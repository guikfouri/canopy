# Terminal Clipboard — Design Spec

**Date:** 2026-04-10
**Status:** Approved
**Scope:** Add copy/paste support to the terminal pane (primarily fixes Windows, also improves Linux/macOS)

---

## Problem

`TerminalPane.tsx` has no clipboard implementation. On macOS, Cmd+C (copy) doesn't conflict with Ctrl+C (SIGINT), so the absence of explicit clipboard handling is less noticeable. On Windows there is no such separation — Ctrl+C is always SIGINT, Ctrl+V is unreliable, and right-click produces no useful menu on xterm.js canvas elements.

Result on Windows: users cannot copy text from the terminal or paste into it via keyboard or mouse.

---

## Decision

Implement clipboard via manual handling in `TerminalPane.tsx` (Approach B). No new dependencies, no new files — uses `terminal.attachCustomKeyEventHandler()`, `navigator.clipboard`, and the existing `ContextMenu` component.

---

## Behavior

| Action | Result |
|--------|--------|
| Select text | Automatically copies to clipboard (`copyOnSelect: true`) |
| `Ctrl+Shift+C` | Copies current selection to clipboard |
| `Ctrl+Shift+V` | Pastes clipboard content into terminal |
| Right-click (with selection) | Context menu: Copy + Paste |
| Right-click (no selection) | Context menu: Paste only |
| `Ctrl+C` | Unchanged — sends SIGINT to PTY |

---

## Architecture

Single file change: `src/renderer/components/terminal/TerminalPane.tsx`.

### 1. `copyOnSelect` option

Add to the `new Terminal({...})` options:

```typescript
copyOnSelect: true,
```

### 2. Custom key handler

Registered immediately after `terminal.open()`. Returns `false` to suppress PTY propagation for handled keys; `true` for everything else.

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

### 3. Right-click context menu

Add `contextMenu` state to `TerminalPane`:

```typescript
const [contextMenu, setContextMenu] = useState<{ x: number; y: number } | null>(null)
```

Add `onContextMenu` to the outer wrapper `<div>`:

```typescript
onContextMenu={(e) => {
  e.preventDefault()
  setContextMenu({ x: e.clientX, y: e.clientY })
}}
```

Render `<ContextMenu>` below the terminal `<div>`:

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

---

## What Does NOT Change

- `Ctrl+C` behavior — still sends SIGINT to PTY
- All other keyboard shortcuts
- All other files (no IPC additions, no new components, no new dependencies)
- macOS/Linux behavior — `copyOnSelect` and `Ctrl+Shift+C/V` work on all platforms

---

## Out of Scope

- Middle-click paste (X11 style)
- `Ctrl+C` copy-when-selection-exists behavior (VS Code style) — conflicts with SIGINT expectations
- Clipboard history
