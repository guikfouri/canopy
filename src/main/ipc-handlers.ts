import { ipcMain, BrowserWindow, dialog } from 'electron'
import { IPC } from '../shared/ipc-channels'
import type { CreateTerminalPayload, ResizeTerminalPayload, CreateWorktreePayload } from '../shared/types'
import * as terminalManager from './terminal-manager'
import * as worktreeManager from './worktree-manager'
import * as configStore from './config-store'
import fs from 'fs'
import { promises as fsp } from 'fs'
import path from 'path'
import type { FileEntry } from '../shared/types'

function getMainWindow(): BrowserWindow | null {
  const windows = BrowserWindow.getAllWindows()
  return windows[0] || null
}

function wireTerminalCallbacks(id: string): void {
  terminalManager.onTerminalData(id, (data) => {
    const win = getMainWindow()
    if (win && !win.isDestroyed()) {
      win.webContents.send(IPC.TERMINAL_OUTPUT, { id, data })
    }
  })

  terminalManager.onTerminalExit(id, (code) => {
    const win = getMainWindow()
    if (win && !win.isDestroyed()) {
      win.webContents.send(IPC.TERMINAL_EXIT, { id, code })
    }
  })

  terminalManager.onCommandState(id, (state) => {
    const win = getMainWindow()
    if (win && !win.isDestroyed()) {
      win.webContents.send(IPC.TERMINAL_COMMAND_STATE, { id, state })
    }
  })
}

