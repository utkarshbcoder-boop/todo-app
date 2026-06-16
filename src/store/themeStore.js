import { create } from 'zustand'
import { persist } from 'zustand/middleware'

export const useThemeStore = create(
  persist(
    (set, get) => ({
      dark: typeof window !== 'undefined'
        ? window.matchMedia('(prefers-color-scheme: dark)').matches
        : false,
      toggleTheme: () => set((s) => {
        const next = !s.dark
        document.documentElement.classList.toggle('dark', next)
        return { dark: next }
      }),
      initTheme: () => {
        const { dark } = get()
        document.documentElement.classList.toggle('dark', dark)
      },
    }),
    { name: 'todo-theme' }
  )
)
