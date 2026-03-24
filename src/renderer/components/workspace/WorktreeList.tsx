import { useState, useRef, useEffect, useCallback } from 'react'
import { useWorktreeStore } from '../../stores/worktree-store'
import { useTerminalStore } from '../../stores/terminal-store'
import { COLORS } from '../../lib/constants'
import { ContextMenu } from '../shared/ContextMenu'
import type { Project, Worktree, CommandState, ProjectFolder } from '@shared/types'

export function WorktreeList() {
  const projects = useWorktreeStore((s) => s.projects)
  const worktrees = useWorktreeStore((s) => s.worktrees)
  const folders = useWorktreeStore((s) => s.folders)
  const sidebarOrder = useWorktreeStore((s) => s.sidebarOrder)
  const activeId = useWorktreeStore((s) => s.activeWorktreeId)
  const setActive = useWorktreeStore((s) => s.setActive)
  const addWorktree = useWorktreeStore((s) => s.addWorktree)
  const removeWorktree = useWorktreeStore((s) => s.removeWorktree)
  const reorderSidebar = useWorktreeStore((s) => s.reorderSidebar)
  const reorderWorktrees = useWorktreeStore((s) => s.reorderWorktrees)
  const moveProjectToFolder = useWorktreeStore((s) => s.moveProjectToFolder)
  const reorderProjectsInFolder = useWorktreeStore((s) => s.reorderProjectsInFolder)
  const toggleFlag = useWorktreeStore((s) => s.toggleWorktreeFlag)
  const removeFolder = useWorktreeStore((s) => s.removeFolder)
  const renameFolder = useWorktreeStore((s) => s.renameFolder)

  // Delete confirmation state
  const [deleteTarget, setDeleteTarget] = useState<Worktree | null>(null)

  // Sidebar-level drag state
  const [sidebarDragOverIndex, setSidebarDragOverIndex] = useState<number | null>(null)
  const dragSidebarId = useRef<string | null>(null)

  // Folder drop target state (for dragging projects into folders)
  const [folderDropTarget, setFolderDropTarget] = useState<string | null>(null)

  const handleSidebarDragStart = useCallback((e: React.DragEvent, itemId: string, itemType: 'project' | 'folder') => {
    dragSidebarId.current = itemId
    e.dataTransfer.setData('text/sidebar-item', itemId)
    e.dataTransfer.setData('text/sidebar-item-type', itemType)
    // Also set project-id for folder drop detection
    if (itemType === 'project') {
      e.dataTransfer.setData('text/project-id', itemId)
    }
    e.dataTransfer.effectAllowed = 'move'
  }, [])

  const handleSidebarDragOver = useCallback((e: React.DragEvent, index: number) => {
    if (!e.dataTransfer.types.includes('text/sidebar-item')) return
    e.preventDefault()
    e.dataTransfer.dropEffect = 'move'
    setSidebarDragOverIndex(index)
  }, [])

  const handleSidebarDrop = useCallback((e: React.DragEvent, dropIndex: number) => {
    e.preventDefault()
    setSidebarDragOverIndex(null)
    const droppedId = e.dataTransfer.getData('text/sidebar-item')
    if (!droppedId) return
    const fromIndex = sidebarOrder.findIndex(item => item.id === droppedId)
    if (fromIndex === -1 || fromIndex === dropIndex) return
    const adjustedIndex = dropIndex > fromIndex ? dropIndex - 1 : dropIndex
    reorderSidebar(fromIndex, adjustedIndex)
  }, [sidebarOrder, reorderSidebar])

  const handleSidebarDragEnd = useCallback(() => {
    dragSidebarId.current = null
    setSidebarDragOverIndex(null)
    setFolderDropTarget(null)
  }, [])

  // Handle dropping a project onto a folder header
  const handleFolderDrop = useCallback((e: React.DragEvent, folderId: string) => {
    e.preventDefault()
    e.stopPropagation()
    setFolderDropTarget(null)
    setSidebarDragOverIndex(null)
    const projectId = e.dataTransfer.getData('text/project-id')
    if (!projectId) return
    // Don't do anything if this project is already in this folder
    const project = projects.find(p => p.id === projectId)
    if (!project || project.folderId === folderId) return
    moveProjectToFolder(projectId, folderId)
  }, [projects, moveProjectToFolder])

  const handleFolderDragOver = useCallback((e: React.DragEvent, folderId: string) => {
    if (!e.dataTransfer.types.includes('text/project-id')) return
    e.preventDefault()
    e.stopPropagation()
    e.dataTransfer.dropEffect = 'move'
    setFolderDropTarget(folderId)
    setSidebarDragOverIndex(null)
  }, [])

  // Context menu state
  const [contextMenu, setContextMenu] = useState<{ x: number; y: number; worktree: Worktree } | null>(null)
  const [folderContextMenu, setFolderContextMenu] = useState<{ x: number; y: number; folder: ProjectFolder } | null>(null)

  if (sidebarOrder.length === 0 && projects.length === 0) {
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
    // Always remove from UI — git cleanup failure shouldn't block the user
    removeWorktree(worktree.id)
    setDeleteTarget(null)

    try {
      await window.electronAPI.canopy.removeWorktree(
        worktree.worktreePath,
        deleteBranch ? worktree.branch : undefined,
      )
    } catch (err) {
      console.error('Failed to remove worktree from disk:', err)
    }
  }

  return (
    <>
      <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
        {sidebarOrder.map((item, index) => {
          if (item.type === 'folder') {
            const folder = folders.find(f => f.id === item.id)
            if (!folder) return null
            const folderProjects = projects.filter(p => p.folderId === folder.id)

            return (
              <FolderGroup
                key={folder.id}
                folder={folder}
                projects={folderProjects}
                worktrees={worktrees}
                activeId={activeId}
                onSelect={setActive}
                onCreateWorktree={(project, name) => handleCreateWorktree(project, name)}
                onDeleteWorktree={setDeleteTarget}
                // Sidebar-level drag (reorder folders/loose projects)
                isDragOver={sidebarDragOverIndex === index}
                isFolderDropTarget={folderDropTarget === folder.id}
                onDragStart={(e) => handleSidebarDragStart(e, folder.id, 'folder')}
                onDragOver={(e) => handleSidebarDragOver(e, index)}
                onDrop={(e) => handleSidebarDrop(e, index)}
                onDragEnd={handleSidebarDragEnd}
                onFolderDragOver={(e) => handleFolderDragOver(e, folder.id)}
                onFolderDrop={(e) => handleFolderDrop(e, folder.id)}
                onReorderWorktrees={(projectId, fromIdx, toIdx) => reorderWorktrees(projectId, fromIdx, toIdx)}
                onReorderProjects={(fromIdx, toIdx) => reorderProjectsInFolder(folder.id, fromIdx, toIdx)}
                onMoveProjectOut={(projectId) => moveProjectToFolder(projectId, null)}
                onContextMenu={(wt, x, y) => setContextMenu({ x, y, worktree: wt })}
                onFolderContextMenu={(f, x, y) => setFolderContextMenu({ x, y, folder: f })}
              />
            )
          }

          // Loose project
          const project = projects.find(p => p.id === item.id)
          if (!project) return null
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
              isDragOver={sidebarDragOverIndex === index}
              onDragStart={(e) => handleSidebarDragStart(e, project.id, 'project')}
              onDragOver={(e) => handleSidebarDragOver(e, index)}
              onDrop={(e) => handleSidebarDrop(e, index)}
              onDragEnd={handleSidebarDragEnd}
              onReorderWorktrees={(fromIdx, toIdx) => reorderWorktrees(project.id, fromIdx, toIdx)}
              onContextMenu={(wt, x, y) => setContextMenu({ x, y, worktree: wt })}
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

      {/* Worktree context menu */}
      {contextMenu && (
        <ContextMenu
          x={contextMenu.x}
          y={contextMenu.y}
          onDismiss={() => setContextMenu(null)}
          items={[
            {
              label: contextMenu.worktree.flagged ? 'Remove flag' : 'Flag for review',
              onClick: () => { toggleFlag(contextMenu.worktree.id); setContextMenu(null) },
            },
            ...(!contextMenu.worktree.isMain ? [{
              label: 'Delete worktree',
              danger: true,
              onClick: () => { setDeleteTarget(contextMenu.worktree); setContextMenu(null) },
            }] : []),
          ]}
        />
      )}

      {/* Folder context menu */}
      {folderContextMenu && (
        <FolderContextMenuWrapper
          folder={folderContextMenu.folder}
          x={folderContextMenu.x}
          y={folderContextMenu.y}
          onDismiss={() => setFolderContextMenu(null)}
          onRename={(name) => { renameFolder(folderContextMenu.folder.id, name); setFolderContextMenu(null) }}
          onDelete={() => { removeFolder(folderContextMenu.folder.id); setFolderContextMenu(null) }}
        />
      )}
    </>
  )
}

// ── Folder Context Menu ──────────────────────────────────
function FolderContextMenuWrapper({ folder, x, y, onDismiss, onRename, onDelete }: {
  folder: ProjectFolder
  x: number
  y: number
  onDismiss: () => void
  onRename: (name: string) => void
  onDelete: () => void
}) {
  const [renaming, setRenaming] = useState(false)
  const [name, setName] = useState(folder.name)
  const inputRef = useRef<HTMLInputElement>(null)

  useEffect(() => {
    if (renaming) inputRef.current?.focus()
  }, [renaming])

  if (renaming) {
    return (
      <>
        <div
          onClick={onDismiss}
          style={{ position: 'fixed', inset: 0, zIndex: 999 }}
        />
        <div style={{
          position: 'fixed',
          left: x,
          top: y,
          zIndex: 1000,
          background: COLORS.surfaceContainerHigh,
          borderRadius: '6px',
          border: `1px solid ${COLORS.outlineVariant}40`,
          boxShadow: '0 4px 16px rgba(0,0,0,0.4)',
          padding: '6px 10px',
          minWidth: '160px',
        }}>
          <input
            ref={inputRef}
            value={name}
            onChange={(e) => setName(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === 'Enter' && name.trim()) onRename(name.trim())
              if (e.key === 'Escape') onDismiss()
            }}
            onBlur={() => { if (name.trim()) onRename(name.trim()); else onDismiss() }}
            style={{
              background: COLORS.surfaceContainerLowest,
              border: `1px solid ${COLORS.outlineVariantStrong}`,
              borderRadius: '4px',
              color: COLORS.onSurface,
              fontSize: '12px',
              fontFamily: "'Inter', sans-serif",
              padding: '4px 8px',
              outline: 'none',
              width: '100%',
            }}
          />
        </div>
      </>
    )
  }

  return (
    <ContextMenu
      x={x}
      y={y}
      onDismiss={onDismiss}
      items={[
        {
          label: 'Rename folder',
          onClick: () => setRenaming(true),
        },
        {
          label: 'Remove folder',
          danger: true,
          onClick: onDelete,
        },
      ]}
    />
  )
}

// ── Folder Group ──────────────────────────────────────────
function FolderGroup({ folder, projects, worktrees, activeId, onSelect, onCreateWorktree, onDeleteWorktree, isDragOver, isFolderDropTarget, onDragStart, onDragOver, onDrop, onDragEnd, onFolderDragOver, onFolderDrop, onReorderWorktrees, onReorderProjects, onMoveProjectOut, onContextMenu, onFolderContextMenu }: {
  folder: ProjectFolder
  projects: Project[]
  worktrees: Worktree[]
  activeId: string | null
  onSelect: (id: string) => void
  onCreateWorktree: (project: Project, name: string) => void
  onDeleteWorktree: (wt: Worktree) => void
  isDragOver: boolean
  isFolderDropTarget: boolean
  onDragStart: (e: React.DragEvent) => void
  onDragOver: (e: React.DragEvent) => void
  onDrop: (e: React.DragEvent) => void
  onDragEnd: () => void
  onFolderDragOver: (e: React.DragEvent) => void
  onFolderDrop: (e: React.DragEvent) => void
  onReorderWorktrees: (projectId: string, fromIndex: number, toIndex: number) => void
  onReorderProjects: (fromIndex: number, toIndex: number) => void
  onMoveProjectOut: (projectId: string) => void
  onContextMenu: (wt: Worktree, x: number, y: number) => void
  onFolderContextMenu: (folder: ProjectFolder, x: number, y: number) => void
}) {
  const [collapsed, setCollapsed] = useState(false)
  const [headerHovered, setHeaderHovered] = useState(false)

  // Project reorder within folder
  const [projectDragOverIndex, setProjectDragOverIndex] = useState<number | null>(null)
  const dragProjectId = useRef<string | null>(null)

  const handleProjectDragStart = useCallback((e: React.DragEvent, projectId: string) => {
    e.stopPropagation()
    dragProjectId.current = projectId
    e.dataTransfer.setData('text/project-id', projectId)
    e.dataTransfer.setData('text/sidebar-item', projectId)
    e.dataTransfer.setData('text/sidebar-item-type', 'project')
    e.dataTransfer.effectAllowed = 'move'
  }, [])

  const handleProjectDragOver = useCallback((e: React.DragEvent, index: number) => {
    if (!e.dataTransfer.types.includes('text/project-id')) return
    e.preventDefault()
    e.stopPropagation()
    e.dataTransfer.dropEffect = 'move'
    setProjectDragOverIndex(index)
  }, [])

  const handleProjectDrop = useCallback((e: React.DragEvent, dropIndex: number) => {
    e.preventDefault()
    e.stopPropagation()
    setProjectDragOverIndex(null)
    const droppedId = e.dataTransfer.getData('text/project-id')
    if (!droppedId) return

    // Check if it's a project from outside this folder
    const droppedProject = projects.find(p => p.id === droppedId)
    if (!droppedProject) {
      // Project from outside — this is handled by folder drop
      return
    }

    const fromIndex = projects.findIndex(p => p.id === droppedId)
    if (fromIndex === -1 || fromIndex === dropIndex) return
    const adjustedIndex = dropIndex > fromIndex ? dropIndex - 1 : dropIndex
    onReorderProjects(fromIndex, adjustedIndex)
  }, [projects, onReorderProjects])

  const handleProjectDragEnd = useCallback(() => {
    dragProjectId.current = null
    setProjectDragOverIndex(null)
  }, [])

  const totalWorktrees = projects.reduce((sum, p) => sum + worktrees.filter(w => w.projectId === p.id).length, 0)

  return (
    <div style={{ animation: 'slideDown 200ms ease-out' }}>
      {/* Folder header */}
      <div
        draggable
        onDragStart={onDragStart}
        onDragOver={(e) => {
          // Allow both sidebar reorder and project-into-folder drop
          if (e.dataTransfer.types.includes('text/project-id')) {
            onFolderDragOver(e)
          } else {
            onDragOver(e)
          }
        }}
        onDrop={(e) => {
          if (e.dataTransfer.types.includes('text/project-id')) {
            onFolderDrop(e)
          } else {
            onDrop(e)
          }
        }}
        onDragEnd={onDragEnd}
        onMouseEnter={() => setHeaderHovered(true)}
        onMouseLeave={() => setHeaderHovered(false)}
        onContextMenu={(e) => { e.preventDefault(); onFolderContextMenu(folder, e.clientX, e.clientY) }}
        style={{
          display: 'flex',
          alignItems: 'center',
          padding: '6px 8px',
          gap: '6px',
          cursor: 'pointer',
          borderRadius: '4px',
          background: isFolderDropTarget
            ? COLORS.surfaceContainerHighest
            : headerHovered
              ? COLORS.surfaceContainerHigh
              : 'transparent',
          borderTop: isDragOver ? `2px solid ${COLORS.primaryContainer}` : '2px solid transparent',
          border: isFolderDropTarget ? `1px dashed ${COLORS.primaryContainer}` : undefined,
          borderTopWidth: isDragOver ? '2px' : undefined,
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

        {/* Folder icon with color */}
        <svg width="12" height="12" viewBox="0 0 14 14" fill="none" strokeWidth="1.3" strokeLinecap="round" style={{ flexShrink: 0 }}>
          <path
            d="M1.5 3.5a1 1 0 0 1 1-1h3l1.5 1.5h4.5a1 1 0 0 1 1 1v6a1 1 0 0 1-1 1h-10a1 1 0 0 1-1-1v-7.5z"
            stroke={folder.color}
            fill={`${folder.color}20`}
          />
        </svg>

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
          {folder.name}
        </span>

        <span style={{
          color: COLORS.textMuted,
          fontSize: '10px',
          fontFamily: "'JetBrains Mono', monospace",
          marginRight: '2px',
        }}>
          {projects.length}
        </span>
      </div>

      {/* Projects inside folder */}
      {!collapsed && (
        <div style={{ paddingLeft: '8px' }}>
          {projects.map((project, projectIndex) => {
            const projectWorktrees = worktrees.filter(w => w.projectId === project.id)

            return (
              <ProjectGroup
                key={project.id}
                project={project}
                worktrees={projectWorktrees}
                activeId={activeId}
                onSelect={onSelect}
                onCreateWorktree={(name) => onCreateWorktree(project, name)}
                onDeleteWorktree={onDeleteWorktree}
                isDragOver={projectDragOverIndex === projectIndex}
                onDragStart={(e) => handleProjectDragStart(e, project.id)}
                onDragOver={(e) => handleProjectDragOver(e, projectIndex)}
                onDrop={(e) => handleProjectDrop(e, projectIndex)}
                onDragEnd={handleProjectDragEnd}
                onReorderWorktrees={(fromIdx, toIdx) => onReorderWorktrees(project.id, fromIdx, toIdx)}
                onContextMenu={onContextMenu}
                insideFolder
              />
            )
          })}

          {projects.length === 0 && (
            <div style={{
              padding: '8px 12px',
              color: COLORS.textMuted,
              fontSize: '11px',
              fontFamily: "'Inter', sans-serif",
              fontStyle: 'italic',
            }}>
              Drag projects here
            </div>
          )}
        </div>
      )}
    </div>
  )
}

// ── Project Group ──────────────────────────────────────────
function ProjectGroup({ project, worktrees, activeId, onSelect, onCreateWorktree, onDeleteWorktree, isDragOver, onDragStart, onDragOver, onDrop, onDragEnd, onReorderWorktrees, onContextMenu, insideFolder }: {
  project: Project
  worktrees: Worktree[]
  activeId: string | null
  onSelect: (id: string) => void
  onCreateWorktree: (name: string) => void
  onDeleteWorktree: (wt: Worktree) => void
  isDragOver: boolean
  onDragStart: (e: React.DragEvent) => void
  onDragOver: (e: React.DragEvent) => void
  onDrop: (e: React.DragEvent) => void
  onDragEnd: () => void
  onReorderWorktrees: (fromIndex: number, toIndex: number) => void
  onContextMenu: (wt: Worktree, x: number, y: number) => void
  insideFolder?: boolean
}) {
  const [collapsed, setCollapsed] = useState(false)
  const [headerHovered, setHeaderHovered] = useState(false)
  const [showNameInput, setShowNameInput] = useState(false)

  // Worktree drag state
  const [wtDragOverIndex, setWtDragOverIndex] = useState<number | null>(null)
  const dragWtId = useRef<string | null>(null)

  const handleWtDragStart = useCallback((e: React.DragEvent, wtId: string) => {
    e.stopPropagation()
    dragWtId.current = wtId
    e.dataTransfer.setData('text/worktree-id', wtId)
    e.dataTransfer.setData('text/worktree-project-id', project.id)
    e.dataTransfer.effectAllowed = 'move'
  }, [project.id])

  const handleWtDragOver = useCallback((e: React.DragEvent, index: number) => {
    if (!e.dataTransfer.types.includes('text/worktree-id')) return
    e.preventDefault()
    e.stopPropagation()
    e.dataTransfer.dropEffect = 'move'
    setWtDragOverIndex(index)
  }, [])

  const handleWtDrop = useCallback((e: React.DragEvent, dropIndex: number) => {
    e.preventDefault()
    e.stopPropagation()
    setWtDragOverIndex(null)
    const droppedId = e.dataTransfer.getData('text/worktree-id')
    const sourceProjectId = e.dataTransfer.getData('text/worktree-project-id')
    if (!droppedId || sourceProjectId !== project.id) return
    const fromIndex = worktrees.findIndex(w => w.id === droppedId)
    if (fromIndex === -1 || fromIndex === dropIndex) return
    const adjustedIndex = dropIndex > fromIndex ? dropIndex - 1 : dropIndex
    onReorderWorktrees(fromIndex, adjustedIndex)
  }, [project.id, worktrees, onReorderWorktrees])

  const handleWtDragEnd = useCallback(() => {
    dragWtId.current = null
    setWtDragOverIndex(null)
  }, [])

  return (
    <div style={{ animation: 'slideDown 200ms ease-out' }}>
      {/* Project header */}
      <div
        draggable
        onDragStart={onDragStart}
        onDragOver={onDragOver}
        onDrop={onDrop}
        onDragEnd={onDragEnd}
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
          borderTop: isDragOver ? `2px solid ${COLORS.primaryContainer}` : '2px solid transparent',
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
        <div style={{ paddingLeft: insideFolder ? '8px' : '12px' }}>
          {worktrees.map((wt, index) => (
            <WorktreeItem
              key={wt.id}
              worktree={wt}
              isActive={wt.id === activeId}
              index={index}
              onSelect={() => onSelect(wt.id)}
              onDelete={() => onDeleteWorktree(wt)}
              isDragOver={wtDragOverIndex === index}
              onDragStart={(e) => handleWtDragStart(e, wt.id)}
              onDragOver={(e) => handleWtDragOver(e, index)}
              onDrop={(e) => handleWtDrop(e, index)}
              onDragEnd={handleWtDragEnd}
              onContextMenu={(x, y) => onContextMenu(wt, x, y)}
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

function getDotStyle(commandState: CommandState, isActive: boolean): React.CSSProperties {
  if (isActive) {
    return {
      background: COLORS.activeDot,
      boxShadow: `0 0 8px ${COLORS.activeDotGlow}, 0 0 2px ${COLORS.activeDot}`,
    }
  }

  switch (commandState) {
    case 'busy':
      return {
        background: COLORS.primaryContainer,
        animation: 'dotPulse 1.5s ease-in-out infinite',
        // CSS custom property for the animation keyframes
        ['--dot-color' as string]: COLORS.primaryContainer,
      }
    case 'done':
      return {
        background: COLORS.success,
        animation: 'doneGlow 1.5s ease-out forwards',
        ['--dot-color' as string]: COLORS.success,
      }
    default:
      return {
        background: COLORS.textMuted,
        boxShadow: `0 0 4px ${COLORS.outlineVariantSubtle}`,
      }
  }
}

function WorktreeItem({ worktree, isActive, index, onSelect, onDelete, isDragOver, onDragStart, onDragOver, onDrop, onDragEnd, onContextMenu }: {
  worktree: Worktree
  isActive: boolean
  index: number
  onSelect: () => void
  onDelete: () => void
  isDragOver: boolean
  onDragStart: (e: React.DragEvent) => void
  onDragOver: (e: React.DragEvent) => void
  onDrop: (e: React.DragEvent) => void
  onDragEnd: () => void
  onContextMenu: (x: number, y: number) => void
}) {
  const [hovered, setHovered] = useState(false)
  const commandState = useTerminalStore((s) => s.getWorktreeCommandState(worktree.splitLayout))
  const clearDone = useTerminalStore((s) => s.clearWorktreeDone)

  // Clear 'done' state when user activates this worktree
  useEffect(() => {
    if (isActive && commandState === 'done') {
      clearDone(worktree.splitLayout)
    }
  }, [isActive, commandState, clearDone, worktree.splitLayout])

  const bg = isActive
    ? COLORS.surfaceContainerHigh
    : hovered
      ? COLORS.surfaceContainerHighest
      : 'transparent'

  const dotStyle = getDotStyle(commandState, isActive)

  return (
    <div
      role="button"
      tabIndex={0}
      draggable
      onDragStart={onDragStart}
      onDragOver={onDragOver}
      onDrop={onDrop}
      onDragEnd={onDragEnd}
      onClick={onSelect}
      onKeyDown={(e) => { if (e.key === 'Enter' || e.key === ' ') onSelect() }}
      onContextMenu={(e) => { e.preventDefault(); onContextMenu(e.clientX, e.clientY) }}
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
        borderTop: isDragOver ? `2px solid ${COLORS.primaryContainer}` : '2px solid transparent',
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

      {/* Status dot — color reflects terminal command state */}
      <div style={{
        width: '6px',
        height: '6px',
        borderRadius: '50%',
        flexShrink: 0,
        transition: 'background 200ms ease-out, box-shadow 200ms ease-out',
        ...dotStyle,
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

      {/* Flag indicator — red asterisk */}
      {worktree.flagged && (
        <span style={{
          color: COLORS.error,
          fontSize: '16px',
          fontWeight: 700,
          lineHeight: 1,
          flexShrink: 0,
        }}>
          *
        </span>
      )}

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
    </div>
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
        background: COLORS.scrim,
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
          boxShadow: '0 16px 48px var(--shadow-color)',
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
