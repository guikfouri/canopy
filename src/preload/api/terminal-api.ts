import { ipcRenderer } from 'electron'
import { IPC } from '../../shared/ipc-channels'
import type { CreateTerminalPayload, ResizeTerminalPayload, CommandState } from '../../shared/types'

export interface AttachResult {
  exists: boolean
  scrollback: string | null
  exited: boolean
  exitCode: number | null
}

export const terminalApi = {
  create: (payload: CreateTerminalPayload) =>
    ipcRenderer.invoke(IPC.TERMINAL_CREATE, payload),

  attach: (id: string): Promise<AttachResult> =>
    ipcRenderer.invoke(IPC.TERMINAL_ATTACH, id),

  destroy: (id: string) =>
    ipcRenderer.invoke(IPC.TERMINAL_DESTROY, id),

  write: (id: string, data: string) =>
    ipcRenderer.send(IPC.TERMINAL_INPUT, { id, data }),

  resize: (id: string, cols: number, rows: number) =>
    ipcRenderer.send(IPC.TERMINAL_RESIZE, { id, cols, rows } satisfies ResizeTerminalPayload),

  onOutput: (callback: (data: { id: string; data: string }) => void) => {
    const handler = (_event: Electron.IpcRendererEvent, data: { id: string; data: string }) => callback(data)
    ipcRenderer.on(IPC.TERMINAL_OUTPUT, handler)
    return () => ipcRenderer.removeListener(IPC.TERMINAL_OUTPUT, handler)
  },

  onExit: (callback: (data: { id: string; code: number }) => void) => {
    const handler = (_event: Electron.IpcRendererEvent, data: { id: string; code: number }) => callback(data)
    ipcRenderer.on(IPC.TERMINAL_EXIT, handler)
    return () => ipcRenderer.removeListener(IPC.TERMINAL_EXIT, handler)
  },

  onCommandState: (callback: (data: { id: string; state: CommandState; exitCode?: number }) => void) => {
    const handler = (_event: Electron.IpcRendererEvent, data: { id: string; state: CommandState; exitCode?: number }) => callback(data)
    ipcRenderer.on(IPC.TERMINAL_COMMAND_STATE, handler)
    return () => ipcRenderer.removeListener(IPC.TERMINAL_COMMAND_STATE, handler)
  },
}
