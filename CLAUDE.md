# Canopy — Development Guidelines

## Project Info
- **Name:** Canopy
- **Stack:** Electron 40, React 19, TypeScript 5.9, xterm.js, Monaco, Zustand, Tailwind CSS 4.1
- **Build:** electron-vite + electron-builder
- **Config:** `~/.canopy/config.json`

## Commands
```bash
npm run dev        # Dev mode with hot reload
npm run build      # Production build
npm run typecheck  # TypeScript validation
npm run rebuild    # Rebuild native modules (node-pty)
```

---

## Git Conventions

### Branching Strategy (GitHub Flow)

```
main ─────────────────────────────────────── (always deployable)
  └── feat/split-pane-resize ──── PR ──→ main
  └── fix/terminal-reconnect ──── PR ──→ main
  └── docs/architecture ──── PR ──→ main
```

- **`main`** — Always stable. Never commit directly. All changes via PR (or squash-merge).
- **Feature branches** — Short-lived, created from `main`, merged back via PR.
- **Branch naming:** `{type}/{short-description}` using kebab-case.

| Prefix | Usage |
|--------|-------|
| `feat/` | New features |
| `fix/` | Bug fixes |
| `refactor/` | Code restructuring (no behavior change) |
| `docs/` | Documentation changes |
| `chore/` | Dependencies, tooling, configs |
| `test/` | Adding or fixing tests |

### Commit Messages (Conventional Commits)

Format: `{type}({scope}): {description}`

```
feat(terminal): add scrollback buffer replay on reconnect
fix(worktree): prevent crash when removing active worktree
refactor(split-tree): simplify node removal algorithm
docs(readme): add architecture diagram
chore(deps): upgrade electron to v40
```

**Rules:**
- **Type is required** — one of: `feat`, `fix`, `refactor`, `docs`, `chore`, `test`, `perf`, `style`
- **Scope is optional** but encouraged — component or area: `terminal`, `worktree`, `split-tree`, `sidebar`, `config`, `ipc`, `editor`, `deps`
- **Description is lowercase**, imperative mood ("add" not "added"), no period at end
- **Body (optional)** — explain WHY, not what. The diff shows what.
- **Breaking changes** — add `!` after type: `feat(config)!: change config schema to v2`
- **Max 72 characters** for the first line

### Versioning (Semantic Versioning)

Format: `MAJOR.MINOR.PATCH` (e.g., `0.3.1`)

| Bump | When | Example |
|------|------|---------|
| **MAJOR** | Breaking changes (config schema, API changes) | `1.0.0` |
| **MINOR** | New features (backward compatible) | `0.2.0` |
| **PATCH** | Bug fixes, docs, refactors | `0.1.1` |

While in `0.x.x` (pre-1.0), minor version bumps may include breaking changes.

Version is tracked in `package.json` → `version` field. Update it when creating a release.

### Release Process

1. All changes merged to `main` via PRs
2. When ready for release: bump version in `package.json`
3. Create a git tag: `git tag v0.2.0`
4. Push tag: `git push origin v0.2.0`
5. Create GitHub Release with changelog from commits

### PR Guidelines

- One logical change per PR
- PR title follows commit convention: `feat(terminal): add search`
- Squash-merge to keep `main` history clean
- Delete branch after merge

---

## Code Conventions

### File Naming
- Components: `PascalCase.tsx`
- Utilities/modules: `kebab-case.ts`
- Types: defined in `src/shared/types.ts`
- IPC channels: defined in `src/shared/ipc-channels.ts`

### Architecture Rules
- **Renderer is source of truth** for all UI state
- **Main process is stateless** (except live PTY instances)
- **All IPC channels** must be registered in `src/shared/ipc-channels.ts`
- **All shared types** must live in `src/shared/types.ts`
- **Split-tree operations** must be pure/immutable (return new references)
- **Zustand stores** use selector patterns to minimize re-renders

### Styling
- Tailwind CSS utility classes as primary styling
- Design tokens from `src/renderer/lib/constants.ts`
- Tonal hierarchy for depth — avoid borders where possible
- Use COLORS constant, never hardcode hex values in components

---

## Workflow Orchestration

### 1. Plan Mode Default
- Enter plan mode for ANY non-trivial task (3+ steps or architectural decisions)
- If something goes sideways, STOP and re-plan immediately
- Use plan mode for verification steps, not just building
- Write detailed specs upfront to reduce ambiguity

### 2. Subagent Strategy
- Use subagents liberally to keep main context window clean
- Offload research, exploration, and parallel analysis to subagents
- For complex problems, throw more compute at it via subagents
- One task per subagent for focused execution

### 3. Self-Improvement Loop
- After ANY correction from the user: update tasks/lessons.md with the pattern
- Write rules for yourself that prevent the same mistake
- Ruthlessly iterate on these lessons until mistake rate drops
- Review lessons at session start for relevant project

### 4. Verification Before Done
- Never mark a task complete without proving it works
- Diff behavior between main and your changes when relevant
- Ask yourself: "Would a staff engineer approve this?"
- Run tests, check logs, demonstrate correctness

### 5. Demand Elegance (Balanced)
- For non-trivial changes: pause and ask "is there a more elegant way?"
- If a fix feels hacky: "Knowing everything I know now, implement the elegant solution"
- Skip this for simple, obvious fixes — don't over-engineer
- Challenge your own work before presenting it

### 6. Autonomous Bug Fixing
- When given a bug report: just fix it. Don't ask for hand-holding
- Point at logs, errors, failing tests — then resolve them
- Zero context switching required from the user
- Go fix failing CI tests without being told how

## Task Management

1. Plan First: Write plan to tasks/todo.md with checkable items
2. Verify Plan: Check in before starting implementation
3. Track Progress: Mark items complete as you go
4. Explain Changes: High-level summary at each step
5. Document Results: Add review section to tasks/todo.md
6. Capture Lessons: Update tasks/lessons.md after corrections

## Core Principles

- Simplicity First: Make every change as simple as possible. Impact minimal code.
- No Laziness: Find root causes. No temporary fixes. Senior developer standards.
- Minimal Impact: Only touch what's necessary. No side effects with new bugs.
