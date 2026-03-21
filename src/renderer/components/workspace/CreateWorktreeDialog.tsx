import { useState } from 'react'
import { COLORS } from '../../lib/constants'
import { useWorktreeStore } from '../../stores/worktree-store'

interface CreateWorktreeDialogProps {
  isOpen: boolean
  onClose: () => void
}

export function CreateWorktreeDialog({ isOpen, onClose }: CreateWorktreeDialogProps) {
  const [projectPath, setProjectPath] = useState('')
  const [branch, setBranch] = useState('')
  const [name, setName] = useState('')
  const [isCreating, setIsCreating] = useState(false)
  const [focusedField, setFocusedField] = useState<string | null>(null)
  const addWorktree = useWorktreeStore((s) => s.addWorktree)

  if (!isOpen) return null

  const handleCreate = async () => {
    if (!projectPath.trim()) return

    setIsCreating(true)
    try {
      const wtName = name.trim() || projectPath.split('/').pop() || 'worktree'
      const branchName = branch.trim()

      if (branchName) {
        const info = await window.electronAPI.canopy.createWorktree({
          repoPath: projectPath.trim(),
          branch: branchName,
          name: wtName,
        })
        addWorktree(wtName, projectPath.trim(), info.path, branchName, false)
      } else {
        addWorktree(wtName, projectPath.trim(), projectPath.trim(), 'main', true)
      }

      const config = useWorktreeStore.getState().toConfig()
      await window.electronAPI.canopy.saveConfig(config)

      setProjectPath('')
      setBranch('')
      setName('')
      onClose()
    } catch (err) {
      console.error('Failed to create worktree:', err)
    } finally {
      setIsCreating(false)
    }
  }

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && projectPath.trim()) {
      handleCreate()
    }
    if (e.key === 'Escape') {
      onClose()
    }
  }

  return (
    <div
      style={{
        position: 'fixed',
        inset: 0,
        background: 'rgba(12, 12, 31, 0.7)',
        backdropFilter: 'blur(4px)',
        WebkitBackdropFilter: 'blur(4px)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        zIndex: 100,
        animation: 'fadeIn 150ms ease-out',
      }}
      onClick={onClose}
    >
      <div
        onClick={(e) => e.stopPropagation()}
        onKeyDown={handleKeyDown}
        style={{
          background: COLORS.surfaceContainer,
          borderRadius: '8px',
          border: `1px solid ${COLORS.outlineVariant}30`,
          padding: '28px',
          width: '440px',
          display: 'flex',
          flexDirection: 'column',
          gap: '20px',
          boxShadow: '0 24px 48px rgba(0, 0, 0, 0.4)',
          animation: 'scaleIn 200ms ease-out',
        }}
      >
        <div>
          <h2 style={{
            color: COLORS.onSurface,
            fontSize: '17px',
            fontFamily: "'Space Grotesk', sans-serif",
            fontWeight: 600,
            margin: 0,
            letterSpacing: '-0.01em',
          }}>
            New Worktree
          </h2>
          <p style={{
            color: COLORS.textSecondary,
            fontSize: '12px',
            fontFamily: "'Inter', sans-serif",
            marginTop: '4px',
          }}>
            Create a new git worktree for a project
          </p>
        </div>

        <div style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
          <InputField
            label="Project Path"
            required
            value={projectPath}
            onChange={setProjectPath}
            placeholder="/path/to/your/project"
            autoFocus
            isFocused={focusedField === 'path'}
            onFocus={() => setFocusedField('path')}
            onBlur={() => setFocusedField(null)}
          />

          <InputField
            label="Branch"
            hint="Leave empty for main"
            value={branch}
            onChange={setBranch}
            placeholder="feature/my-feature"
            isFocused={focusedField === 'branch'}
            onFocus={() => setFocusedField('branch')}
            onBlur={() => setFocusedField(null)}
          />

          <InputField
            label="Name"
            value={name}
            onChange={setName}
            placeholder="Auto-generated from path"
            isFocused={focusedField === 'name'}
            onFocus={() => setFocusedField('name')}
            onBlur={() => setFocusedField(null)}
          />
        </div>

        <div style={{
          display: 'flex',
          gap: '8px',
          justifyContent: 'flex-end',
          paddingTop: '4px',
        }}>
          <DialogButton onClick={onClose} variant="ghost">
            Cancel
          </DialogButton>
          <DialogButton
            onClick={handleCreate}
            variant="primary"
            disabled={isCreating || !projectPath.trim()}
          >
            {isCreating ? 'Creating...' : 'Create'}
          </DialogButton>
        </div>
      </div>
    </div>
  )
}

function InputField({ label, hint, required, value, onChange, placeholder, autoFocus, isFocused, onFocus, onBlur }: {
  label: string
  hint?: string
  required?: boolean
  value: string
  onChange: (val: string) => void
  placeholder: string
  autoFocus?: boolean
  isFocused: boolean
  onFocus: () => void
  onBlur: () => void
}) {
  return (
    <div>
      <label style={{
        display: 'flex',
        alignItems: 'center',
        gap: '4px',
        color: COLORS.onSurfaceVariant,
        fontSize: '11px',
        fontFamily: "'Inter', sans-serif",
        fontWeight: 500,
        marginBottom: '6px',
      }}>
        {label}
        {required && (
          <span style={{ color: COLORS.primaryContainer, fontSize: '10px' }}>*</span>
        )}
        {hint && (
          <span style={{
            color: COLORS.textMuted,
            fontSize: '10px',
            fontWeight: 400,
            marginLeft: 'auto',
          }}>
            {hint}
          </span>
        )}
      </label>
      <input
        style={{
          width: '100%',
          padding: '9px 12px',
          background: COLORS.surfaceContainerLowest,
          border: 'none',
          borderBottom: `2px solid ${isFocused ? COLORS.primaryContainer : COLORS.outlineVariant}40`,
          borderRadius: '4px 4px 0 0',
          color: COLORS.onSurface,
          fontSize: '13px',
          fontFamily: "'JetBrains Mono', monospace",
          outline: 'none',
          transition: 'border-color 200ms ease-out',
        }}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder={placeholder}
        autoFocus={autoFocus}
        onFocus={onFocus}
        onBlur={onBlur}
      />
    </div>
  )
}

function DialogButton({ children, onClick, variant, disabled }: {
  children: React.ReactNode
  onClick: () => void
  variant: 'primary' | 'ghost'
  disabled?: boolean
}) {
  const [hovered, setHovered] = useState(false)

  const isPrimary = variant === 'primary'

  return (
    <button
      onClick={onClick}
      disabled={disabled}
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
      style={{
        padding: '8px 18px',
        background: isPrimary
          ? (hovered ? COLORS.primaryFixedDim : COLORS.primaryContainer)
          : (hovered ? COLORS.surfaceContainerHighest : 'transparent'),
        border: 'none',
        borderRadius: '6px',
        color: isPrimary ? COLORS.onPrimary : COLORS.onSurfaceVariant,
        fontSize: '13px',
        fontFamily: "'Inter', sans-serif",
        fontWeight: 500,
        cursor: disabled ? 'not-allowed' : 'pointer',
        opacity: disabled ? 0.4 : 1,
        transition: 'all 150ms ease-out',
      }}
    >
      {children}
    </button>
  )
}
