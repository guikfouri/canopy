import { app } from 'electron'
import type { CreateTerminalPayload, ResizeTerminalPayload, CommandState, ShellType } from '../shared/types'
import { UnixShellProvider } from './shell-providers/unix-shell-provider'
import { WindowsShellProvider } from './shell-providers/windows-shell-provider'
import type { ShellProvider } from './shell-providers/shell-provider.interface'

const shellProvider: ShellProvider =
  process.platform === 'win32'
    ? new WindowsShellProvider()
    : new UnixShellProvider()

// ── Diagnostic logging (prefix all with [canopy-term]) ──────────
const DEBUG = !app.isPackaged
function log(...args: unknown[]) {
  if (DEBUG) console.log('[canopy-term]', ...args)
}

// Dynamic import for node-pty (native module, must be required at runtime)
let pty: typeof import('@lydell/node-pty')

async function loadPty() {
  if (!pty) {
    pty = await import('@lydell/node-pty')
  }
  return pty
}

const DEFAULT_SCROLLBACK_SIZE = 100_000 // ~100KB of terminal output

// ── Fallback prompt detection (used when OSC 133 is unavailable) ──

// Strip ANSI escape codes for prompt pattern matching
const ANSI_RE = /\x1b\[[0-9;]*[a-zA-Z]|\x1b\].*?(?:\x07|\x1b\\)/g
function stripAnsi(str: string): string {
  return str.replace(ANSI_RE, '')
}

// Detect common shell prompt endings (after stripping ANSI)
const PROMPT_RE = /[$%❯#>]\s*$/m

function looksLikePrompt(data: string): boolean {
  const clean = stripAnsi(data)
  return PROMPT_RE.test(clean)
}

const COMMAND_STATE_DEBOUNCE_MS = 1500
// Minimum output bytes before we consider the terminal "busy"
const MIN_OUTPUT_FOR_BUSY = 200

// Activity-based idle detection (runs alongside OSC 133)
// Detects when interactive programs like Claude Code become idle
const ACTIVITY_IDLE_TIMEOUT_MS = 4000  // 4s of silence after output = idle
const MIN_OUTPUT_FOR_ACTIVITY = 100    // Minimum output bytes for idle → busy
const ACTIVITY_REACTIVATION_MIN = 500  // Minimum output bytes for done → busy (higher to avoid cursor noise)
const ACTIVITY_COOLDOWN_MS = 8000      // After activity-done, ignore small output for 8s

// ── OSC 133 parsing ──────────────────────────────────────────────

// Matches OSC 133 sequences: ESC ] 133 ; <command> [; <params>] (BEL | ST)
// BEL = \x07, ST = ESC \ (\x1b\x5c)
const OSC_133_RE = /\x1b\]133;([A-Z])(?:;([^\x07\x1b]*))?\x07|\x1b\]133;([A-Z])(?:;([^\x07\x1b]*))?\x1b\\/g

interface Osc133Event {
  command: 'A' | 'B' | 'C' | 'D'
  params?: string
}

function parseOsc133(data: string): Osc133Event[] {
  const events: Osc133Event[] = []
  let match: RegExpExecArray | null
  OSC_133_RE.lastIndex = 0
  while ((match = OSC_133_RE.exec(data)) !== null) {
    // BEL variant: groups 1,2 — ST variant: groups 3,4
    const command = (match[1] || match[3]) as Osc133Event['command']
    const params = match[2] || match[4]
    events.push({ command, params })
  }
  return events
}

// ── Terminal instance management ─────────────────────────────────

