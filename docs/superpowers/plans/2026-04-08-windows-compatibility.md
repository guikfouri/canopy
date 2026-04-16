# Windows Compatibility Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add full Windows support to Canopy — shell detection, PowerShell integration, config path migration, and Windows build target — without regressing macOS/Linux.

**Architecture:** Introduce a `ShellProvider` interface with `UnixShellProvider` (extracts current code) and `WindowsShellProvider` (new). `terminal-manager.ts` selects the correct provider at startup based on `process.platform`. All other app layers (React, Zustand, Monaco) are already cross-platform.

**Tech Stack:** Electron, TypeScript, `@lydell/node-pty`, `electron-builder` (NSIS), PowerShell OSC 133 integration script.

---

## File Map

| Action | File | Purpose |
|--------|------|---------|
| CREATE | `src/main/shell-providers/shell-provider.interface.ts` | `ShellProvider` interface + `ShellInfo` type |
| CREATE | `src/main/shell-providers/shell-utils.ts` | Shared: `getShellIntegrationDir()`, `getZshBootstrapDir()` |
| CREATE | `src/main/shell-providers/unix-shell-provider.ts` | Extracts current shell logic from `terminal-manager.ts` |
| CREATE | `src/main/shell-providers/windows-shell-provider.ts` | Windows shell detection + PowerShell integration |
| CREATE | `src/main/shell-integration/canopy-integration.ps1` | PowerShell Core OSC 133 integration script |
| MODIFY | `src/shared/types.ts` | Add `ShellType` export |
| MODIFY | `src/shared/ipc-channels.ts` | Add `TERMINAL_GET_SHELL_TYPE` |
| MODIFY | `src/main/terminal-manager.ts` | Wire `ShellProvider`, store `shellType`, add `getTerminalShellType` export |
| MODIFY | `src/main/config-store.ts` | Migrate to `app.getPath('userData')` + legacy migration |
| MODIFY | `src/main/ipc-handlers.ts` | Handle `TERMINAL_GET_SHELL_TYPE` |
| MODIFY | `src/preload/api/terminal-api.ts` | Expose `getShellType` IPC call |
| MODIFY | `src/renderer/components/terminal/TerminalPane.tsx` | Shell-aware `shellEscape`, update `window` type |
| MODIFY | `src/renderer/components/terminal/FileEditorPane.tsx` | Add `.bat`, `.cmd`, `.ps1` to Monaco language map |
| MODIFY | `package.json` | Add `pack:win` script + NSIS build config |
| MODIFY | `README.md` | Update platform badge, add Windows install section |

---

## Task 1: Add ShellType to shared types and IPC channel

**Files:**
- Modify: `src/shared/types.ts`
- Modify: `src/shared/ipc-channels.ts`

- [ ] **Step 1: Add ShellType to types.ts**

Open `src/shared/types.ts`. Add this export after the `CommandState` type (after line 28):

```typescript
export type ShellType = 'zsh' | 'bash' | 'fish' | 'pwsh' | 'powershell' | 'cmd' | 'unknown'
```

- [ ] **Step 2: Add IPC channel constant**

Open `src/shared/ipc-channels.ts`. Add inside the `IPC` object, after `TERMINAL_COMMAND_STATE`:

```typescript
TERMINAL_GET_SHELL_TYPE: 'terminal:get-shell-type',
```

- [ ] **Step 3: Verify TypeScript compiles**

```bash
npm run typecheck
```
Expected: no errors.

- [ ] **Step 4: Commit**

```bash
git add src/shared/types.ts src/shared/ipc-channels.ts
git commit -m "feat(ipc): add ShellType and terminal:get-shell-type channel"
```

---

## Task 2: Create shell-utils.ts (shared utilities)

**Files:**
- Create: `src/main/shell-providers/shell-utils.ts`

- [ ] **Step 1: Create the directory and file**

```bash
mkdir -p src/main/shell-providers
```

Create `src/main/shell-providers/shell-utils.ts`:

