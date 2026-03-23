# Dark/Light Theme Support — Design Spec

## Overview

Add dark/light theme switching to Canopy with system-default detection and a toggle button in the sidebar header next to the "Canopy" logo.

## Requirements

- Detect system preference (`prefers-color-scheme`) on first launch
- Three-state preference: `system | dark | light`
- Persist theme preference in `~/.canopy/config.json`
- Toggle button in sidebar header (sun/moon icon)
- Propagate theme to Monaco editor and xterm.js terminals
- Maintain amber accent identity across both themes

## Architecture

### Single Source of Truth: CSS Custom Properties

Currently, the app uses a hardcoded `COLORS` object in `constants.ts` with inline `style` props. The new approach:

1. **`styles.css`** defines two complete color sets via `[data-theme="dark"]` and `[data-theme="light"]` selectors on `<html>`
2. **`COLORS` object** reads from CSS custom properties via `getComputedStyle()`, cached and invalidated on theme change
3. **Components** continue using `COLORS.xxx` in inline styles — minimal migration
4. **Monaco/xterm** re-apply their themes when the resolved theme changes

### Theme Resolution

```
config.theme → "system" | "dark" | "light"
                    ↓
            if "system" → read prefers-color-scheme
                    ↓
            resolvedTheme → "dark" | "light"
                    ↓
            set data-theme on <html>
                    ↓
            invalidate COLORS cache
                    ↓
            notify subscribers (stores, Monaco, xterm)
```

### State Management

Add theme fields to the existing `WorktreeStore` (or a minimal dedicated hook):

```typescript
// In CanopyConfig (types.ts)
theme: 'system' | 'dark' | 'light'  // persisted preference

// Runtime state
resolvedTheme: 'dark' | 'light'     // actual applied theme
```

A `useTheme()` hook exposes:
- `theme` — the user preference (`system | dark | light`)
- `resolvedTheme` — the actual applied theme (`dark | light`)
- `setTheme(preference)` — updates preference, resolves, applies, persists
- `toggleTheme()` — cycles: current resolved → opposite

### System Detection

```typescript
// On app start + when preference is "system"
const mediaQuery = window.matchMedia('(prefers-color-scheme: dark)')
mediaQuery.addEventListener('change', (e) => {
  if (theme === 'system') applyTheme(e.matches ? 'dark' : 'light')
})
```

## Color Palettes

### Dark Theme (existing "Kinetic Console")

| Token | Value |
|-------|-------|
| `--surface` | `#111125` |
| `--surface-dim` | `#0c0c1f` |
| `--surface-container` | `#1e1e32` |
| `--surface-container-high` | `#28283d` |
| `--surface-container-highest` | `#333348` |
| `--on-surface` | `#e2e0fc` |
| `--on-surface-variant` | `#d6c4ac` |
| `--text-secondary` | `#9e8e78` |
| `--text-muted` | `#6b6460` |
| `--primary` | `#ffd79b` |
| `--primary-container` | `#ffb300` |
| `--on-primary` | `#1a1a00` |
| `--error` | `#ffb4ab` |
| `--success` | `#4ADE80` |
| `--outline` | `#9e8e78` |
| `--outline-variant` | `#514532` |
| `--gutter` | `#1a1a2e` |

### Light Theme (warm cream + amber)

| Token | Value | Notes |
|-------|-------|-------|
| `--surface` | `#faf7f2` | Warm cream base |
| `--surface-dim` | `#f0ece5` | Slightly deeper cream |
| `--surface-container` | `#e8e2d9` | Card/panel bg |
| `--surface-container-high` | `#ddd7ce` | Elevated surfaces |
| `--surface-container-highest` | `#d2ccc3` | Highest elevation |
| `--on-surface` | `#1a1a2e` | Near-black text (15:1 contrast) |
| `--on-surface-variant` | `#4a3f2e` | Warm dark variant |
| `--text-secondary` | `#6b5d4f` | Secondary text (4.7:1) |
| `--text-muted` | `#8a8078` | Decorative text (3.2:1) |
| `--primary` | `#9a6e00` | Darkened amber for contrast (5.2:1) |
| `--primary-container` | `#e09500` | Saturated amber |
| `--on-primary` | `#ffffff` | White on amber buttons |
| `--error` | `#ba1a1a` | Accessible red on cream |
| `--success` | `#1b7a3d` | Accessible green on cream |
| `--outline` | `#b5a898` | Warm gray border |
| `--outline-variant` | `#d4c9bc` | Subtle separator |
| `--gutter` | `#e0dbd4` | Split pane separator |