interface ManagedTerminal {
  process: import('@lydell/node-pty').IPty
  onDataCallback: ((data: string) => void) | null
  onExitCallback: ((code: number) => void) | null
  onCommandStateCallback: ((state: CommandState, exitCode?: number) => void) | null
  scrollbackBuffer: string[]
  scrollbackSize: number
  maxScrollbackSize: number
  exited: boolean
  exitCode: number | null
  commandState: CommandState
  outputSinceIdle: number
  lastOutputChunk: string
  commandStateTimer: ReturnType<typeof setTimeout> | null
  activityTimer: ReturnType<typeof setTimeout> | null
  activityBytes: number // Output bytes since last idle/done
  lastActivityDoneAt: number // Timestamp of last activity-based done (for cooldown)
  hasOscSupport: boolean
  lastCommandExitCode: number | undefined
  oscBuffer: string // Buffer for partial OSC sequences across chunks
  shellType: ShellType
}

const terminals = new Map<string, ManagedTerminal>()

export function hasTerminal(id: string): boolean {
  return terminals.has(id)
}

/** Returns buffered output for replay when re-attaching a terminal */
export function getScrollback(id: string): string | null {
  const terminal = terminals.get(id)
  if (!terminal) return null
  return terminal.scrollbackBuffer.join('')
}

/** Returns true if the terminal process has already exited */
export function getExitInfo(id: string): { exited: boolean; exitCode: number | null } | null {
  const terminal = terminals.get(id)
  if (!terminal) return null
  return { exited: terminal.exited, exitCode: terminal.exitCode }
}