```typescript
import { app } from 'electron'
import path from 'path'
import fs from 'fs'

const DEBUG = !app.isPackaged
function log(...args: unknown[]) {
  if (DEBUG) console.log('[canopy-term]', ...args)
}

export function getShellIntegrationDir(): string {
  if (app.isPackaged) {
    return path.join(process.resourcesPath, 'shell-integration')
  }
  const dir = path.join(app.getAppPath(), 'src', 'main', 'shell-integration')
  if (!fs.existsSync(dir)) {
    const fallback = path.join(__dirname, '..', '..', 'src', 'main', 'shell-integration')
    log('shell-integration dir (primary missing, using fallback):', fallback, '| exists:', fs.existsSync(fallback))
    return fallback
  }
  log('shell-integration dir:', dir)
  return dir
}

export function getZshBootstrapDir(): string {
  return path.join(getShellIntegrationDir(), 'zsh-bootstrap')
}
```

- [ ] **Step 2: Verify TypeScript compiles**

```bash
npm run typecheck
```
Expected: no errors.

- [ ] **Step 3: Commit**

```bash
git add src/main/shell-providers/shell-utils.ts
git commit -m "feat(terminal): extract shell integration path utilities to shell-utils"
```

---

## Task 3: Create ShellProvider interface

**Files:**
- Create: `src/main/shell-providers/shell-provider.interface.ts`

- [ ] **Step 1: Create the interface file**

Create `src/main/shell-providers/shell-provider.interface.ts`:

```typescript
import type { ShellType } from '../../shared/types'

export interface ShellInfo {
  executable: string
  type: ShellType
  args: string[]
  env: Record<string, string | undefined>
  integrationSupported: boolean
}

export interface ShellProvider {
  detect(): ShellInfo
  getIntegrationArgs(info: ShellInfo): string[]
  getIntegrationEnv(info: ShellInfo): Record<string, string | undefined>
  escapeFilePath(filePath: string): string
}
```

- [ ] **Step 2: Verify TypeScript compiles**

```bash
npm run typecheck
```
Expected: no errors.

- [ ] **Step 3: Commit**

```bash
git add src/main/shell-providers/shell-provider.interface.ts
git commit -m "feat(terminal): add ShellProvider interface"
```

---

## Task 4: Create UnixShellProvider (extract existing logic)

**Files:**
- Create: `src/main/shell-providers/unix-shell-provider.ts`

This task extracts the existing logic from `terminal-manager.ts` into the provider. The logic itself is **not changed** — only moved.

- [ ] **Step 1: Create UnixShellProvider**

Create `src/main/shell-providers/unix-shell-provider.ts`:

```typescript
import path from 'path'
import type { ShellProvider, ShellInfo } from './shell-provider.interface'
import { getShellIntegrationDir, getZshBootstrapDir } from './shell-utils'

function detectUnixShellType(shellPath: string): 'zsh' | 'bash' | 'fish' | 'unknown' {
  const base = path.basename(shellPath)
  if (base === 'zsh' || base.startsWith('zsh-')) return 'zsh'
  if (base === 'bash' || base.startsWith('bash-')) return 'bash'
  if (base === 'fish' || base.startsWith('fish-')) return 'fish'
  return 'unknown'
}

export class UnixShellProvider implements ShellProvider {
  detect(): ShellInfo {
    const executable = process.env.SHELL ?? (process.platform === 'darwin' ? '/bin/zsh' : '/bin/bash')
    const type = detectUnixShellType(executable)
    return {
      executable,
      type,
      args: [],
      env: {},
      integrationSupported: type !== 'unknown',
    }
  }

  getIntegrationArgs(info: ShellInfo): string[] {
    const integrationDir = getShellIntegrationDir()
    if (info.type === 'bash') {
      return ['--rcfile', path.join(integrationDir, 'canopy-integration.bash')]
    }
    if (info.type === 'fish') {
      return ['-C', `source ${path.join(integrationDir, 'canopy-integration.fish')}`]
    }
    return []
  }

  getIntegrationEnv(info: ShellInfo): Record<string, string | undefined> {
    const integrationDir = getShellIntegrationDir()
    if (info.type === 'zsh') {
      return {
        CANOPY_ORIGINAL_ZDOTDIR: process.env.ZDOTDIR ?? '',
        ZDOTDIR: getZshBootstrapDir(),
        CANOPY_SHELL_INTEGRATION_DIR: integrationDir,
      }
    }
    if (info.type === 'bash' || info.type === 'fish') {
      return { CANOPY_SHELL_INTEGRATION_DIR: integrationDir }
    }
    return {}
  }

  escapeFilePath(filePath: string): string {
    return filePath.replace(/([\\  !"#$&'()*,:;<>?@[\]^`{|}~])/g, '\\$1')
  }
}
```

- [ ] **Step 2: Verify TypeScript compiles**

```bash
npm run typecheck
```
Expected: no errors.

- [ ] **Step 3: Commit**

```bash
git add src/main/shell-providers/unix-shell-provider.ts
git commit -m "feat(terminal): extract Unix shell logic into UnixShellProvider"
```

---

## Task 5: Create WindowsShellProvider

**Files:**
- Create: `src/main/shell-providers/windows-shell-provider.ts`

- [ ] **Step 1: Create WindowsShellProvider**

Create `src/main/shell-providers/windows-shell-provider.ts`:

```typescript
import { execFileSync } from 'child_process'
import path from 'path'
import type { ShellProvider, ShellInfo } from './shell-provider.interface'
import { getShellIntegrationDir } from './shell-utils'

