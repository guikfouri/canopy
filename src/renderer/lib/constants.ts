// ── Canopy Design System ─────────────────────────────────
// CSS custom properties as single source of truth.
// COLORS uses var() references so inline styles react to theme changes automatically.

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
  primaryFixedDim: 'var(--primary-fixed-dim)',
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

  // Gutter between splits
  gutter: 'var(--gutter)',

  // Alpha variants
  primaryContainerGlow: 'var(--primary-container-glow)',
  primaryContainerOutline: 'var(--primary-container-outline)',
  primaryContainerSubtle: 'var(--primary-container-subtle)',
  outlineVariantSubtle: 'var(--outline-variant-subtle)',
} as const

export const PROJECT_COLORS = [
  '#ffb300', // amber
  '#ff8f00', // orange
  '#4ADE80', // green
  '#bbbcff', // indigo
  '#ffb4ab', // coral
  '#22D3EE', // cyan
  '#ffd79b', // gold
  '#EC4899', // pink
] as const

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
  return resolved === 'light' ? XTERM_LIGHT_THEME : XTERM_DARK_THEME
}

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