export async function createTerminal(payload: CreateTerminalPayload): Promise<void> {
  if (terminals.has(payload.id)) return

  const nodePty = await loadPty()
  const shellInfo = shellProvider.detect()
  const disableIntegration = process.env.CANOPY_DISABLE_SHELL_INTEGRATION === '1'

  const baseEnv: Record<string, string | undefined> = {
    ...process.env,
    TERM: 'xterm-256color',
    COLORTERM: 'truecolor',
  }
  delete baseEnv.CLAUDECODE

  const integrationEnv = disableIntegration ? {} : shellProvider.getIntegrationEnv(shellInfo)
  const env = { ...baseEnv, ...integrationEnv }

  const args: string[] = disableIntegration ? [] : shellProvider.getIntegrationArgs(shellInfo)

  log('createTerminal:', {
    id: payload.id,
    shell: shellInfo.executable,
    shellType: shellInfo.type,
    disableIntegration,
    args,
  })

  const ptyProcess = nodePty.spawn(shellInfo.executable, args, {
    name: 'xterm-256color',
    cols: payload.cols || 80,
    rows: payload.rows || 24,
    cwd: payload.cwd,
    env,
  })

  // Scale server buffer proportionally: ~10 bytes per scrollback line
  const maxScrollbackSize = payload.scrollback
    ? Math.round(payload.scrollback * 10)
    : DEFAULT_SCROLLBACK_SIZE

  const managed: ManagedTerminal = {
    process: ptyProcess,
    onDataCallback: null,
    onExitCallback: null,
    onCommandStateCallback: null,
    scrollbackBuffer: [],
    scrollbackSize: 0,
    maxScrollbackSize,
    exited: false,
    exitCode: null,
    commandState: 'idle',
    outputSinceIdle: 0,
    lastOutputChunk: '',
    commandStateTimer: null,
    activityTimer: null,
    activityBytes: 0,
    lastActivityDoneAt: 0,
    hasOscSupport: false,
    lastCommandExitCode: undefined,
    oscBuffer: '',
    shellType: shellInfo.type,
  }

  function setCommandState(state: CommandState, exitCode?: number) {
    if (managed.commandState === state) return
    log(`state: ${managed.commandState} → ${state}`, exitCode !== undefined ? `exit=${exitCode}` : '', `hasCallback=${!!managed.onCommandStateCallback}`, `[${payload.id.slice(0, 8)}]`)
    managed.commandState = state
    if (managed.onCommandStateCallback) {
      managed.onCommandStateCallback(state, exitCode)
    } else {
      log(`⚠ no callback for state change!`, `[${payload.id.slice(0, 8)}]`)
    }
  }

  // ── OSC 133 handler ──────────────────────────────────
  function handleOsc133Events(data: string): void {
    // Prepend any buffered partial OSC sequence from previous chunk
    const combined = managed.oscBuffer + data
    managed.oscBuffer = ''

    // Check if data ends with a partial OSC 133 sequence (no BEL or ST terminator yet)
    const lastEsc = combined.lastIndexOf('\x1b]133;')
    if (lastEsc !== -1) {
      const afterEsc = combined.substring(lastEsc)
      if (!afterEsc.includes('\x07') && !afterEsc.includes('\x1b\\')) {
        // Partial sequence — buffer it for next chunk
        managed.oscBuffer = afterEsc
      }
    }

    const events = parseOsc133(combined)
    if (events.length === 0) return

    if (!managed.hasOscSupport) {
      log('✓ OSC 133 support detected!', `[${payload.id.slice(0, 8)}]`)
      managed.hasOscSupport = true
      if (managed.commandStateTimer) {
        clearTimeout(managed.commandStateTimer)
        managed.commandStateTimer = null
      }
    }
    log('OSC events:', events.map(e => `${e.command}${e.params ? ';' + e.params : ''}`).join(', '), `[${payload.id.slice(0, 8)}]`)

    for (const event of events) {
      switch (event.command) {
        case 'C':
          setCommandState('busy')
          break
        case 'D': {
          // Ignore D when idle — first prompt fires D before any command runs
          if (managed.commandState !== 'busy') break
          const exitCode = event.params !== undefined ? parseInt(event.params, 10) : undefined
          managed.lastCommandExitCode = isNaN(exitCode as number) ? undefined : exitCode
          setCommandState('done', managed.lastCommandExitCode)
          managed.outputSinceIdle = 0
          // Reset activity tracking to prevent double-notification
          managed.activityBytes = 0
          if (managed.activityTimer) {
            clearTimeout(managed.activityTimer)
            managed.activityTimer = null
          }
          break
        }
        case 'A':
        case 'B':
          // Prompt/input markers — no state change needed
          break
      }
    }
  }

  // ── Fallback prompt-matching handler ─────────────────
  function handleFallbackDetection(data: string): void {
    if (managed.hasOscSupport) return

    managed.lastOutputChunk = data
    managed.outputSinceIdle += data.length

    if (managed.outputSinceIdle >= MIN_OUTPUT_FOR_BUSY && (managed.commandState === 'idle' || managed.commandState === 'done')) {
      setCommandState('busy')
    }

    if (managed.commandStateTimer) clearTimeout(managed.commandStateTimer)
    managed.commandStateTimer = setTimeout(() => {
      if (managed.commandState === 'busy' && looksLikePrompt(managed.lastOutputChunk)) {
        setCommandState('done')
        managed.outputSinceIdle = 0
      }
    }, COMMAND_STATE_DEBOUNCE_MS)
  }

  // ── Activity-based idle detection ──────────────────
  // Runs alongside OSC 133 to catch interactive programs (Claude Code, etc.)
  // becoming idle. OSC 133 handles precise shell command boundaries;
  // this catches "the terminal stopped producing output".
  function handleActivityDetection(data: string): void {
    managed.activityBytes += data.length

    // Determine threshold based on current state
    // After a recent done, require more output to re-enter busy (avoid oscillation from cursor noise)
    const inCooldown = managed.lastActivityDoneAt > 0 &&
      (Date.now() - managed.lastActivityDoneAt) < ACTIVITY_COOLDOWN_MS
    const threshold = managed.commandState === 'done'
      ? ACTIVITY_REACTIVATION_MIN
      : MIN_OUTPUT_FOR_ACTIVITY

    if (!inCooldown && managed.activityBytes >= threshold && managed.commandState !== 'busy') {
      setCommandState('busy')
    }

    // Reset the idle timer on every chunk
    if (managed.activityTimer) clearTimeout(managed.activityTimer)
    managed.activityTimer = setTimeout(() => {
      if (managed.commandState === 'busy') {
        log(`activity timeout (${ACTIVITY_IDLE_TIMEOUT_MS}ms silence after ${managed.activityBytes}b)`, `[${payload.id.slice(0, 8)}]`)
        setCommandState('done')
        managed.activityBytes = 0
        managed.lastActivityDoneAt = Date.now()
      }
    }, ACTIVITY_IDLE_TIMEOUT_MS)
  }

  let chunkCount = 0
  ptyProcess.onData((data) => {
    // Diagnostic: log first 5 chunks as hex to verify OSC 133 arrives in Electron
    if (chunkCount < 5) {
      chunkCount++
      const hasOsc = data.includes('\x1b]133;')
      log(
        `chunk #${chunkCount} (${data.length}b) osc133=${hasOsc}`,
        hasOsc ? '' : `hex=${Buffer.from(data.slice(0, 100)).toString('hex')}`,
        `[${payload.id.slice(0, 8)}]`,
      )
    }

    managed.scrollbackBuffer.push(data)
    managed.scrollbackSize += data.length

    while (managed.scrollbackSize > managed.maxScrollbackSize && managed.scrollbackBuffer.length > 1) {
      const removed = managed.scrollbackBuffer.shift()!
      managed.scrollbackSize -= removed.length
    }

    // Parse OSC 133 from raw data BEFORE any stripping
    handleOsc133Events(data)
    // Fallback detection (only active when no OSC 133 support)
    handleFallbackDetection(data)
    // Activity-based idle detection (always active, catches interactive programs)
    handleActivityDetection(data)

    if (managed.onDataCallback) {
      managed.onDataCallback(data)
    }
  })

  ptyProcess.onExit(({ exitCode }) => {
    managed.exited = true
    managed.exitCode = exitCode
    if (managed.onExitCallback) {
      managed.onExitCallback(exitCode)
    }
  })

  terminals.set(payload.id, managed)
}

