export const IPC = {
  // Terminal
  TERMINAL_CREATE: 'terminal:create',
  TERMINAL_ATTACH: 'terminal:attach',
  TERMINAL_DESTROY: 'terminal:destroy',
  TERMINAL_INPUT: 'terminal:input',
  TERMINAL_RESIZE: 'terminal:resize',
  TERMINAL_OUTPUT: 'terminal:output',
  TERMINAL_EXIT: 'terminal:exit',

  // Worktree
  WORKTREE_CREATE: 'worktree:create',
  WORKTREE_LIST: 'worktree:list',
  WORKTREE_REMOVE: 'worktree:remove',

  // Config persistence
  CONFIG_LOAD: 'config:load',
  CONFIG_SAVE: 'config:save',

  // Git
  GIT_LIST_BRANCHES: 'git:list-branches',
  GIT_CHECKOUT: 'git:checkout',
  GIT_STATUS: 'git:status',

  // Dialog
  DIALOG_OPEN_DIRECTORY: 'dialog:open-directory',

  // Filesystem
  FS_READ_DIR: 'fs:readdir',
  FS_READ_FILE: 'fs:read-file',
  FS_WRITE_FILE: 'fs:write-file',
  FS_WATCH_START: 'fs:watch:start',
  FS_WATCH_STOP: 'fs:watch:stop',
  FS_CHANGE: 'fs:change',
} as const
