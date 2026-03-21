import { contextBridge } from 'electron'
import { terminalApi } from './api/terminal-api'
import { canopyApi } from './api/canopy-api'

const electronAPI = {
  terminal: terminalApi,
  canopy: canopyApi,
}

contextBridge.exposeInMainWorld('electronAPI', electronAPI)
contextBridge.exposeInMainWorld('platform', {
  isMacOS: process.platform === 'darwin',
  isWindows: process.platform === 'win32',
  isLinux: process.platform === 'linux',
})

// Type declaration for renderer
export type ElectronAPI = typeof electronAPI
