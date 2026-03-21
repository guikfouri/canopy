import { useState, useEffect, useCallback, useRef } from 'react'
import { COLORS } from '../../lib/constants'
import { useWorktreeStore } from '../../stores/worktree-store'

type ChangeFilter = 'all' | 'uncommitted'

interface FileChange {
  path: string
  status: string
  staged: boolean
}

export function ChangesPanel() {
  const worktree = useWorktreeStore((s) => s.getActive())
  const [changes, setChanges] = useState<FileChange[]>([])
  const [filter, setFilter] = useState<ChangeFilter>('all')
  const [dropdownOpen, setDropdownOpen] = useState(false)
  const [loading, setLoading] = useState(false)
  const dropdownRef = useRef<HTMLDivElement>(null)

  const fetchStatus = useCallback(async () => {
    if (!worktree) return
    setLoading(true)
    try {
      const result = await window.electronAPI?.canopy?.gitStatus(worktree.worktreePath)
      setChanges(result || [])
    } catch {
      setChanges([])
    }
    setLoading(false)
  }, [worktree?.worktreePath])

  useEffect(() => {
    fetchStatus()
  }, [fetchStatus])

  // Close dropdown on outside click
  useEffect(() => {
    if (!dropdownOpen) return
    const handler = (e: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target as Node)) {
        setDropdownOpen(false)
      }
    }
    document.addEventListener('mousedown', handler)
    return () => document.removeEventListener('mousedown', handler)
  }, [dropdownOpen])

  const filtered = filter === 'uncommitted'
    ? changes.filter((c) => !c.staged)
    : changes

  const statusColor = (status: string) => {
    switch (status) {
      case 'added':
      case 'untracked': return COLORS.success
      case 'modified': return COLORS.primary
      case 'deleted': return COLORS.error
      case 'renamed': return '#22D3EE'
      default: return COLORS.textSecondary
    }
  }

  const statusLabel = (status: string) => {
    switch (status) {
      case 'added': return 'A'
      case 'untracked': return 'U'
      case 'modified': return 'M'
      case 'deleted': return 'D'
      case 'renamed': return 'R'
      default: return '?'
    }
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', height: '100%' }}>
      {/* Filter bar */}
      <div style={{ position: 'relative', padding: '8px 12px' }} ref={dropdownRef}>
        <button
          onClick={() => setDropdownOpen(!dropdownOpen)}
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: '4px',
            background: 'transparent',
            border: 'none',
            color: COLORS.textSecondary,
            fontSize: '11px',
            fontFamily: "'Inter', sans-serif",
            cursor: 'pointer',
            padding: '4px 6px',
            borderRadius: '4px',
            transition: 'background 100ms ease-out',
          }}
          onMouseEnter={(e) => e.currentTarget.style.background = COLORS.surfaceContainerHigh}
          onMouseLeave={(e) => e.currentTarget.style.background = 'transparent'}
        >
          <span>{filter === 'all' ? 'All changes' : 'Uncommitted changes'}</span>
          <svg width="10" height="10" viewBox="0 0 10 10" fill="none" stroke="currentColor" strokeWidth="1.5">
            <path d="M2.5 4L5 6.5L7.5 4" />
          </svg>
        </button>

        {/* Dropdown */}
        {dropdownOpen && (
          <div style={{
            position: 'absolute',
            top: '100%',
            left: '12px',
            zIndex: 100,
            background: COLORS.surfaceContainerHighest,
            borderRadius: '6px',
            padding: '4px',
            minWidth: '180px',
            boxShadow: '0 4px 16px rgba(0,0,0,0.4)',
            border: `1px solid ${COLORS.outlineVariant}30`,
            animation: 'fadeIn 100ms ease-out',
          }}>
            <DropdownItem
              label="All changes"
              selected={filter === 'all'}
              onClick={() => { setFilter('all'); setDropdownOpen(false) }}
            />
            <DropdownItem
              label="Uncommitted changes"
              selected={filter === 'uncommitted'}
              shortcut="⌘U"
              onClick={() => { setFilter('uncommitted'); setDropdownOpen(false) }}
            />
          </div>
        )}
      </div>

      {/* Content */}
      <div style={{ flex: 1, overflow: 'auto' }}>
        {loading ? (
          <div style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            height: '100%',
            color: COLORS.textMuted,
            fontSize: '11px',
            fontFamily: "'Inter', sans-serif",
          }}>
            Loading...
          </div>
        ) : filtered.length === 0 ? (
          <EmptyState />
        ) : (
          <div style={{ padding: '0 4px' }}>
            {filtered.map((change) => (
              <ChangeItem
                key={change.path}
                change={change}
                statusColor={statusColor(change.status)}
                statusLabel={statusLabel(change.status)}
              />
            ))}
          </div>
        )}
      </div>
    </div>
  )
}

