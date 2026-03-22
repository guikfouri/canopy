import { useState, useRef, useEffect } from 'react'
import { useWorktreeStore } from '../../stores/worktree-store'
import { COLORS } from '../../lib/constants'
import type { Project, Worktree } from '@shared/types'

export function WorktreeList() {
  const projects = useWorktreeStore((s) => s.projects)
  const worktrees = useWorktreeStore((s) => s.worktrees)
  const activeId = useWorktreeStore((s) => s.activeWorktreeId)
  const setActive = useWorktreeStore((s) => s.setActive)
  const addWorktree = useWorktreeStore((s) => s.addWorktree)
  const removeWorktree = useWorktreeStore((s) => s.removeWorktree)

  // Delete confirmation state
  const [deleteTarget, setDeleteTarget] = useState<Worktree | null>(null)

  if (projects.length === 0) {
    return (
      <div style={{
        padding: '24px 12px',
        textAlign: 'center',
        animation: 'fadeIn 300ms ease-out',
      }}>
        <div style={{
          width: '40px',
          height: '32px',
          margin: '0 auto 12px',
          borderRadius: '5px',
          background: COLORS.surfaceContainerHigh,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
        }}>
          <svg width="16" height="16" viewBox="0 0 16 16" fill="none" stroke={COLORS.textMuted} strokeWidth="1.2" strokeLinecap="round">
            <path d="M2 4h12M2 8h8M2 12h10" />
          </svg>
        </div>
        <div style={{
          color: COLORS.textSecondary,
          fontSize: '12px',
          fontFamily: "'Inter', sans-serif",
          lineHeight: 1.5,
        }}>
          No projects yet
        </div>
        <div style={{
          color: COLORS.textMuted,
          fontSize: '11px',
          fontFamily: "'Inter', sans-serif",
          marginTop: '4px',
        }}>
          Click + to add one
        </div>
      </div>
    )
  }

  const handleCreateWorktree = async (project: Project, name: string) => {
    const safeName = name.trim().replace(/\s+/g, '-').toLowerCase()
    if (!safeName) return
    const branchName = safeName
    try {
      const info = await window.electronAPI.canopy.createWorktree({
        repoPath: project.path,
        branch: branchName,
        name: safeName,
      })
      addWorktree(project.id, name.trim(), info.path, branchName, false)
    } catch (err) {
      console.error('Failed to create worktree:', err)
    }
  }

  const handleDeleteWorktree = async (worktree: Worktree, deleteBranch: boolean) => {
    try {
      await window.electronAPI.canopy.removeWorktree(
        worktree.worktreePath,
        deleteBranch ? worktree.branch : undefined,
      )
      removeWorktree(worktree.id)
    } catch (err) {
      console.error('Failed to remove worktree:', err)
    }
    setDeleteTarget(null)
  }

  return (
    <>
      <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
        {projects.map((project) => {
          const projectWorktrees = worktrees.filter(w => w.projectId === project.id)

          return (
            <ProjectGroup
              key={project.id}
              project={project}
              worktrees={projectWorktrees}
              activeId={activeId}
              onSelect={setActive}
              onCreateWorktree={(name) => handleCreateWorktree(project, name)}
              onDeleteWorktree={setDeleteTarget}
            />
          )
        })}
      </div>

      {/* Delete confirmation dialog */}
      {deleteTarget && (
        <DeleteDialog
          worktree={deleteTarget}
          onConfirm={(deleteBranch) => handleDeleteWorktree(deleteTarget, deleteBranch)}
          onCancel={() => setDeleteTarget(null)}
        />
      )}
    </>
  )
}