export function registerIpcHandlers(): void {
  // ── Terminal ──────────────────────────────────
  ipcMain.handle(IPC.TERMINAL_CREATE, async (_event, payload: CreateTerminalPayload) => {
    await terminalManager.createTerminal(payload)
    wireTerminalCallbacks(payload.id)
  })

  // Attach to an existing terminal (reconnect after worktree switch)
  ipcMain.handle(IPC.TERMINAL_ATTACH, async (_event, id: string): Promise<{ exists: boolean; scrollback: string | null; exited: boolean; exitCode: number | null }> => {
    if (!terminalManager.hasTerminal(id)) {
      return { exists: false, scrollback: null, exited: false, exitCode: null }
    }

    // Re-wire callbacks to current window
    wireTerminalCallbacks(id)

    const scrollback = terminalManager.getScrollback(id)
    const exitInfo = terminalManager.getExitInfo(id)!
    return { exists: true, scrollback, exited: exitInfo.exited, exitCode: exitInfo.exitCode }
  })

  ipcMain.on(IPC.TERMINAL_INPUT, (_event, { id, data }: { id: string; data: string }) => {
    terminalManager.writeToTerminal(id, data)
  })

  ipcMain.on(IPC.TERMINAL_RESIZE, (_event, payload: ResizeTerminalPayload) => {
    terminalManager.resizeTerminal(payload)
  })

  ipcMain.handle(IPC.TERMINAL_DESTROY, async (_event, id: string) => {
    terminalManager.destroyTerminal(id)
  })

  // ── Worktree ──────────────────────────────────
  ipcMain.handle(IPC.WORKTREE_CREATE, async (_event, payload: CreateWorktreePayload) => {
    return worktreeManager.createWorktree(payload)
  })

  ipcMain.handle(IPC.WORKTREE_LIST, async (_event, repoPath: string) => {
    return worktreeManager.listWorktrees(repoPath)
  })

  ipcMain.handle(IPC.WORKTREE_REMOVE, async (_event, { worktreePath, deleteBranch }: { worktreePath: string; deleteBranch?: string }) => {
    return worktreeManager.removeWorktree(worktreePath, deleteBranch)
  })

  // ── Git ─────────────────────────────────────
  ipcMain.handle(IPC.GIT_GET_BRANCH, async (_event, worktreePath: string) => {
    return worktreeManager.getBranch(worktreePath)
  })

  ipcMain.handle(IPC.GIT_LIST_BRANCHES, async (_event, repoPath: string) => {
    return worktreeManager.listBranches(repoPath)
  })

  ipcMain.handle(IPC.GIT_CHECKOUT, async (_event, { worktreePath, branch }: { worktreePath: string; branch: string }) => {
    return worktreeManager.checkoutBranch(worktreePath, branch)
  })

  ipcMain.handle(IPC.GIT_STATUS, async (_event, worktreePath: string) => {
    return worktreeManager.getStatus(worktreePath)
  })

  // ── Config persistence ──────────────────────────
  ipcMain.handle(IPC.CONFIG_LOAD, async () => {
    return configStore.loadConfig()
  })

  ipcMain.handle(IPC.CONFIG_SAVE, async (_event, config) => {
    configStore.saveConfig(config)
  })

  // ── Dialog ───────────────────────────────────
  ipcMain.handle(IPC.DIALOG_OPEN_DIRECTORY, async (): Promise<string | null> => {
    const win = getMainWindow()
    if (!win) return null

    const result = await dialog.showOpenDialog(win, {
      title: 'Select Project Directory',
      properties: ['openDirectory'],
    })

    if (result.canceled || result.filePaths.length === 0) return null
    return result.filePaths[0]
  })

  ipcMain.handle(IPC.DIALOG_SAVE_FILE, async (_event, defaultPath?: string): Promise<string | null> => {
    const win = getMainWindow()
    if (!win) return null

    const result = await dialog.showSaveDialog(win, {
      title: 'Save File',
      defaultPath: defaultPath || undefined,
    })

    if (result.canceled || !result.filePath) return null
    return result.filePath
  })

  // ── Filesystem ────────────────────────────────
  ipcMain.handle(IPC.FS_READ_FILE, async (_event, filePath: string): Promise<string | null> => {
    try {
      return fs.readFileSync(filePath, 'utf-8')
    } catch {
      return null
    }
  })

  ipcMain.handle(IPC.FS_WRITE_FILE, async (_event, { filePath: fp, content }: { filePath: string; content: string }): Promise<boolean> => {
    try {
      fs.writeFileSync(fp, content, 'utf-8')
      return true
    } catch {
      return false
    }
  })

  ipcMain.handle(IPC.FS_CREATE_DIR, async (_event, dirPath: string): Promise<boolean> => {
    try {
      await fsp.mkdir(dirPath, { recursive: true })
      return true
    } catch {
      return false
    }
  })

  ipcMain.handle(IPC.FS_RENAME, async (_event, { oldPath, newPath }: { oldPath: string; newPath: string }): Promise<boolean> => {
    try {
      await fsp.rename(oldPath, newPath)
      return true
    } catch {
      return false
    }
  })

  ipcMain.handle(IPC.FS_DELETE, async (_event, targetPath: string): Promise<boolean> => {
    try {
      await fsp.rm(targetPath, { recursive: true })
      return true
    } catch {
      return false
    }
  })

  ipcMain.handle(IPC.FS_STAT, async (_event, filePath: string): Promise<{ exists: boolean; isDirectory: boolean } | null> => {
    try {
      const stat = await fsp.stat(filePath)
      return { exists: true, isDirectory: stat.isDirectory() }
    } catch {
      return { exists: false, isDirectory: false }
    }
  })

  ipcMain.handle(IPC.FS_READ_DIR, async (_event, dirPath: string): Promise<FileEntry[]> => {
    try {
      const entries = fs.readdirSync(dirPath, { withFileTypes: true })
      return entries
        .filter(e => !e.name.startsWith('.'))
        .sort((a, b) => {
          // Directories first, then alphabetical
          if (a.isDirectory() !== b.isDirectory()) return a.isDirectory() ? -1 : 1
          return a.name.localeCompare(b.name)
        })
        .map(e => ({
          name: e.name,
          path: path.join(dirPath, e.name),
          isDirectory: e.isDirectory(),
        }))
    } catch {
      return []
    }
  })
}
