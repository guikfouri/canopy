import { useEffect, useState } from 'react'
import { COLORS } from '../../lib/constants'

export interface ContextMenuItem {
  label: string
  shortcut?: string
  danger?: boolean
  onClick: () => void
}

interface ContextMenuProps {
  x: number
  y: number
  items: ContextMenuItem[]
  onDismiss: () => void
}

export function ContextMenu({ x, y, items, onDismiss }: ContextMenuProps) {
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onDismiss()
    }
    window.addEventListener('keydown', handleKeyDown)
    return () => window.removeEventListener('keydown', handleKeyDown)
  }, [onDismiss])

  return (
    <>
      <div
        onClick={onDismiss}
        onContextMenu={(e) => { e.preventDefault(); onDismiss() }}
        style={{ position: 'fixed', inset: 0, zIndex: 999 }}
      />
      <div style={{
        position: 'fixed',
        left: x,
        top: y,
        zIndex: 1000,
        background: COLORS.surfaceContainerHigh,
        borderRadius: '6px',
        border: `1px solid ${COLORS.outlineVariant}40`,
        boxShadow: '0 4px 16px rgba(0,0,0,0.4)',
        padding: '4px 0',
        minWidth: '160px',
      }}>
        {items.map((item) => (
          <ContextMenuItemRow key={item.label} item={item} />
        ))}
      </div>
    </>
  )
}

function ContextMenuItemRow({ item }: { item: ContextMenuItem }) {
  const [hovered, setHovered] = useState(false)

  return (
    <div
      onClick={item.onClick}
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
      style={{
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        padding: '6px 12px',
        cursor: 'pointer',
        background: hovered ? COLORS.surfaceContainerHighest : 'transparent',
        color: item.danger ? COLORS.error : COLORS.onSurface,
        fontSize: '12px',
        fontFamily: "'Inter', sans-serif",
        transition: 'background 100ms',
      }}
    >
      <span>{item.label}</span>
      {item.shortcut && (
        <span style={{ color: COLORS.textMuted, fontSize: '10px', marginLeft: '16px' }}>
          {item.shortcut}
        </span>
      )}
    </div>
  )
}
