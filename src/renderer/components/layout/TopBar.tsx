import { useCallback, useEffect, useRef, useState } from 'react'
import { COLORS } from '../../lib/constants'
import { useWorktreeStore } from '../../stores/worktree-store'

const DRAG = { WebkitAppRegion: 'drag' } as React.CSSProperties
const NO_DRAG = { WebkitAppRegion: 'no-drag' } as React.CSSProperties

export function TopBar() {
  const worktree = useWorktreeStore((s) => s.getActive())
  const project = useWorktreeStore((s) =>
    worktree ? s.getProjectForWorktree(worktree.id) : undefined
  )

  if (!worktree || !project) return <TopBarEmpty />

  return (
    <div style={{
      display: 'flex',
      alignItems: 'center',
      height: '38px',
      minHeight: '38px',
      background: COLORS.surfaceContainerLow,
      borderBottom: `1px solid ${COLORS.outlineVariantFaint}`,
      padding: '0 16px 0 80px',
      gap: '6px',
      ...DRAG,
    }}>
      {/* Git icon */}
      <svg width="14" height="14" viewBox="0 0 16 16" fill={COLORS.textMuted} style={{ flexShrink: 0 }}>
        <path d="M15.698 7.287L8.712.302a1.03 1.03 0 00-1.457 0L5.632 1.924l1.84 1.84a1.223 1.223 0 011.548 1.56l1.773 1.774a1.224 1.224 0 11-.733.691L8.38 6.108v3.834a1.224 1.224 0 11-1.008-.036V6.016a1.224 1.224 0 01-.664-1.606L4.88 2.583.302 7.16a1.03 1.03 0 000 1.457l6.986 6.986a1.03 1.03 0 001.457 0l6.953-6.953a1.031 1.031 0 000-1.457" />
      </svg>

      {/* Worktree path breadcrumb */}
      <span style={{
        color: COLORS.onSurface,
        fontSize: '12px',
        fontFamily: "'Inter', sans-serif",
        fontWeight: 500,
      }}>
        {project.name}
      </span>

      <span style={{
        color: COLORS.textMuted,
        fontSize: '12px',
        fontFamily: "'Inter', sans-serif",
      }}>
        /
      </span>

      <span style={{
        color: COLORS.textSecondary,
        fontSize: '12px',
        fontFamily: "'Inter', sans-serif",
      }}>
        {worktree.name}
      </span>

      <span style={{
        color: COLORS.textMuted,
        fontSize: '11px',
        margin: '0 2px',
      }}>
        ›
      </span>

      <span style={{
        color: COLORS.textSecondary,
        fontSize: '11px',
        fontFamily: "'JetBrains Mono', monospace",
      }}>
        {worktree.branch}
      </span>

      <div style={{ flex: 1 }} />

      {/* Branch selector */}
      <BranchSelector worktree={worktree} />
    </div>
  )
}

function TopBarEmpty() {
  return (
    <div style={{
      height: '38px',
      minHeight: '38px',
      background: COLORS.surfaceContainerLow,
      borderBottom: `1px solid ${COLORS.outlineVariantFaint}`,
      padding: '0 16px 0 80px',
      ...DRAG,
    }} />
  )
}

// ── Branch Selector ──────────────────────────────────────

interface BranchInfo {
  name: string
  current: boolean
}