function ProjectGroup({ project, worktrees, activeId, onSelect, onCreateWorktree, onDeleteWorktree }: {
  project: Project
  worktrees: Worktree[]
  activeId: string | null
  onSelect: (id: string) => void
  onCreateWorktree: (name: string) => void
  onDeleteWorktree: (wt: Worktree) => void
}) {
  const [collapsed, setCollapsed] = useState(false)
  const [headerHovered, setHeaderHovered] = useState(false)
  const [showNameInput, setShowNameInput] = useState(false)

  return (
    <div style={{ animation: 'slideDown 200ms ease-out' }}>
      {/* Project header */}
      <div
        onMouseEnter={() => setHeaderHovered(true)}
        onMouseLeave={() => setHeaderHovered(false)}
        style={{
          display: 'flex',
          alignItems: 'center',
          padding: '6px 8px',
          gap: '6px',
          cursor: 'pointer',
          borderRadius: '4px',
          background: headerHovered ? COLORS.surfaceContainerHigh : 'transparent',
          transition: 'background 150ms ease-out',
        }}
      >
        <button
          onClick={() => setCollapsed(!collapsed)}
          style={{
            background: 'none',
            border: 'none',
            color: COLORS.textMuted,
            fontSize: '8px',
            cursor: 'pointer',
            padding: '0 2px',
            transform: collapsed ? 'rotate(-90deg)' : 'rotate(0deg)',
            transition: 'transform 150ms ease-out',
            display: 'flex',
            alignItems: 'center',
          }}
        >
          <svg width="8" height="8" viewBox="0 0 8 8" fill="currentColor">
            <path d="M2 1.5L6 4L2 6.5V1.5Z" />
          </svg>
        </button>

        <div style={{
          width: '8px',
          height: '8px',
          borderRadius: '2px',
          background: project.color,
          boxShadow: `0 0 6px ${project.color}30`,
          flexShrink: 0,
        }} />

        <span
          onClick={() => setCollapsed(!collapsed)}
          style={{
            flex: 1,
            color: COLORS.onSurface,
            fontSize: '13px',
            fontFamily: "'Inter', sans-serif",
            fontWeight: 500,
            whiteSpace: 'nowrap',
            overflow: 'hidden',
            textOverflow: 'ellipsis',
          }}
        >
          {project.name}
        </span>

        <span style={{
          color: COLORS.textMuted,
          fontSize: '10px',
          fontFamily: "'JetBrains Mono', monospace",
          marginRight: '2px',
        }}>
          {worktrees.length}
        </span>

        <button
          onClick={(e) => { e.stopPropagation(); setShowNameInput(true); setCollapsed(false) }}
          title="New worktree"
          style={{
            width: '18px',
            height: '18px',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            background: 'none',
            border: 'none',
            color: COLORS.textMuted,
            cursor: 'pointer',
            borderRadius: '3px',
            transition: 'color 150ms ease-out',
            opacity: headerHovered ? 1 : 0,
          }}
          onMouseEnter={(e) => { e.currentTarget.style.color = COLORS.primary }}
          onMouseLeave={(e) => { e.currentTarget.style.color = COLORS.textMuted }}
        >
          <svg width="12" height="12" viewBox="0 0 14 14" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round">
            <path d="M7 2v10M2 7h10" />
          </svg>
        </button>
      </div>

      {/* Worktree list under project */}
      {!collapsed && (
        <div style={{ paddingLeft: '12px' }}>
          {worktrees.map((wt, index) => (
            <WorktreeItem
              key={wt.id}
              worktree={wt}
              isActive={wt.id === activeId}
              index={index}
              onSelect={() => onSelect(wt.id)}
              onDelete={() => onDeleteWorktree(wt)}
            />
          ))}

          {/* Inline name input for new worktree */}
          {showNameInput && (
            <NewWorktreeInput
              onSubmit={(name) => { onCreateWorktree(name); setShowNameInput(false) }}
              onCancel={() => setShowNameInput(false)}
            />
          )}
        </div>
      )}
    </div>
  )
}

