# Canopy Architecture

This document provides a deep dive into Canopy's architecture for contributors and curious developers.

## Overview

Canopy is an Electron desktop application with a React frontend. It manages terminal workspaces organized around git worktrees, allowing developers to work on multiple branches simultaneously with full isolation.

## Process Model

```
┌────────────────────────────────────────────────────┐
│                  Main Process                       │
│                                                     │
│  ┌──────────────────┐   ┌───────────────────────┐  │
│  │ Terminal Manager  │   │   Worktree Manager    │  │
│  │                   │   │                       │  │
│  │ • PTY creation    │   │ • git worktree add    │  │
│  │ • Input routing   │   │ • git worktree remove │  │
│  │ • Resize handling │   │ • git status/branch   │  │
│  │ • Output buffering│   │ • File listing        │  │
│  │ • Session cleanup │   │                       │  │
│  └────────┬──────────┘   └──────────┬────────────┘  │
│           │                         │               │
│  ┌────────┴─────────────────────────┴────────────┐  │
│  │              IPC Handlers                      │  │
│  │    ipcMain.handle() / ipcMain.on()            │  │
│  └────────────────────┬──────────────────────────┘  │
│                       │                              │
│  ┌────────────────────┴──────────────────────────┐  │
│  │              Config Store                      │  │
│  │    ~/.canopy/config.json                       │  │
│  └───────────────────────────────────────────────┘  │
└───────────────────────┬────────────────────────────┘
                        │ IPC (contextBridge)
┌───────────────────────┴────────────────────────────┐
│                  Preload Script                      │
│  Exposes typed APIs:                                 │
│  • window.terminalAPI  (create, input, resize, etc.) │
│  • window.canopyAPI    (worktrees, config, files)    │
└───────────────────────┬────────────────────────────┘
                        │
┌───────────────────────┴────────────────────────────┐
│                Renderer Process                      │
│                                                      │
│  ┌──────────────────────────────────────────────┐   │
│  │              React Application                │   │
│  │                                               │   │
│  │  ┌──────────────────────────────────────────┐│   │
│  │  │           Zustand Stores                  ││   │
│  │  │  • worktree-store (projects, worktrees)   ││   │
│  │  │  • terminal-store (sessions, focus)        ││   │
│  │  └──────────────────────────────────────────┘│   │
│  │                                               │   │
│  │  ┌────────┐ ┌──────────┐ ┌───────────────┐  │   │
│  │  │Sidebar │ │ MainArea │ │ FileExplorer  │  │   │
│  │  │        │ │          │ │               │  │   │
│  │  │Projects│ │ Split    │ │ Tree View     │  │   │
│  │  │Worktree│ │ Container│ │ Changes Panel │  │   │
│  │  │List    │ │ (recurse)│ │               │  │   │
│  │  └────────┘ └──────────┘ └───────────────┘  │   │
│  └──────────────────────────────────────────────┘   │
└─────────────────────────────────────────────────────┘
```

## Split Tree Data Structure

The split pane system is the architectural centerpiece. It uses a recursive binary tree where each node is either a **leaf** (tab group) or an **internal node** (split with two children).

### Type Definition

```typescript
// Leaf node — contains tabs
interface TabGroupNode {
  type: 'tab-group'
  id: string
  tabs: Tab[]
  activeTabId: string
}

// Internal node — splits space between two children
interface SplitNodeInternal {
  type: 'split'
  direction: 'horizontal' | 'vertical'
  ratio: number              // 0.0 to 1.0
  children: [SplitNode, SplitNode]
}

type SplitNode = TabGroupNode | SplitNodeInternal
```

### Visual Example

```
SplitNode (vertical, ratio: 0.6)
├── TabGroup "A" (terminal-1, terminal-2)
└── SplitNode (horizontal, ratio: 0.5)
    ├── TabGroup "B" (terminal-3)
    └── TabGroup "C" (editor: main.ts)
```

Renders as:

```
┌────────────────────┬──────────────┐
│                    │  Terminal 3  │
│  Terminal 1 | T2   │──────────────│
│                    │  main.ts     │
└────────────────────┴──────────────┘
       60%                 40%
                      50% │ 50%
```

### Immutable Operations

All tree modifications in `split-tree.ts` are pure functions that return new tree references:

- `splitNode(tree, nodeId, direction)` — Split a tab group into two
- `removeNode(tree, nodeId)` — Remove a pane and collapse the parent split
- `updateRatio(tree, nodeId, ratio)` — Resize split divider
- `findNode(tree, nodeId)` — Locate a node by ID
- `addTab(tree, nodeId, tab)` — Add a tab to a tab group

This immutability is critical for React's reconciliation — Zustand detects changes via reference equality.

## Terminal Lifecycle

```
1. User creates a tab (or worktree loads with saved layout)
          │
2. TerminalPane component mounts
          │
3. Check: existing PTY for this terminal ID?
          ├── YES → Attach to existing, replay scrollback buffer
          └── NO  → IPC: create-terminal { id, cwd, cols, rows }
                        │
4. Main process spawns PTY (node-pty)
          │
5. Wire event handlers:
   • PTY stdout  → IPC event → xterm.write()
   • xterm input → IPC send  → PTY stdin
   • Resize      → IPC send  → PTY resize
          │
6. Terminal runs until:
   • Tab closed → PTY destroyed
   • Worktree switch → PTY kept alive, xterm detached
   • Process exits → Tab shows "exited" state
```

