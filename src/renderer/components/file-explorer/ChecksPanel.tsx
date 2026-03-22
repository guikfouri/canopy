import { useState, useCallback } from 'react'
import { v4 as uuid } from 'uuid'
import { COLORS } from '../../lib/constants'
import type { TodoItem } from '@shared/types'

export function ChecksPanel() {
  const [prTitle, setPrTitle] = useState('')
  const [prDescription, setPrDescription] = useState('')
  const [todos, setTodos] = useState<TodoItem[]>([])
  const [editingTitle, setEditingTitle] = useState(false)
  const [editingDesc, setEditingDesc] = useState(false)
  const [addingTodo, setAddingTodo] = useState(false)
  const [newTodoText, setNewTodoText] = useState('')

  const handleAddTodo = useCallback(() => {
    if (!newTodoText.trim()) {
      setAddingTodo(false)
      return
    }
    setTodos((prev) => [...prev, { id: uuid(), text: newTodoText.trim(), completed: false }])
    setNewTodoText('')
    setAddingTodo(false)
  }, [newTodoText])

  const toggleTodo = useCallback((id: string) => {
    setTodos((prev) => prev.map((t) => t.id === id ? { ...t, completed: !t.completed } : t))
  }, [])

  const removeTodo = useCallback((id: string) => {
    setTodos((prev) => prev.filter((t) => t.id !== id))
  }, [])

  return (
    <div style={{
      display: 'flex',
      flexDirection: 'column',
      height: '100%',
      padding: '12px',
      gap: '16px',
    }}>
      {/* PR Title */}
      <div>
        {editingTitle ? (
          <input
            autoFocus
            value={prTitle}
            onChange={(e) => setPrTitle(e.target.value)}
            onBlur={() => setEditingTitle(false)}
            onKeyDown={(e) => { if (e.key === 'Enter') setEditingTitle(false) }}
            placeholder="PR title"
            style={{
              ...inputStyle,
              fontSize: '13px',
              fontWeight: 600,
              color: COLORS.onSurface,
            }}
          />
        ) : (
          <div
            onClick={() => setEditingTitle(true)}
            style={{
              color: prTitle ? COLORS.onSurface : COLORS.textMuted,
              fontSize: '13px',
              fontFamily: "'Inter', sans-serif",
              fontWeight: 600,
              cursor: 'text',
              padding: '4px 0',
            }}
          >
            {prTitle || 'PR title'}
          </div>
        )}
      </div>

      {/* PR Description */}
      <div>
        {editingDesc ? (
          <textarea
            autoFocus
            value={prDescription}
            onChange={(e) => setPrDescription(e.target.value)}
            onBlur={() => setEditingDesc(false)}
            placeholder="PR description"
            rows={3}
            style={{
              ...inputStyle,
              fontSize: '12px',
              color: COLORS.onSurfaceVariant,
              resize: 'vertical',
              minHeight: '48px',
            }}
          />
        ) : (
          <div
            onClick={() => setEditingDesc(true)}
            style={{
              color: prDescription ? COLORS.onSurfaceVariant : COLORS.textMuted,
              fontSize: '12px',
              fontFamily: "'Inter', sans-serif",
              cursor: 'text',
              padding: '4px 0',
              lineHeight: 1.5,
            }}
          >
            {prDescription || 'PR description'}
          </div>
        )}
      </div>

      {/* Divider */}
      <div style={{ height: '1px', background: COLORS.outlineVariantLight }} />

      {/* Todos section */}
      <div>
        <div style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          marginBottom: '8px',
        }}>
          <span style={{
            color: COLORS.onSurface,
            fontSize: '12px',
            fontFamily: "'Inter', sans-serif",
            fontWeight: 600,
          }}>
            Your todos
          </span>
          <AddButton onClick={() => setAddingTodo(true)} />
        </div>

        {/* Todo list */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: '2px' }}>
          {todos.map((todo) => (
            <TodoRow
              key={todo.id}
              todo={todo}
              onToggle={() => toggleTodo(todo.id)}
              onRemove={() => removeTodo(todo.id)}
            />
          ))}

          {addingTodo && (
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px', padding: '4px 0' }}>
              <div style={{
                width: '14px',
                height: '14px',
                borderRadius: '3px',
                border: `1.5px solid ${COLORS.textMuted}`,
                flexShrink: 0,
              }} />
              <input
                autoFocus
                value={newTodoText}
                onChange={(e) => setNewTodoText(e.target.value)}
                onBlur={handleAddTodo}
                onKeyDown={(e) => {
                  if (e.key === 'Enter') handleAddTodo()
                  if (e.key === 'Escape') { setAddingTodo(false); setNewTodoText('') }
                }}
                placeholder="Add a todo..."
                style={{
                  ...inputStyle,
                  fontSize: '12px',
                  flex: 1,
                }}
              />
            </div>
          )}

          {todos.length === 0 && !addingTodo && (
            <span style={{
              color: COLORS.textMuted,
              fontSize: '12px',
              fontFamily: "'Inter', sans-serif",
              padding: '4px 0',
            }}>
              No todos yet
            </span>
          )}
        </div>
      </div>
    </div>
  )
}

