# Project Folders Implementation Plan

> **For agentic workers:** REQUIRED: Use superpowers:subagent-driven-development (if subagents available) or superpowers:executing-plans to implement this plan. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add folder-based organization for projects in the sidebar — folders with name + color, optional grouping, drag-and-drop reordering.

**Architecture:** New `ProjectFolder` type + `folderId` FK on `Project` + `sidebarOrder` array for explicit ordering. Dropdown on "+" button to choose between adding a project or folder. Drag-and-drop supports moving projects in/out of folders.

**Tech Stack:** React 19, Zustand, TypeScript 5.9, Tailwind CSS (inline styles via COLORS constants)

---

## File Structure

| File | Action | Responsibility |
|------|--------|----------------|
| `src/shared/types.ts` | Modify | Add `ProjectFolder`, `SidebarOrderItem`, update `Project`, `CanopyConfig` |
| `src/renderer/stores/worktree-store.ts` | Modify | Add folder state, folder CRUD methods, sidebarOrder logic, migration |
| `src/renderer/components/workspace/WorktreeList.tsx` | Modify | Render folders, folder drag-and-drop, project-into-folder drag |
| `src/renderer/components/layout/Sidebar.tsx` | Modify | Replace "+" button with dropdown (Project / Folder) |
| `src/main/config-store.ts` | Modify | Update DEFAULT_CONFIG with folders + sidebarOrder |

---

## Chunk 1: Data Model + Store

### Task 1: Add types

**Files:**
- Modify: `src/shared/types.ts`

- [ ] **Step 1: Add ProjectFolder and SidebarOrderItem types, update Project and CanopyConfig**

```typescript
// After Project interface
export interface ProjectFolder {
  id: string
  name: string
  color: string
  createdAt: string
}

export type SidebarOrderItem =
  | { type: 'folder'; id: string }
  | { type: 'project'; id: string }

// Add to Project:
//   folderId?: string

// Add to CanopyConfig:
//   folders: ProjectFolder[]
//   sidebarOrder: SidebarOrderItem[]
```

- [ ] **Step 2: Update config-store default**

Add `folders: []` and `sidebarOrder: []` to DEFAULT_CONFIG in `src/main/config-store.ts`.

- [ ] **Step 3: Commit**

```bash
git add src/shared/types.ts src/main/config-store.ts
git commit -m "feat(types): add ProjectFolder and SidebarOrderItem types"
```

### Task 2: Store — folder state + CRUD + migration

**Files:**
- Modify: `src/renderer/stores/worktree-store.ts`

- [ ] **Step 1: Add folder state and methods to store interface**

New state: `folders: ProjectFolder[]`, `sidebarOrder: SidebarOrderItem[]`

New methods:
- `addFolder(name: string) => ProjectFolder`
- `removeFolder(id: string) => void`
- `renameFolder(id: string, name: string) => void`
- `moveProjectToFolder(projectId: string, folderId: string | null) => void`
- `reorderSidebar(fromIndex: number, toIndex: number) => void`
- `reorderProjectsInFolder(folderId: string, fromIndex: number, toIndex: number) => void`

- [ ] **Step 2: Implement migration in loadFromConfig**

When `config.sidebarOrder` is undefined/empty but `config.projects` has items, generate sidebarOrder from existing projects order.

- [ ] **Step 3: Update addProject to also add to sidebarOrder**
- [ ] **Step 4: Update removeProject to also remove from sidebarOrder**
- [ ] **Step 5: Update toConfig to include folders and sidebarOrder**
- [ ] **Step 6: Update auto-save subscription to watch folders and sidebarOrder**
- [ ] **Step 7: Commit**

```bash
git add src/renderer/stores/worktree-store.ts
git commit -m "feat(store): add folder CRUD and sidebarOrder management"
```

---

## Chunk 2: UI — Sidebar Dropdown + WorktreeList Folders

### Task 3: Sidebar "+" dropdown

**Files:**
- Modify: `src/renderer/components/layout/Sidebar.tsx`

- [ ] **Step 1: Replace direct "+" button with dropdown**

Click "+" shows a small dropdown with two options: "New Project" and "New Folder". "New Project" calls existing `handleAddProject`. "New Folder" shows an inline input or prompt for folder name, then calls `addFolder`.

- [ ] **Step 2: Commit**

```bash
git add src/renderer/components/layout/Sidebar.tsx
git commit -m "feat(sidebar): add dropdown menu for creating projects or folders"
```

### Task 4: WorktreeList — render folders + drag-and-drop

**Files:**
- Modify: `src/renderer/components/workspace/WorktreeList.tsx`

- [ ] **Step 1: Refactor WorktreeList to use sidebarOrder**

Instead of iterating `projects`, iterate `sidebarOrder`. For `type: 'folder'`, render a `FolderGroup` component. For `type: 'project'`, render existing `ProjectGroup`.

- [ ] **Step 2: Create FolderGroup component**

Similar to ProjectGroup but wraps multiple ProjectGroups. Shows folder name, color swatch, collapse toggle, project count. Projects inside a folder are those with matching `folderId`.

- [ ] **Step 3: Implement drag-and-drop for sidebar-level reordering**

Drag folders and loose projects to reorder via `reorderSidebar`.

- [ ] **Step 4: Implement drag project into/out of folder**

Dragging a project onto a folder header calls `moveProjectToFolder(projectId, folderId)`. Dragging a project out of a folder to the root level calls `moveProjectToFolder(projectId, null)`.

- [ ] **Step 5: Add folder context menu**

Right-click folder header: "Rename", "Remove folder" (projects become loose).

- [ ] **Step 6: Commit**

```bash
git add src/renderer/components/workspace/WorktreeList.tsx
git commit -m "feat(sidebar): render project folders with drag-and-drop support"
```

---

## Chunk 3: Verification

### Task 5: Typecheck + manual verification

- [ ] **Step 1: Run typecheck**

```bash
npm run typecheck
```

- [ ] **Step 2: Run dev mode and verify**

```bash
npm run dev
```

Verify: create folder, add projects to folder, drag in/out, reorder, rename, delete folder, config persists on restart.

- [ ] **Step 3: Final commit if needed**
