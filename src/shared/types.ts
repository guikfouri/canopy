// ── Tab System ──────────────────────────────────────
export interface Tab {
  id: string
  type: 'terminal' | 'file'
  title: string
  terminalId?: string   // For terminal tabs
  filePath?: string     // For file tabs
  isDirty?: boolean     // For file tabs — unsaved changes
}

// ── Split Tree ─────────────────────────────────────
export interface TabGroupNode {
  type: 'tab-group'
  id: string
  tabs: Tab[]
  activeTabId: string
}

export interface SplitNodeInternal {
  type: 'split'
  direction: 'horizontal' | 'vertical'
  ratio: number
  children: [SplitNode, SplitNode]
}

export type SplitNode = TabGroupNode | SplitNodeInternal

// ── Terminal Session ───────────────────────────────
export interface TerminalSession {
  id: string
  worktreeId: string
  status: 'idle' | 'running' | 'exited'
  cols: number
  rows: number
  title: string
  cwd: string
}

// ── Project (top-level repo) ───────────────────────
export interface Project {
  id: string
  name: string
  path: string           // Root path of the git repo
  color: string
  createdAt: string
}

// ── Worktree (git worktree within a project) ───────
export interface Worktree {
  id: string
  projectId: string      // Which project this belongs to
  name: string           // Display name (e.g. "Florence", "Baton rouge")
  worktreePath: string   // Path to the git worktree
  branch: string
  color: string          // Inherited from project or custom
  isMain: boolean        // True if this is the main worktree (not a created one)
  splitLayout: SplitNode
  createdAt: string
}

// ── Persisted Config ───────────────────────────────
export interface CanopyConfig {
  version: 1
  theme: ThemePreference
  projects: Project[]
  worktrees: Worktree[]
  activeWorktreeId: string | null
  sidebarWidth: number
  fileExplorerWidth: number
  terminalScrollback: number
  terminalFontSize: number
}

// ── File Tree ──────────────────────────────────────
export interface FileEntry {
  name: string
  path: string
  isDirectory: boolean
  children?: FileEntry[]
}

// ── Git Status ────────────────────────────────
export interface GitFileChange {
  path: string
  status: 'added' | 'modified' | 'deleted' | 'renamed' | 'untracked'
  staged: boolean
}

// ── Todo Item ─────────────────────────────────
export interface TodoItem {
  id: string
  text: string
  completed: boolean
}

// ── Theme ──────────────────────────────────────
export type ThemePreference = 'system' | 'dark' | 'light'

// ── IPC Payloads ───────────────────────────────────
export interface CreateTerminalPayload {
  id: string
  cwd: string
  cols: number
  rows: number
  scrollback?: number
}

export interface ResizeTerminalPayload {
  id: string
  cols: number
  rows: number
}

export interface CreateWorktreePayload {
  repoPath: string
  branch: string
  name: string
}

export interface WorktreeInfo {
  path: string
  branch: string
  head: string
  isMain: boolean
}