function EmptyState() {
  return (
    <div style={{
      display: 'flex',
      flexDirection: 'column',
      alignItems: 'center',
      justifyContent: 'center',
      height: '100%',
      padding: '24px',
      gap: '12px',
    }}>
      {/* Git merge icon */}
      <svg width="40" height="40" viewBox="0 0 40 40" fill="none" stroke={COLORS.textMuted} strokeWidth="1.5" opacity={0.5}>
        <circle cx="12" cy="10" r="3" />
        <circle cx="12" cy="30" r="3" />
        <circle cx="28" cy="22" r="3" />
        <path d="M12 13L12 27" />
        <path d="M12 16C12 16 12 22 28 19" />
      </svg>
      <span style={{
        color: COLORS.onSurface,
        fontSize: '13px',
        fontFamily: "'Inter', sans-serif",
        fontWeight: 500,
      }}>
        No file changes yet
      </span>
      <span style={{
        color: COLORS.textMuted,
        fontSize: '12px',
        fontFamily: "'Inter', sans-serif",
      }}>
        Review code changes here.
      </span>
    </div>
  )
}

function ChangeItem({ change, statusColor, statusLabel }: {
  change: FileChange
  statusColor: string
  statusLabel: string
}) {
  const [hovered, setHovered] = useState(false)
  const fileName = change.path.split('/').pop() || change.path
  const dirPath = change.path.includes('/') ? change.path.slice(0, change.path.lastIndexOf('/')) : ''

  return (
    <div
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
      style={{
        display: 'flex',
        alignItems: 'center',
        padding: '4px 8px',
        borderRadius: '4px',
        cursor: 'pointer',
        background: hovered ? COLORS.surfaceContainerHigh : 'transparent',
        transition: 'background 100ms ease-out',
        gap: '8px',
      }}
    >
      <span style={{
        color: statusColor,
        fontSize: '10px',
        fontFamily: "'JetBrains Mono', monospace",
        fontWeight: 600,
        width: '14px',
        textAlign: 'center',
        flexShrink: 0,
      }}>
        {statusLabel}
      </span>
      <span style={{
        color: COLORS.onSurface,
        fontSize: '12px',
        fontFamily: "'Inter', sans-serif",
        whiteSpace: 'nowrap',
        overflow: 'hidden',
        textOverflow: 'ellipsis',
        flex: 1,
      }}>
        {fileName}
      </span>
      {dirPath && (
        <span style={{
          color: COLORS.textMuted,
          fontSize: '10px',
          fontFamily: "'Inter', sans-serif",
          whiteSpace: 'nowrap',
          overflow: 'hidden',
          textOverflow: 'ellipsis',
          maxWidth: '80px',
          flexShrink: 0,
        }}>
          {dirPath}
        </span>
      )}
    </div>
  )
}

function DropdownItem({ label, selected, shortcut, onClick }: {
  label: string
  selected: boolean
  shortcut?: string
  onClick: () => void
}) {
  const [hovered, setHovered] = useState(false)

  return (
    <button
      onClick={onClick}
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
      style={{
        display: 'flex',
        alignItems: 'center',
        width: '100%',
        padding: '6px 8px',
        background: hovered ? COLORS.surfaceContainerHigh : 'transparent',
        border: 'none',
        borderRadius: '4px',
        cursor: 'pointer',
        gap: '8px',
        transition: 'background 100ms ease-out',
      }}
    >
      <span style={{
        color: COLORS.onSurface,
        fontSize: '12px',
        fontFamily: "'Inter', sans-serif",
        flex: 1,
        textAlign: 'left',
      }}>
        {label}
      </span>
      {selected && (
        <svg width="14" height="14" viewBox="0 0 14 14" fill="none" stroke={COLORS.onSurface} strokeWidth="1.5">
          <path d="M3 7L6 10L11 4" />
        </svg>
      )}
      {shortcut && (
        <span style={{
          color: COLORS.textMuted,
          fontSize: '10px',
          fontFamily: "'JetBrains Mono', monospace",
        }}>
          {shortcut}
        </span>
      )}
    </button>
  )
}
