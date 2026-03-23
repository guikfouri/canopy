import { create } from 'zustand'
import { subscribeWithSelector } from 'zustand/middleware'
import type { ThemePreference } from '@shared/types'

type ResolvedTheme = 'dark' | 'light'

interface ThemeStore {
  preference: ThemePreference
  resolved: ResolvedTheme

  init: (preference: ThemePreference) => void
  setTheme: (preference: ThemePreference) => void
  toggleTheme: () => void
}

function resolveTheme(preference: ThemePreference): ResolvedTheme {
  if (preference !== 'system') return preference
  return window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light'
}

function applyTheme(resolved: ResolvedTheme) {
  document.documentElement.setAttribute('data-theme', resolved)
}

export const useThemeStore = create<ThemeStore>()(subscribeWithSelector((set, get) => ({
  preference: 'system',
  resolved: 'dark',

  init: (preference: ThemePreference) => {
    const resolved = resolveTheme(preference)
    applyTheme(resolved)
    set({ preference, resolved })
  },

  setTheme: (preference: ThemePreference) => {
    const resolved = resolveTheme(preference)
    applyTheme(resolved)
    set({ preference, resolved })
  },

  toggleTheme: () => {
    const current = get().resolved
    const next: ResolvedTheme = current === 'dark' ? 'light' : 'dark'
    applyTheme(next)
    set({ preference: next, resolved: next })
  },
})))

// Listen for system theme changes when preference is "system"
if (typeof window !== 'undefined') {
  const mediaQuery = window.matchMedia('(prefers-color-scheme: dark)')
  mediaQuery.addEventListener('change', (e) => {
    const { preference } = useThemeStore.getState()
    if (preference === 'system') {
      const resolved: ResolvedTheme = e.matches ? 'dark' : 'light'
      applyTheme(resolved)
      useThemeStore.setState({ resolved })
    }
  })
}
