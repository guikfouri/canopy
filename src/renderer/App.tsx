import { useEffect } from 'react'
import { AppShell } from './components/layout/AppShell'
import { useWorktreeStore } from './stores/worktree-store'
import { useTerminalStore } from './stores/terminal-store'
import { splitTabGroup, createTabGroup, findTabGroupContaining } from './lib/split-tree'
import { playNotificationSound } from './lib/notification-sounds'

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

  // Global command state listener — updates store + plays sound
  useEffect(() => {
    if (!window.electronAPI?.terminal?.onCommandState) return

    const unsub = window.electronAPI.terminal.onCommandState(({ id, state, exitCode }) => {
      console.log('[canopy-notif] command state:', state, 'exit:', exitCode, 'id:', id.slice(0, 8))
      useTerminalStore.getState().setCommandState(id, state, exitCode)

      if (state === 'done') {
        const { worktrees, activeWorktreeId, notification } = useWorktreeStore.getState()

        // Find which worktree owns this terminal by scanning split layouts
        const ownerWorktree = worktrees.find(w =>
          findTabGroupContaining(w.splitLayout, id) !== undefined,
        )

        console.log('[canopy-notif] done check:', {
          ownerWorktreeId: ownerWorktree?.id.slice(0, 8),
          activeWorktreeId: activeWorktreeId?.slice(0, 8),
          isBackground: ownerWorktree != null && ownerWorktree.id !== activeWorktreeId,
          soundEnabled: notification.soundEnabled,
        })

        // Play sound if terminal belongs to a non-active worktree
        if (ownerWorktree && ownerWorktree.id !== activeWorktreeId) {
          console.warn('[canopy-notif] ▶ BACKGROUND DONE! sound:', notification.soundType, 'enabled:', notification.soundEnabled, 'vol:', notification.volume)
          if (notification.soundEnabled) {
            playNotificationSound(notification.soundType, notification.volume)
          }
        }
      }
    })

    return unsub
  }, [])

  // Prevent Electron from navigating when files are dropped anywhere
  useEffect(() => {
    const preventNav = (e: DragEvent) => {
      e.preventDefault()
    }
    document.addEventListener('dragover', preventNav)
    document.addEventListener('drop', preventNav)
    return () => {
      document.removeEventListener('dragover', preventNav)
      document.removeEventListener('drop', preventNav)
    }
  }, [])

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
