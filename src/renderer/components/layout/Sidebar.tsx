import { useState } from 'react'
import { WorktreeList } from '../workspace/WorktreeList'
import { useWorktreeStore } from '../../stores/worktree-store'
import { COLORS } from '../../lib/constants'

const DRAG = { WebkitAppRegion: 'drag' } as React.CSSProperties
const NO_DRAG = { WebkitAppRegion: 'no-drag' } as React.CSSProperties

interface SidebarProps {
  width: number
}

export function Sidebar({ width }: SidebarProps) {
  const addProject = useWorktreeStore((s) => s.addProject)
  const saveConfig = useWorktreeStore((s) => s.saveConfig)
  const [addHovered, setAddHovered] = useState(false)

  const handleAddProject = async () => {
    const path = await window.electronAPI?.canopy?.openDirectoryDialog()
    if (path) {
      addProject(path)
      saveConfig()
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
            boxShadow: `0 0 8px ${COLORS.primaryContainer}60`,
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

      {/* Bottom: add project + version */}
      <div style={{
        padding: '8px 20px 12px',
        borderTop: `1px solid ${COLORS.outlineVariant}20`,
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
      </div>
    </div>
  )
}
