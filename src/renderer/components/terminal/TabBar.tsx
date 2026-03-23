import { useState, useRef, useCallback } from 'react'
import type { Tab } from '@shared/types'
import { COLORS } from '../../lib/constants'

const NO_DRAG = { WebkitAppRegion: 'no-drag' } as React.CSSProperties

interface TabBarProps {
  tabs: Tab[]
  activeTabId: string
  groupId: string
  onSelectTab: (tabId: string) => void
  onCloseTab: (tabId: string) => void
  onAddTerminal: () => void
  onAddFile: () => void
  onRenameTab: (tabId: string, title: string) => void
  onReorderTabs: (tabs: Tab[]) => void
  onDropTabFromGroup?: (sourceGroupId: string, tabId: string, insertIndex: number) => void
}

export function TabBar({
  tabs,
  activeTabId,
  groupId,
  onSelectTab,
  onCloseTab,
  onAddTerminal,
  onAddFile,
  onRenameTab,
  onReorderTabs,
  onDropTabFromGroup,
}: TabBarProps) {
  const [editingTabId, setEditingTabId] = useState<string | null>(null)
  const [editValue, setEditValue] = useState('')
  const [contextMenu, setContextMenu] = useState<{ tabId: string; x: number; y: number } | null>(null)
  const [dragOverIndex, setDragOverIndex] = useState<number | null>(null)
  const dragTabId = useRef<string | null>(null)

  const startRename = useCallback((tabId: string, currentTitle: string) => {
    setEditingTabId(tabId)
    setEditValue(currentTitle)
    setContextMenu(null)
  }, [])

  const commitRename = useCallback(() => {
    if (editingTabId && editValue.trim()) {
      onRenameTab(editingTabId, editValue.trim())
    }
    setEditingTabId(null)
  }, [editingTabId, editValue, onRenameTab])

  const handleContextMenu = useCallback((e: React.MouseEvent, tabId: string) => {
    e.preventDefault()
    setContextMenu({ tabId, x: e.clientX, y: e.clientY })
  }, [])

  const handleDragStart = useCallback((e: React.DragEvent, tabId: string) => {
    dragTabId.current = tabId
    e.dataTransfer.setData('text/tab-id', tabId)
    e.dataTransfer.setData('text/source-group-id', groupId)
    e.dataTransfer.effectAllowed = 'move'
  }, [groupId])

  const handleDragOver = useCallback((e: React.DragEvent, index: number) => {
    e.preventDefault()
    e.dataTransfer.dropEffect = 'move'
    setDragOverIndex(index)
  }, [])

  const handleDrop = useCallback((e: React.DragEvent, dropIndex: number) => {
    e.preventDefault()
    setDragOverIndex(null)

    const droppedTabId = e.dataTransfer.getData('text/tab-id')
    const sourceGroupId = e.dataTransfer.getData('text/source-group-id')

    if (!droppedTabId) return

    if (sourceGroupId === groupId) {
      // Reorder within same group
      const currentIndex = tabs.findIndex(t => t.id === droppedTabId)
      if (currentIndex === -1 || currentIndex === dropIndex) return

      const newTabs = [...tabs]
      const [moved] = newTabs.splice(currentIndex, 1)
      const adjustedIndex = dropIndex > currentIndex ? dropIndex - 1 : dropIndex
      newTabs.splice(adjustedIndex, 0, moved)
      onReorderTabs(newTabs)
    } else {
      // Move from another group
      onDropTabFromGroup?.(sourceGroupId, droppedTabId, dropIndex)
    }
  }, [groupId, tabs, onReorderTabs, onDropTabFromGroup])

  const handleDragEnd = useCallback(() => {
    dragTabId.current = null
    setDragOverIndex(null)
  }, [])

  return (
    <>
      <div
        style={{
          display: 'flex',
          alignItems: 'center',
          height: '32px',
          background: COLORS.surfaceContainerLow,
          borderBottom: `1px solid ${COLORS.outlineVariantSubtle}`,
          overflow: 'hidden',
          ...NO_DRAG,
        }}
        onDragOver={(e) => {
          e.preventDefault()
          // Allow dropping at end of tab list
          if (dragOverIndex === null) setDragOverIndex(tabs.length)
        }}
        onDrop={(e) => handleDrop(e, tabs.length)}
        onDragLeave={() => setDragOverIndex(null)}
      >
        <div style={{ display: 'flex', flex: 1, overflow: 'hidden' }}>
          {tabs.map((tab, index) => (
            <TabItem
              key={tab.id}
              tab={tab}
              isActive={tab.id === activeTabId}
              isEditing={editingTabId === tab.id}
              editValue={editValue}
              isDragOver={dragOverIndex === index}
              onSelect={() => onSelectTab(tab.id)}
              onClose={(e) => {
                e.stopPropagation()
                onCloseTab(tab.id)
              }}
              onDoubleClick={() => startRename(tab.id, tab.title)}
              onContextMenu={(e) => handleContextMenu(e, tab.id)}
              onEditChange={setEditValue}
              onEditCommit={commitRename}
              onEditCancel={() => setEditingTabId(null)}
              onDragStart={(e) => handleDragStart(e, tab.id)}
              onDragOver={(e) => handleDragOver(e, index)}
              onDragEnd={handleDragEnd}
            />
          ))}
        </div>

        {/* Add tab button */}
        <AddTabButton onAddTerminal={onAddTerminal} onAddFile={onAddFile} />
      </div>

      {/* Context menu */}
      {contextMenu && (
        <ContextMenuOverlay
          x={contextMenu.x}
          y={contextMenu.y}
          tabId={contextMenu.tabId}
          tabTitle={tabs.find(t => t.id === contextMenu.tabId)?.title ?? ''}
          onRename={(tabId, title) => startRename(tabId, title)}
          onClose={(tabId) => {
            onCloseTab(tabId)
            setContextMenu(null)
          }}
          onDismiss={() => setContextMenu(null)}
        />
      )}
    </>
  )
}

