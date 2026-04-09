import { app } from 'electron'
import path from 'path'
import fs from 'fs'

const DEBUG = !app.isPackaged
function log(...args: unknown[]) {
  if (DEBUG) console.log('[canopy-term]', ...args)
}

export function getShellIntegrationDir(): string {
  if (app.isPackaged) {
    return path.join(process.resourcesPath, 'shell-integration')
  }
  const dir = path.join(app.getAppPath(), 'src', 'main', 'shell-integration')
  if (!fs.existsSync(dir)) {
    const fallback = path.join(__dirname, '..', '..', 'src', 'main', 'shell-integration')
    log('shell-integration dir (primary missing, using fallback):', fallback, '| exists:', fs.existsSync(fallback))
    return fallback
  }
  log('shell-integration dir:', dir)
  return dir
}

export function getZshBootstrapDir(): string {
  return path.join(getShellIntegrationDir(), 'zsh-bootstrap')
}
