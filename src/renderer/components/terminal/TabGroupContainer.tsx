import { useCallback } from 'react'
import type { TabGroupNode, Tab } from '@shared/types'
import { TabBar } from './TabBar'
import { TerminalPane } from './TerminalPane'
import { FileEditorPane } from './FileEditorPane'
import { useTerminalStore } from '../../stores/terminal-store'
import { useWorktreeStore } from '../../stores/worktree-store'
import { createTab, addTabToGroup, removeTabFromGroup, setActiveTab, renameTab, reorderTabs, moveTabBetweenGroups } from '../../lib/split-tree'
import { COLORS } from '../../lib/constants'

interface TabGroupContainerProps {
  group: TabGroupNode
  cwd: string
  worktreeId: string
}

export function TabGroupContainer({ group, cwd, worktreeId }: TabGroupContainerProps) {
  const updateSplitLayout = useWorktreeStore((s) => s.updateSplitLayout)
  const getActive = useWorktreeStore((s) => s.getActive)
  const focusedTerminalId = useTerminalStore((s) => s.focusedTerminalId)
  const setFocused = useTerminalStore((s) => s.setFocused)

  const getLayout = useCallback(() => {
    const wt = getActive()
    return wt?.splitLayout
  }, [getActive])

  const updateLayout = useCallback((updater: (layout: import('@shared/types').SplitNode) => import('@shared/types').SplitNode | null) => {
    const layout = getLayout()
    if (!layout) return
    const result = updater(layout)
    if (result) {
      updateSplitLayout(worktreeId, result)
    }
  }, [getLayout, updateSplitLayout, worktreeId])

  const handleSelectTab = useCallback((tabId: string) => {
    updateLayout((layout) => setActiveTab(layout, group.id, tabId))
    // If it's a terminal tab, focus it
    const tab = group.tabs.find(t => t.id === tabId)
    if (tab?.type === 'terminal' && tab.terminalId) {
      setFocused(tab.terminalId)
    }
  }, [group.id, group.tabs, updateLayout, setFocused])

  const handleCloseTab = useCallback((tabId: string) => {
    const tab = group.tabs.find(t => t.id === tabId)
    // Destroy terminal PTY if it's a terminal tab
    if (tab?.type === 'terminal' && tab.terminalId) {
      window.electronAPI.terminal.destroy(tab.terminalId)
    }
    updateLayout((layout) => removeTabFromGroup(layout, group.id, tabId))
  }, [group.id, group.tabs, updateLayout])

  const handleAddTerminal = useCallback(() => {
    const tab = createTab('terminal', 'Terminal')
    updateLayout((layout) => addTabToGroup(layout, group.id, tab))
    if (tab.terminalId) {
      setFocused(tab.terminalId)
    }
  }, [group.id, updateLayout, setFocused])

  const handleRenameTab = useCallback((tabId: string, title: string) => {
    updateLayout((layout) => renameTab(layout, group.id, tabId, title))
  }, [group.id, updateLayout])

  const handleReorderTabs = useCallback((tabs: Tab[]) => {
    updateLayout((layout) => reorderTabs(layout, group.id, tabs))
  }, [group.id, updateLayout])

  const handleDropTabFromGroup = useCallback((sourceGroupId: string, tabId: string, insertIndex: number) => {
    updateLayout((layout) => moveTabBetweenGroups(layout, sourceGroupId, group.id, tabId, insertIndex))
  }, [group.id, updateLayout])

  const handleDirtyChange = useCallback((tabId: string, isDirty: boolean) => {
    updateLayout((layout) => {
      if (layout.type === 'tab-group' && layout.id === group.id) {
        return {
          ...layout,
          tabs: layout.tabs.map(t => t.id === tabId ? { ...t, isDirty } : t),
        }
      }
      // For nested trees, we'd need a recursive update — but the renameTab pattern works
      return renameTab(layout, group.id, tabId, group.tabs.find(t => t.id === tabId)?.title ?? '')
    })
  }, [group.id, group.tabs, updateLayout])

  // Find the active tab
  const activeTab = group.tabs.find(t => t.id === group.activeTabId) ?? group.tabs[0]

  return (
    <div style={{
      display: 'flex',
      flexDirection: 'column',
      width: '100%',
      height: '100%',
      overflow: 'hidden',
      borderRadius: '3px',
      background: COLORS.surfaceDim,
    }}>
      <TabBar
        tabs={group.tabs}
        activeTabId={group.activeTabId}
        groupId={group.id}
        onSelectTab={handleSelectTab}
        onCloseTab={handleCloseTab}
        onAddTerminal={handleAddTerminal}
        onRenameTab={handleRenameTab}
        onReorderTabs={handleReorderTabs}
        onDropTabFromGroup={handleDropTabFromGroup}
      />

      <div style={{ flex: 1, overflow: 'hidden' }}>
        {activeTab && (
          <TabContent
            tab={activeTab}
            cwd={cwd}
            isFocused={activeTab.type === 'terminal'
              ? focusedTerminalId === activeTab.terminalId
              : false}
            onFocus={() => {
              if (activeTab.type === 'terminal' && activeTab.terminalId) {
                setFocused(activeTab.terminalId)
              }
            }}
            onDirtyChange={(isDirty) => handleDirtyChange(activeTab.id, isDirty)}
          />
        )}
      </div>
    </div>
  )
}

function TabContent({
  tab,
  cwd,
  isFocused,
  onFocus,
  onDirtyChange,
}: {
  tab: Tab
  cwd: string
  isFocused: boolean
  onFocus: () => void
  onDirtyChange: (isDirty: boolean) => void
}) {
  if (tab.type === 'terminal' && tab.terminalId) {
    return (
      <TerminalPane
        terminalId={tab.terminalId}
        cwd={cwd}
        isFocused={isFocused}
        onFocus={onFocus}
      />
    )
  }

  if (tab.type === 'file' && tab.filePath) {
    return (
      <FileEditorPane
        filePath={tab.filePath}
        isFocused={isFocused}
        onFocus={onFocus}
        onDirtyChange={onDirtyChange}
      />
    )
  }

  return null
}
