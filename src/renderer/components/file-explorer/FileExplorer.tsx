import { useState, useEffect, useCallback } from 'react'
import { COLORS } from '../../lib/constants'
import { useWorktreeStore } from '../../stores/worktree-store'
import { useTerminalStore } from '../../stores/terminal-store'
import { createTab, addTabToGroup, setActiveTab, findTabGroupContaining, getAllTabGroups } from '../../lib/split-tree'

interface FileEntry {
  name: string
  path: string
  isDirectory: boolean
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

    // Find the focused tab group, or fall back to first group
    let group = focusedTerminalId
      ? findTabGroupContaining(layout, focusedTerminalId)
      : undefined
    if (!group) {
      const groups = getAllTabGroups(layout)
      group = groups[0]
    }
    if (!group) return

    // Check if file is already open in this group
    const existing = group.tabs.find(t => t.type === 'file' && t.filePath === filePath)
    if (existing) {
      updateSplitLayout(worktree.id, setActiveTab(layout, group.id, existing.id))
      return
    }

    const tab = createTab('file', fileName, { filePath })
    const updated = addTabToGroup(layout, group.id, tab)
    updateSplitLayout(worktree.id, updated)
  }, [worktree, focusedTerminalId, updateSplitLayout])

  return <FileTree rootPath={worktree.worktreePath} onOpenFile={handleOpenFile} />
}

function FileTree({ rootPath, onOpenFile }: { rootPath: string; onOpenFile: (filePath: string, fileName: string) => void }) {
  const [entries, setEntries] = useState<FileEntry[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    setLoading(true)
    window.electronAPI?.canopy?.readDir(rootPath)
      .then((result) => {
        setEntries(result || [])
        setLoading(false)
      })
      .catch(() => setLoading(false))
  }, [rootPath])

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
    <div style={{ padding: '4px 0' }}>
      {entries.map((entry) => (
        <FileNode key={entry.path} entry={entry} depth={0} onOpenFile={onOpenFile} />
      ))}
    </div>
  )
}

function FileNode({ entry, depth, onOpenFile }: { entry: FileEntry; depth: number; onOpenFile: (filePath: string, fileName: string) => void }) {
  const [expanded, setExpanded] = useState(false)
  const [children, setChildren] = useState<FileEntry[]>([])
  const [loaded, setLoaded] = useState(false)
  const [hovered, setHovered] = useState(false)

  const handleClick = useCallback(async () => {
    if (entry.isDirectory) {
      if (!expanded && !loaded) {
        const api = window.electronAPI?.canopy
        const result = await api?.readDir(entry.path)
        setChildren(result || [])
        setLoaded(true)
      }
      setExpanded(!expanded)
    } else {
      onOpenFile(entry.path, entry.name)
    }
  }, [entry, expanded, loaded, onOpenFile])

  const icon = entry.isDirectory
    ? expanded ? '▾' : '▸'
    : null

  const fileIcon = entry.isDirectory
    ? '📁'
    : getFileIcon(entry.name)

  return (
    <div>
      <div
        onClick={handleClick}
        onMouseEnter={() => setHovered(true)}
        onMouseLeave={() => setHovered(false)}
        style={{
          display: 'flex',
          alignItems: 'center',
          gap: '4px',
          padding: '3px 8px 3px',
          paddingLeft: `${12 + depth * 16}px`,
          cursor: 'pointer',
          background: hovered ? COLORS.surfaceContainerHigh : 'transparent',
          borderRadius: '3px',
          transition: 'background 100ms ease-out',
          userSelect: 'none',
        }}
      >
        {/* Expand arrow for dirs */}
        <span style={{
          width: '10px',
          fontSize: '9px',
          color: COLORS.textMuted,
          textAlign: 'center',
          flexShrink: 0,
        }}>
          {icon}
        </span>

        {/* File/folder name */}
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

      {/* Children */}
      {expanded && children.map((child) => (
        <FileNode key={child.path} entry={child} depth={depth + 1} onOpenFile={onOpenFile} />
      ))}
    </div>
  )
}

function getFileIcon(name: string): string {
  const ext = name.split('.').pop()?.toLowerCase()
  switch (ext) {
    case 'ts': case 'tsx': return '🔷'
    case 'js': case 'jsx': return '🟡'
    case 'json': return '📋'
    case 'md': return '📝'
    case 'css': return '🎨'
    case 'html': return '🌐'
    default: return '📄'
  }
}
