import type { ShellType } from '../../shared/types'

export interface ShellInfo {
  executable: string
  type: ShellType
  args: string[]
  env: Record<string, string | undefined>
  integrationSupported: boolean
}

export interface ShellProvider {
  detect(): ShellInfo
  getIntegrationArgs(info: ShellInfo): string[]
  getIntegrationEnv(info: ShellInfo): Record<string, string | undefined>
  escapeFilePath(filePath: string): string
}
