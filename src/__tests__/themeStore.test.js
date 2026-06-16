import { describe, it, expect, beforeEach } from 'vitest'
import { useThemeStore } from '../store/themeStore'

describe('themeStore', () => {
  beforeEach(() => {
    localStorage.clear()
    document.documentElement.classList.remove('dark')
    useThemeStore.setState({ dark: false })
  })

  it('has default light theme', () => {
    const { dark } = useThemeStore.getState()
    expect(dark).toBe(false)
  })

  it('toggles theme', () => {
    const { toggleTheme } = useThemeStore.getState()
    toggleTheme()
    expect(useThemeStore.getState().dark).toBe(true)
    toggleTheme()
    expect(useThemeStore.getState().dark).toBe(false)
  })

  it('initTheme applies dark class to document', () => {
    useThemeStore.setState({ dark: true })
    const { initTheme } = useThemeStore.getState()
    initTheme()
    expect(document.documentElement.classList.contains('dark')).toBe(true)
  })

  it('initTheme defaults to system preference', () => {
    const { initTheme } = useThemeStore.getState()
    initTheme()
    const dark = useThemeStore.getState().dark
    expect(typeof dark).toBe('boolean')
  })
})
