import { ipcRenderer } from 'electron'
import { IPC } from '../../shared/ipc-channels'
import type { CanopyConfig, CreateWorktreePayload, WorktreeInfo, FileEntry } from '../../shared/types'

export const canopyApi = {
  loadConfig: (): Promise<CanopyConfig> =>
    ipcRenderer.invoke(IPC.CONFIG_LOAD),

  saveConfig: (config: CanopyConfig): Promise<void> =>
    ipcRenderer.invoke(IPC.CONFIG_SAVE, config),

  createWorktree: (payload: CreateWorktreePayload): Promise<WorktreeInfo> =>
    ipcRenderer.invoke(IPC.WORKTREE_CREATE, payload),

  listWorktrees: (repoPath: string): Promise<WorktreeInfo[]> =>
    ipcRenderer.invoke(IPC.WORKTREE_LIST, repoPath),

  removeWorktree: (worktreePath: string, deleteBranch?: string): Promise<void> =>
    ipcRenderer.invoke(IPC.WORKTREE_REMOVE, { worktreePath, deleteBranch }),

  readDir: (dirPath: string): Promise<FileEntry[]> =>
    ipcRenderer.invoke(IPC.FS_READ_DIR, dirPath),

  readFile: (filePath: string): Promise<string | null> =>
    ipcRenderer.invoke(IPC.FS_READ_FILE, filePath),

  writeFile: (filePath: string, content: string): Promise<boolean> =>
    ipcRenderer.invoke(IPC.FS_WRITE_FILE, { filePath, content }),

  openDirectoryDialog: (): Promise<string | null> =>
    ipcRenderer.invoke(IPC.DIALOG_OPEN_DIRECTORY),

  getBranch: (worktreePath: string): Promise<string> =>
    ipcRenderer.invoke(IPC.GIT_GET_BRANCH, worktreePath),

  listBranches: (repoPath: string): Promise<{ name: string; current: boolean }[]> =>
    ipcRenderer.invoke(IPC.GIT_LIST_BRANCHES, repoPath),

  checkoutBranch: (worktreePath: string, branch: string): Promise<void> =>
    ipcRenderer.invoke(IPC.GIT_CHECKOUT, { worktreePath, branch }),

  gitStatus: (worktreePath: string): Promise<{ path: string; status: string; staged: boolean }[]> =>
    ipcRenderer.invoke(IPC.GIT_STATUS, worktreePath),

  createDir: (dirPath: string): Promise<boolean> =>
    ipcRenderer.invoke(IPC.FS_CREATE_DIR, dirPath),

  rename: (oldPath: string, newPath: string): Promise<boolean> =>
    ipcRenderer.invoke(IPC.FS_RENAME, { oldPath, newPath }),

  delete: (targetPath: string): Promise<boolean> =>
    ipcRenderer.invoke(IPC.FS_DELETE, targetPath),

  stat: (filePath: string): Promise<{ exists: boolean; isDirectory: boolean } | null> =>
    ipcRenderer.invoke(IPC.FS_STAT, filePath),

  saveFileDialog: (defaultPath?: string): Promise<string | null> =>
    ipcRenderer.invoke(IPC.DIALOG_SAVE_FILE, defaultPath),

  openExternal: (url: string): Promise<void> =>
    ipcRenderer.invoke(IPC.SHELL_OPEN_EXTERNAL, url),
}
