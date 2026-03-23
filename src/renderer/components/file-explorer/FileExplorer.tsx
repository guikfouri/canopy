import { useState, useEffect, useCallback } from 'react'
import { COLORS } from '../../lib/constants'
import { useWorktreeStore } from '../../stores/worktree-store'
import { useTerminalStore } from '../../stores/terminal-store'
import {
  createTab, addTabToGroup, setActiveTab,
  findTabGroupContaining, getAllTabGroups,
  updateTabProps, removeTabsByFilePath, findTabsByFilePath,
} from '../../lib/split-tree'
import { ContextMenu } from '../shared/ContextMenu'
import type { ContextMenuItem } from '../shared/ContextMenu'
import { InlineInput } from './InlineInput'

interface FileEntry {
  name: string
  path: string
  isDirectory: boolean
}

interface InlineInputState {
  parentPath: string
  type: 'file' | 'folder'
  depth: number
}

interface RenameState {
  path: string
  name: string
  isDirectory: boolean
  depth: number
}

interface ContextMenuState {
  x: number
  y: number
  entry: FileEntry
  depth: number
}

export function FileExplorer() {
  const worktree = useWorktreeStore((s) => s.getActive())

  if (!worktree) {
    return (
      <div style={{
        height: '100%',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        color: COLORS.textMuted,
        fontSize: '12px',
        fontFamily: "'Inter', sans-serif",
      }}>
        No worktree selected
      </div>
    )
  }

  const updateSplitLayout = useWorktreeStore((s) => s.updateSplitLayout)
  const focusedTerminalId = useTerminalStore((s) => s.focusedTerminalId)

  const handleOpenFile = useCallback((filePath: string, fileName: string) => {
    if (!worktree) return
    const layout = worktree.splitLayout

    let group = focusedTerminalId
      ? findTabGroupContaining(layout, focusedTerminalId)
      : undefined
    if (!group) {
      const groups = getAllTabGroups(layout)
      group = groups[0]
    }
    if (!group) return

    const existing = group.tabs.find(t => t.type === 'file' && t.filePath === filePath)
    if (existing) {
      updateSplitLayout(worktree.id, setActiveTab(layout, group.id, existing.id))
      return
    }

    const tab = createTab('file', fileName, { filePath })
    const updated = addTabToGroup(layout, group.id, tab)
    updateSplitLayout(worktree.id, updated)
  }, [worktree, focusedTerminalId, updateSplitLayout])

  const handleUpdateOpenTabs = useCallback((oldPath: string, newPath: string, newName: string) => {
    if (!worktree) return
    const layout = worktree.splitLayout
    const tabs = findTabsByFilePath(layout, oldPath)
    if (tabs.length === 0) return
    let updated = layout
    for (const { tabId } of tabs) {
      updated = updateTabProps(updated, tabId, { filePath: newPath, title: newName })
    }
    updateSplitLayout(worktree.id, updated)
  }, [worktree, updateSplitLayout])

  const handleCloseTabsForPath = useCallback((filePath: string) => {
    if (!worktree) return
    const layout = worktree.splitLayout
    const result = removeTabsByFilePath(layout, filePath)
    if (result) {
      updateSplitLayout(worktree.id, result)
    }
  }, [worktree, updateSplitLayout])

  return (
    <FileTree
      rootPath={worktree.worktreePath}
      onOpenFile={handleOpenFile}
      onUpdateOpenTabs={handleUpdateOpenTabs}
      onCloseTabsForPath={handleCloseTabsForPath}
    />
  )
}

// ── File Tree ─────────────────────────────────────