function findInPath(name: string): string | null {
  try {
    const result = execFileSync('where.exe', [name], { encoding: 'utf8', timeout: 3000 })
    const firstLine = result.trim().split('\n')[0].trim()
    return firstLine || null
  } catch {
    return null
  }
}

export class WindowsShellProvider implements ShellProvider {
  detect(): ShellInfo {
    const pwsh = findInPath('pwsh')
    if (pwsh) {
      return { executable: pwsh, type: 'pwsh', args: [], env: {}, integrationSupported: true }
    }

    const powershell = findInPath('powershell')
    if (powershell) {
      return { executable: powershell, type: 'powershell', args: [], env: {}, integrationSupported: false }
    }

    const comspec = process.env.COMSPEC ?? 'cmd.exe'
    return { executable: comspec, type: 'cmd', args: [], env: {}, integrationSupported: false }
  }

  getIntegrationArgs(info: ShellInfo): string[] {
    if (info.type === 'pwsh') {
      const scriptPath = path.join(getShellIntegrationDir(), 'canopy-integration.ps1')
      return ['-NoLogo', '-NoExit', '-ExecutionPolicy', 'Bypass', '-File', scriptPath]
    }
    // powershell.exe and cmd.exe: no integration args, ANSI fallback handles state detection
    return []
  }

  getIntegrationEnv(_info: ShellInfo): Record<string, string | undefined> {
    return {}
  }

  escapeFilePath(filePath: string): string {
    // PowerShell (pwsh + powershell.exe): single-quoted strings, escape internal single quotes by doubling
    // Also used for cmd.exe — close enough for most paths
    return `'${filePath.replace(/'/g, "''")}'`
  }
}
```

- [ ] **Step 2: Verify TypeScript compiles**

```bash
npm run typecheck
```
Expected: no errors.

- [ ] **Step 3: Commit**

```bash
git add src/main/shell-providers/windows-shell-provider.ts
git commit -m "feat(terminal): implement WindowsShellProvider with pwsh/powershell/cmd detection"
```

---

## Task 6: Create PowerShell Core integration script

**Files:**
- Create: `src/main/shell-integration/canopy-integration.ps1`

- [ ] **Step 1: Create the PowerShell script**

Create `src/main/shell-integration/canopy-integration.ps1`:

```powershell
# Canopy terminal shell integration for PowerShell Core (pwsh)
# Emits OSC 133 escape sequences at command boundaries.
# Loaded via -File argument — does NOT modify the user's $PROFILE.

# Guard against double-loading
if ($env:__CANOPY_SHELL_INTEGRATION) { return }
$env:__CANOPY_SHELL_INTEGRATION = '1'

function prompt {
  # OSC 133;A — prompt start
  [Console]::Write("`e]133;A`a")
  $result = "PS $($executionContext.SessionState.Path.CurrentLocation)> "
  # OSC 133;B — prompt end / input start
  [Console]::Write("`e]133;B`a")
  $result
}

