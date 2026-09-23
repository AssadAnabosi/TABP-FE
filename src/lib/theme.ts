// Light/dark theme with a "system" default. The initial class is set by an inline script in index.html
// (before first paint, so there's no flash); this store keeps it in sync afterwards.
import { create } from 'zustand'

export type ThemePreference = 'light' | 'dark' | 'system'
type ResolvedTheme = 'light' | 'dark'

const STORAGE_KEY = 'tabp.theme'
const media = window.matchMedia('(prefers-color-scheme: dark)')

function readPreference(): ThemePreference {
  try {
    const value = localStorage.getItem(STORAGE_KEY)
    return value === 'light' || value === 'dark' ? value : 'system'
  } catch {
    return 'system'
  }
}

function resolve(preference: ThemePreference): ResolvedTheme {
  if (preference === 'system') return media.matches ? 'dark' : 'light'
  return preference
}

function apply(theme: ResolvedTheme) {
  document.documentElement.classList.toggle('dark', theme === 'dark')
  document.documentElement.style.colorScheme = theme
}

interface ThemeState {
  preference: ThemePreference
  resolved: ResolvedTheme
  setPreference: (preference: ThemePreference) => void
}

export const useTheme = create<ThemeState>((set) => {
  const preference = readPreference()
  const resolved = resolve(preference)
  apply(resolved)
  return {
    preference,
    resolved,
    setPreference: (next) => {
      try {
        if (next === 'system') localStorage.removeItem(STORAGE_KEY)
        else localStorage.setItem(STORAGE_KEY, next)
      } catch {
        // Storage unavailable: the choice lasts for this page view only.
      }
      const nextResolved = resolve(next)
      apply(nextResolved)
      set({ preference: next, resolved: nextResolved })
    },
  }
})

// Follow OS changes while the user hasn't picked a theme explicitly.
media.addEventListener('change', () => {
  const { preference } = useTheme.getState()
  if (preference !== 'system') return
  const resolved = resolve('system')
  apply(resolved)
  useTheme.setState({ resolved })
})