function TodoRow({ todo, onToggle, onRemove }: {
  todo: TodoItem
  onToggle: () => void
  onRemove: () => void
}) {
  const [hovered, setHovered] = useState(false)

  return (
    <div
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
      style={{
        display: 'flex',
        alignItems: 'center',
        gap: '8px',
        padding: '4px 6px',
        borderRadius: '4px',
        background: hovered ? COLORS.surfaceContainerHigh : 'transparent',
        transition: 'background 100ms ease-out',
      }}
    >
      <button
        onClick={onToggle}
        style={{
          width: '14px',
          height: '14px',
          borderRadius: '3px',
          border: `1.5px solid ${todo.completed ? COLORS.success : COLORS.textMuted}`,
          background: todo.completed ? COLORS.success : 'transparent',
          cursor: 'pointer',
          flexShrink: 0,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          padding: 0,
        }}
      >
        {todo.completed && (
          <svg width="8" height="8" viewBox="0 0 8 8" fill="none" stroke={COLORS.surfaceDim} strokeWidth="1.5">
            <path d="M1.5 4L3 5.5L6.5 2" />
          </svg>
        )}
      </button>
      <span style={{
        color: todo.completed ? COLORS.textMuted : COLORS.onSurface,
        fontSize: '12px',
        fontFamily: "'Inter', sans-serif",
        textDecoration: todo.completed ? 'line-through' : 'none',
        flex: 1,
      }}>
        {todo.text}
      </span>
      {hovered && (
        <button
          onClick={onRemove}
          style={{
            background: 'transparent',
            border: 'none',
            color: COLORS.textMuted,
            cursor: 'pointer',
            padding: '2px',
            fontSize: '12px',
            lineHeight: 1,
          }}
        >
          ×
        </button>
      )}
    </div>
  )
}

function AddButton({ onClick }: { onClick: () => void }) {
  const [hovered, setHovered] = useState(false)

  return (
    <button
      onClick={onClick}
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
      style={{
        display: 'flex',
        alignItems: 'center',
        gap: '4px',
        background: 'transparent',
        border: 'none',
        color: hovered ? COLORS.onSurface : COLORS.textSecondary,
        fontSize: '11px',
        fontFamily: "'Inter', sans-serif",
        cursor: 'pointer',
        padding: '2px 6px',
        borderRadius: '4px',
        transition: 'all 100ms ease-out',
      }}
    >
      <span style={{ fontSize: '13px' }}>+</span>
      Add
    </button>
  )
}

const inputStyle: React.CSSProperties = {
  width: '100%',
  background: COLORS.surfaceContainerHigh,
  border: `1px solid ${COLORS.outlineVariantMedium}`,
  borderRadius: '4px',
  padding: '6px 8px',
  fontFamily: "'Inter', sans-serif",
  color: COLORS.onSurface,
  outline: 'none',
}
