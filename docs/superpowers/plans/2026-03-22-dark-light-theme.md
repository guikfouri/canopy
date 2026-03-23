# Dark/Light Theme Implementation Plan

> **For agentic workers:** REQUIRED: Use superpowers:subagent-driven-development (if subagents available) or superpowers:executing-plans to implement this plan. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add dark/light theme switching with system-default detection and a toggle button in the sidebar header.

**Architecture:** CSS custom properties are the single source of truth. `COLORS` object returns `var(--x)` references so inline styles react automatically via CSS — zero re-renders needed. A `useTheme` Zustand store manages preference/resolution/persistence. Monaco and xterm use separate hex-value theme objects swapped reactively.

**Tech Stack:** Electron 40, React 19, TypeScript, Zustand, Tailwind CSS 4.1, xterm.js, Monaco Editor

---

## File Structure

| File | Action | Responsibility |
|------|--------|----------------|
| `src/shared/types.ts` | Modify | Add `theme` to `CanopyConfig` |
| `src/renderer/styles.css` | Modify | Add `[data-theme="dark"]` and `[data-theme="light"]` variable sets |
| `src/renderer/lib/constants.ts` | Modify | COLORS uses CSS var refs; add light/dark xterm+monaco theme objects |
| `src/renderer/lib/theme.ts` | Create | `useTheme` Zustand store + system detection + persistence helpers |
| `src/renderer/App.tsx` | Modify | Initialize theme on mount |
| `src/renderer/components/layout/Sidebar.tsx` | Modify | Add toggle button in header |
| `src/renderer/components/terminal/TerminalPane.tsx` | Modify | Subscribe to theme, re-apply xterm theme |
| `src/renderer/components/terminal/FileEditorPane.tsx` | Modify | Subscribe to theme, re-apply Monaco theme |
| `src/renderer/stores/worktree-store.ts` | Modify | Include `theme` in config save/load |
| `src/main/config-store.ts` | Modify | Add `theme` default |

---

## Chunk 1: Foundation (Types + CSS + Constants)

### Task 1: Add `theme` to CanopyConfig type

**Files:**
- Modify: `src/shared/types.ts:62-69`

- [ ] **Step 1: Add ThemePreference type and theme field**

In `src/shared/types.ts`, add the type alias before `CanopyConfig` and add the field:

```typescript
// After line 60 (after TodoItem interface closing brace)
export type ThemePreference = 'system' | 'dark' | 'light'
```

Add `theme` field to `CanopyConfig`:

```typescript
export interface CanopyConfig {
  version: 1
  theme: ThemePreference  // NEW
  projects: Project[]
  worktrees: Worktree[]
  activeWorktreeId: string | null
  sidebarWidth: number
  fileExplorerWidth: number
}
```

- [ ] **Step 2: Add theme default to config-store**

In `src/main/config-store.ts:9-16`, add `theme: 'system'` to `DEFAULT_CONFIG`:

```typescript
const DEFAULT_CONFIG: CanopyConfig = {
  version: 1,
  theme: 'system',
  projects: [],
  worktrees: [],
  activeWorktreeId: null,
  sidebarWidth: 220,
  fileExplorerWidth: 280,
}
```

- [ ] **Step 3: Commit**

```bash
git add src/shared/types.ts src/main/config-store.ts
git commit -m "feat(config): add theme preference to CanopyConfig type"
```

---

### Task 2: Define both theme CSS variable sets

**Files:**
- Modify: `src/renderer/styles.css:4-38`

- [ ] **Step 1: Replace `:root` with `[data-theme="dark"]` and add `[data-theme="light"]`**

Replace the `:root` block (lines 4-38) with both theme definitions. Keep `:root` for non-color variables (fonts, radius, transitions). Colors go under `[data-theme]` selectors.

