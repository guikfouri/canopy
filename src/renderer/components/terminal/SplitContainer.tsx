import { useState, useCallback, useRef } from 'react'
import type { SplitNode } from '@shared/types'
import { TabGroupContainer } from './TabGroupContainer'
import { COLORS } from '../../lib/constants'

interface SplitContainerProps {
  node: SplitNode
  cwd: string
  worktreeId: string
  onRatioChange?: (path: number[], newRatio: number) => void
  path?: number[]
}

export function SplitContainer({ node, cwd, worktreeId, onRatioChange, path = [] }: SplitContainerProps) {
  if (node.type === 'tab-group') {
    return (
      <TabGroupContainer
        group={node}
        cwd={cwd}
        worktreeId={worktreeId}
      />
    )
  }

  const { direction, ratio, children } = node
  const isHorizontal = direction === 'horizontal'

  return (
    <div style={{
      display: 'flex',
      flexDirection: isHorizontal ? 'row' : 'column',
      width: '100%',
      height: '100%',
      gap: '3px',
      background: COLORS.gutter,
    }}>
      <div style={{
        [isHorizontal ? 'width' : 'height']: `calc(${ratio * 100}% - 1.5px)`,
        overflow: 'hidden',
      }}>
        <SplitContainer
          node={children[0]}
          cwd={cwd}
          worktreeId={worktreeId}
          onRatioChange={onRatioChange}
          path={[...path, 0]}
        />
      </div>

      <SplitDivider
        direction={direction}
        onDrag={(delta) => {
          onRatioChange?.(path, ratio + delta)
        }}
      />

      <div style={{
        flex: 1,
        overflow: 'hidden',
      }}>
        <SplitContainer
          node={children[1]}
          cwd={cwd}
          worktreeId={worktreeId}
          onRatioChange={onRatioChange}
          path={[...path, 1]}
        />
      </div>
    </div>
  )
}

function SplitDivider({ direction, onDrag }: {
  direction: 'horizontal' | 'vertical'
  onDrag: (delta: number) => void
}) {
  const [isHovered, setIsHovered] = useState(false)
  const [isDragging, setIsDragging] = useState(false)
  const containerRef = useRef<HTMLDivElement>(null)

  const handleMouseDown = useCallback((e: React.MouseEvent) => {
    e.preventDefault()
    setIsDragging(true)

    const startPos = direction === 'horizontal' ? e.clientX : e.clientY
    const parent = containerRef.current?.parentElement
    if (!parent) return

    const parentSize = direction === 'horizontal'
      ? parent.getBoundingClientRect().width
      : parent.getBoundingClientRect().height

    const handleMouseMove = (moveEvent: MouseEvent) => {
      const currentPos = direction === 'horizontal' ? moveEvent.clientX : moveEvent.clientY
      const delta = (currentPos - startPos) / parentSize
      onDrag(delta)
    }

    const handleMouseUp = () => {
      setIsDragging(false)
      document.removeEventListener('mousemove', handleMouseMove)
      document.removeEventListener('mouseup', handleMouseUp)
      document.body.style.cursor = ''
      document.body.style.userSelect = ''
    }

    document.addEventListener('mousemove', handleMouseMove)
    document.addEventListener('mouseup', handleMouseUp)
    document.body.style.cursor = direction === 'horizontal' ? 'col-resize' : 'row-resize'
    document.body.style.userSelect = 'none'
  }, [direction, onDrag])

  const isActive = isHovered || isDragging

  return (
    <div
      ref={containerRef}
      onMouseEnter={() => setIsHovered(true)}
      onMouseLeave={() => setIsHovered(false)}
      onMouseDown={handleMouseDown}
      style={{
        [direction === 'horizontal' ? 'width' : 'height']: '3px',
        [direction === 'horizontal' ? 'minWidth' : 'minHeight']: '3px',
        cursor: direction === 'horizontal' ? 'col-resize' : 'row-resize',
        background: isActive ? COLORS.primaryContainer : 'transparent',
        transition: 'background 200ms ease-out',
        position: 'relative',
        zIndex: 10,
      }}
    >
      {/* Invisible wider hit area */}
      <div style={{
        position: 'absolute',
        [direction === 'horizontal' ? 'left' : 'top']: '-4px',
        [direction === 'horizontal' ? 'right' : 'bottom']: '-4px',
        [direction === 'horizontal' ? 'top' : 'left']: 0,
        [direction === 'horizontal' ? 'bottom' : 'right']: 0,
      }} />
    </div>
  )
}
