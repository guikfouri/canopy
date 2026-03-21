import { create } from 'zustand'
import { v4 as uuid } from 'uuid'
import type { TerminalSession } from '@shared/types'

interface TerminalStore {
  sessions: Map<string, TerminalSession>
  focusedTerminalId: string | null

  createSession: (worktreeId: string, cwd: string) => string
  removeSession: (id: string) => void
  setFocused: (id: string | null) => void
  getSession: (id: string) => TerminalSession | undefined
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
}))