function NewWorktreeInput({ onSubmit, onCancel }: {
  onSubmit: (name: string) => void
  onCancel: () => void
}) {
  const inputRef = useRef<HTMLInputElement>(null)
  const [value, setValue] = useState('')

  useEffect(() => {
    inputRef.current?.focus()
  }, [])

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && value.trim()) {
      onSubmit(value)
    } else if (e.key === 'Escape') {
      onCancel()
    }
  }

  return (
    <div style={{
      display: 'flex',
      alignItems: 'center',
      gap: '8px',
      padding: '4px 10px',
      animation: 'slideDown 150ms ease-out',
    }}>
      <div style={{
        width: '6px',
        height: '6px',
        borderRadius: '50%',
        background: COLORS.textMuted,
        flexShrink: 0,
      }} />
      <input
        ref={inputRef}
        value={value}
        onChange={(e) => setValue(e.target.value)}
        onKeyDown={handleKeyDown}
        onBlur={() => { if (!value.trim()) onCancel() }}
        placeholder="Worktree name..."
        style={{
          flex: 1,
          background: COLORS.surfaceContainerLowest,
          border: `1px solid ${COLORS.outlineVariantStrong}`,
          borderRadius: '4px',
          color: COLORS.onSurface,
          fontSize: '12px',
          fontFamily: "'Inter', sans-serif",
          padding: '4px 8px',
          outline: 'none',
          minWidth: 0,
        }}
        onFocus={(e) => { e.currentTarget.style.borderColor = COLORS.primaryContainer }}
        onBlurCapture={(e) => { e.currentTarget.style.borderColor = COLORS.outlineVariantStrong }}
      />
    </div>
  )
}

function WorktreeItem({ worktree, isActive, index, onSelect, onDelete }: {
  worktree: Worktree
  isActive: boolean
  index: number
  onSelect: () => void
  onDelete: () => void
}) {
  const [hovered, setHovered] = useState(false)

  const bg = isActive
    ? COLORS.surfaceContainerHigh
    : hovered
      ? COLORS.surfaceContainerHighest
      : 'transparent'

  return (
    <button
      onClick={onSelect}
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
      style={{
        display: 'flex',
        alignItems: 'center',
        gap: '8px',
        padding: '6px 10px',
        background: bg,
        border: 'none',
        borderRadius: '6px',
        cursor: 'pointer',
        textAlign: 'left',
        width: '100%',
        transition: 'background 150ms ease-out',
        position: 'relative',
        animation: `slideDown ${200 + index * 40}ms ease-out`,
      }}
    >
      {/* Active indicator: vertical amber pill */}
      {isActive && (
        <div style={{
          position: 'absolute',
          left: '0px',
          top: '50%',
          transform: 'translateY(-50%)',
          width: '2px',
          height: '14px',
          borderRadius: '1px',
          background: COLORS.primaryContainer,
          boxShadow: `0 0 6px ${COLORS.primaryContainerGlow}`,
        }} />
      )}

      {/* Status dot with ambient glow */}
      <div style={{
        width: '6px',
        height: '6px',
        borderRadius: '50%',
        background: isActive ? COLORS.success : COLORS.secondary,
        boxShadow: isActive
          ? `0 0 8px ${COLORS.successGlow}, 0 0 2px ${COLORS.successGlowStrong}`
          : `0 0 4px ${COLORS.secondaryGlow}`,
        flexShrink: 0,
        transition: 'box-shadow 200ms ease-out',
      }} />

      <div style={{ minWidth: 0, flex: 1 }}>
        <div style={{
          color: isActive ? COLORS.onSurface : COLORS.onSurfaceVariant,
          fontSize: '13px',
          fontFamily: "'Inter', sans-serif",
          fontWeight: isActive ? 500 : 400,
          whiteSpace: 'nowrap',
          overflow: 'hidden',
          textOverflow: 'ellipsis',
          lineHeight: 1.3,
        }}>
          {worktree.name}
        </div>
        <div style={{
          color: COLORS.textMuted,
          fontSize: '10px',
          fontFamily: "'JetBrains Mono', monospace",
          whiteSpace: 'nowrap',
          overflow: 'hidden',
          textOverflow: 'ellipsis',
          lineHeight: 1.4,
          marginTop: '1px',
        }}>
          {worktree.branch}
        </div>
      </div>

      {/* Delete button — only on non-main worktrees */}
      {!worktree.isMain && hovered && (
        <button
          onClick={(e) => { e.stopPropagation(); onDelete() }}
          title="Remove worktree"
          style={{
            width: '18px',
            height: '18px',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            background: 'none',
            border: 'none',
            color: COLORS.textMuted,
            cursor: 'pointer',
            borderRadius: '3px',
            transition: 'color 150ms ease-out',
            flexShrink: 0,
          }}
          onMouseEnter={(e) => { e.currentTarget.style.color = COLORS.error }}
          onMouseLeave={(e) => { e.currentTarget.style.color = COLORS.textMuted }}
        >
          <svg width="12" height="12" viewBox="0 0 14 14" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round">
            <path d="M3 3l8 8M11 3l-8 8" />
          </svg>
        </button>
      )}

      {/* Keyboard shortcut hint */}
      {index < 9 && !hovered && (
        <span style={{
          color: COLORS.textMuted,
          fontSize: '9px',
          fontFamily: "'JetBrains Mono', monospace",
          opacity: isActive ? 0.6 : 0,
          transition: 'opacity 150ms ease-out',
          flexShrink: 0,
        }}>
          ⌘{index + 1}
        </span>
      )}
    </button>
  )
}