// ── Tab Item ────────────────────────────────────

function TabItem({
  tab,
  isActive,
  isEditing,
  editValue,
  isDragOver,
  onSelect,
  onClose,
  onDoubleClick,
  onContextMenu,
  onEditChange,
  onEditCommit,
  onEditCancel,
  onDragStart,
  onDragOver,
  onDragEnd,
}: {
  tab: Tab
  isActive: boolean
  isEditing: boolean
  editValue: string
  isDragOver: boolean
  onSelect: () => void
  onClose: (e: React.MouseEvent) => void
  onDoubleClick: () => void
  onContextMenu: (e: React.MouseEvent) => void
  onEditChange: (val: string) => void
  onEditCommit: () => void
  onEditCancel: () => void
  onDragStart: (e: React.DragEvent) => void
  onDragOver: (e: React.DragEvent) => void
  onDragEnd: () => void
}) {
  const [hovered, setHovered] = useState(false)
  const inputRef = useRef<HTMLInputElement>(null)

  // Focus input when editing starts
  if (isEditing && inputRef.current) {
    requestAnimationFrame(() => {
      inputRef.current?.focus()
      inputRef.current?.select()
    })
  }

  const icon = tab.type === 'terminal' ? (
    <svg width="12" height="12" viewBox="0 0 12 12" fill="none" stroke="currentColor" strokeWidth="1.2">
      <polyline points="2,3 5,6 2,9" />
      <line x1="6" y1="9" x2="10" y2="9" />
    </svg>
  ) : (
    <svg width="12" height="12" viewBox="0 0 12 12" fill="none" stroke="currentColor" strokeWidth="1.2">
      <path d="M2,1 L7,1 L10,4 L10,11 L2,11 Z" />
      <polyline points="7,1 7,4 10,4" />
    </svg>
  )

  return (
    <div
      draggable
      onDragStart={onDragStart}
      onDragOver={onDragOver}
      onDragEnd={onDragEnd}
      onClick={onSelect}
      onDoubleClick={onDoubleClick}
      onContextMenu={onContextMenu}
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
      style={{
        display: 'flex',
        alignItems: 'center',
        gap: '6px',
        height: '100%',
        padding: '0 8px',
        cursor: 'pointer',
        background: isActive
          ? COLORS.surfaceContainer
          : hovered
            ? COLORS.surfaceContainerLow
            : 'transparent',
        borderBottom: isActive ? `2px solid ${COLORS.primaryContainer}` : '2px solid transparent',
        borderLeft: isDragOver ? `2px solid ${COLORS.primaryContainer}` : '2px solid transparent',
        color: isActive ? COLORS.onSurface : COLORS.textSecondary,
        transition: 'background 150ms, color 150ms',
        minWidth: 0,
        maxWidth: '200px',
        flexShrink: 0,
      }}
    >
      <span style={{ flexShrink: 0, display: 'flex' }}>{icon}</span>

      {isEditing ? (
        <input
          ref={inputRef}
          value={editValue}
          onChange={(e) => onEditChange(e.target.value)}
          onBlur={onEditCommit}
          onKeyDown={(e) => {
            if (e.key === 'Enter') onEditCommit()
            if (e.key === 'Escape') onEditCancel()
          }}
          style={{
            background: COLORS.surfaceDim,
            border: `1px solid ${COLORS.primaryContainer}`,
            borderRadius: '2px',
            color: COLORS.onSurface,
            fontSize: '11px',
            fontFamily: "'Inter', sans-serif",
            padding: '1px 4px',
            width: '100px',
            outline: 'none',
          }}
        />
      ) : (
        <span style={{
          fontSize: '11px',
          fontFamily: "'Inter', sans-serif",
          fontWeight: isActive ? 500 : 400,
          whiteSpace: 'nowrap',
          overflow: 'hidden',
          textOverflow: 'ellipsis',
        }}>
          {tab.title}
          {tab.isDirty && <span style={{ color: COLORS.primaryContainer, marginLeft: '2px' }}>*</span>}
        </span>
      )}

      {/* Close button */}
      <span
        onClick={onClose}
        style={{
          flexShrink: 0,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          width: '16px',
          height: '16px',
          borderRadius: '3px',
          opacity: hovered || isActive ? 1 : 0,
          color: COLORS.textMuted,
          transition: 'opacity 150ms',
        }}
        onMouseEnter={(e) => { (e.target as HTMLElement).style.background = COLORS.surfaceContainerHigh }}
        onMouseLeave={(e) => { (e.target as HTMLElement).style.background = 'transparent' }}
      >
        <svg width="8" height="8" viewBox="0 0 8 8" fill="none" stroke="currentColor" strokeWidth="1.5">
          <line x1="1" y1="1" x2="7" y2="7" />
          <line x1="7" y1="1" x2="1" y2="7" />
        </svg>
      </span>
    </div>
  )
}

