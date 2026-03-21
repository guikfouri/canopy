<div align="center">

# 🌿 Canopy

### The terminal workspace manager for developers who live in the terminal

**Isolated git worktrees · Split terminal panes · Monaco editor · One unified workspace**

[![Version](https://img.shields.io/badge/version-0.1.0-blue.svg)](package.json)
[![Electron](https://img.shields.io/badge/Electron-40-47848F.svg?logo=electron&logoColor=white)](https://www.electronjs.org/)
[![React](https://img.shields.io/badge/React-19-61DAFB.svg?logo=react&logoColor=white)](https://react.dev/)
[![TypeScript](https://img.shields.io/badge/TypeScript-5.9-3178C6.svg?logo=typescript&logoColor=white)](https://www.typescriptlang.org/)
[![License](https://img.shields.io/badge/license-MIT-green.svg)](LICENSE)
[![Platform](https://img.shields.io/badge/platform-macOS-lightgrey.svg?logo=apple)](https://www.apple.com/macos/)

<br/>

<img src="docs/assets/hero-placeholder.png" alt="Canopy — Terminal Workspace Manager" width="800"/>

<sub>*Split panes, tab groups, and worktree isolation — all in one window*</sub>

</div>

---

## The Problem

You're working on a feature branch. A critical bug comes in. You `git stash`, switch branches, fix the bug, switch back, `git stash pop`... and pray nothing broke. Sound familiar?

**Canopy eliminates context switching entirely.** Each branch gets its own isolated worktree with independent terminal sessions, file trees, and editor tabs. Switch between branches like switching browser tabs — zero stashing, zero conflicts, zero lost state.

## Key Features

### 🌲 Git Worktree Isolation

Each branch runs in a completely isolated git worktree. No stashing, no conflicts, no lost work. Your `main` branch and feature branch coexist side by side with independent file systems.

### 📐 Flexible Split Panes

Split your workspace horizontally or vertically with `Cmd+D` / `Cmd+Shift+D`. Nest splits arbitrarily deep. Drag dividers to resize. The recursive split-tree architecture handles any layout you can dream up.

### 📑 Tab Groups

Each pane contains a tab group with terminals and file editors. Organize your workflow naturally — tests in one pane, server in another, editor in the third.

### ✏️ Monaco Editor

Built-in VS Code-powered editor for quick file edits without leaving Canopy. Full syntax highlighting, IntelliSense, and all the Monaco goodness.

### 💾 Session Persistence

Terminal sessions survive worktree switches. Switch to another branch, come back, and your terminal is exactly where you left it — with full scrollback history (up to 100KB buffer).

### 🎨 Kinetic Console Design

A carefully crafted dark theme with deep navy surfaces (`#111125`) and warm amber accents (`#ffb300`). Boundaries are defined through tonal shifts, not harsh borders. Easy on the eyes during long sessions.

## Quick Start

### Prerequisites

- **Node.js** 18+ and npm
- **Git** 2.15+ (worktree support)
- **macOS** (Windows/Linux support planned)

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

# Package as .dmg / .zip (macOS)
npx electron-builder
```

## How It Works

### 1. Add a Project

Point Canopy at any git repository. It becomes your **project** — the top-level container for all your work.

### 2. Create Worktrees

For each branch you want to work on, create a **worktree**. Canopy runs `git worktree add` under the hood, creating an isolated copy of your repo at `.claude/worktrees/{name}`.

### 3. Work in Isolation

Each worktree has its own:
- Terminal sessions (PTY processes)
- Split pane layout
- File explorer
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

#### State Persistence

All workspace state (projects, worktrees, layouts, active selections) is serialized to `~/.canopy/config.json` with debounced auto-save (1.5s after last change).

## Keyboard Shortcuts

| Shortcut | Action |
|----------|--------|
| `Cmd+D` | Split pane horizontally |
| `Cmd+Shift+D` | Split pane vertically |
| `Cmd+T` | New terminal tab |
| `Cmd+W` | Close active tab |

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
- [x] Git worktree creation & management
- [x] Split pane terminal layout
- [x] Tab groups with terminals
- [x] Monaco editor integration
- [x] File explorer with git status
- [x] Session persistence across worktree switches
- [x] Config auto-save & restore
- [ ] Windows & Linux support
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
