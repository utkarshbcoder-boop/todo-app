import { useCallback } from 'react'
import { persist } from 'zustand/middleware'
import { create } from 'zustand'
import { translations } from './translations'
import { I18nContext } from './context'

const useLangStore = create(
  persist(
    (set) => ({
      lang: 'en',
      setLang: (lang) => set({ lang }),
    }),
    { name: 'todo-lang-store' }
  )
)

export function I18nProvider({ children }) {
  const { lang, setLang } = useLangStore()
  const t = useCallback((key) => translations[lang]?.[key] || translations.en[key] || key, [lang])
  return (
    <I18nContext.Provider value={{ t, lang, setLang }}>
      {children}
    </I18nContext.Provider>
  )
}
