import { useCallback, useState } from 'react'
import type { SplitNode } from '@shared/types'
import { SplitContainer } from '../terminal/SplitContainer'
import { useWorktreeStore } from '../../stores/worktree-store'
import { useTerminalStore } from '../../stores/terminal-store'
import { splitTabGroup, createTabGroup, updateRatio, findTabGroupContaining } from '../../lib/split-tree'
import { COLORS } from '../../lib/constants'

const DRAG = { WebkitAppRegion: 'drag' } as React.CSSProperties
const NO_DRAG = { WebkitAppRegion: 'no-drag' } as React.CSSProperties

interface MainAreaProps {
  onToggleFileExplorer?: () => void
  fileExplorerOpen?: boolean
}

export function MainArea({ onToggleFileExplorer, fileExplorerOpen }: MainAreaProps = {}) {
  const worktree = useWorktreeStore((s) => s.getActive())
  const updateSplitLayout = useWorktreeStore((s) => s.updateSplitLayout)
  const focusedTerminalId = useTerminalStore((s) => s.focusedTerminalId)

  const handleRatioChange = useCallback((path: number[], newRatio: number) => {
    if (!worktree) return
    const updated = updateRatio(worktree.splitLayout, path, newRatio)
    updateSplitLayout(worktree.id, updated)
  }, [worktree, updateSplitLayout])

  if (!worktree) {
    return (
      <div style={{
        flex: 1,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        background: COLORS.surface,
        ...DRAG,
      }}>
        <div style={{
          textAlign: 'center',
          animation: 'slideUp 400ms ease-out',
        }}>
          {/* Stylized terminal icon */}
          <div style={{
            width: '64px',
            height: '48px',
            margin: '0 auto 20px',
            borderRadius: '6px',
            background: COLORS.surfaceContainerLow,
            border: `1px solid ${COLORS.outlineVariantLight}`,
            display: 'flex',
            alignItems: 'flex-end',
            justifyContent: 'flex-start',
            padding: '8px 10px',
            position: 'relative',
          }}>
            <span style={{
              color: COLORS.primaryContainer,
              fontFamily: "'JetBrains Mono', monospace",
              fontSize: '11px',
              fontWeight: 500,
              opacity: 0.8,
            }}>
              _
            </span>
            <div style={{
              position: 'absolute',
              top: '10px',
              right: '12px',
              display: 'flex',
              gap: '3px',
            }}>
              <div style={{ width: '4px', height: '4px', borderRadius: '50%', background: COLORS.textMuted, opacity: 0.3 }} />
              <div style={{ width: '4px', height: '4px', borderRadius: '50%', background: COLORS.textMuted, opacity: 0.3 }} />
              <div style={{ width: '4px', height: '4px', borderRadius: '50%', background: COLORS.textMuted, opacity: 0.3 }} />
            </div>
          </div>

          <div style={{
            color: COLORS.onSurface,
            fontSize: '16px',
            fontFamily: "'Space Grotesk', sans-serif",
            fontWeight: 500,
            marginBottom: '8px',
            letterSpacing: '-0.01em',
          }}>
            No worktree selected
          </div>
          <div style={{
            color: COLORS.textSecondary,
            fontSize: '13px',
            fontFamily: "'Inter', sans-serif",
            lineHeight: 1.5,
          }}>
            Add a project to get started
          </div>

          <div style={{
            marginTop: '24px',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            gap: '6px',
          }}>
            <kbd style={kbdStyle}>+</kbd>
            <span style={{
              color: COLORS.textMuted,
              fontSize: '11px',
              fontFamily: "'Inter', sans-serif",
            }}>
              Add project from sidebar
            </span>
          </div>
        </div>
      </div>
    )
  }

  return (
    <div style={{
      flex: 1,
      display: 'flex',
      flexDirection: 'column',
      background: COLORS.surface,
      overflow: 'hidden',
    }}>
      <TerminalTabBar
        worktree={worktree}
        focusedTerminalId={focusedTerminalId}
        onToggleFileExplorer={onToggleFileExplorer}
        fileExplorerOpen={fileExplorerOpen}
      />

      <div style={{ flex: 1, padding: '2px', overflow: 'hidden' }}>
        <SplitContainer
          node={worktree.splitLayout}
          cwd={worktree.worktreePath}
          worktreeId={worktree.id}
          onRatioChange={handleRatioChange}
        />
      </div>
    </div>
  )
}