```css
/* ── Theme-independent tokens ─────────────────────────── */
:root {
  --font-display: 'Space Grotesk', sans-serif;
  --font-body: 'Inter', -apple-system, sans-serif;
  --font-mono: 'JetBrains Mono', 'Menlo', monospace;

  --radius-sm: 0.25rem;
  --radius-md: 0.375rem;

  --transition-fast: 150ms ease-out;
  --transition-normal: 200ms ease-out;
  --transition-slow: 300ms ease-out;
}

/* ── Dark Theme (Kinetic Console) ─────────────────────── */
[data-theme="dark"] {
  --surface: #111125;
  --surface-dim: #0c0c1f;
  --surface-container-lowest: #0c0c1f;
  --surface-container-low: #1a1a2e;
  --surface-container: #1e1e32;
  --surface-container-high: #28283d;
  --surface-container-highest: #333348;
  --surface-bright: #37374d;

  --primary: #ffd79b;
  --primary-container: #ffb300;
  --primary-fixed: #ffdeac;
  --on-primary: #432c00;

  --secondary: #ffb77a;
  --secondary-container: #ff8f00;

  --tertiary: #dcdaff;
  --tertiary-container: #bbbcff;

  --error: #ffb4ab;
  --error-container: #93000a;
  --success: #4ADE80;

  --on-surface: #e2e0fc;
  --on-surface-variant: #d6c4ac;
  --text-secondary: #9e8e78;
  --text-muted: #6b6460;

  --outline: #9e8e78;
  --outline-variant: #514532;
  --surface-variant: #333348;

  --gutter: #1a1a2e;

  /* Alpha variants for inline styles */
  --primary-container-glow: rgba(255, 179, 0, 0.38);
  --primary-container-outline: rgba(255, 179, 0, 0.19);
  --primary-container-subtle: rgba(255, 179, 0, 0.08);
  --outline-variant-subtle: rgba(81, 69, 50, 0.13);
  --glass-bg: rgba(51, 51, 72, 0.8);
  --selection-bg: rgba(255, 179, 0, 0.25);
}

/* ── Light Theme (Warm Cream + Amber) ─────────────────── */
[data-theme="light"] {
  --surface: #faf7f2;
  --surface-dim: #f0ece5;
  --surface-container-lowest: #ffffff;
  --surface-container-low: #f5f1ea;
  --surface-container: #e8e2d9;
  --surface-container-high: #ddd7ce;
  --surface-container-highest: #d2ccc3;
  --surface-bright: #ffffff;

  --primary: #9a6e00;
  --primary-container: #e09500;
  --primary-fixed: #7a5700;
  --on-primary: #ffffff;

  --secondary: #a85e00;
  --secondary-container: #ff9e2c;

  --tertiary: #4a4580;
  --tertiary-container: #6b65a0;

  --error: #ba1a1a;
  --error-container: #ffdad6;
  --success: #1b7a3d;

  --on-surface: #1a1a2e;
  --on-surface-variant: #4a3f2e;
  --text-secondary: #6b5d4f;
  --text-muted: #8a8078;

  --outline: #b5a898;
  --outline-variant: #d4c9bc;
  --surface-variant: #e8e2d9;

  --gutter: #e0dbd4;

  /* Alpha variants for inline styles */
  --primary-container-glow: rgba(224, 149, 0, 0.35);
  --primary-container-outline: rgba(224, 149, 0, 0.25);
  --primary-container-subtle: rgba(224, 149, 0, 0.10);
  --outline-variant-subtle: rgba(212, 201, 188, 0.5);
  --glass-bg: rgba(232, 226, 217, 0.85);
  --selection-bg: rgba(224, 149, 0, 0.2);
}
```

- [ ] **Step 2: Update other CSS rules that used hardcoded colors**

Update the `.glass` class (line 158-162):

```css
.glass {
  background: var(--glass-bg);
  backdrop-filter: blur(12px);
  -webkit-backdrop-filter: blur(12px);
}
```

Update `::selection` (line 187-190):