// ── Add Tab Button ──────────────────────────────

function AddTabButton({ onAddTerminal, onAddFile }: { onAddTerminal: () => void; onAddFile: () => void }) {
  const [hovered, setHovered] = useState(false)
  const [showMenu, setShowMenu] = useState(false)

  return (
    <div style={{ position: 'relative', flexShrink: 0 }}>
      <button
        onClick={() => setShowMenu(!showMenu)}
        title="New Tab"
        onMouseEnter={() => setHovered(true)}
        onMouseLeave={() => setHovered(false)}
        style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          width: '28px',
          height: '24px',
          margin: '0 4px',
          background: hovered ? COLORS.surfaceContainerHigh : 'transparent',
          border: 'none',
          borderRadius: '4px',
          color: hovered ? COLORS.primary : COLORS.textMuted,
          cursor: 'pointer',
          flexShrink: 0,
          transition: 'all 150ms',
        }}
      >
        <svg width="12" height="12" viewBox="0 0 12 12" fill="none" stroke="currentColor" strokeWidth="1.5">
          <line x1="6" y1="2" x2="6" y2="10" />
          <line x1="2" y1="6" x2="10" y2="6" />
        </svg>
      </button>
      {showMenu && (
        <>
          <div onClick={() => setShowMenu(false)} style={{ position: 'fixed', inset: 0, zIndex: 999 }} />
          <div style={{
            position: 'absolute',
            top: '100%',
            right: 0,
            zIndex: 1000,
            background: COLORS.surfaceContainerHigh,
            borderRadius: '6px',
            border: `1px solid ${COLORS.outlineVariant}40`,
            boxShadow: '0 4px 16px rgba(0,0,0,0.4)',
            padding: '4px 0',
            minWidth: '140px',
          }}>
            <AddTabMenuItem label="Terminal" onClick={() => { onAddTerminal(); setShowMenu(false) }} />
            <AddTabMenuItem label="New File" onClick={() => { onAddFile(); setShowMenu(false) }} />
          </div>
        </>
      )}
    </div>
  )
}

