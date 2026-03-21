# Contributing to Canopy

Thank you for your interest in contributing to Canopy! This document provides guidelines and information for contributors.

## Getting Started

### Prerequisites

- Node.js 18+
- npm 9+
- Git 2.15+
- macOS (primary development platform)

### Setup

```bash
# Fork and clone the repository
git clone https://github.com/guikfouri/canopy.git
cd canopy

# Install dependencies
npm install

# Rebuild native modules
npm run rebuild

# Start development
npm run dev
```

## Development Workflow

### Branch Naming

Use descriptive branch names:

```
feat/split-pane-resize
fix/terminal-reconnect
docs/architecture-update
refactor/ipc-channels
```

### Making Changes

1. **Create a branch** from `main`
2. **Make focused changes** — one feature or fix per PR
3. **Run type checking** before committing: `npm run typecheck`
4. **Write clear commit messages** (see below)
5. **Open a pull request** with a description of what and why

### Commit Messages

Follow [Conventional Commits](https://www.conventionalcommits.org/):

```
feat: add horizontal split keyboard shortcut
fix: terminal not reconnecting after worktree switch
docs: update architecture diagram
refactor: simplify split-tree immutable operations
chore: upgrade electron to v40
```

## Architecture Overview

Understanding the architecture will help you contribute effectively.

### Process Model

Canopy runs as an Electron app with three process layers:

| Process | Role | Key Files |
|---------|------|-----------|
| **Main** | System operations (PTY, git, filesystem) | `src/main/` |
| **Preload** | Secure IPC bridge between main and renderer | `src/preload/` |
| **Renderer** | React UI, state management | `src/renderer/` |

### State Flow

```
User Action → Zustand Store → React Re-render
                    ↓
              IPC Channel → Main Process → System
                    ↓
             Config Persistence (~/.canopy/config.json)
```

### Key Patterns

- **Immutable tree operations** — All split-tree modifications return new references (`src/renderer/lib/split-tree.ts`)
- **Typed IPC channels** — All channels defined in `src/shared/ipc-channels.ts`
- **Zustand with selectors** — State accessed via selector patterns to minimize re-renders
- **PTY lifecycle management** — Terminals persist across worktree switches

### Where to Find Things

| I want to... | Look at... |
|--------------|-----------|
| Add a new IPC channel | `src/shared/ipc-channels.ts` → `src/main/ipc-handlers.ts` → `src/preload/api/` |
| Add a new component | `src/renderer/components/` (pick the right subdirectory) |
| Modify terminal behavior | `src/main/terminal-manager.ts` + `src/renderer/components/terminal/TerminalPane.tsx` |
| Change worktree operations | `src/main/worktree-manager.ts` |
| Update the design system | `src/renderer/lib/constants.ts` + `src/renderer/styles.css` |
| Add new state | `src/renderer/stores/` |
| Define new types | `src/shared/types.ts` |

## Code Style

### TypeScript

- Strict mode enabled — no `any` unless absolutely necessary
- Prefer `interface` over `type` for object shapes
- Use `as const` for constant objects and arrays
- Explicit return types on exported functions

### React

- Functional components only
- Hooks for all state and effects
- Co-locate component-specific logic with the component
- Use Zustand selectors to avoid unnecessary re-renders

### Naming

- **Files:** `kebab-case.ts` / `PascalCase.tsx` (components)
- **Types:** `PascalCase`
- **Functions:** `camelCase`
- **Constants:** `UPPER_SNAKE_CASE`
- **IPC channels:** `kebab-case` strings

### CSS

- Tailwind utility classes as the primary styling method
- Design tokens from `constants.ts` for colors
- Avoid inline styles — use Tailwind or CSS variables
- Tonal hierarchy for depth — avoid borders where possible

## Pull Request Guidelines

### Before Submitting

- [ ] `npm run typecheck` passes
- [ ] `npm run build` succeeds
- [ ] Tested manually in development mode
- [ ] No console errors or warnings introduced
- [ ] Commits follow conventional commit format

### PR Description

Include:
- **What** — brief description of changes
- **Why** — motivation or issue reference
- **How** — approach taken (if non-obvious)
- **Screenshots** — for any visual changes

### Review Process

1. A maintainer will review your PR
2. Address any feedback
3. Once approved, the PR will be squash-merged

## Reporting Issues

When reporting bugs, include:
- macOS version
- Node.js version
- Steps to reproduce
- Expected vs. actual behavior
- Console output (if relevant)

## Feature Requests

Open an issue with:
- Clear description of the feature
- Use case — why is this needed?
- Proposed solution (optional)

## License

By contributing, you agree that your contributions will be licensed under the [MIT License](LICENSE).

---

Thank you for helping make Canopy better! 🌿