export function writeToTerminal(id: string, data: string): void {
  const terminal = terminals.get(id)
  if (terminal) {
    terminal.process.write(data)
  }
}

export function resizeTerminal(payload: ResizeTerminalPayload): void {
  const terminal = terminals.get(payload.id)
  if (terminal) {
    try {
      terminal.process.resize(payload.cols, payload.rows)
    } catch {
      // Ignore resize errors (can happen during shutdown)
    }
  }
}

export function destroyTerminal(id: string): void {
  const terminal = terminals.get(id)
  if (terminal) {
    if (terminal.commandStateTimer) {
      clearTimeout(terminal.commandStateTimer)
    }
    if (terminal.activityTimer) {
      clearTimeout(terminal.activityTimer)
    }
    try {
      terminal.process.kill()
    } catch {
      // Already dead
    }
    terminals.delete(id)
  }
}

export function onTerminalData(id: string, callback: (data: string) => void): void {
  const terminal = terminals.get(id)
  if (terminal) {
    terminal.onDataCallback = callback
  }
}

export function onTerminalExit(id: string, callback: (code: number) => void): void {
  const terminal = terminals.get(id)
  if (terminal) {
    terminal.onExitCallback = callback
  }
}

export function onCommandState(id: string, callback: (state: CommandState, exitCode?: number) => void): void {
  const terminal = terminals.get(id)
  if (terminal) {
    terminal.onCommandStateCallback = callback
  }
}

export function getCommandState(id: string): CommandState | null {
  const terminal = terminals.get(id)
  if (!terminal) return null
  return terminal.commandState
}

export function resetCommandState(id: string): void {
  const terminal = terminals.get(id)
  if (terminal) {
    terminal.commandState = 'idle'
    terminal.outputSinceIdle = 0
  }
}

export function destroyAll(): void {
  for (const [id] of terminals) {
    destroyTerminal(id)
  }
}

export function getTerminalShellType(id: string): ShellType {
  return terminals.get(id)?.shellType ?? 'unknown'
}
