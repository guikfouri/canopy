import { create } from 'zustand'
import { v4 as uuid } from 'uuid'
import type { Project, Worktree, SplitNode, CanopyConfig } from '@shared/types'
import { createTabGroup } from '../lib/split-tree'
import { PROJECT_COLORS } from '../lib/constants'

interface WorktreeStore {
  projects: Project[]
  worktrees: Worktree[]
  activeWorktreeId: string | null
  sidebarWidth: number
  loaded: boolean

  loadFromConfig: (config: CanopyConfig) => void
  addProject: (path: string) => Project
  removeProject: (id: string) => void
  addWorktree: (projectId: string, name: string, worktreePath: string, branch: string, isMain: boolean) => Worktree
  removeWorktree: (id: string) => void
  setActive: (id: string) => void
  getActive: () => Worktree | undefined
  getProjectForWorktree: (worktreeId: string) => Project | undefined
  getWorktreesForProject: (projectId: string) => Worktree[]
  updateSplitLayout: (worktreeId: string, layout: SplitNode) => void
  updateWorktreeBranch: (worktreeId: string, branch: string) => void
  toConfig: () => CanopyConfig
  saveConfig: () => void
}

export const useWorktreeStore = create<WorktreeStore>((set, get) => ({
  projects: [],
  worktrees: [],
  activeWorktreeId: null,
  sidebarWidth: 220,
  loaded: false,

  loadFromConfig: (config: CanopyConfig) => {
    set({
      projects: config.projects || [],
      worktrees: config.worktrees || [],
      activeWorktreeId: config.activeWorktreeId,
      sidebarWidth: config.sidebarWidth,
      loaded: true,
    })
  },

  addProject: (path: string) => {
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
      name: 'main',
      worktreePath: path,
      branch: 'main',
      color: PROJECT_COLORS[colorIndex],
      isMain: true,
      splitLayout: createTabGroup(),
      createdAt: new Date().toISOString(),
    }

    set((s) => ({
      projects: [...s.projects, project],
      worktrees: [...s.worktrees, worktree],
      activeWorktreeId: worktree.id,
    }))

    return project
  },

  removeProject: (id: string) => {
    set((state) => {
      const worktrees = state.worktrees.filter(w => w.projectId !== id)
      const projects = state.projects.filter(p => p.id !== id)
      const activeWorktreeId = state.worktrees.find(w => w.id === state.activeWorktreeId)?.projectId === id
        ? (worktrees[0]?.id || null)
        : state.activeWorktreeId
      return { projects, worktrees, activeWorktreeId }
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

  toConfig: () => {
    const state = get()
    return {
      version: 1 as const,
      projects: state.projects,
      worktrees: state.worktrees,
      activeWorktreeId: state.activeWorktreeId,
      sidebarWidth: state.sidebarWidth,
      fileExplorerWidth: 280,
    }
  },

  saveConfig: () => {
    const config = get().toConfig()
    window.electronAPI?.canopy?.saveConfig(config)
  },
}))