# OSC 133;C — command start (fires before each command executes)
$ExecutionContext.SessionState.InvokeCommand.PreCommandLookupAction = {
  param($commandName, $eventArgs)
  # Only emit once per command (skip built-in lookup noise)
  if ($eventArgs.CommandOrigin -eq 'Runspace') {
    [Console]::Write("`e]133;C`a")
  }
}
```

- [ ] **Step 2: Verify the file was created correctly**

```bash
cat src/main/shell-integration/canopy-integration.ps1
```
Expected: file content printed, no errors.

- [ ] **Step 3: Commit**

```bash
git add src/main/shell-integration/canopy-integration.ps1
git commit -m "feat(terminal): add PowerShell Core OSC 133 integration script"
```

---

## Task 7: Refactor terminal-manager.ts to use ShellProvider

**Files:**
- Modify: `src/main/terminal-manager.ts`

This task wires the provider into `terminal-manager.ts`, removes the now-extracted functions, and adds `shellType` tracking to `ManagedTerminal`.

- [ ] **Step 1: Add provider selection and imports at the top of terminal-manager.ts**

Replace the top of the file (imports through the `ShellType` type definition, lines 1–11 and line 97) with:

```typescript
import { app } from 'electron'
import path from 'path'
import fs from 'fs'
import type { CreateTerminalPayload, ResizeTerminalPayload, CommandState, ShellType } from '../shared/types'
import { UnixShellProvider } from './shell-providers/unix-shell-provider'
import { WindowsShellProvider } from './shell-providers/windows-shell-provider'
import type { ShellProvider } from './shell-providers/shell-provider.interface'

const shellProvider: ShellProvider =
  process.platform === 'win32'
    ? new WindowsShellProvider()
    : new UnixShellProvider()
```

- [ ] **Step 2: Remove the extracted functions**

Delete the following functions from `terminal-manager.ts` (they now live in their respective providers and `shell-utils.ts`):
- `getShellIntegrationDir()` (lines 77–91)
- `getZshBootstrapDir()` (lines 93–95)
- `type ShellType = ...` (line 97)
- `detectShellType()` (lines 99–105)
- `buildShellEnv()` (lines 107–132)
- `getDefaultShell()` (lines 160–163)

- [ ] **Step 3: Add shellType to ManagedTerminal interface**

In the `ManagedTerminal` interface, add after `oscBuffer: string`:

```typescript
shellType: ShellType
```

- [ ] **Step 4: Replace createTerminal shell logic**

Replace the shell detection + args + env section inside `createTerminal` (the block from `const shell = getDefaultShell()` down to the `log('createTerminal', ...)` call) with:

```typescript
const shellInfo = shellProvider.detect()
const disableIntegration = process.env.CANOPY_DISABLE_SHELL_INTEGRATION === '1'

const baseEnv: Record<string, string | undefined> = {
  ...process.env,
  TERM: 'xterm-256color',
  COLORTERM: 'truecolor',
}
delete baseEnv.CLAUDECODE

const integrationEnv = disableIntegration ? {} : shellProvider.getIntegrationEnv(shellInfo)
const env = { ...baseEnv, ...integrationEnv }

const args: string[] = disableIntegration ? [] : shellProvider.getIntegrationArgs(shellInfo)

log('createTerminal:', {
  id: payload.id,
  shell: shellInfo.executable,
  shellType: shellInfo.type,
  disableIntegration,
  args,
})
```

- [ ] **Step 5: Update PTY spawn call**

Replace `nodePty.spawn(shell, args, { ... })` with:

```typescript
const ptyProcess = nodePty.spawn(shellInfo.executable, args, {
  name: 'xterm-256color',
  cols: payload.cols || 80,
  rows: payload.rows || 24,
  cwd: payload.cwd,
  env,
})
```

- [ ] **Step 6: Add shellType to managed terminal object**

In the `managed` object literal (the one assigned to `const managed: ManagedTerminal = { ... }`), add:

```typescript
shellType: shellInfo.type,
```

- [ ] **Step 7: Add getTerminalShellType export**

Add this export function at the bottom of `terminal-manager.ts`, alongside the other exports:

```typescript
export function getTerminalShellType(id: string): ShellType {
  return terminals.get(id)?.shellType ?? 'unknown'
}
```

- [ ] **Step 8: Remove the zsh file-check block**

Remove the `// Verify shell integration files exist` block (the one that checks `zshScript`, `bootstrapDir`, `bootstrapRc`, `bootstrapEnv`) — it no longer applies cross-platform.