function FileTree({
  rootPath,
  onOpenFile,
  onUpdateOpenTabs,
  onCloseTabsForPath,
}: {
  rootPath: string
  onOpenFile: (filePath: string, fileName: string) => void
  onUpdateOpenTabs: (oldPath: string, newPath: string, newName: string) => void
  onCloseTabsForPath: (filePath: string) => void
}) {
  const [entries, setEntries] = useState<FileEntry[]>([])
  const [loading, setLoading] = useState(true)
  const [childrenMap, setChildrenMap] = useState<Map<string, FileEntry[]>>(new Map())
  const [expandedDirs, setExpandedDirs] = useState<Set<string>>(new Set())
  const [selectedPath, setSelectedPath] = useState<string | null>(null)
  const [inlineInput, setInlineInput] = useState<InlineInputState | null>(null)
  const [renaming, setRenaming] = useState<RenameState | null>(null)
  const [contextMenu, setContextMenu] = useState<ContextMenuState | null>(null)

  const loadDir = useCallback(async (dirPath: string) => {
    const result = await window.electronAPI?.canopy?.readDir(dirPath)
    return result || []
  }, [])

  const refreshDir = useCallback(async (dirPath: string) => {
    const result = await loadDir(dirPath)
    if (dirPath === rootPath) {
      setEntries(result)
    } else {
      setChildrenMap(prev => {
        const next = new Map(prev)
        next.set(dirPath, result)
        return next
      })
    }
  }, [rootPath, loadDir])

  useEffect(() => {
    setLoading(true)
    loadDir(rootPath).then((result) => {
      setEntries(result)
      setLoading(false)
    })
  }, [rootPath, loadDir])

  const handleToggleDir = useCallback(async (dirPath: string) => {
    if (expandedDirs.has(dirPath)) {
      setExpandedDirs(prev => {
        const next = new Set(prev)
        next.delete(dirPath)
        return next
      })
    } else {
      if (!childrenMap.has(dirPath)) {
        const result = await loadDir(dirPath)
        setChildrenMap(prev => {
          const next = new Map(prev)
          next.set(dirPath, result)
          return next
        })
      }
      setExpandedDirs(prev => new Set(prev).add(dirPath))
    }
  }, [expandedDirs, childrenMap, loadDir])

  const handleContextMenu = useCallback((e: React.MouseEvent, entry: FileEntry, depth: number) => {
    e.preventDefault()
    e.stopPropagation()
    setContextMenu({ x: e.clientX, y: e.clientY, entry, depth })
  }, [])

  const getContextMenuItems = useCallback((): ContextMenuItem[] => {
    if (!contextMenu) return []
    const { entry, depth } = contextMenu
    const items: ContextMenuItem[] = []

    if (entry.isDirectory) {
      items.push({
        label: 'New File',
        onClick: () => {
          if (!expandedDirs.has(entry.path)) {
            handleToggleDir(entry.path)
          }
          setInlineInput({ parentPath: entry.path, type: 'file', depth: depth + 1 })
          setContextMenu(null)
        },
      })
      items.push({
        label: 'New Folder',
        onClick: () => {
          if (!expandedDirs.has(entry.path)) {
            handleToggleDir(entry.path)
          }
          setInlineInput({ parentPath: entry.path, type: 'folder', depth: depth + 1 })
          setContextMenu(null)
        },
      })
    }

    items.push({
      label: 'Rename',
      onClick: () => {
        setRenaming({ path: entry.path, name: entry.name, isDirectory: entry.isDirectory, depth })
        setContextMenu(null)
      },
    })
    items.push({
      label: 'Delete',
      danger: true,
      onClick: async () => {
        setContextMenu(null)
        const confirmed = window.confirm(`Are you sure you want to delete "${entry.name}"?`)
        if (!confirmed) return
        const success = await window.electronAPI.canopy.delete(entry.path)
        if (success) {
          onCloseTabsForPath(entry.path)
          const parentPath = entry.path.substring(0, entry.path.lastIndexOf('/'))
          await refreshDir(parentPath || rootPath)
        }
      },
    })

    return items
  }, [contextMenu, expandedDirs, handleToggleDir, onCloseTabsForPath, refreshDir, rootPath])

  const handleCreateConfirm = useCallback(async (name: string) => {
    if (!inlineInput) return
    const fullPath = `${inlineInput.parentPath}/${name}`

    if (inlineInput.type === 'folder') {
      const success = await window.electronAPI.canopy.createDir(fullPath)
      if (success) {
        await refreshDir(inlineInput.parentPath)
      }
    } else {
      const success = await window.electronAPI.canopy.writeFile(fullPath, '')
      if (success) {
        await refreshDir(inlineInput.parentPath)
        onOpenFile(fullPath, name)
      }
    }
    setInlineInput(null)
  }, [inlineInput, refreshDir, onOpenFile])

  const handleRenameConfirm = useCallback(async (newName: string) => {
    if (!renaming) return
    const parentPath = renaming.path.substring(0, renaming.path.lastIndexOf('/'))
    const newPath = `${parentPath}/${newName}`

    if (newPath === renaming.path) {
      setRenaming(null)
      return
    }

    const success = await window.electronAPI.canopy.rename(renaming.path, newPath)
    if (success) {
      onUpdateOpenTabs(renaming.path, newPath, newName)
      await refreshDir(parentPath || rootPath)
    }
    setRenaming(null)
  }, [renaming, refreshDir, rootPath, onUpdateOpenTabs])

  const validateName = useCallback((parentPath: string) => (name: string): string | null => {
    const siblings = parentPath === rootPath ? entries : (childrenMap.get(parentPath) || [])
    if (siblings.some(e => e.name === name)) {
      return 'A file or folder with that name already exists'
    }
    if (name.includes('/') || name.includes('\\')) {
      return 'Name cannot contain path separators'
    }
    return null
  }, [entries, childrenMap, rootPath])

  // Toolbar handlers
  const resolveTargetDir = useCallback((): { path: string; depth: number } => {
    if (selectedPath) {
      const entry = findEntry(entries, childrenMap, selectedPath)
      if (entry?.isDirectory) {
        if (!expandedDirs.has(entry.path)) handleToggleDir(entry.path)
        return { path: entry.path, depth: getDepth(rootPath, entry.path) }
      } else if (entry) {
        const parent = entry.path.substring(0, entry.path.lastIndexOf('/'))
        return { path: parent, depth: getDepth(rootPath, parent) }
      }
    }
    return { path: rootPath, depth: 0 }
  }, [rootPath, selectedPath, entries, childrenMap, expandedDirs, handleToggleDir])

  const handleToolbarNewFile = useCallback(() => {
    const { path, depth } = resolveTargetDir()
    setInlineInput({ parentPath: path, type: 'file', depth })
  }, [resolveTargetDir])

  const handleToolbarNewFolder = useCallback(() => {
    const { path, depth } = resolveTargetDir()
    setInlineInput({ parentPath: path, type: 'folder', depth })
  }, [resolveTargetDir])

  if (loading) {
    return (
      <div style={{
        padding: '12px',
        color: COLORS.textMuted,
        fontSize: '11px',
        fontFamily: "'Inter', sans-serif",
      }}>
        Loading...
      </div>
    )
  }

  return (
    <div style={{ height: '100%', display: 'flex', flexDirection: 'column' }}>
      {/* Toolbar */}
      <div style={{
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'flex-end',
        gap: '2px',
        padding: '4px 8px',
        borderBottom: `1px solid ${COLORS.outlineVariant}15`,
      }}>
        <ToolbarButton title="New File" onClick={handleToolbarNewFile}>
          <svg width="14" height="14" viewBox="0 0 14 14" fill="none" stroke="currentColor" strokeWidth="1.2">
            <path d="M3,1 L8,1 L11,4 L11,13 L3,13 Z" />
            <polyline points="8,1 8,4 11,4" />
            <line x1="7" y1="7" x2="7" y2="11" />
            <line x1="5" y1="9" x2="9" y2="9" />
          </svg>
        </ToolbarButton>
        <ToolbarButton title="New Folder" onClick={handleToolbarNewFolder}>
          <svg width="14" height="14" viewBox="0 0 14 14" fill="none" stroke="currentColor" strokeWidth="1.2">
            <path d="M1,3 L5,3 L6.5,1.5 L9,1.5 L9,3 L13,3 L13,12 L1,12 Z" />
            <line x1="7" y1="6" x2="7" y2="10" />
            <line x1="5" y1="8" x2="9" y2="8" />
          </svg>
        </ToolbarButton>
      </div>

      {/* Tree */}
      <div style={{ flex: 1, overflow: 'auto', padding: '4px 0' }}>
        {/* Inline input at root level */}
        {inlineInput && inlineInput.parentPath === rootPath && (
          <InlineInput
            depth={0}
            onConfirm={handleCreateConfirm}
            onCancel={() => setInlineInput(null)}
            validate={validateName(rootPath)}
          />
        )}
        {entries.map((entry) => (
          <FileNode
            key={entry.path}
            entry={entry}
            depth={0}
            expanded={expandedDirs.has(entry.path)}
            nodeChildren={childrenMap.get(entry.path) || []}
            childrenMap={childrenMap}
            expandedDirs={expandedDirs}
            selectedPath={selectedPath}
            renamingPath={renaming?.path || null}
            renameDefaultValue={renaming?.name}
            inlineInput={inlineInput}
            onToggleDir={handleToggleDir}
            onOpenFile={onOpenFile}
            onSelect={setSelectedPath}
            onContextMenu={handleContextMenu}
            onRenameConfirm={handleRenameConfirm}
            onRenameCancel={() => setRenaming(null)}
            validateName={validateName}
            onCreateConfirm={handleCreateConfirm}
            onCreateCancel={() => setInlineInput(null)}
          />
        ))}
      </div>

      {/* Context menu */}
      {contextMenu && (
        <ContextMenu
          x={contextMenu.x}
          y={contextMenu.y}
          items={getContextMenuItems()}
          onDismiss={() => setContextMenu(null)}
        />
      )}
    </div>
  )
}