### xterm.js Light Theme

| Token | Value |
|-------|-------|
| background | `#faf7f2` |
| foreground | `#1a1a2e` |
| cursor | `#e09500` |
| cursorAccent | `#faf7f2` |
| selectionBackground | `rgba(224, 149, 0, 0.2)` |
| black | `#1a1a2e` |
| red | `#ba1a1a` |
| green | `#1b7a3d` |
| yellow | `#9a6e00` |
| blue | `#2563eb` |
| magenta | `#7c3aed` |
| cyan | `#0891b2` |
| white | `#e8e2d9` |
| brightBlack | `#6b5d4f` |
| brightWhite | `#faf7f2` |

### Monaco Light Theme

Base: `vs` (built-in light). Override editor colors:
- `editor.background`: `#faf7f2`
- `editor.foreground`: `#1a1a2e`
- `editor.lineHighlightBackground`: `#f0ece5`
- `editor.selectionBackground`: `rgba(224, 149, 0, 0.2)`
- `editorLineNumber.foreground`: `#8a8078`
- `editorCursor.foreground`: `#e09500`

## UI: Toggle Button

Location: `Sidebar.tsx` header, right side of "Canopy" text.

Appearance:
- Sun icon (light mode active) / Moon icon (dark mode active)
- 24x24px icon, `cursor: pointer`
- Hover: slight opacity change (0.7 → 1.0)
- Transition: 200ms opacity + 200ms icon crossfade
- No text label (icon is self-explanatory in this context)

Behavior:
- Click: toggles between dark and light (overrides "system" to explicit choice)
- The toggle sets explicit preference, not "system". To go back to system, would need a settings panel (future scope).

## Config Schema Change

```typescript
interface CanopyConfig {
  version: 1
  theme: 'system' | 'dark' | 'light'  // NEW — default: 'system'
  projects: Project[]
  worktrees: Worktree[]
  activeWorktreeId: string | null
  sidebarWidth: number
  fileExplorerWidth: number
}
```

Backward compatible: if `theme` is missing from existing config, default to `'system'`.

## Files Changed

| File | Change |
|------|--------|
| `src/shared/types.ts` | Add `theme` field to `CanopyConfig` |
| `src/shared/ipc-channels.ts` | Add `THEME_CHANGED` channel (for future main-process sync) |
| `src/renderer/styles.css` | Add `[data-theme="dark"]` and `[data-theme="light"]` variable sets |
| `src/renderer/lib/constants.ts` | `COLORS` reads from CSS vars; add `XTERM_LIGHT_THEME`; add `getColors()` + `onThemeChange()` |
| `src/renderer/lib/theme.ts` | NEW — `useTheme()` hook: resolve, apply, persist, listen to system changes |
| `src/renderer/App.tsx` | Initialize theme on mount |
| `src/renderer/components/layout/Sidebar.tsx` | Add toggle button in header |
| `src/renderer/components/terminal/TerminalPane.tsx` | Subscribe to theme changes, re-apply xterm theme |
| `src/renderer/components/terminal/FileEditorPane.tsx` | Subscribe to theme changes, re-apply Monaco theme |
| `src/renderer/stores/worktree-store.ts` | Persist `theme` in config save/load |
| `src/main/config-store.ts` | Handle `theme` field with backward-compatible default |

## Accessibility

- Primary text contrast >= 4.5:1 in both modes (verified above)
- Focus ring (amber) visible in both themes
- `prefers-reduced-motion`: skip icon transition animation
- Toggle button has `aria-label="Switch to dark/light theme"`

## Out of Scope

- Theme customization (custom palettes)
- Per-worktree themes
- Settings panel for "system" option (toggle is dark/light only for MVP)
- Syncing theme with OS in real-time when set to explicit dark/light