function BranchSelector({ worktree }: { worktree: import('@shared/types').Worktree }) {
  const [open, setOpen] = useState(false)
  const [branches, setBranches] = useState<BranchInfo[]>([])
  const [search, setSearch] = useState('')
  const [loading, setLoading] = useState(false)
  const updateBranch = useWorktreeStore((s) => s.updateWorktreeBranch)
  const containerRef = useRef<HTMLDivElement>(null)
  const searchRef = useRef<HTMLInputElement>(null)

  const fetchBranches = useCallback(async () => {
    setLoading(true)
    try {
      const result = await window.electronAPI.canopy.listBranches(worktree.worktreePath)
      setBranches(result)
    } catch (err) {
      console.error('Failed to list branches:', err)
    } finally {
      setLoading(false)
    }
  }, [worktree.worktreePath])

  const handleOpen = useCallback(() => {
    setOpen(true)
    setSearch('')
    fetchBranches()
  }, [fetchBranches])

  const handleClose = useCallback(() => {
    setOpen(false)
    setSearch('')
  }, [])

  const handleCheckout = useCallback(async (branch: string) => {
    if (branch === worktree.branch) {
      handleClose()
      return
    }

    try {
      await window.electronAPI.canopy.checkoutBranch(worktree.worktreePath, branch)
      updateBranch(worktree.id, branch)
    } catch (err) {
      console.error('Failed to checkout branch:', err)
    }
    handleClose()
  }, [worktree, updateBranch, handleClose])

  // Close on outside click
  useEffect(() => {
    if (!open) return
    const handler = (e: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        handleClose()
      }
    }
    document.addEventListener('mousedown', handler)
    return () => document.removeEventListener('mousedown', handler)
  }, [open, handleClose])

  // Focus search when opened
  useEffect(() => {
    if (open) {
      setTimeout(() => searchRef.current?.focus(), 50)
    }
  }, [open])

  // Close on Escape
  useEffect(() => {
    if (!open) return
    const handler = (e: KeyboardEvent) => {
      if (e.key === 'Escape') handleClose()
    }
    document.addEventListener('keydown', handler)
    return () => document.removeEventListener('keydown', handler)
  }, [open, handleClose])

  const filtered = branches.filter((b) =>
    b.name.toLowerCase().includes(search.toLowerCase())
  )

  return (
    <div ref={containerRef} style={{ position: 'relative' }}>
      {/* Trigger button */}
      <BranchButton
        branch={worktree.branch}
        onClick={open ? handleClose : handleOpen}
        active={open}
      />

      {/* Dropdown */}
      {open && (
        <div style={{
          position: 'absolute',
          top: 'calc(100% + 4px)',
          right: 0,
          width: '300px',
          background: COLORS.surfaceContainer,
          border: `1px solid ${COLORS.outlineVariantLight}`,
          borderRadius: '8px',
          boxShadow: '0 8px 32px rgba(0,0,0,0.5)',
          zIndex: 1000,
          overflow: 'hidden',
          animation: 'fadeIn 150ms ease-out',
          ...NO_DRAG,
        }}>
          {/* Search */}
          <div style={{
            padding: '8px',
            borderBottom: `1px solid ${COLORS.outlineVariantSubtle}`,
          }}>
            <div style={{
              display: 'flex',
              alignItems: 'center',
              gap: '8px',
              background: COLORS.surfaceContainerLow,
              borderRadius: '6px',
              padding: '0 10px',
              height: '32px',
            }}>
              <svg width="13" height="13" viewBox="0 0 16 16" fill="none" stroke={COLORS.textMuted} strokeWidth="1.5">
                <circle cx="7" cy="7" r="5.5" />
                <line x1="11" y1="11" x2="14.5" y2="14.5" />
              </svg>
              <input
                ref={searchRef}
                type="text"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder="Select target branch..."
                style={{
                  flex: 1,
                  background: 'transparent',
                  border: 'none',
                  outline: 'none',
                  color: COLORS.onSurface,
                  fontSize: '12px',
                  fontFamily: "'Inter', sans-serif",
                }}
              />
            </div>
          </div>

          {/* Branch list */}
          <div style={{
            maxHeight: '240px',
            overflow: 'auto',
            padding: '4px',
          }}>
            {loading ? (
              <div style={{
                padding: '16px',
                textAlign: 'center',
                color: COLORS.textMuted,
                fontSize: '12px',
                fontFamily: "'Inter', sans-serif",
              }}>
                Loading branches...
              </div>
            ) : filtered.length === 0 ? (
              <div style={{
                padding: '16px',
                textAlign: 'center',
                color: COLORS.textMuted,
                fontSize: '12px',
                fontFamily: "'Inter', sans-serif",
              }}>
                No branches found
              </div>
            ) : (
              filtered.map((branch) => (
                <BranchItem
                  key={branch.name}
                  branch={branch}
                  isActive={branch.name === worktree.branch}
                  onClick={() => handleCheckout(branch.name)}
                />
              ))
            )}
          </div>
        </div>
      )}
    </div>
  )
}

function BranchButton({ branch, onClick, active }: {
  branch: string
  onClick: () => void
  active: boolean
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
        gap: '6px',
        height: '26px',
        padding: '0 10px',
        background: active
          ? COLORS.surfaceContainerHigh
          : hovered
            ? COLORS.surfaceContainerHigh
            : COLORS.surfaceContainer,
        border: `1px solid ${active ? COLORS.outlineVariantMedium : COLORS.outlineVariantLight}`,
        borderRadius: '6px',
        color: COLORS.onSurface,
        cursor: 'pointer',
        transition: 'all 150ms ease-out',
        ...NO_DRAG,
      }}
    >
      {/* Branch icon */}
      <svg width="12" height="12" viewBox="0 0 16 16" fill="none" stroke={COLORS.primaryContainer} strokeWidth="1.5" strokeLinecap="round">
        <line x1="6" y1="3" x2="6" y2="10" />
        <circle cx="6" cy="12.5" r="1.5" />
        <circle cx="6" cy="1.5" r="1.5" />
        <circle cx="12" cy="4.5" r="1.5" />
        <path d="M6 6c0-2 2-3.5 6-1.5" />
      </svg>

      <span style={{
        fontSize: '11px',
        fontFamily: "'JetBrains Mono', monospace",
        fontWeight: 500,
        maxWidth: '140px',
        overflow: 'hidden',
        textOverflow: 'ellipsis',
        whiteSpace: 'nowrap',
      }}>
        {branch}
      </span>

      {/* Chevron */}
      <svg width="10" height="10" viewBox="0 0 10 10" fill="none" stroke={COLORS.textMuted} strokeWidth="1.5" strokeLinecap="round">
        <polyline points="2,3.5 5,6.5 8,3.5" />
      </svg>
    </button>
  )
}

function BranchItem({ branch, isActive, onClick }: {
  branch: BranchInfo
  isActive: boolean
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
        gap: '8px',
        width: '100%',
        padding: '6px 10px',
        background: hovered ? COLORS.surfaceContainerHigh : 'transparent',
        border: 'none',
        borderRadius: '4px',
        color: isActive ? COLORS.primaryContainer : COLORS.onSurface,
        cursor: 'pointer',
        transition: 'background 100ms ease-out',
        textAlign: 'left',
      }}
    >
      {/* Check mark for active branch */}
      <span style={{
        width: '14px',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        flexShrink: 0,
      }}>
        {isActive && (
          <svg width="12" height="12" viewBox="0 0 12 12" fill="none" stroke={COLORS.primaryContainer} strokeWidth="1.5" strokeLinecap="round">
            <polyline points="2,6 5,9 10,3" />
          </svg>
        )}
      </span>

      <span style={{
        fontSize: '12px',
        fontFamily: "'JetBrains Mono', monospace",
        overflow: 'hidden',
        textOverflow: 'ellipsis',
        whiteSpace: 'nowrap',
      }}>
        {branch.name}
      </span>
    </button>
  )
}
