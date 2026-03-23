import { create } from 'zustand'
import { v4 as uuid } from 'uuid'
import type { TerminalSession, CommandState } from '@shared/types'

interface TerminalStore {
  sessions: Map<string, TerminalSession>
  focusedTerminalId: string | null

  createSession: (worktreeId: string, cwd: string) => string
  removeSession: (id: string) => void
  setFocused: (id: string | null) => void
  getSession: (id: string) => TerminalSession | undefined
  setCommandState: (id: string, state: CommandState, exitCode?: number) => void
  getWorktreeCommandState: (worktreeId: string) => CommandState
  clearWorktreeDone: (worktreeId: string) => void
}

export const useTerminalStore = create<TerminalStore>((set, get) => ({
  sessions: new Map(),
  focusedTerminalId: null,

  createSession: (worktreeId: string, cwd: string) => {
    const id = uuid()
    const session: TerminalSession = {
      id,
      worktreeId,
      status: 'idle',
      commandState: 'idle',
      cols: 80,
      rows: 24,
      title: '',
      cwd,
    }
    set((state) => {
      const sessions = new Map(state.sessions)
      sessions.set(id, session)
      return { sessions, focusedTerminalId: id }
    })
    return id
  },

  removeSession: (id: string) => {
    set((state) => {
      const sessions = new Map(state.sessions)
      sessions.delete(id)
      const focusedTerminalId = state.focusedTerminalId === id ? null : state.focusedTerminalId
      return { sessions, focusedTerminalId }
    })
  },

  setFocused: (id: string | null) => set({ focusedTerminalId: id }),

  getSession: (id: string) => get().sessions.get(id),

  setCommandState: (id: string, state: CommandState, exitCode?: number) => {
    set((prev) => {
      const session = prev.sessions.get(id)
      if (!session || session.commandState === state) return prev
      const sessions = new Map(prev.sessions)
      sessions.set(id, { ...session, commandState: state, lastExitCode: exitCode })
      return { sessions }
    })
  },

  getWorktreeCommandState: (worktreeId: string) => {
    const sessions = get().sessions
    let hasBusy = false
    for (const session of sessions.values()) {
      if (session.worktreeId !== worktreeId) continue
      if (session.commandState === 'done') return 'done'
      if (session.commandState === 'busy') hasBusy = true
    }
    return hasBusy ? 'busy' : 'idle'
  },

  clearWorktreeDone: (worktreeId: string) => {
    set((prev) => {
      const sessions = new Map(prev.sessions)
      let changed = false
      for (const [id, session] of sessions) {
        if (session.worktreeId === worktreeId && session.commandState === 'done') {
          sessions.set(id, { ...session, commandState: 'idle' })
          changed = true
        }
      }
      return changed ? { sessions } : prev
    })
  },
}))