function DeleteDialog({ worktree, onConfirm, onCancel }: {
  worktree: Worktree
  onConfirm: (deleteBranch: boolean) => void
  onCancel: () => void
}) {
  const [hoveredBtn, setHoveredBtn] = useState<string | null>(null)

  // Close on Escape
  useEffect(() => {
    const handleKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onCancel()
    }
    window.addEventListener('keydown', handleKey)
    return () => window.removeEventListener('keydown', handleKey)
  }, [onCancel])

  const buttonStyle = (id: string, isDestructive: boolean): React.CSSProperties => ({
    padding: '6px 14px',
    borderRadius: '6px',
    border: 'none',
    fontSize: '12px',
    fontFamily: "'Inter', sans-serif",
    fontWeight: 500,
    cursor: 'pointer',
    transition: 'all 150ms ease-out',
    background: hoveredBtn === id
      ? (isDestructive ? COLORS.errorContainer : COLORS.surfaceContainerHighest)
      : COLORS.surfaceContainerHigh,
    color: isDestructive ? COLORS.error : COLORS.onSurface,
  })

  return (
    <div
      onClick={onCancel}
      style={{
        position: 'fixed',
        inset: 0,
        background: 'rgba(0,0,0,0.5)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        zIndex: 1000,
        animation: 'fadeIn 150ms ease-out',
      }}
    >
      <div
        onClick={(e) => e.stopPropagation()}
        style={{
          background: COLORS.surfaceContainer,
          borderRadius: '12px',
          padding: '20px 24px',
          maxWidth: '340px',
          width: '100%',
          boxShadow: '0 16px 48px rgba(0,0,0,0.4)',
          animation: 'slideDown 200ms ease-out',
        }}
      >
        <div style={{
          color: COLORS.onSurface,
          fontSize: '14px',
          fontFamily: "'Inter', sans-serif",
          fontWeight: 600,
          marginBottom: '8px',
        }}>
          Remove "{worktree.name}"?
        </div>

        <div style={{
          color: COLORS.textSecondary,
          fontSize: '12px',
          fontFamily: "'Inter', sans-serif",
          lineHeight: 1.5,
          marginBottom: '16px',
        }}>
          This will remove the worktree at<br />
          <span style={{
            fontFamily: "'JetBrains Mono', monospace",
            fontSize: '11px',
            color: COLORS.textMuted,
          }}>
            {worktree.worktreePath}
          </span>
        </div>

        <div style={{
          color: COLORS.textSecondary,
          fontSize: '12px',
          fontFamily: "'Inter', sans-serif",
          marginBottom: '16px',
        }}>
          Delete branch <span style={{
            fontFamily: "'JetBrains Mono', monospace",
            color: COLORS.primary,
          }}>{worktree.branch}</span> too?
        </div>

        <div style={{ display: 'flex', gap: '8px', justifyContent: 'flex-end' }}>
          <button
            onClick={onCancel}
            onMouseEnter={() => setHoveredBtn('cancel')}
            onMouseLeave={() => setHoveredBtn(null)}
            style={buttonStyle('cancel', false)}
          >
            Cancel
          </button>
          <button
            onClick={() => onConfirm(false)}
            onMouseEnter={() => setHoveredBtn('keep')}
            onMouseLeave={() => setHoveredBtn(null)}
            style={buttonStyle('keep', false)}
          >
            Keep branch
          </button>
          <button
            onClick={() => onConfirm(true)}
            onMouseEnter={() => setHoveredBtn('delete')}
            onMouseLeave={() => setHoveredBtn(null)}
            style={buttonStyle('delete', true)}
          >
            Delete branch
          </button>
        </div>
      </div>
    </div>
  )
}