// ── File Node ─────────────────────────────────────

function FileNode({
  entry,
  depth,
  expanded,
  nodeChildren,
  childrenMap,
  expandedDirs,
  selectedPath,
  renamingPath,
  renameDefaultValue,
  inlineInput,
  onToggleDir,
  onOpenFile,
  onSelect,
  onContextMenu,
  onRenameConfirm,
  onRenameCancel,
  validateName,
  onCreateConfirm,
  onCreateCancel,
}: {
  entry: FileEntry
  depth: number
  expanded: boolean
  nodeChildren: FileEntry[]
  childrenMap: Map<string, FileEntry[]>
  expandedDirs: Set<string>
  selectedPath: string | null
  renamingPath: string | null
  renameDefaultValue?: string
  inlineInput: InlineInputState | null
  onToggleDir: (dirPath: string) => void
  onOpenFile: (filePath: string, fileName: string) => void
  onSelect: (path: string) => void
  onContextMenu: (e: React.MouseEvent, entry: FileEntry, depth: number) => void
  onRenameConfirm: (newName: string) => void
  onRenameCancel: () => void
  validateName: (parentPath: string) => (name: string) => string | null
  onCreateConfirm: (name: string) => void
  onCreateCancel: () => void
}) {
  const [hovered, setHovered] = useState(false)
  const isSelected = selectedPath === entry.path
  const isRenaming = renamingPath === entry.path

  const handleClick = useCallback(() => {
    onSelect(entry.path)
    if (entry.isDirectory) {
      onToggleDir(entry.path)
    } else {
      onOpenFile(entry.path, entry.name)
    }
  }, [entry, onToggleDir, onOpenFile, onSelect])

  const icon = entry.isDirectory
    ? expanded ? '▾' : '▸'
    : null

  return (
    <div>
      {isRenaming ? (
        <div style={{ paddingLeft: `${12 + depth * 16}px`, paddingRight: '8px', paddingTop: '2px', paddingBottom: '2px' }}>
          <InlineInput
            defaultValue={renameDefaultValue}
            depth={0}
            onConfirm={onRenameConfirm}
            onCancel={onRenameCancel}
          />
        </div>
      ) : (
        <div
          onClick={handleClick}
          onContextMenu={(e) => onContextMenu(e, entry, depth)}
          onMouseEnter={() => setHovered(true)}
          onMouseLeave={() => setHovered(false)}
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: '4px',
            padding: '3px 8px 3px',
            paddingLeft: `${12 + depth * 16}px`,
            cursor: 'pointer',
            background: isSelected
              ? COLORS.surfaceContainerHigh
              : hovered
                ? `${COLORS.surfaceContainerHigh}80`
                : 'transparent',
            borderRadius: '3px',
            transition: 'background 100ms ease-out',
            userSelect: 'none',
          }}
        >
          <span style={{
            width: '10px',
            fontSize: '9px',
            color: COLORS.textMuted,
            textAlign: 'center',
            flexShrink: 0,
          }}>
            {icon}
          </span>

          <span style={{
            color: entry.isDirectory ? COLORS.onSurface : COLORS.onSurfaceVariant,
            fontSize: '12px',
            fontFamily: "'Inter', sans-serif",
            fontWeight: entry.isDirectory ? 500 : 400,
            whiteSpace: 'nowrap',
            overflow: 'hidden',
            textOverflow: 'ellipsis',
          }}>
            {entry.name}
          </span>
        </div>
      )}

      {/* Children + inline input for new items */}
      {expanded && (
        <>
          {inlineInput && inlineInput.parentPath === entry.path && (
            <InlineInput
              depth={depth + 1}
              onConfirm={onCreateConfirm}
              onCancel={onCreateCancel}
              validate={validateName(entry.path)}
            />
          )}
          {nodeChildren.map((child) => (
            <FileNode
              key={child.path}
              entry={child}
              depth={depth + 1}
              expanded={expandedDirs.has(child.path)}
              nodeChildren={childrenMap.get(child.path) || []}
              childrenMap={childrenMap}
              expandedDirs={expandedDirs}
              selectedPath={selectedPath}
              renamingPath={renamingPath}
              renameDefaultValue={renameDefaultValue}
              inlineInput={inlineInput}
              onToggleDir={onToggleDir}
              onOpenFile={onOpenFile}
              onSelect={onSelect}
              onContextMenu={onContextMenu}
              onRenameConfirm={onRenameConfirm}
              onRenameCancel={onRenameCancel}
              validateName={validateName}
              onCreateConfirm={onCreateConfirm}
              onCreateCancel={onCreateCancel}
            />
          ))}
        </>
      )}
    </div>
  )
}

// ── Toolbar Button ────────────────────────────────

function ToolbarButton({ title, onClick, children }: { title: string; onClick: () => void; children: React.ReactNode }) {
  const [hovered, setHovered] = useState(false)

  return (
    <button
      title={title}
      onClick={onClick}
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
        color: hovered ? COLORS.primary : COLORS.textMuted,
        cursor: 'pointer',
        transition: 'all 150ms',
      }}
    >
      {children}
    </button>
  )
}

// ── Helpers ───────────────────────────────────────

function findEntry(entries: FileEntry[], childrenMap: Map<string, FileEntry[]>, path: string): FileEntry | undefined {
  for (const entry of entries) {
    if (entry.path === path) return entry
  }
  for (const children of childrenMap.values()) {
    for (const entry of children) {
      if (entry.path === path) return entry
    }
  }
  return undefined
}

function getDepth(rootPath: string, dirPath: string): number {
  if (dirPath === rootPath) return 0
  const relative = dirPath.substring(rootPath.length + 1)
  return relative.split('/').length
}