function AddTabMenuItem({ label, onClick }: { label: string; onClick: () => void }) {
  const [hovered, setHovered] = useState(false)
  return (
    <div
      onClick={onClick}
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
      style={{
        padding: '6px 12px',
        cursor: 'pointer',
        background: hovered ? COLORS.surfaceContainerHighest : 'transparent',
        color: COLORS.onSurface,
        fontSize: '12px',
        fontFamily: "'Inter', sans-serif",
        transition: 'background 100ms',
      }}
    >
      {label}
    </div>
  )
}

// ── Context Menu ────────────────────────────────

function ContextMenuOverlay({
  x,
  y,
  tabId,
  tabTitle,
  onRename,
  onClose,
  onDismiss,
}: {
  x: number
  y: number
  tabId: string
  tabTitle: string
  onRename: (tabId: string, title: string) => void
  onClose: (tabId: string) => void
  onDismiss: () => void
}) {
  return (
    <>
      {/* Backdrop */}
      <div
        onClick={onDismiss}
        onContextMenu={(e) => { e.preventDefault(); onDismiss() }}
        style={{
          position: 'fixed',
          inset: 0,
          zIndex: 999,
        }}
      />
      {/* Menu */}
      <div style={{
        position: 'fixed',
        left: x,
        top: y,
        zIndex: 1000,
        background: COLORS.surfaceContainerHigh,
        borderRadius: '6px',
        border: `1px solid ${COLORS.outlineVariantMedium}`,
        boxShadow: '0 4px 16px var(--shadow-color)',
        padding: '4px 0',
        minWidth: '140px',
      }}>
        <ContextMenuItem
          label="Rename"
          shortcut="double-click"
          onClick={() => onRename(tabId, tabTitle)}
        />
        <ContextMenuItem
          label="Close"
          onClick={() => onClose(tabId)}
        />
      </div>
    </>
  )
}

function ContextMenuItem({ label, shortcut, onClick }: {
  label: string
  shortcut?: string
  onClick: () => void
}) {
  const [hovered, setHovered] = useState(false)

  return (
    <div
      onClick={onClick}
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
      style={{
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        padding: '6px 12px',
        cursor: 'pointer',
        background: hovered ? COLORS.surfaceContainerHighest : 'transparent',
        color: COLORS.onSurface,
        fontSize: '12px',
        fontFamily: "'Inter', sans-serif",
        transition: 'background 100ms',
      }}
    >
      <span>{label}</span>
      {shortcut && (
        <span style={{ color: COLORS.textMuted, fontSize: '10px', marginLeft: '16px' }}>
          {shortcut}
        </span>
      )}
    </div>
  )
}
