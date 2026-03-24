# Reorder Projects & Worktrees in Sidebar

**Date:** 2026-03-24
**Status:** Approved
**Scope:** Drag-and-drop reordering for projects and worktrees in the sidebar

## Problem

Projects and worktrees display in insertion order with no way to rearrange them. Users with multiple projects need to organize their sidebar by priority or workflow.

## Design

### Approach

Use the HTML5 Drag-and-Drop API, following the existing pattern in `TabBar.tsx`. Zero new dependencies.

### Store Changes (`worktree-store.ts`)

Add two methods:

- **`reorderProjects(fromIndex: number, toIndex: number)`** — removes project at `fromIndex`, inserts at `toIndex`. Operates on the `projects` array.
- **`reorderWorktrees(projectId: string, fromIndex: number, toIndex: number)`** — same logic but scoped to worktrees belonging to `projectId`. Must map indices between the filtered project-worktree subset and the full `worktrees` array.

Auto-save (already debounced at 1.5s) persists the new order automatically. No IPC or type changes needed.

### UI Changes (`WorktreeList.tsx`)

**Project-level drag:**
- `ProjectGroup` header gets `draggable` attribute
- `onDragStart` sets `text/project-id` in dataTransfer
- `onDragOver` on other project headers shows drop indicator
- `onDrop` reads project id, calculates from/to indices, calls `reorderProjects`
- `onDragEnd` clears visual state

**Worktree-level drag:**
- `WorktreeItem` gets `draggable` attribute
- `onDragStart` sets `text/worktree-id` in dataTransfer
- `onDragOver` on sibling worktree items shows drop indicator (only within same project)
- `onDrop` reads worktree id, calls `reorderWorktrees`
- `onDragEnd` clears visual state

**Visual feedback:**
- Drop indicator: 2px accent-colored line between items at the drop position
- Dragged item gets reduced opacity (0.5)
- Only show drop indicators for valid targets (projects on projects, worktrees within same project)

### Data Transfer Types

| Drag type | dataTransfer key | Value |
|-----------|-----------------|-------|
| Project | `text/project-id` | project.id |
| Worktree | `text/worktree-id` | worktree.id |

Using distinct keys prevents cross-type drops (can't drop a worktree where a project goes and vice versa).

### Edge Cases

- **Single project/worktree:** Drag still works, just no-ops (drop on self)
- **Collapsed project:** Worktrees inside are hidden, so only project-level drag applies
- **Drop on self:** No state change, no save triggered

## Files to Modify

| File | Change |
|------|--------|
| `src/renderer/stores/worktree-store.ts` | Add `reorderProjects`, `reorderWorktrees` |
| `src/renderer/components/workspace/WorktreeList.tsx` | Add drag-and-drop handlers and visual feedback |

## Files NOT Modified

- `src/shared/types.ts` — array position is the order, no new fields
- `src/shared/ipc-channels.ts` — existing config save handles persistence
- `src/main/*` — main process stays stateless
