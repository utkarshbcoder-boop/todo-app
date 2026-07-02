import { I18nProvider } from '../i18n/I18nProvider'

export function TestWrapper({ children }) {
  return <I18nProvider>{children}</I18nProvider>
}
