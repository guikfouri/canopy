# Windows Compatibility — Design Spec

**Date:** 2026-04-08
**Status:** Approved
**Scope:** Add full Windows support to Canopy without regressing macOS/Linux

---

## Problem

Canopy is currently macOS/Linux-only. The following areas are not Windows-compatible:

| Area | Severity | Issue |
|------|----------|-------|
| Shell detection | Critical | Hardcoded `/bin/bash`, `/bin/zsh` — don't exist on Windows |
| Shell integration scripts | Critical | Only bash/zsh/fish scripts — no PowerShell equivalent |
| Build target | Critical | No `electron-builder` Windows configuration |
| Shell escaping | High | POSIX-only escaping in drag-and-drop file path insertion |
| Config path | Medium | Uses `~/.canopy` (Unix dotfile convention) |
| Monaco language map | Low | Missing `.bat`, `.cmd`, `.ps1` syntax highlighting |

---

## Decisions

| Question | Decision |
|----------|----------|
| Default Windows shell | Auto-detect: `pwsh.exe` → `powershell.exe` → `cmd.exe` |
| OSC 133 integration | Hybrid: full integration for `pwsh`, ANSI fallback for `powershell.exe` and `cmd.exe` |
| Config path | Platform-specific via `app.getPath('userData')` with migration from `~/.canopy` |
| Distribution format | NSIS installer (`.exe`) |
| Architecture pattern | ShellProvider abstraction (Strategy pattern) |

---

## Architecture

### ShellProvider Pattern

The core change is extracting all shell-specific logic from `terminal-manager.ts` into a `ShellProvider` interface with two implementations. The Mac/Linux path is extracted as-is — zero behavior change. The Windows path is new.

```
src/main/
├── shell-providers/
│   ├── shell-provider.interface.ts   ← interface + ShellInfo type
│   ├── unix-shell-provider.ts        ← current terminal-manager.ts logic, extracted
│   └── windows-shell-provider.ts     ← new Windows implementation
├── shell-integration/
│   ├── canopy-integration.bash       ← unchanged
│   ├── canopy-integration.zsh        ← unchanged
│   ├── canopy-integration.fish       ← unchanged
│   └── canopy-integration.ps1        ← new PowerShell Core script
└── terminal-manager.ts               ← selects provider, consumes interface
```

### Interface

```typescript
// shell-provider.interface.ts

export type ShellType =
  | 'zsh' | 'bash' | 'fish'           // Unix
  | 'pwsh' | 'powershell' | 'cmd'     // Windows
  | 'unknown'

export interface ShellInfo {
  executable: string
  type: ShellType
  args: string[]
  env: NodeJS.ProcessEnv
  integrationSupported: boolean
}

export interface ShellProvider {
  detect(): ShellInfo
  getIntegrationArgs(info: ShellInfo): string[]
  getIntegrationEnv(info: ShellInfo): NodeJS.ProcessEnv
  escapeFilePath(path: string): string
}
```

### Provider Selection

```typescript
// terminal-manager.ts — only change at the top level

const shellProvider: ShellProvider =
  process.platform === 'win32'
    ? new WindowsShellProvider()
    : new UnixShellProvider()
```

---

## Component Details

### 1. WindowsShellProvider — Shell Detection

Detection order:

```
where.exe pwsh       → pwsh.exe       (PowerShell Core, preferred)
where.exe powershell → powershell.exe (Windows PowerShell, fallback)
process.env.COMSPEC  → cmd.exe        (last resort)
```

`where.exe` is a Windows built-in available on all Windows 7+ systems.

### 2. WindowsShellProvider — OSC 133 Integration

| Shell | Strategy | Mechanism |
|-------|----------|-----------|
| `pwsh` | Full OSC 133 | Launch with `-NoExit -ExecutionPolicy Bypass -File canopy-integration.ps1` |
| `powershell.exe` | ANSI fallback | No modification; existing pattern-matching fallback handles state detection |
| `cmd.exe` | ANSI fallback | No modification; existing pattern-matching fallback handles state detection |

**PowerShell Core integration script** (`canopy-integration.ps1`):

