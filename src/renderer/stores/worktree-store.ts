import { create } from 'zustand'
import { subscribeWithSelector } from 'zustand/middleware'
import { v4 as uuid } from 'uuid'
import type { Project, Worktree, SplitNode, CanopyConfig, NotificationConfig, ProjectFolder, SidebarOrderItem } from '@shared/types'

const DEFAULT_NOTIFICATION: NotificationConfig = {
  soundEnabled: true,
  soundType: 'ding',
  volume: 0.5,
}
import { createTabGroup } from '../lib/split-tree'
import { PROJECT_COLORS } from '../lib/constants'
import { useThemeStore } from '../lib/theme'

interface WorktreeStore {
  projects: Project[]
  worktrees: Worktree[]
  folders: ProjectFolder[]
  sidebarOrder: SidebarOrderItem[]
  activeWorktreeId: string | null
  sidebarWidth: number
  terminalScrollback: number
  terminalFontSize: number
  notification: NotificationConfig
  loaded: boolean

  loadFromConfig: (config: CanopyConfig) => void
  addProject: (path: string, branch?: string) => Project
  removeProject: (id: string) => void
  addWorktree: (projectId: string, name: string, worktreePath: string, branch: string, isMain: boolean) => Worktree
  removeWorktree: (id: string) => void
  setActive: (id: string) => void
  getActive: () => Worktree | undefined
  getProjectForWorktree: (worktreeId: string) => Project | undefined
  getWorktreesForProject: (projectId: string) => Worktree[]
  updateSplitLayout: (worktreeId: string, layout: SplitNode) => void
  updateWorktreeBranch: (worktreeId: string, branch: string) => void
  reorderProjects: (fromIndex: number, toIndex: number) => void
  reorderWorktrees: (projectId: string, fromIndex: number, toIndex: number) => void
  updateProjectColor: (projectId: string, color: string) => void
  updateFolderColor: (folderId: string, color: string) => void
  toggleWorktreeFlag: (worktreeId: string) => void
  updateNotification: (config: Partial<NotificationConfig>) => void
  addFolder: (name: string) => ProjectFolder
  removeFolder: (id: string) => void
  renameFolder: (id: string, name: string) => void
  moveProjectToFolder: (projectId: string, folderId: string | null) => void
  reorderSidebar: (fromIndex: number, toIndex: number) => void
  reorderProjectsInFolder: (folderId: string, fromIndex: number, toIndex: number) => void
  toConfig: () => CanopyConfig
  saveConfig: () => void
}

// Flag to suppress auto-save during initial config load
let _isLoadingConfig = false

