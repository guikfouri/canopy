import { execFile } from 'child_process'
import { promisify } from 'util'
import path from 'path'
import type { CreateWorktreePayload, WorktreeInfo } from '../shared/types'

const execFileAsync = promisify(execFile)

export async function createWorktree(payload: CreateWorktreePayload): Promise<WorktreeInfo> {
  const worktreeDir = path.join(
    payload.repoPath,
    '.claude',
    'worktrees',
    payload.name
  )

  await execFileAsync('git', [
    'worktree', 'add',
    worktreeDir,
    '-b', payload.branch,
  ], { cwd: payload.repoPath })

  return {
    path: worktreeDir,
    branch: payload.branch,
    head: '',
    isMain: false,
  }
}

export async function listWorktrees(repoPath: string): Promise<WorktreeInfo[]> {
  const { stdout } = await execFileAsync('git', [
    'worktree', 'list', '--porcelain'
  ], { cwd: repoPath })

  const worktrees: WorktreeInfo[] = []
  let current: Partial<WorktreeInfo> = {}

  for (const line of stdout.split('\n')) {
    if (line.startsWith('worktree ')) {
      if (current.path) worktrees.push(current as WorktreeInfo)
      current = { path: line.slice(9), isMain: false }
    } else if (line.startsWith('HEAD ')) {
      current.head = line.slice(5)
    } else if (line.startsWith('branch ')) {
      current.branch = line.slice(7).replace('refs/heads/', '')
    } else if (line === 'bare') {
      current.isMain = true
    }
  }
  if (current.path) worktrees.push(current as WorktreeInfo)

  // Mark first entry as main
  if (worktrees.length > 0) worktrees[0].isMain = true

  return worktrees
}

export async function removeWorktree(worktreePath: string, deleteBranch?: string): Promise<void> {
  // Find the main repo by going up from worktree
  const { stdout } = await execFileAsync('git', [
    'rev-parse', '--git-common-dir'
  ], { cwd: worktreePath })

  const gitDir = path.resolve(worktreePath, stdout.trim())
  const repoPath = path.dirname(gitDir)

  await execFileAsync('git', [
    'worktree', 'remove', worktreePath, '--force'
  ], { cwd: repoPath })

  if (deleteBranch) {
    await execFileAsync('git', [
      'branch', '-D', deleteBranch
    ], { cwd: repoPath })
  }
}

export async function getBranch(worktreePath: string): Promise<string> {
  const { stdout } = await execFileAsync('git', [
    'rev-parse', '--abbrev-ref', 'HEAD'
  ], { cwd: worktreePath })

  return stdout.trim()
}

export async function listBranches(repoPath: string): Promise<{ name: string; current: boolean }[]> {
  const { stdout } = await execFileAsync('git', [
    'branch', '--list', '--format=%(refname:short)\t%(HEAD)'
  ], { cwd: repoPath })

  return stdout
    .split('\n')
    .filter(Boolean)
    .map((line) => {
      const [name, head] = line.split('\t')
      return { name, current: head === '*' }
    })
}

export async function checkoutBranch(worktreePath: string, branch: string): Promise<void> {
  await execFileAsync('git', ['switch', branch], { cwd: worktreePath })
}

export async function getStatus(worktreePath: string): Promise<{ path: string; status: string; staged: boolean }[]> {
  const { stdout } = await execFileAsync('git', [
    'status', '--porcelain=v1', '-uall'
  ], { cwd: worktreePath })

  return stdout
    .split('\n')
    .filter(Boolean)
    .map((line) => {
      const x = line[0] // staged status
      const y = line[1] // unstaged status
      const filePath = line.slice(3)

      let status: string
      const code = x !== ' ' && x !== '?' ? x : y
      switch (code) {
        case 'A': status = 'added'; break
        case 'M': status = 'modified'; break
        case 'D': status = 'deleted'; break
        case 'R': status = 'renamed'; break
        case '?': status = 'untracked'; break
        default: status = 'modified'
      }

      const staged = x !== ' ' && x !== '?'

      return { path: filePath, status, staged }
    })
}
