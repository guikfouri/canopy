import { useEffect } from 'react'
import { AppShell } from './components/layout/AppShell'
import { useWorktreeStore } from './stores/worktree-store'
import { useTerminalStore } from './stores/terminal-store'
import { splitTabGroup, createTabGroup, findTabGroupContaining } from './lib/split-tree'

// Set default theme before React hydrates to prevent flash
if (!document.documentElement.hasAttribute('data-theme')) {
  const prefersDark = window.matchMedia('(prefers-color-scheme: dark)').matches
  document.documentElement.setAttribute('data-theme', prefersDark ? 'dark' : 'light')
}

function handleSplit(direction: 'horizontal' | 'vertical') {
  const store = useWorktreeStore.getState()
  const worktree = store.getActive()
  const { focusedTerminalId } = useTerminalStore.getState()
  if (worktree && focusedTerminalId) {
    const group = findTabGroupContaining(worktree.splitLayout, focusedTerminalId)
    if (!group) return
    const updated = splitTabGroup(worktree.splitLayout, group.id, direction, createTabGroup())
    store.updateSplitLayout(worktree.id, updated)
  }
}

export default function App() {
  const loaded = useWorktreeStore((s) => s.loaded)
  const loadFromConfig = useWorktreeStore((s) => s.loadFromConfig)

  useEffect(() => {
    if (window.electronAPI?.canopy) {
      window.electronAPI.canopy.loadConfig().then(loadFromConfig)
    } else {
      loadFromConfig({
        version: 1,
        theme: 'system',
        projects: [],
        worktrees: [],
        activeWorktreeId: null,
        sidebarWidth: 220,
        fileExplorerWidth: 280,
        terminalScrollback: 10_000,
        terminalFontSize: 13,
      })
    }
  }, [loadFromConfig])

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      const meta = e.metaKey || e.ctrlKey

      if (meta && !e.shiftKey && e.key === 'd') {
        e.preventDefault()
        handleSplit('horizontal')
      }

      if (meta && e.shiftKey && e.key === 'D') {
        e.preventDefault()
        handleSplit('vertical')
      }
    }

    window.addEventListener('keydown', handleKeyDown)
    return () => window.removeEventListener('keydown', handleKeyDown)
  }, [])

  if (!loaded) {
    return (
      <div style={{
        width: '100vw',
        height: '100dvh',
        background: 'var(--surface)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
      }}>
        <div style={{
          width: '32px',
          height: '32px',
          borderRadius: '50%',
          border: '2px solid var(--surface-container-highest)',
          borderTopColor: 'var(--primary-container)',
          animation: 'spin 800ms linear infinite',
        }} />
        <style>{`@keyframes spin { to { transform: rotate(360deg) } }`}</style>
      </div>
    )
  }

  return <AppShell />
}
