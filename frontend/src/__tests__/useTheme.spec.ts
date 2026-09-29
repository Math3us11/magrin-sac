import { beforeEach, describe, expect, it } from 'vitest'

import { initializeTheme, setTheme, THEME_STORAGE_KEY, useTheme } from '@/composables/useTheme'

describe('useTheme', () => {
  beforeEach(() => {
    setTheme('light')
    window.localStorage.clear()
  })

  it('inicia com o tema claro quando não há preferência salva', () => {
    initializeTheme()

    expect(useTheme().theme.value).toBe('light')
    expect(document.documentElement.dataset.theme).toBe('light')
  })

  it('restaura e alterna a preferência salva', () => {
    window.localStorage.setItem(THEME_STORAGE_KEY, 'dark')
    initializeTheme()

    const { isDark, toggleTheme } = useTheme()

    expect(isDark.value).toBe(true)
    expect(document.documentElement.dataset.theme).toBe('dark')

    toggleTheme()

    expect(isDark.value).toBe(false)
    expect(document.documentElement.dataset.theme).toBe('light')
    expect(window.localStorage.getItem(THEME_STORAGE_KEY)).toBe('light')
  })
})
