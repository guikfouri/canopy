import { useState } from 'react'
import { WorktreeList } from '../workspace/WorktreeList'
import { useWorktreeStore } from '../../stores/worktree-store'
import { COLORS } from '../../lib/constants'
import { useThemeStore } from '../../lib/theme'

const DRAG = { WebkitAppRegion: 'drag' } as React.CSSProperties
const NO_DRAG = { WebkitAppRegion: 'no-drag' } as React.CSSProperties

interface SidebarProps {
  width: number
  onOpenSettings: () => void
}

export function Sidebar({ width, onOpenSettings }: SidebarProps) {
  const addProject = useWorktreeStore((s) => s.addProject)
  const projects = useWorktreeStore((s) => s.projects)
  const [addHovered, setAddHovered] = useState(false)
  const [settingsHovered, setSettingsHovered] = useState(false)
  const resolved = useThemeStore((s) => s.resolved)
  const toggleTheme = useThemeStore((s) => s.toggleTheme)
  const [themeHovered, setThemeHovered] = useState(false)

  const handleAddProject = async () => {
    try {
      const path = await window.electronAPI?.canopy?.openDirectoryDialog()
      if (!path) return

      // Prevent duplicate projects with the same path
      if (projects.some((p) => p.path === path)) return

      const branch = await window.electronAPI?.canopy?.getBranch(path).catch(() => 'main') ?? 'main'

      addProject(path, branch)
    } catch (err) {
      console.error('[Canopy] Failed to add project:', err)
    }
  }

  return (
    <div style={{
      width: `${width}px`,
      minWidth: `${width}px`,
      height: '100%',
      background: COLORS.surfaceContainer,
      display: 'flex',
      flexDirection: 'column',
      overflow: 'hidden',
      animation: 'fadeIn 300ms ease-out',
    }}>
      {/* Header — macOS traffic light space + brand */}
      <div style={{
        padding: '12px 20px',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        ...DRAG,
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
          {/* Amber LED indicator */}
          <div style={{
            width: '6px',
            height: '6px',
            borderRadius: '50%',
            background: COLORS.primaryContainer,
            boxShadow: `0 0 8px ${COLORS.primaryContainerGlow}`,
          }} />
          <span style={{
            color: COLORS.onSurface,
            fontSize: '15px',
            fontFamily: "'Space Grotesk', sans-serif",
            fontWeight: 600,
            letterSpacing: '-0.02em',
          }}>
            Canopy
          </span>
        </div>
        {/* Theme toggle */}
        <button
          onClick={toggleTheme}
          onMouseEnter={() => setThemeHovered(true)}
          onMouseLeave={() => setThemeHovered(false)}
          style={{
            width: '28px',
            height: '28px',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            background: themeHovered ? COLORS.surfaceContainerHighest : 'transparent',
            border: 'none',
            borderRadius: '6px',
            color: themeHovered ? COLORS.primary : COLORS.textSecondary,
            cursor: 'pointer',
            transition: 'all 200ms ease-out',
            ...NO_DRAG,
          }}
          aria-label={`Switch to ${resolved === 'dark' ? 'light' : 'dark'} theme`}
          title={`Switch to ${resolved === 'dark' ? 'light' : 'dark'} theme`}
        >
          {resolved === 'dark' ? (
            <svg width="16" height="16" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.3" strokeLinecap="round">
              <circle cx="8" cy="8" r="3" />
              <path d="M8 1.5v1.5M8 13v1.5M1.5 8H3M13 8h1.5M3.17 3.17l1.06 1.06M11.77 11.77l1.06 1.06M3.17 12.83l1.06-1.06M11.77 4.23l1.06-1.06" />
            </svg>
          ) : (
            <svg width="16" height="16" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.3" strokeLinecap="round">
              <path d="M13.5 8.5a5.5 5.5 0 0 1-7-7 5.5 5.5 0 1 0 7 7z" />
            </svg>
          )}
        </button>
      </div>

      {/* Section header */}
      <div style={{
        padding: '16px 20px 8px',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        ...NO_DRAG,
      }}>
        <span style={{
          color: COLORS.textSecondary,
          fontSize: '10px',
          fontFamily: "'Inter', sans-serif",
          fontWeight: 600,
          textTransform: 'uppercase',
          letterSpacing: '0.08em',
        }}>
          Projects
        </span>
        <button
          onClick={handleAddProject}
          onMouseEnter={() => setAddHovered(true)}
          onMouseLeave={() => setAddHovered(false)}
          style={{
            width: '22px',
            height: '22px',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            background: addHovered ? COLORS.surfaceContainerHighest : 'transparent',
            border: 'none',
            borderRadius: '4px',
            color: addHovered ? COLORS.primary : COLORS.textSecondary,
            fontSize: '16px',
            cursor: 'pointer',
            lineHeight: 1,
            transition: 'all 150ms ease-out',
            fontFamily: "'Inter', sans-serif",
            fontWeight: 300,
          }}
          title="Add Project"
        >
          <svg width="14" height="14" viewBox="0 0 14 14" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round">
            <path d="M7 2v10M2 7h10" />
          </svg>
        </button>
      </div>

      {/* Project & worktree list */}
      <div style={{
        flex: 1,
        overflow: 'auto',
        padding: '4px 8px 12px',
        ...NO_DRAG,
      }}>
        <WorktreeList />
      </div>

      {/* Bottom: add project + settings */}
      <div style={{
        padding: '8px 20px 12px',
        borderTop: `1px solid ${COLORS.outlineVariantSubtle}`,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        ...NO_DRAG,
      }}>
        <button
          onClick={handleAddProject}
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: '6px',
            background: 'none',
            border: 'none',
            color: COLORS.textMuted,
            fontSize: '11px',
            fontFamily: "'Inter', sans-serif",
            cursor: 'pointer',
            padding: '4px 0',
            transition: 'color 150ms ease-out',
          }}
          onMouseEnter={(e) => { e.currentTarget.style.color = COLORS.onSurfaceVariant }}
          onMouseLeave={(e) => { e.currentTarget.style.color = COLORS.textMuted }}
        >
          <svg width="12" height="12" viewBox="0 0 14 14" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round">
            <path d="M7 2v10M2 7h10" />
          </svg>
          Add project
        </button>
        <button
          onClick={onOpenSettings}
          onMouseEnter={() => setSettingsHovered(true)}
          onMouseLeave={() => setSettingsHovered(false)}
          style={{
            width: '26px',
            height: '26px',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            background: settingsHovered ? COLORS.surfaceContainerHighest : 'transparent',
            border: 'none',
            borderRadius: '6px',
            color: settingsHovered ? COLORS.primary : COLORS.textMuted,
            cursor: 'pointer',
            transition: 'all 200ms ease-out',
          }}
          title="Settings"
          aria-label="Settings"
        >
          <svg width="15" height="15" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.3" strokeLinecap="round" strokeLinejoin="round">
            <circle cx="8" cy="8" r="2.5" />
            <path d="M13.3 9.7a1.2 1.2 0 0 0 .24 1.32l.04.04a1.45 1.45 0 1 1-2.06 2.06l-.04-.04a1.2 1.2 0 0 0-1.32-.24 1.2 1.2 0 0 0-.73 1.1v.11a1.45 1.45 0 1 1-2.9 0v-.06a1.2 1.2 0 0 0-.78-1.1 1.2 1.2 0 0 0-1.32.24l-.04.04a1.45 1.45 0 1 1-2.06-2.06l.04-.04a1.2 1.2 0 0 0 .24-1.32 1.2 1.2 0 0 0-1.1-.73h-.11a1.45 1.45 0 1 1 0-2.9h.06a1.2 1.2 0 0 0 1.1-.78 1.2 1.2 0 0 0-.24-1.32l-.04-.04A1.45 1.45 0 1 1 4.23 1.87l.04.04a1.2 1.2 0 0 0 1.32.24h.06a1.2 1.2 0 0 0 .73-1.1v-.11a1.45 1.45 0 1 1 2.9 0v.06a1.2 1.2 0 0 0 .73 1.1 1.2 1.2 0 0 0 1.32-.24l.04-.04a1.45 1.45 0 1 1 2.06 2.06l-.04.04a1.2 1.2 0 0 0-.24 1.32v.06a1.2 1.2 0 0 0 1.1.73h.11a1.45 1.45 0 1 1 0 2.9h-.06a1.2 1.2 0 0 0-1.1.73z" />
          </svg>
        </button>
      </div>
    </div>
  )
}