export const useWorktreeStore = create<WorktreeStore>()(subscribeWithSelector((set, get) => ({
  projects: [],
  worktrees: [],
  folders: [],
  sidebarOrder: [],
  activeWorktreeId: null,
  sidebarWidth: 220,
  terminalScrollback: 10_000,
  terminalFontSize: 13,
  notification: DEFAULT_NOTIFICATION,
  loaded: false,

  loadFromConfig: (config: CanopyConfig) => {
    _isLoadingConfig = true
    useThemeStore.getState().init(config.theme ?? 'system')

    const projects = config.projects || []
    const folders = config.folders || []

    // Migration: generate sidebarOrder from existing projects if missing
    let sidebarOrder = config.sidebarOrder
    if (!sidebarOrder || sidebarOrder.length === 0) {
      sidebarOrder = projects
        .filter(p => !p.folderId)
        .map(p => ({ type: 'project' as const, id: p.id }))
    }

    set({
      projects,
      worktrees: config.worktrees || [],
      folders,
      sidebarOrder,
      activeWorktreeId: config.activeWorktreeId,
      sidebarWidth: config.sidebarWidth,
      terminalScrollback: config.terminalScrollback ?? 10_000,
      terminalFontSize: config.terminalFontSize ?? 13,
      notification: config.notification || DEFAULT_NOTIFICATION,
      loaded: true,
    })
    _isLoadingConfig = false
  },

  addProject: (path: string, branch: string = 'main') => {
    const state = get()
    const colorIndex = state.projects.length % PROJECT_COLORS.length
    const name = path.split('/').pop() || 'project'

    const project: Project = {
      id: uuid(),
      name,
      path,
      color: PROJECT_COLORS[colorIndex],
      createdAt: new Date().toISOString(),
    }

    const worktree: Worktree = {
      id: uuid(),
      projectId: project.id,
      name: branch,
      worktreePath: path,
      branch,
      color: PROJECT_COLORS[colorIndex],
      isMain: true,
      splitLayout: createTabGroup(),
      createdAt: new Date().toISOString(),
    }

    set((s) => ({
      projects: [...s.projects, project],
      worktrees: [...s.worktrees, worktree],
      sidebarOrder: [...s.sidebarOrder, { type: 'project' as const, id: project.id }],
      activeWorktreeId: worktree.id,
    }))

    return project
  },

  removeProject: (id: string) => {
    set((state) => {
      const worktrees = state.worktrees.filter(w => w.projectId !== id)
      const projects = state.projects.filter(p => p.id !== id)
      const sidebarOrder = state.sidebarOrder.filter(item => !(item.type === 'project' && item.id === id))
      const activeWorktreeId = state.worktrees.find(w => w.id === state.activeWorktreeId)?.projectId === id
        ? (worktrees[0]?.id || null)
        : state.activeWorktreeId
      return { projects, worktrees, sidebarOrder, activeWorktreeId }
    })
  },

  addWorktree: (projectId, name, worktreePath, branch, isMain) => {
    const project = get().projects.find(p => p.id === projectId)
    const color = project?.color ?? PROJECT_COLORS[0]

    const worktree: Worktree = {
      id: uuid(),
      projectId,
      name,
      worktreePath,
      branch,
      color,
      isMain,
      splitLayout: createTabGroup(),
      createdAt: new Date().toISOString(),
    }

    set((s) => ({
      worktrees: [...s.worktrees, worktree],
      activeWorktreeId: worktree.id,
    }))

    return worktree
  },

  removeWorktree: (id: string) => {
    set((state) => {
      const worktrees = state.worktrees.filter(w => w.id !== id)
      const activeWorktreeId = state.activeWorktreeId === id
        ? (worktrees[0]?.id || null)
        : state.activeWorktreeId
      return { worktrees, activeWorktreeId }
    })
  },

  setActive: (id) => set({ activeWorktreeId: id }),

  getActive: () => {
    const state = get()
    return state.worktrees.find(w => w.id === state.activeWorktreeId)
  },

  getProjectForWorktree: (worktreeId: string) => {
    const state = get()
    const wt = state.worktrees.find(w => w.id === worktreeId)
    if (!wt) return undefined
    return state.projects.find(p => p.id === wt.projectId)
  },

  getWorktreesForProject: (projectId: string) => {
    return get().worktrees.filter(w => w.projectId === projectId)
  },

  updateSplitLayout: (worktreeId, layout) => {
    set((state) => ({
      worktrees: state.worktrees.map(w =>
        w.id === worktreeId ? { ...w, splitLayout: layout } : w
      ),
    }))
  },

  updateWorktreeBranch: (worktreeId, branch) => {
    set((state) => ({
      worktrees: state.worktrees.map(w =>
        w.id === worktreeId ? { ...w, branch } : w
      ),
    }))
  },

  reorderProjects: (fromIndex, toIndex) => {
    set((state) => {
      const projects = [...state.projects]
      const [moved] = projects.splice(fromIndex, 1)
      projects.splice(toIndex, 0, moved)
      return { projects }
    })
  },

  reorderWorktrees: (projectId, fromIndex, toIndex) => {
    set((state) => {
      // Get indices of this project's worktrees within the full array
      const projectIndices: number[] = []
      state.worktrees.forEach((w, i) => {
        if (w.projectId === projectId) projectIndices.push(i)
      })
      if (fromIndex >= projectIndices.length || toIndex >= projectIndices.length) return state

      const worktrees = [...state.worktrees]
      const actualFrom = projectIndices[fromIndex]
      const [moved] = worktrees.splice(actualFrom, 1)
      // Recalculate target after removal
      const remaining = worktrees.filter(w => w.projectId === projectId)
      const targetWorktree = remaining[toIndex > fromIndex ? toIndex - 1 : toIndex]
      const actualTo = targetWorktree
        ? worktrees.indexOf(targetWorktree) + (toIndex > fromIndex ? 1 : 0)
        : worktrees.length
      worktrees.splice(actualTo, 0, moved)
      return { worktrees }
    })
  },

  updateProjectColor: (projectId, color) => {
    set((state) => ({
      projects: state.projects.map(p =>
        p.id === projectId ? { ...p, color } : p
      ),
      worktrees: state.worktrees.map(w =>
        w.projectId === projectId ? { ...w, color } : w
      ),
    }))
  },

  updateFolderColor: (folderId, color) => {
    set((state) => ({
      folders: state.folders.map(f =>
        f.id === folderId ? { ...f, color } : f
      ),
    }))
  },

  toggleWorktreeFlag: (worktreeId) => {
    set((state) => ({
      worktrees: state.worktrees.map(w =>
        w.id === worktreeId ? { ...w, flagged: !w.flagged } : w
      ),
    }))
  },

  updateNotification: (config) => {
    set((state) => ({
      notification: { ...state.notification, ...config },
    }))
  },

  addFolder: (name: string) => {
    const state = get()
    const colorIndex = (state.projects.length + state.folders.length) % PROJECT_COLORS.length
    const folder: ProjectFolder = {
      id: uuid(),
      name,
      color: PROJECT_COLORS[colorIndex],
      createdAt: new Date().toISOString(),
    }
    set((s) => ({
      folders: [...s.folders, folder],
      sidebarOrder: [...s.sidebarOrder, { type: 'folder' as const, id: folder.id }],
    }))
    return folder
  },

  removeFolder: (id: string) => {
    set((state) => {
      // Projects inside this folder become loose — add them to sidebarOrder where the folder was
      const folderIndex = state.sidebarOrder.findIndex(item => item.type === 'folder' && item.id === id)
      const looseProjects: SidebarOrderItem[] = state.projects
        .filter(p => p.folderId === id)
        .map(p => ({ type: 'project' as const, id: p.id }))

      const sidebarOrder = [...state.sidebarOrder]
      sidebarOrder.splice(folderIndex, 1, ...looseProjects)

      return {
        folders: state.folders.filter(f => f.id !== id),
        projects: state.projects.map(p => p.folderId === id ? { ...p, folderId: undefined } : p),
        sidebarOrder,
      }
    })
  },

  renameFolder: (id: string, name: string) => {
    set((state) => ({
      folders: state.folders.map(f => f.id === id ? { ...f, name } : f),
    }))
  },

  moveProjectToFolder: (projectId: string, folderId: string | null) => {
    set((state) => {
      const project = state.projects.find(p => p.id === projectId)
      if (!project) return state

      const wasLoose = !project.folderId
      const becomingLoose = folderId === null

      let sidebarOrder = [...state.sidebarOrder]

      if (wasLoose && !becomingLoose) {
        // Moving from root into a folder — remove from sidebarOrder
        sidebarOrder = sidebarOrder.filter(item => !(item.type === 'project' && item.id === projectId))
      } else if (!wasLoose && becomingLoose) {
        // Moving from folder to root — add to sidebarOrder at the end
        sidebarOrder = [...sidebarOrder, { type: 'project' as const, id: projectId }]
      }
      // folder-to-folder: sidebarOrder doesn't change (project is not in it)

      return {
        projects: state.projects.map(p =>
          p.id === projectId ? { ...p, folderId: folderId ?? undefined } : p
        ),
        sidebarOrder,
      }
    })
  },

  reorderSidebar: (fromIndex: number, toIndex: number) => {
    set((state) => {
      const sidebarOrder = [...state.sidebarOrder]
      const [moved] = sidebarOrder.splice(fromIndex, 1)
      sidebarOrder.splice(toIndex, 0, moved)
      return { sidebarOrder }
    })
  },

  reorderProjectsInFolder: (folderId: string, fromIndex: number, toIndex: number) => {
    set((state) => {
      // Get projects in this folder, reorder them, then update the full projects array
      const folderProjects = state.projects.filter(p => p.folderId === folderId)
      if (fromIndex >= folderProjects.length || toIndex >= folderProjects.length) return state

      const reordered = [...folderProjects]
      const [moved] = reordered.splice(fromIndex, 1)
      reordered.splice(toIndex, 0, moved)

      // Rebuild the projects array maintaining the order of non-folder projects
      const otherProjects = state.projects.filter(p => p.folderId !== folderId)
      // Insert folder projects back at the position of the first folder project
      const firstIdx = state.projects.findIndex(p => p.folderId === folderId)
      const projects = [...otherProjects]
      projects.splice(firstIdx, 0, ...reordered)

      return { projects }
    })
  },

  toConfig: () => {
    const state = get()
    return {
      version: 1 as const,
      theme: useThemeStore.getState().preference,
      projects: state.projects,
      worktrees: state.worktrees,
      folders: state.folders,
      sidebarOrder: state.sidebarOrder,
      activeWorktreeId: state.activeWorktreeId,
      sidebarWidth: state.sidebarWidth,
      fileExplorerWidth: 280,
      terminalScrollback: state.terminalScrollback,
      terminalFontSize: state.terminalFontSize,
      notification: state.notification,
    }
  },

  saveConfig: () => {
    const config = get().toConfig()
    window.electronAPI?.canopy?.saveConfig(config)
  },
})))

// ── Auto-save with debounce ──────────────────────────
// Persists config to disk 1.5s after any state change,
// skipping the initial loadFromConfig hydration.
let _saveTimer: ReturnType<typeof setTimeout> | null = null

useWorktreeStore.subscribe(
  (s) => ({ projects: s.projects, worktrees: s.worktrees, folders: s.folders, sidebarOrder: s.sidebarOrder, activeWorktreeId: s.activeWorktreeId, sidebarWidth: s.sidebarWidth, terminalScrollback: s.terminalScrollback, terminalFontSize: s.terminalFontSize, notification: s.notification }),
  () => {
    if (_isLoadingConfig) return
    if (_saveTimer) clearTimeout(_saveTimer)
    _saveTimer = setTimeout(() => {
      useWorktreeStore.getState().saveConfig()
    }, 1500)
  },
  { equalityFn: (a, b) => a === b },
)

// Auto-save when theme preference changes
useThemeStore.subscribe(
  (s) => s.preference,
  () => {
    if (_isLoadingConfig) return
    if (_saveTimer) clearTimeout(_saveTimer)
    _saveTimer = setTimeout(() => {
      useWorktreeStore.getState().saveConfig()
    }, 1500)
  },
)
