import { app } from 'electron'
import path from 'path'
import type { CreateTerminalPayload, ResizeTerminalPayload, CommandState } from '../shared/types'

// Dynamic import for node-pty (native module, must be required at runtime)
let pty: typeof import('@lydell/node-pty')

async function loadPty() {
  if (!pty) {
    pty = await import('@lydell/node-pty')
  }
  return pty
}

const MAX_SCROLLBACK_SIZE = 100_000 // ~100KB of terminal output

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

// ── OSC 133 parsing ──────────────────────────────────────────────

// Matches OSC 133 sequences: ESC ] 133 ; <command> [; <params>] BEL
const OSC_133_RE = /\x1b\]133;([A-Z])(?:;([^\x07\x1b]*))?\x07/g

interface Osc133Event {
  command: 'A' | 'B' | 'C' | 'D'
  params?: string
}

function parseOsc133(data: string): Osc133Event[] {
  const events: Osc133Event[] = []
  let match: RegExpExecArray | null
  OSC_133_RE.lastIndex = 0
  while ((match = OSC_133_RE.exec(data)) !== null) {
    events.push({
      command: match[1] as Osc133Event['command'],
      params: match[2],
    })
  }
  return events
}

// ── Shell integration path resolution ────────────────────────────

function getShellIntegrationDir(): string {
  if (app.isPackaged) {
    return path.join(process.resourcesPath, 'shell-integration')
  }
  return path.join(__dirname, '..', '..', 'src', 'main', 'shell-integration')
}

function getZshBootstrapDir(): string {
  return path.join(getShellIntegrationDir(), 'zsh-bootstrap')
}

type ShellType = 'zsh' | 'bash' | 'fish' | 'unknown'

function detectShellType(shellPath: string): ShellType {
  const base = path.basename(shellPath)
  if (base === 'zsh' || base.startsWith('zsh-')) return 'zsh'
  if (base === 'bash' || base.startsWith('bash-')) return 'bash'
  if (base === 'fish' || base.startsWith('fish-')) return 'fish'
  return 'unknown'
}

function buildShellEnv(
  shellType: ShellType,
  baseEnv: Record<string, string | undefined>,
): Record<string, string | undefined> {
  const env = { ...baseEnv }
  const integrationDir = getShellIntegrationDir()

  switch (shellType) {
    case 'zsh': {
      env.CANOPY_ORIGINAL_ZDOTDIR = env.ZDOTDIR || ''
      env.ZDOTDIR = getZshBootstrapDir()
      env.CANOPY_SHELL_INTEGRATION_DIR = integrationDir
      break
    }
    case 'bash': {
      env.CANOPY_SHELL_INTEGRATION_DIR = integrationDir
      // --rcfile is used in args, no BASH_ENV to avoid injecting into subshells
      break
    }
    case 'fish': {
      env.CANOPY_SHELL_INTEGRATION_DIR = integrationDir
      break
    }
  }

  return env
}

// ── Terminal instance management ─────────────────────────────────

interface ManagedTerminal {
  process: import('@lydell/node-pty').IPty
  onDataCallback: ((data: string) => void) | null
  onExitCallback: ((code: number) => void) | null
  onCommandStateCallback: ((state: CommandState, exitCode?: number) => void) | null
  scrollbackBuffer: string[]
  scrollbackSize: number
  exited: boolean
  exitCode: number | null
  commandState: CommandState
  outputSinceIdle: number
  lastOutputChunk: string
  commandStateTimer: ReturnType<typeof setTimeout> | null
  hasOscSupport: boolean
  lastCommandExitCode: number | undefined
}

const terminals = new Map<string, ManagedTerminal>()

function getDefaultShell(): string {
  return process.env.SHELL || '/bin/zsh'
}

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
  const shell = getDefaultShell()
  const shellType = detectShellType(shell)
  const disableIntegration = process.env.CANOPY_DISABLE_SHELL_INTEGRATION === '1'

  const baseEnv: Record<string, string | undefined> = {
    ...process.env,
    TERM: 'xterm-256color',
    COLORTERM: 'truecolor',
  }
  delete baseEnv.CLAUDECODE

  const env = disableIntegration ? baseEnv : buildShellEnv(shellType, baseEnv)

  // Shell-specific args for integration injection
  const args: string[] = []
  if (!disableIntegration) {
    const integrationDir = getShellIntegrationDir()
    if (shellType === 'bash') {
      args.push('--rcfile', path.join(integrationDir, 'canopy-integration.bash'))
    } else if (shellType === 'fish') {
      args.push('-C', `source ${path.join(integrationDir, 'canopy-integration.fish')}`)
    }
  }

  const ptyProcess = nodePty.spawn(shell, args, {
    name: 'xterm-256color',
    cols: payload.cols || 80,
    rows: payload.rows || 24,
    cwd: payload.cwd,
    env,
  })

  const managed: ManagedTerminal = {
    process: ptyProcess,
    onDataCallback: null,
    onExitCallback: null,
    onCommandStateCallback: null,
    scrollbackBuffer: [],
    scrollbackSize: 0,
    exited: false,
    exitCode: null,
    commandState: 'idle',
    outputSinceIdle: 0,
    lastOutputChunk: '',
    commandStateTimer: null,
    hasOscSupport: false,
    lastCommandExitCode: undefined,
  }

  function setCommandState(state: CommandState, exitCode?: number) {
    if (managed.commandState === state) return
    managed.commandState = state
    if (managed.onCommandStateCallback) {
      managed.onCommandStateCallback(state, exitCode)
    }
  }

  // ── OSC 133 handler ──────────────────────────────────
  function handleOsc133Events(data: string): void {
    const events = parseOsc133(data)
    if (events.length === 0) return

    if (!managed.hasOscSupport) {
      managed.hasOscSupport = true
      if (managed.commandStateTimer) {
        clearTimeout(managed.commandStateTimer)
        managed.commandStateTimer = null
      }
    }

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

    if (managed.outputSinceIdle >= MIN_OUTPUT_FOR_BUSY && managed.commandState === 'idle') {
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

  ptyProcess.onData((data) => {
    managed.scrollbackBuffer.push(data)
    managed.scrollbackSize += data.length

    while (managed.scrollbackSize > MAX_SCROLLBACK_SIZE && managed.scrollbackBuffer.length > 1) {
      const removed = managed.scrollbackBuffer.shift()!
      managed.scrollbackSize -= removed.length
    }

    // Parse OSC 133 from raw data BEFORE any stripping
    handleOsc133Events(data)
    // Fallback detection (only active when no OSC 133 support)
    handleFallbackDetection(data)

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
