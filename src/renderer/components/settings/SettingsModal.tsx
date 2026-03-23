import { useState } from 'react'
import { COLORS } from '../../lib/constants'
import { useWorktreeStore } from '../../stores/worktree-store'
import { useThemeStore } from '../../lib/theme'
import type { ThemePreference } from '@shared/types'

type Category = 'appearance' | 'terminal'

const CATEGORIES: { id: Category; label: string; icon: React.ReactNode }[] = [
  {
    id: 'appearance',
    label: 'Appearance',
    icon: (
      <svg width="16" height="16" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.3" strokeLinecap="round">
        <circle cx="8" cy="8" r="6" />
        <path d="M8 2v12" />
        <path d="M8 2a6 6 0 0 1 0 12" fill="currentColor" fillOpacity="0.15" stroke="none" />
      </svg>
    ),
  },
  {
    id: 'terminal',
    label: 'Terminal',
    icon: (
      <svg width="16" height="16" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.3" strokeLinecap="round" strokeLinejoin="round">
        <rect x="1.5" y="2.5" width="13" height="11" rx="1.5" />
        <path d="M4.5 6l2.5 2-2.5 2" />
        <path d="M8.5 10h3" />
      </svg>
    ),
  },
]

interface SettingsModalProps {
  isOpen: boolean
  onClose: () => void
}

export function SettingsModal({ isOpen, onClose }: SettingsModalProps) {
  const [activeCategory, setActiveCategory] = useState<Category>('appearance')
  const [hoveredCategory, setHoveredCategory] = useState<Category | null>(null)

  if (!isOpen) return null

  return (
    <div
      style={{
        position: 'fixed',
        inset: 0,
        background: COLORS.scrim,
        backdropFilter: 'blur(4px)',
        WebkitBackdropFilter: 'blur(4px)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        zIndex: 100,
        animation: 'fadeIn 150ms ease-out',
      }}
      onClick={onClose}
      onKeyDown={(e) => { if (e.key === 'Escape') onClose() }}
    >
      <div
        onClick={(e) => e.stopPropagation()}
        style={{
          background: COLORS.surfaceContainer,
          borderRadius: '10px',
          border: `1px solid ${COLORS.outlineVariantLight}`,
          width: '560px',
          maxHeight: '80vh',
          display: 'flex',
          overflow: 'hidden',
          boxShadow: `0 24px 48px ${COLORS.shadowColorStrong}`,
          animation: 'scaleIn 200ms ease-out',
        }}
      >
        {/* Category sidebar */}
        <div style={{
          width: '160px',
          minWidth: '160px',
          background: COLORS.surfaceContainerLow,
          borderRight: `1px solid ${COLORS.outlineVariantSubtle}`,
          padding: '16px 8px',
          display: 'flex',
          flexDirection: 'column',
          gap: '2px',
        }}>
          <span style={{
            color: COLORS.textSecondary,
            fontSize: '10px',
            fontFamily: "'Inter', sans-serif",
            fontWeight: 600,
            textTransform: 'uppercase',
            letterSpacing: '0.08em',
            padding: '4px 12px 8px',
          }}>
            Settings
          </span>
          {CATEGORIES.map((cat) => {
            const isActive = activeCategory === cat.id
            const isHovered = hoveredCategory === cat.id
            return (
              <button
                key={cat.id}
                onClick={() => setActiveCategory(cat.id)}
                onMouseEnter={() => setHoveredCategory(cat.id)}
                onMouseLeave={() => setHoveredCategory(null)}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: '8px',
                  padding: '7px 12px',
                  background: isActive
                    ? COLORS.surfaceContainerHighest
                    : isHovered
                      ? COLORS.surfaceContainerHigh
                      : 'transparent',
                  border: 'none',
                  borderRadius: '6px',
                  color: isActive ? COLORS.onSurface : COLORS.textSecondary,
                  fontSize: '12px',
                  fontFamily: "'Inter', sans-serif",
                  fontWeight: isActive ? 500 : 400,
                  cursor: 'pointer',
                  transition: 'all 150ms ease-out',
                  textAlign: 'left',
                }}
              >
                {cat.icon}
                {cat.label}
              </button>
            )
          })}
        </div>

        {/* Content area */}
        <div style={{
          flex: 1,
          padding: '24px',
          overflowY: 'auto',
        }}>
          {activeCategory === 'appearance' && <AppearanceSettings />}
          {activeCategory === 'terminal' && <TerminalSettings />}
        </div>
      </div>
    </div>
  )
}

// ── Appearance Settings ──────────────────────────────────

function AppearanceSettings() {
  const preference = useThemeStore((s) => s.preference)
  const setTheme = useThemeStore((s) => s.setTheme)

  return (
    <div>
      <SectionHeader title="Appearance" description="Customize the look and feel" />

      <SettingRow label="Theme" description="Choose between dark, light, or match your system">
        <SegmentedControl
          options={[
            { value: 'system', label: 'System' },
            { value: 'dark', label: 'Dark' },
            { value: 'light', label: 'Light' },
          ]}
          value={preference}
          onChange={(v) => setTheme(v as ThemePreference)}
        />
      </SettingRow>
    </div>
  )
}

// ── Terminal Settings ────────────────────────────────────