```powershell
# Emits OSC 133 sequences compatible with Canopy's terminal state detection.
# Loaded via -File argument — does NOT modify the user's $PROFILE.

function prompt {
  [Console]::Write("`e]133;A`a")
  $result = "PS $($executionContext.SessionState.Path.CurrentLocation)> "
  [Console]::Write("`e]133;B`a")
  $result
}

$ExecutionContext.SessionState.InvokeCommand.PreCommandLookupAction = {
  param($cmd, $eventArgs)
  [Console]::Write("`e]133;C`a")
}
```

`-ExecutionPolicy Bypass` is scoped to the spawned process only — it does not alter the user's system policy. This is the same approach used by VS Code.

### 3. Config Path Migration

Change in `src/main/config-store.ts`:

```typescript
// Before
const CONFIG_DIR = path.join(app.getPath('home'), '.canopy')

// After
const CONFIG_DIR = path.join(app.getPath('userData'), 'canopy')
```

`app.getPath('userData')` resolves to:
- **Windows:** `%APPDATA%\Canopy` (`C:\Users\<user>\AppData\Roaming\Canopy`)
- **macOS:** `~/Library/Application Support/Canopy`
- **Linux:** `~/.config/Canopy`

**Migration logic** (runs at startup, before config load):

```typescript
// If new path doesn't exist but old ~/.canopy/config.json does → copy it
const legacyPath = path.join(app.getPath('home'), '.canopy', 'config.json')
const newPath = path.join(CONFIG_DIR, 'config.json')

if (!fs.existsSync(newPath) && fs.existsSync(legacyPath)) {
  fs.mkdirSync(CONFIG_DIR, { recursive: true })
  fs.copyFileSync(legacyPath, newPath)
}
```

### 4. Shell Escaping — TerminalPane.tsx

The renderer needs to know the active shell type to apply correct escaping. `ShellType` is exposed via a new IPC channel `terminal:get-shell-type`.

```typescript
function shellEscape(filePath: string, shellType: ShellType): string {
  if (shellType === 'pwsh' || shellType === 'powershell') {
    // PowerShell: single-quoted strings, escape internal single quotes by doubling
    return `'${filePath.replace(/'/g, "''")}'`
  }
  if (shellType === 'cmd') {
    // CMD: double-quoted strings
    return `"${filePath.replace(/"/g, '\\"')}"`
  }
  // POSIX (bash/zsh/fish): backslash-escape special characters
  return filePath.replace(/([\\  !"#$&'()*,:;<>?@[\]^`{|}~])/g, '\\$1')
}
```

### 5. Monaco Language Map

Add to `FileEditorPane.tsx` language extension map:

```typescript
bat: 'bat',
cmd: 'bat',
ps1: 'powershell',
psm1: 'powershell',
psd1: 'powershell',
```

### 6. Build Target

`package.json` additions:

```json
"scripts": {
  "pack:win": "electron-vite build && electron-builder --win --config"
},
"build": {
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
}
```

A `resources/icon.ico` file (256×256, multi-resolution) must be created for the Windows build.

---

## What Does NOT Change

- `UnixShellProvider` — extracted from current code, behavior identical
- All shell integration scripts for bash/zsh/fish — untouched
- React components (split panes, tabs, Monaco, file explorer) — untouched
- IPC channels — one addition (`terminal:get-shell-type`), no modifications
- Zustand stores — untouched
- Worktree manager — untouched (git CLI is cross-platform)

---

## Out of Scope

- Windows Store (MSIX) packaging
- Auto-update (Squirrel) — can be added in a follow-up
- cmd.exe OSC 133 integration — ANSI fallback is sufficient
- WSL detection/integration — future feature

---

## Implementation Order

1. `shell-provider.interface.ts` — define interface and types
2. `unix-shell-provider.ts` — extract current logic from `terminal-manager.ts`
3. `terminal-manager.ts` — wire provider selection, remove extracted code
4. `windows-shell-provider.ts` — implement detection + integration args
5. `canopy-integration.ps1` — write PowerShell Core integration script
6. `config-store.ts` — migrate to `app.getPath('userData')` + legacy migration
7. `TerminalPane.tsx` — update `shellEscape` with shell-type awareness
8. `FileEditorPane.tsx` — add Windows file type language mappings
9. `package.json` — add Windows build target and NSIS config
10. `resources/icon.ico` — create Windows app icon
11. README.md — update platform badge and add Windows install instructions
