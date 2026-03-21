// ── Kinetic Console Design System ──────────────────────────
// Deep navy surfaces with amber accents. Tonal nesting for depth.
// No harsh borders — boundaries defined through background shifts.

export const COLORS = {
  // Surface hierarchy (tonal nesting)
  surface: '#111125',
  surfaceDim: '#0c0c1f',
  surfaceContainerLowest: '#0c0c1f',
  surfaceContainerLow: '#1a1a2e',
  surfaceContainer: '#1e1e32',
  surfaceContainerHigh: '#28283d',
  surfaceContainerHighest: '#333348',
  surfaceBright: '#37374d',

  // Primary (Amber)
  primary: '#ffd79b',
  primaryContainer: '#ffb300',
  primaryFixed: '#ffdeac',
  primaryFixedDim: '#ffba38',
  onPrimary: '#432c00',

  // Secondary (Warm Orange)
  secondary: '#ffb77a',
  secondaryContainer: '#ff8f00',

  // Tertiary (Indigo/Lavender)
  tertiary: '#dcdaff',
  tertiaryContainer: '#bbbcff',

  // Semantic
  error: '#ffb4ab',
  errorContainer: '#93000a',
  success: '#4ADE80',

  // Text
  onSurface: '#e2e0fc',
  onSurfaceVariant: '#d6c4ac',
  textPrimary: '#e2e0fc',
  textSecondary: '#9e8e78',
  textMuted: '#6b6460',

  // Structure
  outline: '#9e8e78',
  outlineVariant: '#514532',
  surfaceVariant: '#333348',

  // Gutter between splits (slightly lighter than terminal bg for visibility)
  gutter: '#1a1a2e',
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

export const XTERM_THEME = {
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
