import { useState, useEffect, useRef } from 'react'
import { COLORS, PROJECT_COLORS } from '../../lib/constants'

interface ColorPickerProps {
  currentColor: string
  anchorRect: DOMRect
  onSelect: (color: string) => void
  onDismiss: () => void
}

export function ColorPicker({ currentColor, anchorRect, onSelect, onDismiss }: ColorPickerProps) {
  const ref = useRef<HTMLDivElement>(null)

  useEffect(() => {
    const handleClick = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) {
        onDismiss()
      }
    }
    const handleKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onDismiss()
    }
    window.addEventListener('mousedown', handleClick)
    window.addEventListener('keydown', handleKey)
    return () => {
      window.removeEventListener('mousedown', handleClick)
      window.removeEventListener('keydown', handleKey)
    }
  }, [onDismiss])

  const top = anchorRect.bottom + 4
  const left = anchorRect.left

  return (
    <div
      ref={ref}
      style={{
        position: 'fixed',
        top,
        left,
        zIndex: 1000,
        background: COLORS.surfaceContainer,
        borderRadius: '8px',
        padding: '8px',
        display: 'grid',
        gridTemplateColumns: 'repeat(4, 1fr)',
        gap: '4px',
        boxShadow: `0 8px 24px ${COLORS.shadowColorStrong}`,
        border: `1px solid ${COLORS.outlineVariantSubtle}`,
        animation: 'fadeIn 100ms ease-out',
      }}
    >
      {PROJECT_COLORS.map((color) => (
        <ColorSwatch
          key={color}
          color={color}
          isSelected={color === currentColor}
          onSelect={() => { onSelect(color); onDismiss() }}
        />
      ))}
    </div>
  )
}

function ColorSwatch({ color, isSelected, onSelect }: {
  color: string
  isSelected: boolean
  onSelect: () => void
}) {
  const [hovered, setHovered] = useState(false)

  return (
    <button
      onClick={onSelect}
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
      style={{
        width: '20px',
        height: '20px',
        borderRadius: '4px',
        background: color,
        border: isSelected ? `2px solid ${COLORS.onSurface}` : '2px solid transparent',
        cursor: 'pointer',
        transform: hovered ? 'scale(1.15)' : 'scale(1)',
        transition: 'transform 100ms ease-out, border-color 100ms ease-out',
        boxShadow: hovered ? `0 0 8px ${color}50` : 'none',
        padding: 0,
      }}
    />
  )
}
