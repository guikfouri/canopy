import { useEffect, useRef, useState } from 'react'
import * as monaco from 'monaco-editor'
import { COLORS } from '../../lib/constants'

// Configure Monaco workers for Electron
self.MonacoEnvironment = {
  getWorker(_: string, _label: string) {
    const blob = new Blob(
      ['self.onmessage = function() {}'],
      { type: 'application/javascript' }
    )
    return new Worker(URL.createObjectURL(blob))
  },
}

// Define Kinetic Console theme for Monaco
monaco.editor.defineTheme('kinetic-console', {
  base: 'vs-dark',
  inherit: true,
  rules: [
    { token: 'comment', foreground: '6b6460', fontStyle: 'italic' },
    { token: 'keyword', foreground: 'ffba38' },
    { token: 'string', foreground: '4ADE80' },
    { token: 'number', foreground: 'ffb77a' },
    { token: 'type', foreground: 'bbbcff' },
    { token: 'function', foreground: 'ffd79b' },
    { token: 'variable', foreground: 'e2e0fc' },
  ],
  colors: {
    'editor.background': COLORS.surfaceDim,
    'editor.foreground': COLORS.onSurface,
    'editor.lineHighlightBackground': '#1a1a2e',
    'editor.selectionBackground': '#ffb30040',
    'editorCursor.foreground': COLORS.primaryContainer,
    'editorLineNumber.foreground': COLORS.textMuted,
    'editorLineNumber.activeForeground': COLORS.textSecondary,
    'editor.inactiveSelectionBackground': '#ffb30020',
    'editorIndentGuide.background': '#28283d',
    'editorIndentGuide.activeBackground': '#333348',
    'scrollbarSlider.background': '#33334840',
    'scrollbarSlider.hoverBackground': '#33334880',
    'scrollbarSlider.activeBackground': '#333348',
  },
})

interface FileEditorPaneProps {
  filePath?: string
  tabId: string
  onDirtyChange?: (isDirty: boolean) => void
  onFilePathChange?: (tabId: string, filePath: string, title: string) => void
  isFocused: boolean
  onFocus: () => void
}

function getLanguageFromPath(filePath: string): string {
  const ext = filePath.split('.').pop()?.toLowerCase() ?? ''
  const langMap: Record<string, string> = {
    ts: 'typescript', tsx: 'typescript',
    js: 'javascript', jsx: 'javascript',
    json: 'json',
    md: 'markdown',
    css: 'css', scss: 'scss', less: 'less',
    html: 'html', htm: 'html',
    py: 'python',
    rs: 'rust',
    go: 'go',
    yaml: 'yaml', yml: 'yaml',
    toml: 'ini',
    sh: 'shell', bash: 'shell', zsh: 'shell',
    sql: 'sql',
    xml: 'xml',
    svg: 'xml',
    graphql: 'graphql', gql: 'graphql',
  }
  return langMap[ext] ?? 'plaintext'
}

export function FileEditorPane({ filePath, tabId, onDirtyChange, onFilePathChange, isFocused, onFocus }: FileEditorPaneProps) {
  const containerRef = useRef<HTMLDivElement>(null)
  const editorRef = useRef<monaco.editor.IStandaloneCodeEditor | null>(null)
  const originalContentRef = useRef<string>('')
  const filePathRef = useRef(filePath)
  filePathRef.current = filePath
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  // Load file content
  useEffect(() => {
    if (!filePath) {
      // Untitled buffer — start empty
      originalContentRef.current = ''
      if (editorRef.current) {
        editorRef.current.getModel()?.setValue('')
      }
      setLoading(false)
      return
    }

    let cancelled = false

    async function loadFile() {
      setLoading(true)
      setError(null)
      const content = await window.electronAPI.canopy.readFile(filePath!)
      if (cancelled) return

      if (content === null) {
        setError('Failed to read file')
        setLoading(false)
        return
      }

      originalContentRef.current = content

      if (editorRef.current) {
        const model = editorRef.current.getModel()
        if (model) {
          model.setValue(content)
        }
      }
      setLoading(false)
    }

    loadFile()
    return () => { cancelled = true }
  }, [filePath])

  // Create editor
  useEffect(() => {
    if (!containerRef.current) return

    const editor = monaco.editor.create(containerRef.current, {
      value: '',
      language: filePath ? getLanguageFromPath(filePath) : 'plaintext',
      theme: 'kinetic-console',
      fontFamily: "'JetBrains Mono', 'Menlo', monospace",
      fontSize: 13,
      lineHeight: 20,
      minimap: { enabled: false },
      scrollBeyondLastLine: false,
      padding: { top: 8, bottom: 8 },
      renderLineHighlight: 'line',
      smoothScrolling: true,
      cursorBlinking: 'smooth',
      cursorSmoothCaretAnimation: 'on',
      automaticLayout: true,
      wordWrap: 'on',
      tabSize: 2,
      bracketPairColorization: { enabled: true },
    })

    editorRef.current = editor

    // Track dirty state
    editor.onDidChangeModelContent(() => {
      const currentContent = editor.getValue()
      const isDirty = currentContent !== originalContentRef.current
      onDirtyChange?.(isDirty)
    })

    // Save on Cmd+S
    editor.addCommand(monaco.KeyMod.CtrlCmd | monaco.KeyCode.KeyS, async () => {
      const content = editor.getValue()
      const currentPath = filePathRef.current
      let savePath: string

      if (currentPath) {
        savePath = currentPath
      } else {
        // Untitled — show Save As dialog
        const chosen = await window.electronAPI.canopy.saveFileDialog()
        if (!chosen) return
        savePath = chosen
      }

      const saved = await window.electronAPI.canopy.writeFile(savePath, content)
      if (saved) {
        originalContentRef.current = content
        onDirtyChange?.(false)

        // If this was an untitled buffer, update the tab
        if (!currentPath) {
          const fileName = savePath.split('/').pop() || savePath
          onFilePathChange?.(tabId, savePath, fileName)

          // Update language based on new file extension
          const model = editor.getModel()
          if (model) {
            monaco.editor.setModelLanguage(model, getLanguageFromPath(savePath))
          }
        }
      }
    })

    // Focus handling
    editor.onDidFocusEditorText(() => {
      onFocus()
    })

    return () => {
      editor.dispose()
      editorRef.current = null
    }
  }, [filePath]) // Recreate editor when filePath changes

  // Focus management
  useEffect(() => {
    if (isFocused && editorRef.current) {
      editorRef.current.focus()
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
      {(loading || error) && (
        <div style={{
          position: 'absolute',
          inset: 0,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          background: COLORS.surfaceDim,
          color: error ? COLORS.error : COLORS.textMuted,
          fontSize: '12px',
          fontFamily: "'Inter', sans-serif",
        }}>
          {error ?? 'Loading...'}
        </div>
      )}
    </div>
  )
}