### Scrollback Buffer

When a terminal is detached (worktree switch), the main process continues buffering PTY output into a circular buffer (up to 100KB). When the terminal is re-attached, this buffer is replayed into xterm.js, giving the user a seamless experience.

## IPC Channel Architecture

All IPC channels are defined as string constants in `src/shared/ipc-channels.ts` for type safety and autocomplete.

### Request-Response (invoke/handle)

| Channel | Direction | Purpose |
|---------|-----------|---------|
| `terminal:create` | Renderer → Main | Spawn new PTY |
| `terminal:resize` | Renderer → Main | Resize PTY dimensions |
| `worktree:create` | Renderer → Main | Create git worktree |
| `worktree:list` | Renderer → Main | List worktrees for repo |
| `worktree:remove` | Renderer → Main | Remove git worktree |
| `git:status` | Renderer → Main | Get file changes |
| `git:current-branch` | Renderer → Main | Get HEAD branch name |
| `fs:read-dir` | Renderer → Main | List directory contents |
| `config:save` | Renderer → Main | Persist config to disk |
| `config:load` | Renderer → Main | Load config from disk |
| `dialog:open-directory` | Renderer → Main | Native folder picker |

### Event Streams (send/on)

| Channel | Direction | Purpose |
|---------|-----------|---------|
| `terminal:input` | Renderer → Main | Keyboard input to PTY |
| `terminal:output` | Main → Renderer | PTY stdout to xterm |
| `terminal:exit` | Main → Renderer | PTY process exited |

## State Management

### Worktree Store (`worktree-store.ts`)

The primary store manages:
- **Projects** — Git repositories added to Canopy
- **Worktrees** — Git worktrees within projects (each with its own split layout)
- **Active state** — Currently active worktree, sidebar width, file explorer width
- **Persistence** — Auto-saves to `~/.canopy/config.json` via debounced IPC

Key design decision: **the renderer is the source of truth**. The main process is stateless (except for live PTY instances). This simplifies state synchronization and makes the config file a pure serialization of renderer state.

### Terminal Store (`terminal-store.ts`)

Manages ephemeral terminal state:
- Active terminal sessions (ID, worktree, status, dimensions)
- Currently focused terminal
- Session creation and cleanup

## Config Persistence

```
Zustand Store Change
        │
   Debounce (1.5s)
        │
   Serialize to CanopyConfig
        │
   IPC: config:save
        │
   Main Process: fs.writeFile
        │
   ~/.canopy/config.json
```

Config schema (v1):

```typescript
interface CanopyConfig {
  version: 1
  projects: Project[]
  worktrees: Worktree[]           // Each includes splitLayout
  activeWorktreeId: string | null
  sidebarWidth: number
  fileExplorerWidth: number
}
```

## Design System: Kinetic Console

The visual design uses a **tonal hierarchy** — depth is communicated through background color shifts rather than borders.

### Surface Hierarchy

```
Deepest     ▓▓▓ #0c0c1f  surfaceDim        (terminal bg)
            ▓▓▓ #111125  surface            (app bg)
            ▓▓▓ #1a1a2e  surfaceContainerLow (sidebar)
            ▓▓▓ #1e1e32  surfaceContainer    (panels)
            ▓▓▓ #28283d  surfaceContainerHigh (hover)
Brightest   ▓▓▓ #333348  surfaceContainerHighest (active)
```

### Accent Colors

- **Primary:** Amber (`#ffb300`) — cursor, active indicators, selection
- **Secondary:** Warm orange (`#ff8f00`) — secondary actions
- **Tertiary:** Indigo/Lavender (`#bbbcff`) — code, links
- **Error:** Coral (`#ffb4ab`) — errors, deletions
- **Success:** Green (`#4ADE80`) — additions, confirmations

## File Structure Rationale

```
src/
├── main/          # One file per concern (terminal, worktree, config, IPC)
├── preload/       # Minimal bridge — only exposes typed API surfaces
├── renderer/
│   ├── components/
│   │   ├── layout/      # Structural components (shell, sidebar, topbar)
│   │   ├── terminal/    # Terminal-specific (pane, tabs, splits, editor)
│   │   ├── workspace/   # Worktree management (list, create dialog)
│   │   └── file-explorer/ # File browsing and git changes
│   ├── stores/          # One store per domain (worktree, terminal)
│   └── lib/             # Pure utilities (split-tree ops, constants)
└── shared/              # Types and constants shared across processes
```

**Why this structure:**
- **Process boundaries are explicit** — `main/`, `preload/`, `renderer/` mirror Electron's process model
- **Components grouped by domain** — not by type (no generic `buttons/` or `modals/` folders)
- **Shared types prevent drift** — `shared/types.ts` is the single source of truth for data shapes
- **Stores are separate from components** — enables testing and prevents circular dependencies
