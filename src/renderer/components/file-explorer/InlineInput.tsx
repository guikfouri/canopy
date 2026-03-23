import { useState, useRef, useEffect } from 'react'
import { COLORS } from '../../lib/constants'

interface InlineInputProps {
  defaultValue?: string
  depth: number
  onConfirm: (value: string) => void
  onCancel: () => void
  validate?: (value: string) => string | null
}

export function InlineInput({ defaultValue = '', depth, onConfirm, onCancel, validate }: InlineInputProps) {
  const [value, setValue] = useState(defaultValue)
  const [error, setError] = useState<string | null>(null)
  const inputRef = useRef<HTMLInputElement>(null)

  useEffect(() => {
    requestAnimationFrame(() => {
      inputRef.current?.focus()
      if (defaultValue) {
        const dotIndex = defaultValue.lastIndexOf('.')
        if (dotIndex > 0) {
          inputRef.current?.setSelectionRange(0, dotIndex)
        } else {
          inputRef.current?.select()
        }
      }
    })
  }, [defaultValue])

  const handleConfirm = () => {
    const trimmed = value.trim()
    if (!trimmed) {
      onCancel()
      return
    }
    if (validate) {
      const err = validate(trimmed)
      if (err) {
        setError(err)
        return
      }
    }
    onConfirm(trimmed)
  }

  return (
    <div style={{
      display: 'flex',
      alignItems: 'center',
      paddingLeft: `${12 + depth * 16}px`,
      paddingRight: '8px',
      paddingTop: '2px',
      paddingBottom: '2px',
    }}>
      <input
        ref={inputRef}
        value={value}
        onChange={(e) => { setValue(e.target.value); setError(null) }}
        onBlur={handleConfirm}
        onKeyDown={(e) => {
          if (e.key === 'Enter') handleConfirm()
          if (e.key === 'Escape') onCancel()
        }}
        style={{
          width: '100%',
          background: COLORS.surfaceDim,
          border: `1px solid ${error ? COLORS.error : COLORS.primaryContainer}`,
          borderRadius: '2px',
          color: COLORS.onSurface,
          fontSize: '12px',
          fontFamily: "'Inter', sans-serif",
          padding: '2px 6px',
          outline: 'none',
        }}
      />
    </div>
  )
}
