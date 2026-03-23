import { v4 as uuid } from 'uuid'
import type { SplitNode, TabGroupNode, Tab, SplitNodeInternal } from '@shared/types'

// ── Tab Group creation ──────────────────────────────

export function createTab(type: 'terminal' | 'file', title: string, extra?: Partial<Tab>): Tab {
  const id = uuid()
  return {
    id,
    type,
    title,
    ...(type === 'terminal' ? { terminalId: id } : {}),
    ...extra,
  }
}

export function createTabGroup(initialTab?: Tab): TabGroupNode {
  const tab = initialTab ?? createTab('terminal', 'Terminal')
  return {
    type: 'tab-group',
    id: uuid(),
    tabs: [tab],
    activeTabId: tab.id,
  }
}

// ── Split operations ────────────────────────────────

export function splitTabGroup(
  tree: SplitNode,
  targetGroupId: string,
  direction: 'horizontal' | 'vertical',
  newGroup: TabGroupNode
): SplitNode {
  if (tree.type === 'tab-group') {
    if (tree.id === targetGroupId) {
      return {
        type: 'split',
        direction,
        ratio: 0.5,
        children: [tree, newGroup],
      }
    }
    return tree
  }

  return {
    ...tree,
    children: [
      splitTabGroup(tree.children[0], targetGroupId, direction, newGroup),
      splitTabGroup(tree.children[1], targetGroupId, direction, newGroup),
    ],
  }
}

export function removeTabGroup(tree: SplitNode, targetGroupId: string): SplitNode | null {
  if (tree.type === 'tab-group') {
    return tree.id === targetGroupId ? null : tree
  }

  const left = removeTabGroup(tree.children[0], targetGroupId)
  const right = removeTabGroup(tree.children[1], targetGroupId)

  if (left === null) return right
  if (right === null) return left

  return { ...tree, children: [left, right] }
}

// ── Tab operations within a group ───────────────────

export function addTabToGroup(tree: SplitNode, groupId: string, tab: Tab): SplitNode {
  if (tree.type === 'tab-group') {
    if (tree.id === groupId) {
      return { ...tree, tabs: [...tree.tabs, tab], activeTabId: tab.id }
    }
    return tree
  }
  return {
    ...tree,
    children: [
      addTabToGroup(tree.children[0], groupId, tab),
      addTabToGroup(tree.children[1], groupId, tab),
    ],
  }
}

export function removeTabFromGroup(tree: SplitNode, groupId: string, tabId: string): SplitNode | null {
  if (tree.type === 'tab-group') {
    if (tree.id !== groupId) return tree
    const newTabs = tree.tabs.filter(t => t.id !== tabId)
    if (newTabs.length === 0) return null // Group is now empty — remove it
    const activeTabId = tree.activeTabId === tabId
      ? newTabs[Math.max(0, tree.tabs.findIndex(t => t.id === tabId) - 1)].id
      : tree.activeTabId
    return { ...tree, tabs: newTabs, activeTabId }
  }

  const left = removeTabFromGroup(tree.children[0], groupId, tabId)
  const right = removeTabFromGroup(tree.children[1], groupId, tabId)

  if (left === null) return right
  if (right === null) return left

  return { ...tree, children: [left, right] }
}

export function setActiveTab(tree: SplitNode, groupId: string, tabId: string): SplitNode {
  if (tree.type === 'tab-group') {
    if (tree.id === groupId) {
      return { ...tree, activeTabId: tabId }
    }
    return tree
  }
  return {
    ...tree,
    children: [
      setActiveTab(tree.children[0], groupId, tabId),
      setActiveTab(tree.children[1], groupId, tabId),
    ],
  }
}

export function renameTab(tree: SplitNode, groupId: string, tabId: string, title: string): SplitNode {
  if (tree.type === 'tab-group') {
    if (tree.id !== groupId) return tree
    return {
      ...tree,
      tabs: tree.tabs.map(t => t.id === tabId ? { ...t, title } : t),
    }
  }
  return {
    ...tree,
    children: [
      renameTab(tree.children[0], groupId, tabId, title),
      renameTab(tree.children[1], groupId, tabId, title),
    ],
  }
}

export function updateTabProps(tree: SplitNode, tabId: string, props: Partial<Tab>): SplitNode {
  if (tree.type === 'tab-group') {
    const hasTab = tree.tabs.some(t => t.id === tabId)
    if (!hasTab) return tree
    return {
      ...tree,
      tabs: tree.tabs.map(t => t.id === tabId ? { ...t, ...props } : t),
    }
  }
  return {
    ...tree,
    children: [
      updateTabProps(tree.children[0], tabId, props),
      updateTabProps(tree.children[1], tabId, props),
    ],
  }
}

export function findTabsByFilePath(tree: SplitNode, filePath: string): { groupId: string; tabId: string }[] {
  if (tree.type === 'tab-group') {
    return tree.tabs
      .filter(t => t.type === 'file' && t.filePath === filePath)
      .map(t => ({ groupId: tree.id, tabId: t.id }))
  }
  return [
    ...findTabsByFilePath(tree.children[0], filePath),
    ...findTabsByFilePath(tree.children[1], filePath),
  ]
}

