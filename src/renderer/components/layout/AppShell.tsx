import { useState } from 'react'
import { Sidebar } from './Sidebar'
import { TopBar } from './TopBar'
import { MainArea } from './MainArea'
import { FileExplorer } from '../file-explorer/FileExplorer'
import { ChangesPanel } from '../file-explorer/ChangesPanel'
import { ChecksPanel } from '../file-explorer/ChecksPanel'
import { COLORS } from '../../lib/constants'
import { useWorktreeStore } from '../../stores/worktree-store'

type RightPanelTab = 'files' | 'changes' | 'checks'

export function AppShell() {
  const [fileExplorerOpen, setFileExplorerOpen] = useState(true)
  const [fileExplorerWidth, setFileExplorerWidth] = useState(280)
  const worktree = useWorktreeStore((s) => s.getActive())

  return (
    <div style={{
      display: 'flex',
      flexDirection: 'column',
      width: '100vw',
      height: '100dvh',
      background: COLORS.surface,
      overflow: 'hidden',
    }}>
      <TopBar />
      <div style={{
        display: 'flex',
        flex: 1,
        overflow: 'hidden',
      }}>
        <Sidebar width={240} />
        <MainArea
          onToggleFileExplorer={() => setFileExplorerOpen(!fileExplorerOpen)}
          fileExplorerOpen={fileExplorerOpen}
        />
        {fileExplorerOpen && worktree && (
          <FileExplorerPanel width={fileExplorerWidth} />
        )}
      </div>
    </div>
  )
}

function FileExplorerPanel({ width }: { width: number }) {
  const [activeTab, setActiveTab] = useState<RightPanelTab>('files')
  const [changesCount] = useState(0) // Will be reactive later

  return (
    <div style={{
      width: `${width}px`,
      minWidth: `${width}px`,
      height: '100%',
      background: COLORS.surfaceContainer,
      display: 'flex',
      flexDirection: 'column',
      overflow: 'hidden',
      borderLeft: `1px solid ${COLORS.outlineVariantSubtle}`,
    }}>
      {/* Tab bar */}
      <div style={{
        display: 'flex',
        alignItems: 'center',
        marginTop: '28px',
        padding: '0 8px',
        gap: '0',
        borderBottom: `1px solid ${COLORS.outlineVariantSubtle}`,
      }}>
        <PanelTab
          label="All files"
          active={activeTab === 'files'}
          onClick={() => setActiveTab('files')}
        />
        <PanelTab
          label="Changes"
          badge={changesCount > 0 ? String(changesCount) : '0'}
          active={activeTab === 'changes'}
          onClick={() => setActiveTab('changes')}
        />
        <PanelTab
          label="Checks"
          active={activeTab === 'checks'}
          onClick={() => setActiveTab('checks')}
        />

        <div style={{ flex: 1 }} />

        <MoreButton />
      </div>

      {/* Panel content */}
      <div style={{ flex: 1, overflow: 'auto' }}>
        {activeTab === 'files' && <FileExplorer />}
        {activeTab === 'changes' && <ChangesPanel />}
        {activeTab === 'checks' && <ChecksPanel />}
      </div>
    </div>
  )
}

function PanelTab({ label, badge, active, onClick }: {
  label: string
  badge?: string
  active: boolean
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
        gap: '5px',
        padding: '8px 10px',
        background: 'transparent',
        border: 'none',
        borderBottom: `2px solid ${active ? COLORS.onSurface : 'transparent'}`,
        color: active ? COLORS.onSurface : hovered ? COLORS.textSecondary : COLORS.textMuted,
        fontSize: '12px',
        fontFamily: "'Inter', sans-serif",
        fontWeight: active ? 500 : 400,
        cursor: 'pointer',
        transition: 'all 150ms ease-out',
        marginBottom: '-1px',
      }}
    >
      {label}
      {badge !== undefined && (
        <span style={{
          color: active ? COLORS.textSecondary : COLORS.textMuted,
          fontSize: '11px',
        }}>
          {badge}
        </span>
      )}
    </button>
  )
}

function MoreButton() {
  const [hovered, setHovered] = useState(false)

  return (
    <button
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
      style={{
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        width: '24px',
        height: '24px',
        background: hovered ? COLORS.surfaceContainerHigh : 'transparent',
        border: 'none',
        borderRadius: '4px',
        color: hovered ? COLORS.onSurface : COLORS.textMuted,
        cursor: 'pointer',
        transition: 'all 100ms ease-out',
        fontSize: '14px',
        marginBottom: '2px',
      }}
    >
      ⋮
    </button>
  )
}