```css
::selection {
  background: var(--selection-bg);
  color: var(--on-surface);
}
```

- [ ] **Step 3: Commit**

```bash
git add src/renderer/styles.css
git commit -m "feat(theme): define dark and light CSS variable sets"
```

---

### Task 3: Migrate COLORS to CSS var references + add theme-specific objects

**Files:**
- Modify: `src/renderer/lib/constants.ts`

- [ ] **Step 1: Change COLORS to use CSS var references**

Replace the entire `COLORS` object to use CSS var references instead of hex values:

```typescript
// ── Kinetic Console Design System ──────────────────────────
// Colors reference CSS custom properties defined in styles.css.
// Theme switching changes the data-theme attribute on <html>,
// and CSS cascades handle the rest — zero React re-renders.

export const COLORS = {
  // Surface hierarchy (tonal nesting)
  surface: 'var(--surface)',
  surfaceDim: 'var(--surface-dim)',
  surfaceContainerLowest: 'var(--surface-container-lowest)',
  surfaceContainerLow: 'var(--surface-container-low)',
  surfaceContainer: 'var(--surface-container)',
  surfaceContainerHigh: 'var(--surface-container-high)',
  surfaceContainerHighest: 'var(--surface-container-highest)',
  surfaceBright: 'var(--surface-bright)',

  // Primary (Amber)
  primary: 'var(--primary)',
  primaryContainer: 'var(--primary-container)',
  primaryFixed: 'var(--primary-fixed)',
  primaryFixedDim: 'var(--primary-fixed-dim, #ffba38)',
  onPrimary: 'var(--on-primary)',

  // Secondary (Warm Orange)
  secondary: 'var(--secondary)',
  secondaryContainer: 'var(--secondary-container)',

  // Tertiary (Indigo/Lavender)
  tertiary: 'var(--tertiary)',
  tertiaryContainer: 'var(--tertiary-container)',

  // Semantic
  error: 'var(--error)',
  errorContainer: 'var(--error-container)',
  success: 'var(--success)',

  // Text
  onSurface: 'var(--on-surface)',
  onSurfaceVariant: 'var(--on-surface-variant)',
  textPrimary: 'var(--on-surface)',
  textSecondary: 'var(--text-secondary)',
  textMuted: 'var(--text-muted)',

  // Structure
  outline: 'var(--outline)',
  outlineVariant: 'var(--outline-variant)',
  surfaceVariant: 'var(--surface-variant)',

  // Gutter
  gutter: 'var(--gutter)',

  // Alpha variants (pre-defined in CSS to avoid hex-suffix pattern)
  primaryContainerGlow: 'var(--primary-container-glow)',
  primaryContainerOutline: 'var(--primary-container-outline)',
  primaryContainerSubtle: 'var(--primary-container-subtle)',
  outlineVariantSubtle: 'var(--outline-variant-subtle)',
} as const
```

- [ ] **Step 2: Add dark/light xterm and Monaco theme objects**

Keep the existing `XTERM_THEME` as `XTERM_DARK_THEME`, add `XTERM_LIGHT_THEME`, and add a helper:

