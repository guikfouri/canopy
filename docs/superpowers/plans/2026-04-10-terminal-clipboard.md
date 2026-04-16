# Implementation Plan — Terminal Clipboard

**Date:** 2026-04-10
**Spec:** docs/superpowers/specs/2026-04-10-terminal-clipboard-design.md
**Branch:** feat/windows-compatibility

## Overview

Add copy/paste support to `TerminalPane.tsx`: `copyOnSelect`, `Ctrl+Shift+C/V` keyboard shortcuts, and a right-click context menu using the existing `ContextMenu` component.

Single file change: `src/renderer/components/terminal/TerminalPane.tsx`

---

## Tasks

### Task 1 — Add `copyOnSelect: true` to Terminal options
**File:** `src/renderer/components/terminal/TerminalPane.tsx`

In the `new Terminal({...})` call, add:
```typescript
copyOnSelect: true,
```

**Verification:** Text selected in terminal should be automatically copied to clipboard.

---

### Task 2 — Add `Ctrl+Shift+C/V` keyboard handler
**File:** `src/renderer/components/terminal/TerminalPane.tsx`

After `terminal.open(containerRef.current)`, add:
```typescript
terminal.attachCustomKeyEventHandler((e: KeyboardEvent) => {
  if (e.ctrlKey && e.shiftKey && e.code === 'KeyC') {
    const sel = terminal.getSelection()
    if (sel) navigator.clipboard.writeText(sel)
    return false
  }
  if (e.ctrlKey && e.shiftKey && e.code === 'KeyV') {
    navigator.clipboard.readText().then((text) => {
      window.electronAPI.terminal.write(terminalId, text)
    })
    return false
  }
  return true
})
```

**Verification:** `Ctrl+Shift+C` copies selection; `Ctrl+Shift+V` pastes into terminal. `Ctrl+C` still sends SIGINT.

---

### Task 3 — Add right-click context menu
**File:** `src/renderer/components/terminal/TerminalPane.tsx`

1. Add import: `import { ContextMenu } from '../shared/ContextMenu'`
2. Add state: `const [contextMenu, setContextMenu] = useState<{ x: number; y: number } | null>(null)`
3. Add `onContextMenu` handler to the outer wrapper `<div>`:
   ```typescript
   onContextMenu={(e) => {
     e.preventDefault()
     setContextMenu({ x: e.clientX, y: e.clientY })
   }}
   ```
4. Render `<ContextMenu>` inside the wrapper, after the container `<div>`:
   ```typescript
   {contextMenu && (
     <ContextMenu
       x={contextMenu.x}
       y={contextMenu.y}
       onDismiss={() => setContextMenu(null)}
       items={[
         ...(terminalRef.current?.hasSelection()
           ? [{ label: 'Copy', shortcut: 'Ctrl+Shift+C', onClick: () => {
               const sel = terminalRef.current?.getSelection()
               if (sel) navigator.clipboard.writeText(sel)
               setContextMenu(null)
             }}]
           : []),
         { label: 'Paste', shortcut: 'Ctrl+Shift+V', onClick: () => {
             navigator.clipboard.readText().then((text) => {
               window.electronAPI.terminal.write(terminalId, text)
             })
             setContextMenu(null)
           }},
       ]}
     />
   )}
   ```

**Verification:** Right-click shows context menu. Copy appears only when text is selected. Paste always appears.

---

### Task 4 — Run typecheck
```bash
npm run typecheck
```
Must pass with no errors.

---

### Task 5 — Commit
```
feat(terminal): add clipboard copy/paste support
```