function TerminalSettings() {
  const scrollback = useWorktreeStore((s) => s.terminalScrollback)
  const fontSize = useWorktreeStore((s) => s.terminalFontSize)

  return (
    <div>
      <SectionHeader title="Terminal" description="Configure terminal behavior" />

      <SettingRow label="Font size" description="Size in pixels (8–24)">
        <NumberInput
          value={fontSize}
          min={8}
          max={24}
          step={1}
          onChange={(v) => useWorktreeStore.setState({ terminalFontSize: v })}
        />
      </SettingRow>

      <SettingRow label="Scrollback lines" description="Maximum lines kept in buffer (1,000–100,000)">
        <NumberInput
          value={scrollback}
          min={1000}
          max={100_000}
          step={1000}
          onChange={(v) => useWorktreeStore.setState({ terminalScrollback: v })}
        />
      </SettingRow>
    </div>
  )
}

// ── Shared UI Primitives ─────────────────────────────────

function SectionHeader({ title, description }: { title: string; description: string }) {
  return (
    <div style={{ marginBottom: '20px' }}>
      <h2 style={{
        color: COLORS.onSurface,
        fontSize: '17px',
        fontFamily: "'Space Grotesk', sans-serif",
        fontWeight: 600,
        margin: 0,
        letterSpacing: '-0.01em',
      }}>
        {title}
      </h2>
      <p style={{
        color: COLORS.textSecondary,
        fontSize: '12px',
        fontFamily: "'Inter', sans-serif",
        marginTop: '4px',
      }}>
        {description}
      </p>
    </div>
  )
}

function SettingRow({ label, description, children }: {
  label: string
  description: string
  children: React.ReactNode
}) {
  return (
    <div style={{
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'space-between',
      padding: '12px 0',
      borderBottom: `1px solid ${COLORS.outlineVariantFaint}`,
      gap: '24px',
    }}>
      <div style={{ flex: 1, minWidth: 0 }}>
        <div style={{
          color: COLORS.onSurface,
          fontSize: '13px',
          fontFamily: "'Inter', sans-serif",
          fontWeight: 500,
        }}>
          {label}
        </div>
        <div style={{
          color: COLORS.textMuted,
          fontSize: '11px',
          fontFamily: "'Inter', sans-serif",
          marginTop: '2px',
        }}>
          {description}
        </div>
      </div>
      <div style={{ flexShrink: 0 }}>
        {children}
      </div>
    </div>
  )
}

function SegmentedControl({ options, value, onChange }: {
  options: { value: string; label: string }[]
  value: string
  onChange: (value: string) => void
}) {
  const [hovered, setHovered] = useState<string | null>(null)

  return (
    <div style={{
      display: 'flex',
      background: COLORS.surfaceContainerLowest,
      borderRadius: '6px',
      padding: '2px',
      gap: '2px',
    }}>
      {options.map((opt) => {
        const isActive = value === opt.value
        const isHovered = hovered === opt.value && !isActive
        return (
          <button
            key={opt.value}
            onClick={() => onChange(opt.value)}
            onMouseEnter={() => setHovered(opt.value)}
            onMouseLeave={() => setHovered(null)}
            style={{
              padding: '5px 14px',
              background: isActive
                ? COLORS.primaryContainer
                : isHovered
                  ? COLORS.surfaceContainerHigh
                  : 'transparent',
              border: 'none',
              borderRadius: '4px',
              color: isActive ? COLORS.onPrimary : COLORS.textSecondary,
              fontSize: '11px',
              fontFamily: "'Inter', sans-serif",
              fontWeight: isActive ? 600 : 400,
              cursor: 'pointer',
              transition: 'all 150ms ease-out',
            }}
          >
            {opt.label}
          </button>
        )
      })}
    </div>
  )
}

function NumberInput({ value, min, max, step, onChange }: {
  value: number
  min: number
  max: number
  step: number
  onChange: (value: number) => void
}) {
  const [focused, setFocused] = useState(false)
  const [localValue, setLocalValue] = useState(String(value))

  const commit = (raw: string) => {
    const num = parseInt(raw, 10)
    if (!isNaN(num)) {
      const clamped = Math.min(max, Math.max(min, num))
      onChange(clamped)
      setLocalValue(String(clamped))
    } else {
      setLocalValue(String(value))
    }
  }

  return (
    <input
      type="text"
      inputMode="numeric"
      value={focused ? localValue : value.toLocaleString()}
      onFocus={(e) => {
        setFocused(true)
        setLocalValue(String(value))
        e.target.select()
      }}
      onBlur={() => {
        setFocused(false)
        commit(localValue)
      }}
      onChange={(e) => setLocalValue(e.target.value)}
      onKeyDown={(e) => {
        if (e.key === 'Enter') {
          commit(localValue)
          ;(e.target as HTMLInputElement).blur()
        }
        if (e.key === 'Escape') {
          setLocalValue(String(value))
          ;(e.target as HTMLInputElement).blur()
        }
        if (e.key === 'ArrowUp') {
          e.preventDefault()
          const next = Math.min(max, value + step)
          onChange(next)
          setLocalValue(String(next))
        }
        if (e.key === 'ArrowDown') {
          e.preventDefault()
          const next = Math.max(min, value - step)
          onChange(next)
          setLocalValue(String(next))
        }
      }}
      style={{
        width: '90px',
        padding: '5px 10px',
        background: COLORS.surfaceContainerLowest,
        border: 'none',
        borderBottom: `2px solid ${focused ? COLORS.primaryContainerOutline : COLORS.outlineVariantMedium}`,
        borderRadius: '4px 4px 0 0',
        color: COLORS.onSurface,
        fontSize: '13px',
        fontFamily: "'JetBrains Mono', monospace",
        textAlign: 'right',
        outline: 'none',
        transition: 'border-color 200ms ease-out',
      }}
    />
  )
}
