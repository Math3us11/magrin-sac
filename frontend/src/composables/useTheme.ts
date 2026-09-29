import { computed, readonly, ref } from 'vue'

export type Theme = 'light' | 'dark'

export const THEME_STORAGE_KEY = 'magrin-sac-theme'

const activeTheme = ref<Theme>('light')

function isTheme(value: string | null): value is Theme {
  return value === 'light' || value === 'dark'
}

function applyTheme(theme: Theme) {
  if (typeof document !== 'undefined') {
    document.documentElement.dataset.theme = theme
  }
}

function persistTheme(theme: Theme) {
  if (typeof window === 'undefined') return

  try {
    window.localStorage.setItem(THEME_STORAGE_KEY, theme)
  } catch {
    // O tema continua funcional mesmo quando o armazenamento estiver indisponível.
  }
}

export function setTheme(theme: Theme, persist = true) {
  activeTheme.value = theme
  applyTheme(theme)

  if (persist) persistTheme(theme)
}

export function initializeTheme() {
  let initialTheme: Theme = 'light'

  if (typeof window !== 'undefined') {
    try {
      const storedTheme = window.localStorage.getItem(THEME_STORAGE_KEY)
      if (isTheme(storedTheme)) initialTheme = storedTheme
    } catch {
      // O tema claro é o padrão quando o armazenamento não puder ser lido.
    }
  }

  setTheme(initialTheme, false)
}

export function useTheme() {
  const isDark = computed(() => activeTheme.value === 'dark')

  function toggleTheme() {
    setTheme(isDark.value ? 'light' : 'dark')
  }

  return {
    theme: readonly(activeTheme),
    isDark,
    toggleTheme,
  }
}
