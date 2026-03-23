import { create } from 'zustand'
import type { CommandState, SplitNode } from '@shared/types'

// Find all terminalIds in a split layout tree
function collectTerminalIds(node: SplitNode): string[] {
  if (node.type === 'tab-group') {
    return node.tabs
      .filter(t => t.type === 'terminal' && t.terminalId)
      .map(t => t.terminalId!)
  }
  return [
    ...collectTerminalIds(node.children[0]),
    ...collectTerminalIds(node.children[1]),
  ]
}

interface TerminalCommandInfo {
  state: CommandState
  exitCode?: number
}

interface TerminalStore {
  commandStates: Map<string, TerminalCommandInfo>
  focusedTerminalId: string | null

  setFocused: (id: string | null) => void
  setCommandState: (id: string, state: CommandState, exitCode?: number) => void

  // Derive worktree command state from split layout + command states
  getWorktreeCommandState: (splitLayout: SplitNode) => CommandState
  clearWorktreeDone: (splitLayout: SplitNode) => void
}

export const useTerminalStore = create<TerminalStore>((set, get) => ({
  commandStates: new Map(),
  focusedTerminalId: null,

  setFocused: (id: string | null) => set({ focusedTerminalId: id }),

  setCommandState: (id: string, state: CommandState, exitCode?: number) => {
    set((prev) => {
      const current = prev.commandStates.get(id)
      if (current?.state === state) return prev
      const commandStates = new Map(prev.commandStates)
      commandStates.set(id, { state, exitCode })
      return { commandStates }
    })
  },

  getWorktreeCommandState: (splitLayout: SplitNode) => {
    const terminalIds = collectTerminalIds(splitLayout)
    const states = get().commandStates
    let hasBusy = false
    for (const id of terminalIds) {
      const info = states.get(id)
      if (!info) continue
      if (info.state === 'done') return 'done'
      if (info.state === 'busy') hasBusy = true
    }
    return hasBusy ? 'busy' : 'idle'
  },

  clearWorktreeDone: (splitLayout: SplitNode) => {
    const terminalIds = collectTerminalIds(splitLayout)
    set((prev) => {
      let changed = false
      const commandStates = new Map(prev.commandStates)
      for (const id of terminalIds) {
        const info = commandStates.get(id)
        if (info?.state === 'done') {
          commandStates.set(id, { state: 'idle' })
          changed = true
        }
      }
      return changed ? { commandStates } : prev
    })
  },
}))
