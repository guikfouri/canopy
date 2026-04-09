import path from 'path'
import type { ShellProvider, ShellInfo } from './shell-provider.interface'
import { getShellIntegrationDir, getZshBootstrapDir } from './shell-utils'

function detectUnixShellType(shellPath: string): 'zsh' | 'bash' | 'fish' | 'unknown' {
  const base = path.basename(shellPath)
  if (base === 'zsh' || base.startsWith('zsh-')) return 'zsh'
  if (base === 'bash' || base.startsWith('bash-')) return 'bash'
  if (base === 'fish' || base.startsWith('fish-')) return 'fish'
  return 'unknown'
}

export class UnixShellProvider implements ShellProvider {
  detect(): ShellInfo {
    const executable = process.env.SHELL ?? (process.platform === 'darwin' ? '/bin/zsh' : '/bin/bash')
    const type = detectUnixShellType(executable)
    return {
      executable,
      type,
      args: [],
      env: {},
      integrationSupported: type !== 'unknown',
    }
  }

  getIntegrationArgs(info: ShellInfo): string[] {
    const integrationDir = getShellIntegrationDir()
    if (info.type === 'bash') {
      return ['--rcfile', path.join(integrationDir, 'canopy-integration.bash')]
    }
    if (info.type === 'fish') {
      return ['-C', `source ${path.join(integrationDir, 'canopy-integration.fish')}`]
    }
    return []
  }

  getIntegrationEnv(info: ShellInfo): Record<string, string | undefined> {
    const integrationDir = getShellIntegrationDir()
    if (info.type === 'zsh') {
      return {
        CANOPY_ORIGINAL_ZDOTDIR: process.env.ZDOTDIR ?? '',
        ZDOTDIR: getZshBootstrapDir(),
        CANOPY_SHELL_INTEGRATION_DIR: integrationDir,
      }
    }
    if (info.type === 'bash' || info.type === 'fish') {
      return { CANOPY_SHELL_INTEGRATION_DIR: integrationDir }
    }
    return {}
  }

  escapeFilePath(filePath: string): string {
    return filePath.replace(/([\\  !"#$&'()*,:;<>?@[\]^`{|}~])/g, '\\$1')
  }
}
