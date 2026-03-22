import fs from 'fs'
import path from 'path'
import { app } from 'electron'
import type { CanopyConfig } from '../shared/types'

const CONFIG_DIR = path.join(app.getPath('home'), '.canopy')
const CONFIG_FILE = path.join(CONFIG_DIR, 'config.json')

const DEFAULT_CONFIG: CanopyConfig = {
  version: 1,
  theme: 'system',
  projects: [],
  worktrees: [],
  activeWorktreeId: null,
  sidebarWidth: 220,
  fileExplorerWidth: 280,
  terminalScrollback: 10_000,
}

export function loadConfig(): CanopyConfig {
  try {
    if (fs.existsSync(CONFIG_FILE)) {
      const data = fs.readFileSync(CONFIG_FILE, 'utf-8')
      return JSON.parse(data) as CanopyConfig
    }
  } catch {
    // Corrupted config, return default
  }
  return { ...DEFAULT_CONFIG }
}

export function saveConfig(config: CanopyConfig): void {
  try {
    if (!fs.existsSync(CONFIG_DIR)) {
      fs.mkdirSync(CONFIG_DIR, { recursive: true })
    }
    fs.writeFileSync(CONFIG_FILE, JSON.stringify(config, null, 2), 'utf-8')
  } catch (err) {
    console.error('Failed to save config:', err)
  }
}
