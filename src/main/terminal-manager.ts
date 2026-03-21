import type { CreateTerminalPayload, ResizeTerminalPayload } from '../shared/types'

// Dynamic import for node-pty (native module, must be required at runtime)
let pty: typeof import('@lydell/node-pty')

async function loadPty() {
  if (!pty) {
    pty = await import('@lydell/node-pty')
  }
  return pty
}

const MAX_SCROLLBACK_SIZE = 100_000 // ~100KB of terminal output

interface ManagedTerminal {
  process: import('@lydell/node-pty').IPty
  onDataCallback: ((data: string) => void) | null
  onExitCallback: ((code: number) => void) | null
  scrollbackBuffer: string[]
  scrollbackSize: number
  exited: boolean
  exitCode: number | null
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
  // If terminal already exists (reconnect scenario), skip creation
  if (terminals.has(payload.id)) return

  const nodePty = await loadPty()
  const shell = getDefaultShell()

  const ptyProcess = nodePty.spawn(shell, [], {
    name: 'xterm-256color',
    cols: payload.cols || 80,
    rows: payload.rows || 24,
    cwd: payload.cwd,
    env: (() => {
      const env: Record<string, string | undefined> = { ...process.env, TERM: 'xterm-256color', COLORTERM: 'truecolor' }
      delete env.CLAUDECODE
      return env
    })(),
  })

  const managed: ManagedTerminal = {
    process: ptyProcess,
    onDataCallback: null,
    onExitCallback: null,
    scrollbackBuffer: [],
    scrollbackSize: 0,
    exited: false,
    exitCode: null,
  }

  // Always capture output to scrollback buffer
  ptyProcess.onData((data) => {
    managed.scrollbackBuffer.push(data)
    managed.scrollbackSize += data.length

    // Trim buffer if it exceeds max size
    while (managed.scrollbackSize > MAX_SCROLLBACK_SIZE && managed.scrollbackBuffer.length > 1) {
      const removed = managed.scrollbackBuffer.shift()!
      managed.scrollbackSize -= removed.length
    }

    // Forward to attached listener
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

export function destroyAll(): void {
  for (const [id] of terminals) {
    destroyTerminal(id)
  }
}