```typescript
export const XTERM_DARK_THEME = {
  background: '#0c0c1f',
  foreground: '#e2e0fc',
  cursor: '#ffb300',
  cursorAccent: '#0c0c1f',
  selectionBackground: '#ffb30040',
  black: '#1a1a2e',
  red: '#ffb4ab',
  green: '#4ADE80',
  yellow: '#ffba38',
  blue: '#bbbcff',
  magenta: '#c0c1ff',
  cyan: '#22D3EE',
  white: '#e2e0fc',
  brightBlack: '#514532',
  brightRed: '#ffdad6',
  brightGreen: '#86efac',
  brightYellow: '#ffd79b',
  brightBlue: '#dcdaff',
  brightMagenta: '#e1e0ff',
  brightCyan: '#67e8f9',
  brightWhite: '#FFFFFF',
} as const

export const XTERM_LIGHT_THEME = {
  background: '#faf7f2',
  foreground: '#1a1a2e',
  cursor: '#e09500',
  cursorAccent: '#faf7f2',
  selectionBackground: 'rgba(224, 149, 0, 0.2)',
  black: '#1a1a2e',
  red: '#ba1a1a',
  green: '#1b7a3d',
  yellow: '#9a6e00',
  blue: '#2563eb',
  magenta: '#7c3aed',
  cyan: '#0891b2',
  white: '#e8e2d9',
  brightBlack: '#6b5d4f',
  brightRed: '#dc2626',
  brightGreen: '#22c55e',
  brightYellow: '#ca8a04',
  brightBlue: '#3b82f6',
  brightMagenta: '#8b5cf6',
  brightCyan: '#06b6d4',
  brightWhite: '#faf7f2',
} as const

export function getXtermTheme(resolved: 'dark' | 'light') {
  return resolved === 'dark' ? XTERM_DARK_THEME : XTERM_LIGHT_THEME
}

// Monaco theme definitions (hex values required by Monaco API)
export const MONACO_DARK_COLORS = {
  'editor.background': '#0c0c1f',
  'editor.foreground': '#e2e0fc',
  'editor.lineHighlightBackground': '#1a1a2e',
  'editor.selectionBackground': '#ffb30040',
  'editorCursor.foreground': '#ffb300',
  'editorLineNumber.foreground': '#6b6460',
  'editorLineNumber.activeForeground': '#9e8e78',
  'editor.inactiveSelectionBackground': '#ffb30020',
  'editorIndentGuide.background': '#28283d',
  'editorIndentGuide.activeBackground': '#333348',
  'scrollbarSlider.background': '#33334840',
  'scrollbarSlider.hoverBackground': '#33334880',
  'scrollbarSlider.activeBackground': '#333348',
} as const

export const MONACO_LIGHT_COLORS = {
  'editor.background': '#faf7f2',
  'editor.foreground': '#1a1a2e',
  'editor.lineHighlightBackground': '#f0ece5',
  'editor.selectionBackground': 'rgba(224, 149, 0, 0.2)',
  'editorCursor.foreground': '#e09500',
  'editorLineNumber.foreground': '#8a8078',
  'editorLineNumber.activeForeground': '#6b5d4f',
  'editor.inactiveSelectionBackground': 'rgba(224, 149, 0, 0.1)',
  'editorIndentGuide.background': '#ddd7ce',
  'editorIndentGuide.activeBackground': '#d2ccc3',
  'scrollbarSlider.background': '#d2ccc340',
  'scrollbarSlider.hoverBackground': '#d2ccc380',
  'scrollbarSlider.activeBackground': '#d2ccc3',
} as const

export const MONACO_DARK_RULES = [
  { token: 'comment', foreground: '6b6460', fontStyle: 'italic' },
  { token: 'keyword', foreground: 'ffba38' },
  { token: 'string', foreground: '4ADE80' },
  { token: 'number', foreground: 'ffb77a' },
  { token: 'type', foreground: 'bbbcff' },
  { token: 'function', foreground: 'ffd79b' },
  { token: 'variable', foreground: 'e2e0fc' },
] as const

export const MONACO_LIGHT_RULES = [
  { token: 'comment', foreground: '8a8078', fontStyle: 'italic' },
  { token: 'keyword', foreground: '9a6e00' },
  { token: 'string', foreground: '1b7a3d' },
  { token: 'number', foreground: 'a85e00' },
  { token: 'type', foreground: '4a4580' },
  { token: 'function', foreground: '7a5700' },
  { token: 'variable', foreground: '1a1a2e' },
] as const
```