- [ ] **Step 9: Verify TypeScript compiles**

```bash
npm run typecheck
```
Expected: no errors. If there are import errors for `getShellIntegrationDir` or `getZshBootstrapDir` — check that those are still used in `terminal-manager.ts` (they're not, remove any remaining direct calls) and that they're imported from `shell-utils.ts` in the providers.

- [ ] **Step 10: Commit**

```bash
git add src/main/terminal-manager.ts
git commit -m "refactor(terminal): wire ShellProvider into terminal-manager, remove extracted shell logic"
```

---

## Task 8: Migrate config-store.ts to app.getPath('userData')

**Files:**
- Modify: `src/main/config-store.ts`

- [ ] **Step 1: Replace CONFIG_DIR and add legacy migration**

Replace the entire `config-store.ts` with:

```typescript
import fs from 'fs'
import path from 'path'
import { app } from 'electron'
import type { CanopyConfig } from '../shared/types'

// Use platform-appropriate app data dir:
// Windows:  %APPDATA%\Canopy
// macOS:    ~/Library/Application Support/Canopy
// Linux:    ~/.config/Canopy
const CONFIG_DIR = path.join(app.getPath('userData'), 'canopy')
const CONFIG_FILE = path.join(CONFIG_DIR, 'config.json')

// One-time migration: copy config from old ~/.canopy location if new path doesn't exist yet
function migrateConfigIfNeeded(): void {
  if (fs.existsSync(CONFIG_FILE)) return
  const legacyFile = path.join(app.getPath('home'), '.canopy', 'config.json')
  if (!fs.existsSync(legacyFile)) return
  try {
    fs.mkdirSync(CONFIG_DIR, { recursive: true })
    fs.copyFileSync(legacyFile, CONFIG_FILE)
  } catch {
    // Migration failed — not fatal, will start with default config
  }
}

migrateConfigIfNeeded()

const DEFAULT_CONFIG: CanopyConfig = {
  version: 1,
  theme: 'system',
  projects: [],
  worktrees: [],
  folders: [],
  sidebarOrder: [],
  activeWorktreeId: null,
  sidebarWidth: 220,
  fileExplorerWidth: 280,
  terminalScrollback: 10_000,
  terminalFontSize: 13,
}

export function loadConfig(): CanopyConfig {
  try {
    if (fs.existsSync(CONFIG_FILE)) {
      const data = fs.readFileSync(CONFIG_FILE, 'utf-8')
      return JSON.parse(data) as CanopyConfig
    }
  } catch {
    // Corrupted config, return default
  }
  return { ...DEFAULT_CONFIG }
}

export function saveConfig(config: CanopyConfig): void {
  try {
    if (!fs.existsSync(CONFIG_DIR)) {
      fs.mkdirSync(CONFIG_DIR, { recursive: true })
    }
    fs.writeFileSync(CONFIG_FILE, JSON.stringify(config, null, 2), 'utf-8')
  } catch (err) {
    console.error('Failed to save config:', err)
  }
}
```

- [ ] **Step 2: Verify TypeScript compiles**

```bash
npm run typecheck
```
Expected: no errors.

- [ ] **Step 3: Commit**

```bash
git add src/main/config-store.ts
git commit -m "feat(config): migrate config path to app.getPath('userData') with legacy migration"
```

---

## Task 9: Add IPC handler and preload for getShellType

**Files:**
- Modify: `src/main/ipc-handlers.ts`
- Modify: `src/preload/api/terminal-api.ts`

- [ ] **Step 1: Add IPC handler in ipc-handlers.ts**

Open `src/main/ipc-handlers.ts`. Inside `registerIpcHandlers()`, add after the `TERMINAL_ATTACH` handler block:

```typescript
ipcMain.handle(IPC.TERMINAL_GET_SHELL_TYPE, (_event, id: string) => {
  return terminalManager.getTerminalShellType(id)
})
```

- [ ] **Step 2: Add getShellType to terminal-api.ts**

Open `src/preload/api/terminal-api.ts`. Add the `ShellType` import at the top:

```typescript
import type { CreateTerminalPayload, ResizeTerminalPayload, CommandState, ShellType } from '../../shared/types'
```

Add inside the `terminalApi` object, after `onCommandState`:

```typescript
getShellType: (id: string): Promise<ShellType> =>
  ipcRenderer.invoke(IPC.TERMINAL_GET_SHELL_TYPE, id),
```

- [ ] **Step 3: Verify TypeScript compiles**

```bash
npm run typecheck
```
Expected: no errors.

- [ ] **Step 4: Commit**

```bash
git add src/main/ipc-handlers.ts src/preload/api/terminal-api.ts
git commit -m "feat(ipc): add terminal:get-shell-type handler and preload binding"
```

---

## Task 10: Update TerminalPane.tsx for shell-aware escaping

**Files:**
- Modify: `src/renderer/components/terminal/TerminalPane.tsx`

- [ ] **Step 1: Update the window.electronAPI type declaration**

In `TerminalPane.tsx`, find the `terminal:` block inside the `window` interface declaration (around line 19). Add `getShellType` after `onCommandState`:

```typescript
getShellType: (id: string) => Promise<import('@shared/types').ShellType>
```

- [ ] **Step 2: Replace the shellEscape function**

Replace the current `shellEscape` function (lines 61–64) with:

```typescript
/** Shell-escape a file path based on the active shell type */
function shellEscape(filePath: string, shellType: import('@shared/types').ShellType): string {
  if (shellType === 'pwsh' || shellType === 'powershell') {
    // PowerShell: single-quoted string, escape internal single quotes by doubling
    return `'${filePath.replace(/'/g, "''")}'`
  }
  if (shellType === 'cmd') {
    // CMD: double-quoted string
    return `"${filePath.replace(/"/g, '\\"')}"`
  }
  // POSIX (bash/zsh/fish/unknown): backslash-escape special characters
  return filePath.replace(/([\\  !"#$&'()*,:;<>?@[\]^`{|}~])/g, '\\$1')
}
```

- [ ] **Step 3: Make the onDrop handler shell-type aware**

Find the `onDrop` handler inside the `useEffect` (around line 107). Replace it with an async version that fetches shell type before escaping:

```typescript
const onDrop = async (e: DragEvent) => {
  e.preventDefault()
  e.stopPropagation()
  setIsDragOver(false)
  dragCounterRef.current = 0

  const files = Array.from(e.dataTransfer?.files ?? [])
  if (files.length === 0) return

  const shellType = await window.electronAPI.terminal.getShellType(terminalId)

  const paths = files
    .map((f) => {
      const filePath = window.electronAPI.getPathForFile(f)
      return shellEscape(filePath, shellType)
    })
    .filter(Boolean)
    .join(' ')

  if (paths) {
    window.electronAPI.terminal.write(terminalId, paths)
  }

  terminalRef.current?.focus()
}
```

- [ ] **Step 4: Verify TypeScript compiles**

```bash
npm run typecheck
```
Expected: no errors.

- [ ] **Step 5: Commit**

```bash
git add src/renderer/components/terminal/TerminalPane.tsx
git commit -m "feat(terminal): add shell-aware file path escaping for Windows drag-and-drop"
```

---

## Task 11: Add Windows file type syntax highlighting

**Files:**
- Modify: `src/renderer/components/terminal/FileEditorPane.tsx`

- [ ] **Step 1: Add Windows extensions to the language map**

Open `src/renderer/components/terminal/FileEditorPane.tsx`. Find `getLanguageFromPath` (around line 45). Inside the `langMap` object, add after `zsh: 'shell'`:

```typescript
bat: 'bat', cmd: 'bat',
ps1: 'powershell', psm1: 'powershell', psd1: 'powershell',
```

- [ ] **Step 2: Verify TypeScript compiles**

```bash
npm run typecheck
```
Expected: no errors.

- [ ] **Step 3: Commit**

```bash
git add src/renderer/components/terminal/FileEditorPane.tsx
git commit -m "feat(editor): add Monaco syntax highlighting for .bat, .cmd, .ps1 files"
```

---

## Task 12: Add Windows build target to package.json

**Files:**
- Modify: `package.json`

- [ ] **Step 1: Add pack:win script**

In `package.json`, inside the `"scripts"` block, add after `"pack:linux"`:

```json
"pack:win": "electron-vite build && electron-builder --win --config"
```

- [ ] **Step 2: Add Windows build config**

In `package.json`, inside the `"build"` block, add after the `"linux"` config block:

```json
"win": {
  "target": [{ "target": "nsis", "arch": ["x64"] }],
  "icon": "resources/icon.ico"
},
"nsis": {
  "oneClick": false,
  "allowToChangeInstallationDirectory": true,
  "createDesktopShortcut": true,
  "createStartMenuShortcut": true
}
```

- [ ] **Step 3: Create a placeholder icon note**

```bash
echo "Windows build requires resources/icon.ico (256x256 multi-resolution ICO file). Generate from the existing SVG/PNG icon before running pack:win." > resources/WINDOWS_ICON.md
```

- [ ] **Step 4: Verify package.json is valid JSON**

```bash
node -e "require('./package.json'); console.log('valid')"
```
Expected: `valid`

- [ ] **Step 5: Commit**

```bash
git add package.json resources/WINDOWS_ICON.md
git commit -m "feat(build): add Windows NSIS build target and pack:win script"
```

---

## Task 13: Update README.md

**Files:**
- Modify: `README.md`

- [ ] **Step 1: Update the platform badge**

Find the badge line:
```
[![Platform](https://img.shields.io/badge/platform-macOS%20%7C%20Linux-lightgrey.svg)](https://github.com/guikfouri/canopy)
```

Replace with:
```
[![Platform](https://img.shields.io/badge/platform-macOS%20%7C%20Linux%20%7C%20Windows-lightgrey.svg)](https://github.com/guikfouri/canopy)
```

- [ ] **Step 2: Add Windows to Prerequisites**

Find the Prerequisites section. Add after the Linux line:
```
- **Windows 10+** with PowerShell Core (`pwsh`) recommended for full shell integration
```

- [ ] **Step 3: Add Windows build instructions**

Find the "Build for Production" section. Add after `npm run pack:linux`:

```markdown
npm run pack:win      # .exe NSIS installer (Windows)
```

- [ ] **Step 4: Add Windows install section**

After the "Installing on Linux" section, add:

```markdown
### Installing on Windows

**From .exe installer:**

Run `Canopy-Setup-*.exe` and follow the installation wizard. Creates Start Menu and Desktop shortcuts.

> **Note:** For best experience, install [PowerShell Core](https://github.com/PowerShell/PowerShell) (`pwsh`). Canopy auto-detects it and enables full shell integration (command state tracking, idle/busy indicators). Windows PowerShell (`powershell.exe`) and `cmd.exe` work with a basic fallback.
```

- [ ] **Step 5: Update the Roadmap**

Find `- [ ] Windows support` and replace with `- [x] Windows support`.

- [ ] **Step 6: Commit**

```bash
git add README.md
git commit -m "docs(readme): add Windows support documentation and platform badge"
```

---

## Final Verification

- [ ] **Run full TypeScript check**

```bash
npm run typecheck
```
Expected: no errors across all modified files.

- [ ] **Start dev mode and verify on Windows**

```bash
npm run dev
```

Verify manually:
1. Terminal opens with PowerShell (or auto-detected shell)
2. Sidebar dot changes idle/busy/done when running commands
3. Drag a file into terminal — path is properly single-quoted
4. `.ps1` file opens with PowerShell syntax highlighting in Monaco
5. Config is saved to `%APPDATA%\Canopy\canopy\config.json`

- [ ] **Final commit summary**

```bash
git log --oneline -15
```