const kbdStyle: React.CSSProperties = {
  display: 'inline-flex',
  alignItems: 'center',
  justifyContent: 'center',
  padding: '2px 6px',
  fontSize: '10px',
  fontFamily: "'Inter', sans-serif",
  fontWeight: 500,
  color: COLORS.textSecondary,
  background: COLORS.surfaceContainerLow,
  borderRadius: '3px',
  border: `1px solid ${COLORS.outlineVariantMedium}`,
}

function TerminalTabBar({ worktree, focusedTerminalId, onToggleFileExplorer, fileExplorerOpen }: {
  worktree: import('@shared/types').Worktree
  focusedTerminalId: string | null
  onToggleFileExplorer?: () => void
  fileExplorerOpen?: boolean
}) {
  const updateSplitLayout = useWorktreeStore((s) => s.updateSplitLayout)

  const handleSplitH = () => {
    if (!focusedTerminalId) return
    const group = findTabGroupContaining(worktree.splitLayout, focusedTerminalId)
    if (!group) return
    const updated = splitTabGroup(worktree.splitLayout, group.id, 'horizontal', createTabGroup())
    updateSplitLayout(worktree.id, updated)
  }

  const handleSplitV = () => {
    if (!focusedTerminalId) return
    const group = findTabGroupContaining(worktree.splitLayout, focusedTerminalId)
    if (!group) return
    const updated = splitTabGroup(worktree.splitLayout, group.id, 'vertical', createTabGroup())
    updateSplitLayout(worktree.id, updated)
  }

  return (
    <div style={{
      display: 'flex',
      alignItems: 'center',
      height: '38px',
      background: COLORS.surfaceContainerLow,
      padding: '0 12px',
      gap: '8px',
      ...DRAG,
    }}>
      {/* Active indicator pill */}
      <div style={{
        width: '2px',
        height: '14px',
        borderRadius: '1px',
        background: worktree.color,
        boxShadow: `0 0 6px ${worktree.color}40`,
      }} />

      <span style={{
        color: COLORS.onSurface,
        fontSize: '12px',
        fontFamily: "'Inter', sans-serif",
        fontWeight: 500,
      }}>
        {worktree.name}
      </span>

      <span style={{
        color: COLORS.textMuted,
        fontSize: '11px',
        fontFamily: "'JetBrains Mono', monospace",
      }}>
        {worktree.branch}
      </span>

      <div style={{ flex: 1 }} />

      <SplitButton
        onClick={handleSplitH}
        title="Split Horizontal (⌘D)"
        icon={
          <svg width="14" height="14" viewBox="0 0 14 14" fill="none" stroke="currentColor" strokeWidth="1.2">
            <rect x="1" y="2" width="5" height="10" rx="1" />
            <rect x="8" y="2" width="5" height="10" rx="1" />
          </svg>
        }
      />
      <SplitButton
        onClick={handleSplitV}
        title="Split Vertical (⌘⇧D)"
        icon={
          <svg width="14" height="14" viewBox="0 0 14 14" fill="none" stroke="currentColor" strokeWidth="1.2">
            <rect x="2" y="1" width="10" height="5" rx="1" />
            <rect x="2" y="8" width="10" height="5" rx="1" />
          </svg>
        }
      />
      {onToggleFileExplorer && (
        <SplitButton
          onClick={onToggleFileExplorer}
          title="Toggle File Explorer"
          icon={
            <svg width="14" height="14" viewBox="0 0 14 14" fill="none" stroke="currentColor" strokeWidth="1.2">
              <rect x="1" y="1" width="12" height="12" rx="1" />
              <line x1="5" y1="1" x2="5" y2="13" />
              <line x1="5" y1="5" x2="13" y2="5" />
              <line x1="5" y1="9" x2="13" y2="9" />
            </svg>
          }
        />
      )}
    </div>
  )
}

function SplitButton({ onClick, title, icon }: {
  onClick: () => void
  title: string
  icon: React.ReactNode
}) {
  const [hovered, setHovered] = useState(false)

  return (
    <button
      onClick={onClick}
      title={title}
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
      style={{
        width: '28px',
        height: '24px',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        background: hovered ? COLORS.surfaceContainerHigh : 'transparent',
        border: 'none',
        borderRadius: '4px',
        color: hovered ? COLORS.primary : COLORS.textSecondary,
        cursor: 'pointer',
        transition: 'all 150ms ease-out',
        ...NO_DRAG,
      }}
    >
      {icon}
    </button>
  )
}