Remove the old `XTERM_THEME` export (it's replaced by `XTERM_DARK_THEME`).

- [ ] **Step 3: Commit**

```bash
git add src/renderer/lib/constants.ts
git commit -m "feat(theme): migrate COLORS to CSS var refs, add light theme objects"
```

---

## Chunk 2: Theme Store + UI Toggle

### Task 4: Create theme store with system detection

**Files:**
- Create: `src/renderer/lib/theme.ts`

- [ ] **Step 1: Create the useTheme Zustand store**

```typescript
import { create } from 'zustand'
import type { ThemePreference } from '@shared/types'

type ResolvedTheme = 'dark' | 'light'

interface ThemeStore {
  preference: ThemePreference
  resolved: ResolvedTheme

  init: (preference: ThemePreference) => void
  setTheme: (preference: ThemePreference) => void
  toggleTheme: () => void
}

function resolveTheme(preference: ThemePreference): ResolvedTheme {
  if (preference !== 'system') return preference
  return window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light'
}

function applyTheme(resolved: ResolvedTheme) {
  document.documentElement.setAttribute('data-theme', resolved)
}

export const useThemeStore = create<ThemeStore>()((set, get) => ({
  preference: 'system',
  resolved: 'dark',

  init: (preference: ThemePreference) => {
    const resolved = resolveTheme(preference)
    applyTheme(resolved)
    set({ preference, resolved })
  },

  setTheme: (preference: ThemePreference) => {
    const resolved = resolveTheme(preference)
    applyTheme(resolved)
    set({ preference, resolved })
  },

  toggleTheme: () => {
    const current = get().resolved
    const next: ResolvedTheme = current === 'dark' ? 'light' : 'dark'
    applyTheme(next)
    set({ preference: next, resolved: next })
  },
}))

// Listen for system theme changes when preference is "system"
if (typeof window !== 'undefined') {
  const mediaQuery = window.matchMedia('(prefers-color-scheme: dark)')
  mediaQuery.addEventListener('change', (e) => {
    const { preference } = useThemeStore.getState()
    if (preference === 'system') {
      const resolved: ResolvedTheme = e.matches ? 'dark' : 'light'
      applyTheme(resolved)
      useThemeStore.setState({ resolved })
    }
  })
}
```

- [ ] **Step 2: Commit**

```bash
git add src/renderer/lib/theme.ts
git commit -m "feat(theme): create useThemeStore with system detection"
```

---

### Task 5: Wire theme into config persistence

**Files:**
- Modify: `src/renderer/stores/worktree-store.ts`
- Modify: `src/renderer/App.tsx`

- [ ] **Step 1: Include theme in worktree-store config save/load**

In `worktree-store.ts`, modify `loadFromConfig` to also init theme (line 40-49):

```typescript
loadFromConfig: (config: CanopyConfig) => {
  _isLoadingConfig = true
  // Init theme from config (imported from theme.ts)
  useThemeStore.getState().init(config.theme ?? 'system')

  set({
    projects: config.projects || [],
    worktrees: config.worktrees || [],
    activeWorktreeId: config.activeWorktreeId,
    sidebarWidth: config.sidebarWidth,
    loaded: true,
  })
  _isLoadingConfig = false
},
```

Add import at top:
```typescript
import { useThemeStore } from '../lib/theme'
```

Modify `toConfig` to include theme (line 165-175):

```typescript
toConfig: () => {
  const state = get()
  return {
    version: 1 as const,
    theme: useThemeStore.getState().preference,
    projects: state.projects,
    worktrees: state.worktrees,
    activeWorktreeId: state.activeWorktreeId,
    sidebarWidth: state.sidebarWidth,
    fileExplorerWidth: 280,
  }
},
```

- [ ] **Step 2: Add theme store subscription to auto-save**

In the auto-save subscriber at the bottom of `worktree-store.ts`, add a second subscriber for theme changes:

```typescript
// Auto-save when theme preference changes
useThemeStore.subscribe(
  (s) => s.preference,
  () => {
    if (_isLoadingConfig) return
    if (_saveTimer) clearTimeout(_saveTimer)
    _saveTimer = setTimeout(() => {
      useWorktreeStore.getState().saveConfig()
    }, 1500)
  },
)
```

- [ ] **Step 3: Set default data-theme before React hydrates**

In `src/renderer/App.tsx`, add a fallback `data-theme="dark"` before config loads. Modify the loading spinner div (line 58-77) to also set a default theme:

```typescript
// At the top of App.tsx, before React hydrates, set default theme
// This prevents a flash of unstyled content
if (!document.documentElement.hasAttribute('data-theme')) {
  const prefersDark = window.matchMedia('(prefers-color-scheme: dark)').matches
  document.documentElement.setAttribute('data-theme', prefersDark ? 'dark' : 'light')
}
```

Add this as a module-level statement at the top of `App.tsx` (after imports).

Also update the fallback config in `App.tsx:27-34` to include theme:

```typescript
loadFromConfig({
  version: 1,
  theme: 'system',
  projects: [],
  worktrees: [],
  activeWorktreeId: null,
  sidebarWidth: 220,
  fileExplorerWidth: 280,
})
```

Update the loading spinner to use CSS vars instead of hardcoded colors:

```typescript
if (!loaded) {
  return (
    <div style={{
      width: '100vw',
      height: '100dvh',
      background: 'var(--surface)',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
    }}>
      <div style={{
        width: '32px',
        height: '32px',
        borderRadius: '50%',
        border: '2px solid var(--surface-container-highest)',
        borderTopColor: 'var(--primary-container)',
        animation: 'spin 800ms linear infinite',
      }} />
      <style>{`@keyframes spin { to { transform: rotate(360deg) } }`}</style>
    </div>
  )
}
```

- [ ] **Step 4: Commit**

```bash
git add src/renderer/stores/worktree-store.ts src/renderer/App.tsx
git commit -m "feat(theme): wire theme into config persistence and app init"
```

---

### Task 6: Add toggle button to Sidebar

**Files:**
- Modify: `src/renderer/components/layout/Sidebar.tsx`

- [ ] **Step 1: Add theme toggle button next to "Canopy" title**

Add import at top of `Sidebar.tsx`:
```typescript
import { useThemeStore } from '../../lib/theme'
```

Inside the `Sidebar` component, add:
```typescript
const resolved = useThemeStore((s) => s.resolved)
const toggleTheme = useThemeStore((s) => s.toggleTheme)
const [themeHovered, setThemeHovered] = useState(false)
```

In the header `<div>` (the one with `...DRAG`, lines 37-63), modify to add the toggle button. The header currently has a flex container with "Canopy" on the left and nothing on the right. Add the toggle button on the right side:

Replace the header div content (lines 44-62):

```tsx
<div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
  {/* Amber LED indicator */}
  <div style={{
    width: '6px',
    height: '6px',
    borderRadius: '50%',
    background: COLORS.primaryContainer,
    boxShadow: `0 0 8px ${COLORS.primaryContainerGlow}`,
  }} />
  <span style={{
    color: COLORS.onSurface,
    fontSize: '15px',
    fontFamily: "'Space Grotesk', sans-serif",
    fontWeight: 600,
    letterSpacing: '-0.02em',
  }}>
    Canopy
  </span>
</div>
{/* Theme toggle */}
<button
  onClick={toggleTheme}
  onMouseEnter={() => setThemeHovered(true)}
  onMouseLeave={() => setThemeHovered(false)}
  style={{
    width: '28px',
    height: '28px',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    background: themeHovered ? COLORS.surfaceContainerHighest : 'transparent',
    border: 'none',
    borderRadius: '6px',
    color: themeHovered ? COLORS.primary : COLORS.textSecondary,
    cursor: 'pointer',
    transition: 'all 200ms ease-out',
    ...NO_DRAG,
  }}
  aria-label={`Switch to ${resolved === 'dark' ? 'light' : 'dark'} theme`}
  title={`Switch to ${resolved === 'dark' ? 'light' : 'dark'} theme`}
>
  {resolved === 'dark' ? (
    // Sun icon — click to switch to light
    <svg width="16" height="16" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.3" strokeLinecap="round">
      <circle cx="8" cy="8" r="3" />
      <path d="M8 1.5v1.5M8 13v1.5M1.5 8H3M13 8h1.5M3.17 3.17l1.06 1.06M11.77 11.77l1.06 1.06M3.17 12.83l1.06-1.06M11.77 4.23l1.06-1.06" />
    </svg>
  ) : (
    // Moon icon — click to switch to dark
    <svg width="16" height="16" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.3" strokeLinecap="round">
      <path d="M13.5 8.5a5.5 5.5 0 0 1-7-7 5.5 5.5 0 1 0 7 7z" />
    </svg>
  )}
</button>
```

- [ ] **Step 2: Fix alpha-suffix patterns in Sidebar.tsx**

Replace any remaining `${COLORS.xxx}XX` hex-alpha patterns with the new CSS var alpha variants:

- `${COLORS.primaryContainer}60` → `COLORS.primaryContainerGlow`
- `${COLORS.outlineVariant}20` → `COLORS.outlineVariantSubtle`

In the bottom border (line 125):
```typescript
borderTop: `1px solid ${COLORS.outlineVariantSubtle}`,
```

- [ ] **Step 3: Commit**

```bash
git add src/renderer/components/layout/Sidebar.tsx
git commit -m "feat(theme): add sun/moon toggle button in sidebar header"
```

---

## Chunk 3: Monaco + xterm Theme Reactivity + Component Fixes

### Task 7: Make TerminalPane reactive to theme changes

**Files:**
- Modify: `src/renderer/components/terminal/TerminalPane.tsx`

- [ ] **Step 1: Subscribe to theme and re-apply xterm theme**

Update imports:
```typescript
import { COLORS, getXtermTheme } from '../../lib/constants'
import { useThemeStore } from '../../lib/theme'
```

Replace `XTERM_THEME` reference in Terminal constructor (line 58):
```typescript
const terminal = new Terminal({
  theme: getXtermTheme(useThemeStore.getState().resolved),
  // ... rest unchanged
})
```

Add a new `useEffect` after the existing ones to subscribe to theme changes:
```typescript
// Re-apply xterm theme when theme changes
useEffect(() => {
  const unsub = useThemeStore.subscribe(
    (s) => s.resolved,
    (resolved) => {
      if (terminalRef.current) {
        terminalRef.current.options.theme = getXtermTheme(resolved)
      }
    },
  )
  return unsub
}, [])
```

- [ ] **Step 2: Fix alpha-suffix patterns**

Replace:
- `${COLORS.primaryContainer}30` → `COLORS.primaryContainerOutline`
- `${COLORS.primaryContainer}15` → `COLORS.primaryContainerSubtle`

In the outline style (line 169-171):
```typescript
outline: isFocused
  ? `1px solid ${COLORS.primaryContainerOutline}`
  : '1px solid transparent',
boxShadow: isFocused
  ? `inset 0 0 0 1px ${COLORS.primaryContainerSubtle}`
  : 'none',
```

- [ ] **Step 3: Commit**

```bash
git add src/renderer/components/terminal/TerminalPane.tsx
git commit -m "feat(theme): make TerminalPane reactive to theme changes"
```

---

### Task 8: Make FileEditorPane reactive to theme changes

**Files:**
- Modify: `src/renderer/components/terminal/FileEditorPane.tsx`

- [ ] **Step 1: Define both Monaco themes and subscribe to changes**

Update imports:
```typescript
import { COLORS, MONACO_DARK_COLORS, MONACO_LIGHT_COLORS, MONACO_DARK_RULES, MONACO_LIGHT_RULES } from '../../lib/constants'
import { useThemeStore } from '../../lib/theme'
```

Replace the static theme definition (lines 17-45) with both themes:
```typescript
// Define both Monaco themes
monaco.editor.defineTheme('kinetic-dark', {
  base: 'vs-dark',
  inherit: true,
  rules: [...MONACO_DARK_RULES],
  colors: { ...MONACO_DARK_COLORS },
})

monaco.editor.defineTheme('kinetic-light', {
  base: 'vs',
  inherit: true,
  rules: [...MONACO_LIGHT_RULES],
  colors: { ...MONACO_LIGHT_COLORS },
})

function getMonacoThemeName(resolved: 'dark' | 'light') {
  return resolved === 'dark' ? 'kinetic-dark' : 'kinetic-light'
}
```

In the editor create call (line 122), change theme:
```typescript
theme: getMonacoThemeName(useThemeStore.getState().resolved),
```

Add a `useEffect` to subscribe to theme changes:
```typescript
// Re-apply Monaco theme when theme changes
useEffect(() => {
  const unsub = useThemeStore.subscribe(
    (s) => s.resolved,
    (resolved) => {
      monaco.editor.setTheme(getMonacoThemeName(resolved))
    },
  )
  return unsub
}, [])
```

- [ ] **Step 2: Fix alpha-suffix patterns**

Same as TerminalPane — replace:
- `${COLORS.primaryContainer}30` → `COLORS.primaryContainerOutline`
- `${COLORS.primaryContainer}15` → `COLORS.primaryContainerSubtle`

- [ ] **Step 3: Commit**

```bash
git add src/renderer/components/terminal/FileEditorPane.tsx
git commit -m "feat(theme): make FileEditorPane reactive to theme changes"
```

---

### Task 9: Fix alpha-suffix patterns in remaining components

**Files:**
- Grep for `${COLORS.` pattern across all components to find remaining alpha-suffix usages

- [ ] **Step 1: Search and fix all remaining hex-alpha patterns**

Run:
```bash
grep -rn 'COLORS\.\w*}[0-9a-fA-F]\{2\}' src/renderer/components/
```

For each match, replace with the appropriate CSS var alpha variant:
- `${COLORS.primaryContainer}60` → `COLORS.primaryContainerGlow`
- `${COLORS.primaryContainer}40` → `COLORS.primaryContainerOutline` (close enough)
- `${COLORS.primaryContainer}30` → `COLORS.primaryContainerOutline`
- `${COLORS.primaryContainer}15` → `COLORS.primaryContainerSubtle`
- `${COLORS.outlineVariant}20` → `COLORS.outlineVariantSubtle`

If new alpha patterns are found, add corresponding CSS vars to both theme blocks in `styles.css`.

- [ ] **Step 2: Commit**

```bash
git add -u src/renderer/
git commit -m "fix(theme): replace all hex-alpha patterns with CSS var alpha variants"
```

---

## Chunk 4: Verification

### Task 10: Verify everything works

- [ ] **Step 1: TypeScript check**

Run:
```bash
npm run typecheck
```

Expected: No errors. Fix any type issues.

- [ ] **Step 2: Build check**

Run:
```bash
npm run build
```

Expected: Successful build.

- [ ] **Step 3: Dev mode visual verification**

Run:
```bash
npm run dev
```

Verify:
1. App starts in system-detected theme (dark if system is dark, light if light)
2. Sun/moon icon visible next to "Canopy" in sidebar header
3. Clicking toggle switches theme instantly:
   - All surfaces change color
   - Text contrast is readable
   - Amber accents are visible in both themes
4. Open a terminal — terminal colors match theme
5. Open a file — Monaco editor colors match theme
6. Toggle theme with terminal and editor open — both update live
7. Close and reopen app — theme preference persists
8. Check loading spinner uses theme-appropriate colors

- [ ] **Step 4: Final commit (if any fixes needed)**

```bash
git add -u
git commit -m "fix(theme): address verification issues"
```