export function removeTabsByFilePath(tree: SplitNode, filePath: string): SplitNode | null {
  if (tree.type === 'tab-group') {
    const newTabs = tree.tabs.filter(t => !(t.type === 'file' && t.filePath === filePath))
    if (newTabs.length === 0) return null
    const activeTabId = tree.tabs.find(t => t.id === tree.activeTabId && !(t.type === 'file' && t.filePath === filePath))
      ? tree.activeTabId
      : newTabs[0].id
    return { ...tree, tabs: newTabs, activeTabId }
  }

  const left = removeTabsByFilePath(tree.children[0], filePath)
  const right = removeTabsByFilePath(tree.children[1], filePath)

  if (left === null) return right
  if (right === null) return left

  return { ...tree, children: [left, right] }
}

export function reorderTabs(tree: SplitNode, groupId: string, tabs: Tab[]): SplitNode {
  if (tree.type === 'tab-group') {
    if (tree.id === groupId) {
      return { ...tree, tabs }
    }
    return tree
  }
  return {
    ...tree,
    children: [
      reorderTabs(tree.children[0], groupId, tabs),
      reorderTabs(tree.children[1], groupId, tabs),
    ],
  }
}

export function moveTabBetweenGroups(
  tree: SplitNode,
  sourceGroupId: string,
  targetGroupId: string,
  tabId: string,
  insertIndex?: number
): SplitNode | null {
  // First find the tab
  const tab = findTab(tree, tabId)
  if (!tab) return tree

  // Remove from source
  let result = removeTabFromGroup(tree, sourceGroupId, tabId)
  if (!result) return result // Source group was emptied

  // Add to target at specific index
  if (result.type === 'tab-group' && result.id === targetGroupId) {
    const newTabs = [...result.tabs]
    const idx = insertIndex ?? newTabs.length
    newTabs.splice(idx, 0, tab)
    return { ...result, tabs: newTabs, activeTabId: tab.id }
  }

  return addTabToGroupAt(result, targetGroupId, tab, insertIndex)
}

function addTabToGroupAt(tree: SplitNode, groupId: string, tab: Tab, index?: number): SplitNode {
  if (tree.type === 'tab-group') {
    if (tree.id === groupId) {
      const newTabs = [...tree.tabs]
      const idx = index ?? newTabs.length
      newTabs.splice(idx, 0, tab)
      return { ...tree, tabs: newTabs, activeTabId: tab.id }
    }
    return tree
  }
  return {
    ...tree,
    children: [
      addTabToGroupAt(tree.children[0], groupId, tab, index),
      addTabToGroupAt(tree.children[1], groupId, tab, index),
    ],
  }
}

// ── Ratio ───────────────────────────────────────────

export function updateRatio(tree: SplitNode, path: number[], newRatio: number): SplitNode {
  if (tree.type === 'tab-group') return tree

  if (path.length === 0) {
    return { ...tree, ratio: Math.max(0.1, Math.min(0.9, newRatio)) } as SplitNodeInternal
  }

  const [index, ...rest] = path
  const split = tree as SplitNodeInternal
  const newChildren = [...split.children] as [SplitNode, SplitNode]
  newChildren[index] = updateRatio(newChildren[index], rest, newRatio)

  return { ...split, children: newChildren }
}

// ── Queries ─────────────────────────────────────────

export function getAllTerminalIds(tree: SplitNode): string[] {
  if (tree.type === 'tab-group') {
    return tree.tabs
      .filter(t => t.type === 'terminal' && t.terminalId)
      .map(t => t.terminalId!)
  }
  return [
    ...getAllTerminalIds(tree.children[0]),
    ...getAllTerminalIds(tree.children[1]),
  ]
}

export function findTab(tree: SplitNode, tabId: string): Tab | undefined {
  if (tree.type === 'tab-group') {
    return tree.tabs.find(t => t.id === tabId)
  }
  return findTab(tree.children[0], tabId) ?? findTab(tree.children[1], tabId)
}

export function findTabGroupContaining(tree: SplitNode, tabOrTerminalId: string): TabGroupNode | undefined {
  if (tree.type === 'tab-group') {
    return tree.tabs.some(t => t.id === tabOrTerminalId || t.terminalId === tabOrTerminalId)
      ? tree
      : undefined
  }
  return findTabGroupContaining(tree.children[0], tabOrTerminalId) ?? findTabGroupContaining(tree.children[1], tabOrTerminalId)
}

export function findTabGroup(tree: SplitNode, groupId: string): TabGroupNode | undefined {
  if (tree.type === 'tab-group') {
    return tree.id === groupId ? tree : undefined
  }
  return findTabGroup(tree.children[0], groupId) ?? findTabGroup(tree.children[1], groupId)
}

export function getAllTabGroups(tree: SplitNode): TabGroupNode[] {
  if (tree.type === 'tab-group') return [tree]
  return [
    ...getAllTabGroups(tree.children[0]),
    ...getAllTabGroups(tree.children[1]),
  ]
}

export function countTabGroups(tree: SplitNode): number {
  if (tree.type === 'tab-group') return 1
  return countTabGroups(tree.children[0]) + countTabGroups(tree.children[1])
}
