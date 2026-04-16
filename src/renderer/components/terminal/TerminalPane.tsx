import { useEffect, useRef, useState } from 'react'
import { Terminal } from '@xterm/xterm'
import { FitAddon } from '@xterm/addon-fit'
import { WebLinksAddon } from '@xterm/addon-web-links'
import { COLORS, getXtermTheme } from '../../lib/constants'
import { useThemeStore } from '../../lib/theme'
import { useTerminalStore } from '../../stores/terminal-store'
import { useWorktreeStore } from '../../stores/worktree-store'
import { ContextMenu } from '../shared/ContextMenu'
import '@xterm/xterm/css/xterm.css'

declare global {
  interface Window {
    platform: {
      isMacOS: boolean
      isWindows: boolean
      isLinux: boolean
    }
    electronAPI: {
      getPathForFile: (file: File) => string
      terminal: {
        create: (payload: { id: string; cwd: string; cols: number; rows: number; scrollback?: number }) => Promise<void>
        attach: (id: string) => Promise<{ exists: boolean; scrollback: string | null; exited: boolean; exitCode: number | null }>
        destroy: (id: string) => Promise<void>
        write: (id: string, data: string) => void
        resize: (id: string, cols: number, rows: number) => void
        onOutput: (cb: (data: { id: string; data: string }) => void) => () => void
        onExit: (cb: (data: { id: string; code: number }) => void) => () => void
        onCommandState: (cb: (data: { id: string; state: import('@shared/types').CommandState; exitCode?: number }) => void) => () => void
        getShellType: (id: string) => Promise<import('@shared/types').ShellType>
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
        createDir: (dirPath: string) => Promise<boolean>
        rename: (oldPath: string, newPath: string) => Promise<boolean>
        delete: (targetPath: string) => Promise<boolean>
        stat: (filePath: string) => Promise<{ exists: boolean; isDirectory: boolean } | null>
        openDirectoryDialog: () => Promise<string | null>
        saveFileDialog: (defaultPath?: string) => Promise<string | null>
        getBranch: (worktreePath: string) => Promise<string>
        listBranches: (repoPath: string) => Promise<{ name: string; current: boolean }[]>
        checkoutBranch: (worktreePath: string, branch: string) => Promise<void>
        gitStatus: (worktreePath: string) => Promise<{ path: string; status: string; staged: boolean }[]>
        openExternal: (url: string) => Promise<void>
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

/** Shell-escape a file path based on the active shell type */
function shellEscape(filePath: string, shellType: import('@shared/types').ShellType): string {
  if (shellType === 'pwsh' || shellType === 'powershell') {
    // PowerShell: single-quoted string, escape internal single quotes by doubling
    return `'${filePath.replace(/'/g, "''")}'`
  }
  if (shellType === 'cmd') {
    // CMD: double-quoted string
    return `"${filePath.replace(/"/g, '\\"')}"`
  }
  // POSIX (bash/zsh/fish/unknown): backslash-escape special characters
  return filePath.replace(/([\\  !"#$&'()*,:;<>?@[\]^`{|}~])/g, '\\$1')
}

export function TerminalPane({ terminalId, cwd, isFocused, onFocus }: TerminalPaneProps) {
  const containerRef = useRef<HTMLDivElement>(null)
  const terminalRef = useRef<Terminal | null>(null)
  const fitAddonRef = useRef<FitAddon | null>(null)
  const createdRef = useRef(false)
  const [isDragOver, setIsDragOver] = useState(false)
  const [contextMenu, setContextMenu] = useState<{ x: number; y: number } | null>(null)
  const dragCounterRef = useRef(0)
  const wrapperRef = useRef<HTMLDivElement>(null)
  const terminalScrollback = useWorktreeStore((s) => s.terminalScrollback)
  const terminalFontSize = useWorktreeStore((s) => s.terminalFontSize)

  // Native DOM drag-and-drop listeners with capture phase
  // to intercept events before xterm.js internal elements consume them
  useEffect(() => {
    const el = wrapperRef.current
    if (!el) return

    const onDragEnter = (e: DragEvent) => {
      e.preventDefault()
      dragCounterRef.current++
      if (e.dataTransfer?.types.includes('Files')) {
        setIsDragOver(true)
      }
    }

    const onDragLeave = (e: DragEvent) => {
      e.preventDefault()
      dragCounterRef.current--
      if (dragCounterRef.current <= 0) {
        dragCounterRef.current = 0
        setIsDragOver(false)
      }
    }

    const onDragOver = (e: DragEvent) => {
      e.preventDefault()
      if (e.dataTransfer?.types.includes('Files')) {
        e.dataTransfer.dropEffect = 'copy'
      }
    }

    const onDrop = async (e: DragEvent) => {
      e.preventDefault()
      e.stopPropagation()
      setIsDragOver(false)
      dragCounterRef.current = 0

      const files = Array.from(e.dataTransfer?.files ?? [])
      if (files.length === 0) return

      const shellType = await window.electronAPI.terminal.getShellType(terminalId)

      const paths = files
        .map((f) => {
          const filePath = window.electronAPI.getPathForFile(f)
          return shellEscape(filePath, shellType)
        })
        .filter(Boolean)
        .join(' ')

      if (paths) {
        window.electronAPI.terminal.write(terminalId, paths)
      }

      terminalRef.current?.focus()
    }

    const captureOpts = { capture: true }
    el.addEventListener('dragenter', onDragEnter, captureOpts)
    el.addEventListener('dragleave', onDragLeave, captureOpts)
    el.addEventListener('dragover', onDragOver, captureOpts)
    el.addEventListener('drop', onDrop, captureOpts)

    return () => {
      el.removeEventListener('dragenter', onDragEnter, captureOpts)
      el.removeEventListener('dragleave', onDragLeave, captureOpts)
      el.removeEventListener('dragover', onDragOver, captureOpts)
      el.removeEventListener('drop', onDrop, captureOpts)
    }
  }, [terminalId])

  useEffect(() => {
    if (!containerRef.current || createdRef.current) return
    createdRef.current = true

    const terminal = new Terminal({
      theme: getXtermTheme(useThemeStore.getState().resolved),
      fontFamily: "'JetBrains Mono', 'Menlo', monospace",
      fontSize: terminalFontSize,
      lineHeight: 1.25,
      cursorBlink: true,
      cursorStyle: 'bar',
      allowProposedApi: true,
      scrollback: terminalScrollback,
    })

    const fitAddon = new FitAddon()
    terminal.loadAddon(fitAddon)
    terminal.loadAddon(new WebLinksAddon((_event, uri) => {
      window.electronAPI.canopy.openExternal(uri)
    }))

    terminal.open(containerRef.current)

    // Copy on select (replicates copyOnSelect, removed in xterm.js v5)
    terminal.onSelectionChange(() => {
      const sel = terminal.getSelection()
      if (sel) navigator.clipboard.writeText(sel)
    })

    terminal.attachCustomKeyEventHandler((e: KeyboardEvent) => {
      if (e.ctrlKey && e.shiftKey && e.code === 'KeyC') {
        const sel = terminal.getSelection()
        if (sel) navigator.clipboard.writeText(sel)
        return false
      }
      if (e.ctrlKey && e.shiftKey && e.code === 'KeyV') {
        navigator.clipboard.readText().then((text) => {
          window.electronAPI.terminal.write(terminalId, text)
        })
        return false
      }
      return true
    })

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
          scrollback: terminalScrollback,
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

  useEffect(() => {
    const unsub = useThemeStore.subscribe(
      (s) => s.resolved,
      (resolved) => {
        if (terminalRef.current) {
          terminalRef.current.options.theme = getXtermTheme(resolved)
        }
      },
    )
    return unsub
  }, [])

  return (
    <div
      ref={wrapperRef}
      onClick={onFocus}
      onContextMenu={(e) => {
        e.preventDefault()
        setContextMenu({ x: e.clientX, y: e.clientY })
      }}
      style={{
        width: '100%',
        height: '100%',
        position: 'relative',
        borderRadius: '3px',
        overflow: 'hidden',
        outline: isFocused || isDragOver
          ? `1px solid ${COLORS.primaryContainerOutline}`
          : '1px solid transparent',
        boxShadow: isFocused || isDragOver
          ? `inset 0 0 0 1px ${COLORS.primaryContainerSubtle}`
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
          opacity: isDragOver ? 0.7 : 1,
          transition: 'opacity 150ms ease-out',
        }}
      />
      {contextMenu && (
        <ContextMenu
          x={contextMenu.x}
          y={contextMenu.y}
          onDismiss={() => setContextMenu(null)}
          items={[
            ...(terminalRef.current?.hasSelection()
              ? [{
                  label: 'Copy',
                  shortcut: 'Ctrl+Shift+C',
                  onClick: () => {
                    const sel = terminalRef.current?.getSelection()
                    if (sel) navigator.clipboard.writeText(sel)
                    setContextMenu(null)
                  },
                }]
              : []),
            {
              label: 'Paste',
              shortcut: 'Ctrl+Shift+V',
              onClick: () => {
                navigator.clipboard.readText().then((text) => {
                  window.electronAPI.terminal.write(terminalId, text)
                })
                setContextMenu(null)
              },
            },
          ]}
        />
      )}
    </div>
  )
}
