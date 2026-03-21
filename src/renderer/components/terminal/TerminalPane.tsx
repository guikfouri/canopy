import { useEffect, useRef } from 'react'
import { Terminal } from '@xterm/xterm'
import { FitAddon } from '@xterm/addon-fit'
import { WebLinksAddon } from '@xterm/addon-web-links'
import { XTERM_THEME, COLORS } from '../../lib/constants'
import { useTerminalStore } from '../../stores/terminal-store'
import '@xterm/xterm/css/xterm.css'

declare global {
  interface Window {
    electronAPI: {
      terminal: {
        create: (payload: { id: string; cwd: string; cols: number; rows: number }) => Promise<void>
        attach: (id: string) => Promise<{ exists: boolean; scrollback: string | null; exited: boolean; exitCode: number | null }>
        destroy: (id: string) => Promise<void>
        write: (id: string, data: string) => void
        resize: (id: string, cols: number, rows: number) => void
        onOutput: (cb: (data: { id: string; data: string }) => void) => () => void
        onExit: (cb: (data: { id: string; code: number }) => void) => () => void
      }
      canopy: {
        loadConfig: () => Promise<import('@shared/types').CanopyConfig>
        saveConfig: (config: import('@shared/types').CanopyConfig) => Promise<void>
        createWorktree: (payload: import('@shared/types').CreateWorktreePayload) => Promise<import('@shared/types').WorktreeInfo>
        listWorktrees: (repoPath: string) => Promise<import('@shared/types').WorktreeInfo[]>
        removeWorktree: (worktreePath: string, deleteBranch?: string) => Promise<void>
        readDir: (dirPath: string) => Promise<import('@shared/types').FileEntry[]>
        readFile: (filePath: string) => Promise<string | null>
        writeFile: (filePath: string, content: string) => Promise<boolean>
        openDirectoryDialog: () => Promise<string | null>
        listBranches: (repoPath: string) => Promise<{ name: string; current: boolean }[]>
        checkoutBranch: (worktreePath: string, branch: string) => Promise<void>
        gitStatus: (worktreePath: string) => Promise<{ path: string; status: string; staged: boolean }[]>
      }
    }
  }
}

interface TerminalPaneProps {
  terminalId: string
  cwd: string
  isFocused: boolean
  onFocus: () => void
}

export function TerminalPane({ terminalId, cwd, isFocused, onFocus }: TerminalPaneProps) {
  const containerRef = useRef<HTMLDivElement>(null)
  const terminalRef = useRef<Terminal | null>(null)
  const fitAddonRef = useRef<FitAddon | null>(null)
  const createdRef = useRef(false)

  useEffect(() => {
    if (!containerRef.current || createdRef.current) return
    createdRef.current = true

    const terminal = new Terminal({
      theme: XTERM_THEME,
      fontFamily: "'JetBrains Mono', 'Menlo', monospace",
      fontSize: 13,
      lineHeight: 1.25,
      cursorBlink: true,
      cursorStyle: 'bar',
      allowProposedApi: true,
      scrollback: 10000,
    })

    const fitAddon = new FitAddon()
    terminal.loadAddon(fitAddon)
    terminal.loadAddon(new WebLinksAddon())

    terminal.open(containerRef.current)

    terminal.onData((data) => {
      window.electronAPI.terminal.write(terminalId, data)
    })

    terminalRef.current = terminal
    fitAddonRef.current = fitAddon

    // Try to attach to existing PTY, or create a new one
    requestAnimationFrame(async () => {
      fitAddon.fit()

      const result = await window.electronAPI.terminal.attach(terminalId)
      if (result.exists) {
        // Replay scrollback buffer
        if (result.scrollback) {
          terminal.write(result.scrollback)
        }
        if (result.exited) {
          terminal.write(`\r\n\x1b[90m[Process exited with code ${result.exitCode}]\x1b[0m\r\n`)
        }
        // Resize to current dimensions
        window.electronAPI.terminal.resize(terminalId, terminal.cols, terminal.rows)
      } else {
        // Create new PTY
        await window.electronAPI.terminal.create({
          id: terminalId,
          cwd,
          cols: terminal.cols,
          rows: terminal.rows,
        })
      }
    })

    return () => {
      terminal.dispose()
      // Don't destroy the PTY — keep it alive for reconnection
      createdRef.current = false
    }
  }, [terminalId, cwd])

  useEffect(() => {
    const unsubOutput = window.electronAPI.terminal.onOutput(({ id, data }) => {
      if (id === terminalId && terminalRef.current) {
        terminalRef.current.write(data)
      }
    })

    const unsubExit = window.electronAPI.terminal.onExit(({ id, code }) => {
      if (id === terminalId && terminalRef.current) {
        terminalRef.current.write(`\r\n\x1b[90m[Process exited with code ${code}]\x1b[0m\r\n`)
      }
    })

    return () => {
      unsubOutput()
      unsubExit()
    }
  }, [terminalId])

  useEffect(() => {
    const handleResize = () => {
      if (fitAddonRef.current && terminalRef.current) {
        fitAddonRef.current.fit()
        window.electronAPI.terminal.resize(
          terminalId,
          terminalRef.current.cols,
          terminalRef.current.rows
        )
      }
    }

    const observer = new ResizeObserver(handleResize)
    if (containerRef.current) {
      observer.observe(containerRef.current)
    }

    return () => observer.disconnect()
  }, [terminalId])

  useEffect(() => {
    if (isFocused && terminalRef.current) {
      terminalRef.current.focus()
    }
  }, [isFocused])

  return (
    <div
      onClick={onFocus}
      style={{
        width: '100%',
        height: '100%',
        position: 'relative',
        borderRadius: '3px',
        overflow: 'hidden',
        // Amber glow outline when focused — "Ghost Border" style
        outline: isFocused
          ? `1px solid ${COLORS.primaryContainer}30`
          : '1px solid transparent',
        boxShadow: isFocused
          ? `inset 0 0 0 1px ${COLORS.primaryContainer}15`
          : 'none',
        transition: 'outline-color 200ms ease-out, box-shadow 200ms ease-out',
      }}
    >
      <div
        ref={containerRef}
        style={{
          width: '100%',
          height: '100%',
          background: COLORS.surfaceDim,
        }}
      />
    </div>
  )
}
