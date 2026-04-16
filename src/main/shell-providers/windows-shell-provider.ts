import { execFileSync } from 'child_process'
import path from 'path'
import type { ShellProvider, ShellInfo } from './shell-provider.interface'
import { getShellIntegrationDir } from './shell-utils'

function findInPath(name: string): string | null {
  try {
    const result = execFileSync('where.exe', [name], { encoding: 'utf8', timeout: 3000 })
    const firstLine = result.trim().split('\n')[0].trim()
    return firstLine || null
  } catch {
    return null
  }
}

export class WindowsShellProvider implements ShellProvider {
  detect(): ShellInfo {
    const pwsh = findInPath('pwsh')
    if (pwsh) {
      return { executable: pwsh, type: 'pwsh', args: [], env: {}, integrationSupported: true }
    }

    const powershell = findInPath('powershell')
    if (powershell) {
      return { executable: powershell, type: 'powershell', args: [], env: {}, integrationSupported: false }
    }

    const comspec = process.env.COMSPEC ?? 'cmd.exe'
    return { executable: comspec, type: 'cmd', args: [], env: {}, integrationSupported: false }
  }

  getIntegrationArgs(info: ShellInfo): string[] {
    if (info.type === 'pwsh') {
      const scriptPath = path.join(getShellIntegrationDir(), 'canopy-integration.ps1')
      return ['-NoLogo', '-NoExit', '-ExecutionPolicy', 'Bypass', '-File', scriptPath]
    }
    // powershell.exe and cmd.exe: no integration args, ANSI fallback handles state detection
    return []
  }

  getIntegrationEnv(_info: ShellInfo): Record<string, string | undefined> {
    return {}
  }

  escapeFilePath(filePath: string): string {
    // PowerShell (pwsh + powershell.exe): single-quoted strings, escape internal single quotes by doubling
    // Also used for cmd.exe — close enough for most paths
    return `'${filePath.replace(/'/g, "''")}'`
  }
}
