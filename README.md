<div align="center">

# 🌿 Canopy

### The terminal workspace manager for developers who live in the terminal

**Isolated git worktrees · Split terminal panes · Monaco editor · One unified workspace**

[![Version](https://img.shields.io/badge/version-0.1.0-blue.svg)](package.json)
[![Electron](https://img.shields.io/badge/Electron-40-47848F.svg?logo=electron&logoColor=white)](https://www.electronjs.org/)
[![React](https://img.shields.io/badge/React-19-61DAFB.svg?logo=react&logoColor=white)](https://react.dev/)
[![TypeScript](https://img.shields.io/badge/TypeScript-5.9-3178C6.svg?logo=typescript&logoColor=white)](https://www.typescriptlang.org/)
[![License](https://img.shields.io/badge/license-MIT-green.svg)](LICENSE)
[![Platform](https://img.shields.io/badge/platform-macOS%20%7C%20Linux%20%7C%20Windows-lightgrey.svg)](https://github.com/guikfouri/canopy)

<br/>

<img src="docs/assets/hero-placeholder.png" alt="Canopy — Terminal Workspace Manager" width="800"/>

<sub>*Split panes, tab groups, and worktree isolation — all in one window*</sub>

</div>

---

## The Problem

You're working on a feature branch. A critical bug comes in. You `git stash`, switch branches, fix the bug, switch back, `git stash pop`... and pray nothing broke. Sound familiar?

**Canopy eliminates context switching entirely.** Each branch gets its own isolated worktree with independent terminal sessions, file trees, and editor tabs. Switch between branches like switching browser tabs — zero stashing, zero conflicts, zero lost state.

## Key Features

### 📁 Project Folders

Organize your projects into collapsible folders for a cleaner sidebar. Projects can live at the root level or be grouped inside folders — your choice.

- Create folders from the "+" dropdown menu in the sidebar header
- Drag-and-drop projects into and out of folders
- Reorder folders and loose projects freely
- Customizable folder and project colors via inline color picker (16-color palette)
- Right-click context menu to rename or remove folders
- Removing a folder keeps the projects — they just become loose again

### 🌲 Git Worktree Isolation

Each branch runs in a completely isolated git worktree. No stashing, no conflicts, no lost work. Your `main` branch and feature branch coexist side by side with independent file systems, terminal sessions, and editor state.

- Create, list, and remove worktrees from the sidebar
- Each worktree tracks its own branch, split layout, tabs, and file tree
- Instant switching — click a worktree to switch context immediately

### 📐 Flexible Split Panes

Split your workspace horizontally or vertically with `Cmd+D` / `Cmd+Shift+D`. Nest splits arbitrarily deep. Drag dividers to resize with visual feedback. The recursive binary split-tree architecture handles any layout you can dream up.

- Horizontal and vertical splits with arbitrary nesting
- Draggable dividers with glow effect on hover
- Proportional ratio tracking for smooth resizing

### 📑 Tab Groups

Each pane contains a tab group with terminals and file editors. Organize your workflow naturally — tests in one pane, server in another, editor in the third.

- Terminal tabs and editor tabs in the same group
- Drag-and-drop to reorder tabs within a group or move between groups
- Tab renaming (double-click or right-click context menu)
- Dirty state indicator (`*`) for unsaved editor tabs
- Add tab dropdown (+) to create new terminal or file tabs

### ✏️ Monaco Editor

Built-in VS Code-powered editor for quick file edits without leaving Canopy.

- Syntax highlighting for 20+ languages (TypeScript, JavaScript, Python, Go, Rust, SQL, YAML, and more)
- Bracket pair colorization, word wrap, line numbers
- Save with `Cmd+S`
- Automatic language detection from file extension
- Theme synced with app theme (dark/light)

### 🐚 Shell Integration (OSC 133)

Canopy understands your shell's command lifecycle through OSC 133 escape sequences, with intelligent fallback for shells without integration.

- **Zsh, Bash, and Fish** shell support with automatic bootstrap
- **Command state detection** — idle, busy (executing), or done (with exit code)
- Dual-layer prompt detection: OSC 133 sequences + ANSI pattern matching fallback
- Activity-based idle detection (4-second silence timeout) compatible with interactive programs like `node`, `python`, and Claude Code

### 🔔 Background Command Notifications

Never miss a finished command again. When a terminal is in the background and a command completes, Canopy notifies you.

- Visual indicator in the sidebar (colored dot: idle / busy / done)
- Procedurally generated notification sounds (Ding, Chime, Bell, Pop)
- Configurable sound type and volume in settings
- Sound can be toggled on/off

### 📂 File Explorer

A full file browser and git changes panel in the right sidebar.

- **All Files** tab: directory tree with expand/collapse, sorted folders-first
- **Changes** tab: git status with color-coded indicators (added, modified, deleted, renamed, untracked)
  - Staged vs unstaged distinction
  - Filter dropdown (All / Uncommitted)
  - Change count badge
- **Checks** tab: placeholder for future CI/linting integration
- Inline create, rename, and delete files/folders
- Double-click to open files in the Monaco editor
- Right-click context menu for all operations

### 📋 Drag-and-Drop File Path Insertion

Drop files directly into the terminal to insert their shell-escaped paths. Supports multi-file drop with space-separated paths and visual feedback during drag.

### 💾 Session Persistence

Terminal sessions survive worktree switches. Switch to another branch, come back, and your terminal is exactly where you left it — with full scrollback replay (up to 100KB buffer).

All workspace state is auto-saved to `~/.canopy/config.json` with debounced writes (1.5s), including:

- Projects, folders, and worktrees
- Sidebar ordering (folders and loose projects)
- Split layouts per worktree
- Active worktree selection
- Theme preference
- Terminal and notification settings

### 🎨 Kinetic Console Design

A carefully crafted theme system with dark and light modes.

- **Dark theme**: deep navy surfaces (`#111125`) with warm amber accents (`#ffb300`)
- **Light theme**: warm beige (`#faf7f2`) with orange accents
- **System mode**: follows OS appearance preference
- **16-color project palette** — click the color indicator on any project or folder to pick a new color
- 8-level tonal hierarchy for depth — boundaries defined through tonal shifts, not harsh borders
- Consistent theming across terminal (xterm.js) and editor (Monaco)

## Quick Start

### Prerequisites

- **Node.js** 18+ and npm
- **Git** 2.15+ (worktree support)
- **macOS**, **Linux**, or **Windows 10+**
- **Linux only:** `build-essential` and `python3` (for native module compilation)
- **Windows 10+** with PowerShell Core (`pwsh`) recommended for full shell integration

### Install & Run

```bash
# Clone the repository
git clone https://github.com/guikfouri/canopy.git
cd canopy

# Install dependencies
npm install

# Start in development mode
npm run dev
```

### Build for Production

```bash
# Build the app
npm run build

# Package for current platform
npm run pack

# Package for a specific platform
npm run pack:mac     # .dmg / .zip
npm run pack:linux   # .AppImage / .deb
npm run pack:win      # .exe NSIS installer (Windows)
```

### Installing on Linux

**From .AppImage:**

```bash
chmod +x Canopy-*.AppImage
./Canopy-*.AppImage
```

**From .deb (Debian/Ubuntu):**

```bash
sudo dpkg -i canopy_*_amd64.deb
```

> **Note:** On Linux, you may need to install build dependencies before `npm install`:
> ```bash
> sudo apt install build-essential python3
> ```

### Installing on Windows

**From .exe installer:**

Run `Canopy-Setup-*.exe` and follow the installation wizard. Creates Start Menu and Desktop shortcuts.

> **Note:** For best experience, install [PowerShell Core](https://github.com/PowerShell/PowerShell) (`pwsh`). Canopy auto-detects it and enables full shell integration (command state tracking, idle/busy indicators). Windows PowerShell (`powershell.exe`) and `cmd.exe` work with a basic fallback.

## How It Works

### 1. Add a Project (or Folder)

Click the **+** button in the sidebar header. Choose **New Project** to point at a git repo, or **New Folder** to create an organizational group. Drag projects into folders to keep related repos together.

### 2. Create Worktrees

For each branch you want to work on, create a **worktree**. Canopy runs `git worktree add` under the hood, creating an isolated copy of your repo at `.claude/worktrees/{name}`.

### 3. Work in Isolation

Each worktree has its own:
- Terminal sessions (PTY processes)
- Split pane layout
- File explorer tree
- Editor tabs
- Git status tracking

### 4. Switch Instantly

Click a worktree in the sidebar to switch. Your terminal sessions persist in the background — no process killed, no state lost.

## Architecture

```
┌─────────────────────────────────────────────────────────┐
│                    Electron Main Process                  │
│  ┌──────────────┐  ┌──────────────┐  ┌───────────────┐  │
│  │  Terminal     │  │  Worktree    │  │  Config       │  │
│  │  Manager      │  │  Manager     │  │  Store        │  │
│  │  (node-pty)   │  │  (git cli)   │  │  (JSON fs)    │  │
│  └──────┬───────┘  └──────┬───────┘  └───────┬───────┘  │
│         │                 │                   │          │
│         └────────────┬────┴───────────────────┘          │
│                      │ IPC Channels                      │
├──────────────────────┼──────────────────────────────────-┤
│                      │                                   │
│              Electron Renderer                           │
│  ┌───────────────────┴────────────────────────────────┐  │
│  │                    React App                        │  │
│  │  ┌─────────┐  ┌────────────────┐  ┌─────────────┐ │  │
│  │  │ Sidebar  │  │   MainArea     │  │  File       │ │  │
│  │  │ Projects │  │ ┌────────────┐ │  │  Explorer   │ │  │
│  │  │ Worktree │  │ │SplitContain│ │  │  Changes    │ │  │
│  │  │ List     │  │ │  ┌──┐ ┌──┐│ │  │  Panel      │ │  │
│  │  │          │  │ │  │T1│ │T2││ │  │             │ │  │
│  │  │          │  │ │  └──┘ └──┘│ │  │             │ │  │
│  │  │          │  │ └────────────┘ │  │             │ │  │
│  │  └─────────┘  └────────────────┘  └─────────────┘ │  │
│  │                                                     │  │
│  │  Zustand Stores: worktree-store │ terminal-store    │  │
│  └─────────────────────────────────────────────────────┘  │
└─────────────────────────────────────────────────────────┘
```

### Tech Stack

| Layer | Technology |
|-------|-----------|
| **Framework** | Electron 40 |
| **Frontend** | React 19, TypeScript 5.9 |
| **Terminal** | xterm.js 6 + WebGL renderer |
| **Editor** | Monaco Editor (VS Code engine) |
| **Styling** | Tailwind CSS 4.1 |
| **State** | Zustand 5 |
| **PTY** | @lydell/node-pty |
| **Build** | electron-vite, electron-builder |

### Core Concepts

#### Split Tree

Pane layouts use a recursive binary tree structure. Each node is either a **TabGroup** (leaf with tabs) or a **Split** (internal node with direction, ratio, and two children). All tree operations are immutable — returning new references for clean React reconciliation.

```typescript
type SplitNode = TabGroupNode | SplitNodeInternal

interface SplitNodeInternal {
  type: 'split'
  direction: 'horizontal' | 'vertical'
  ratio: number              // 0.0 - 1.0
  children: [SplitNode, SplitNode]
}
```

#### IPC Architecture

Renderer and main process communicate through typed IPC channels. The renderer is the source of truth for UI state. The main process manages system resources (PTY processes, git operations, filesystem access).

| Domain | Operations |
|--------|-----------|
| **Terminal** | Create, attach, input, resize, destroy, output, exit, command-state |
| **Worktree** | Create, list, remove |
| **Git** | Get branch, list branches, checkout, status |
| **Config** | Load, save |
| **Filesystem** | Read dir, read/write file, create dir, rename, delete, stat, watch |
| **Dialog** | Open directory, save file |

#### State Persistence

All workspace state (projects, worktrees, layouts, active selections) is serialized to `~/.canopy/config.json` with debounced auto-save (1.5s after last change).

## Keyboard Shortcuts

| Shortcut | Action |
|----------|--------|
| `Cmd/Ctrl+D` | Split pane horizontally |
| `Cmd/Ctrl+Shift+D` | Split pane vertically |
| `Cmd/Ctrl+T` | New terminal tab |
| `Cmd/Ctrl+W` | Close active tab |
| `Cmd/Ctrl+S` | Save file (in editor) |
| `Double-click tab` | Rename tab |
| `Esc` | Close dialogs |

## Settings

Access settings from the gear icon in the sidebar bottom.

| Setting | Options |
|---------|---------|
| **Theme** | System (follows OS), Dark, Light |
| **Font Size** | 1–32pt (default 13) |
| **Scrollback** | Lines to keep in buffer (default 10,000) |
| **Sound** | On/Off toggle |
| **Sound Type** | Ding, Chime, Bell, Pop |
| **Volume** | 0–100% slider |

## Project Structure

```
src/
├── main/                    # Electron main process
│   ├── index.ts             # App entry, window creation
│   ├── ipc-handlers.ts      # IPC bridge
│   ├── terminal-manager.ts  # PTY lifecycle
│   ├── worktree-manager.ts  # Git worktree operations
│   └── config-store.ts      # Persistent config
├── preload/                 # Secure IPC bridge
│   └── api/                 # Typed API surfaces
├── renderer/                # React UI
│   ├── components/
│   │   ├── layout/          # App shell, sidebar, top bar
│   │   ├── terminal/        # Terminal panes, tabs, splits
│   │   ├── workspace/       # Worktree management
│   │   └── file-explorer/   # File browser, git changes
│   ├── stores/              # Zustand state stores
│   └── lib/                 # Utilities, constants, split-tree ops
└── shared/                  # Types & IPC channel constants
```

## Contributing

We welcome contributions! Please see [CONTRIBUTING.md](CONTRIBUTING.md) for guidelines.

### Development Commands

```bash
npm run dev        # Start dev server with hot reload
npm run build      # Production build
npm run typecheck  # TypeScript validation
npm run rebuild    # Rebuild native modules (node-pty)
npm run preview    # Preview production build
```

## Roadmap

- [x] Multi-project support
- [x] Project folders for sidebar organization
- [x] Git worktree creation & management
- [x] Split pane terminal layout
- [x] Tab groups with terminals & editors
- [x] Drag-and-drop tab reordering & cross-group moves
- [x] Monaco editor integration (20+ languages)
- [x] File explorer with git status & changes panel
- [x] OSC 133 shell integration (zsh, bash, fish)
- [x] Command state detection (idle/busy/done)
- [x] Background command notifications with sound
- [x] Drag-and-drop file path insertion into terminal
- [x] Dark & light themes with system mode
- [x] Session persistence across worktree switches
- [x] Scrollback buffer replay (100KB)
- [x] Color picker for projects and folders (16-color palette)
- [x] Config auto-save & restore
- [x] Settings panel (theme, font, scrollback, notifications)
- [x] Linux support (.AppImage, .deb)
- [x] Windows support
- [ ] Integrated search across worktrees
- [ ] Custom keybinding configuration
- [ ] Plugin system
- [ ] Collaborative sessions
- [ ] AI-assisted terminal (command suggestions)

## Why "Canopy"?

A canopy is the uppermost layer of a forest — where branches spread out and coexist without conflict. Just like git worktrees let your branches coexist independently, Canopy gives each branch its own space to grow.

## License

[MIT](LICENSE) — use it, fork it, build on it.

---

<div align="center">

**Built with 🌿 by developers, for developers**

[Report Bug](https://github.com/guikfouri/canopy/issues) · [Request Feature](https://github.com/guikfouri/canopy/issues) · [Discussions](https://github.com/guikfouri/canopy/discussions)

</div>
