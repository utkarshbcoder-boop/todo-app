import { useState, useEffect, useCallback, useRef, useMemo, Suspense, lazy } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import confetti from 'canvas-confetti'
import { Toaster, toast } from 'sonner'
import { useTodoStore } from './store/todoStore'
import { useThemeStore } from './store/themeStore'
import { useAdminStore } from './store/adminStore'
import { useUserStore } from './store/userStore'
import { I18nProvider } from './i18n/I18nProvider'
import { useI18n } from './i18n/useI18n'
import TodoList from './components/TodoList'
import BulkActions from './components/BulkActions'
import ErrorBoundary from './components/ErrorBoundary'
import BackgroundScene from './components/Background'
import ThemeToggle from './components/ThemeToggle'
import LanguageToggle from './components/LanguageToggle'
import ProgressRing from './components/ProgressRing'
import Skeleton from './components/Skeleton'
import OfflineBanner from './components/OfflineBanner'
import InstallPrompt from './components/InstallPrompt'
import UpdateNotification from './components/UpdateNotification'
import AdminLogin from './components/AdminLogin'
import AdminPortal from './components/AdminPortal'
import FeatureFlags from './components/FeatureFlags'
import FeatureGate from './components/FeatureGate'
import { useFeatureFlag } from './hooks/useFeatureFlag'
import PomodoroTimer from './components/PomodoroTimer'
import ReviewPrompts from './components/ReviewPrompts'
import LoginPage from './components/LoginPage'
import { CATEGORY_FILTERS } from './constants'
import ShortcutsPanel from './components/ShortcutsPanel'



const LazyTodoForm = lazy(() => import('./components/TodoForm'))

function AppContent() {
  const { t } = useI18n()
  const { addTodo, undo, redo, deleteTodo, selectAll, history, future, checkReminders, todos, purgeExpiredTrash, loadFromServer } = useTodoStore()
  const getStats = useTodoStore((s) => s.getStats)
  const viewTab = useTodoStore((s) => s.viewTab)
  const setViewTab = useTodoStore((s) => s.setViewTab)
  const setCategoryFilter = useTodoStore((s) => s.setCategoryFilter)
  const initTheme = useThemeStore((s) => s.initTheme)
  const isAdmin = useAdminStore((s) => s.isAuthenticated)
  const { user, isAuthenticated, logout } = useUserStore()
  const initialize = useUserStore((s) => s.initialize)
  const initialized = useUserStore((s) => s._initialized)
  const loadFeaturesFromServer = useAdminStore((s) => s.loadFeaturesFromServer)
  const dashboardEnabled = useFeatureFlag('dashboard')
  const remindersEnabled = useFeatureFlag('reminders')
  const [showForm, setShowForm] = useState(false)
  const [prefillDate, setPrefillDate] = useState(null)
  const [loaded, setLoaded] = useState(false)
  const [showAdminLogin, setShowAdminLogin] = useState(false)
  const [showAdminPortal, setShowAdminPortal] = useState(false)
  const [showShortcuts, setShowShortcuts] = useState(false)
  const [prefersReducedMotion, setPrefersReducedMotion] = useState(() => {
    return typeof window !== 'undefined' && window.matchMedia('(prefers-reduced-motion: reduce)').matches
  })
  const prevCompletedRef = useRef(0)
  // eslint-disable-next-line react-hooks/exhaustive-deps
  const stats = useMemo(() => getStats(), [todos, getStats])

  useEffect(() => { initTheme() }, [initTheme])
  useEffect(() => { initialize() }, [initialize])
  useEffect(() => { const t = setTimeout(() => setLoaded(true), 300); return () => clearTimeout(t) }, [])
  useEffect(() => {
    const mq = window.matchMedia('(prefers-reduced-motion: reduce)')
    const handler = (e) => setPrefersReducedMotion(e.matches)
    mq.addEventListener('change', handler)
    return () => mq.removeEventListener('change', handler)
  }, [])

  useEffect(() => { if (remindersEnabled) { checkReminders(); const interval = setInterval(checkReminders, 60000); return () => clearInterval(interval) } }, [checkReminders, remindersEnabled])
  useEffect(() => { purgeExpiredTrash() }, [purgeExpiredTrash])

  useEffect(() => {
    if (isAuthenticated) {
      loadFromServer().catch(() => {})
      loadFeaturesFromServer().catch(() => {})
    }
  }, [isAuthenticated, loadFromServer, loadFeaturesFromServer])

  useEffect(() => {
    if (remindersEnabled && Notification.permission === 'default' && stats.total > 0) {
      Notification.requestPermission()
    }
  }, [stats.total, remindersEnabled])

  useEffect(() => {
    if (stats.total > 0 && stats.completed === stats.total && stats.completed > prevCompletedRef.current && !prefersReducedMotion) {
      confetti({ particleCount: 100, spread: 70, origin: { y: 0.6 } })
    }
    prevCompletedRef.current = stats.completed
  }, [stats.completed, stats.total, prefersReducedMotion])

  const handleDeleteWithUndo = useCallback((id, text) => {
    deleteTodo(id)
    toast.info(`Deleted "${text.slice(0, 30)}${text.length > 30 ? '...' : ''}"`, {
      action: { label: 'Undo', onClick: () => undo() },
      duration: 5000,
    })
  }, [deleteTodo, undo])

  const handleToggleSelectAll = useCallback(() => { selectAll() }, [selectAll])
  const handleToggleDashboard = useCallback(() => { setViewTab(viewTab === 'dashboard' ? 'all' : 'dashboard') }, [viewTab, setViewTab])

  const handleKeyDown = useCallback((e) => {
    const target = e.target
    const isInput = target.tagName === 'INPUT' || target.tagName === 'TEXTAREA' || target.tagName === 'SELECT'
    if (e.key === '/' && !isInput) { e.preventDefault(); document.getElementById('search-input')?.focus() }
    if (e.key === 'n' && !isInput) { e.preventDefault(); setPrefillDate(null); setShowForm(true) }
    if (e.key === 'x' && !isInput) { e.preventDefault(); handleToggleSelectAll() }
    if (e.key === 'd' && !isInput && dashboardEnabled) { e.preventDefault(); handleToggleDashboard() }
    if (e.key === '?' && !isInput) { e.preventDefault(); setShowShortcuts((s) => !s) }
    if (e.key >= '1' && e.key <= '6' && !isInput) { e.preventDefault(); setCategoryFilter(CATEGORY_FILTERS[parseInt(e.key) - 1]) }
    if ((e.ctrlKey || e.metaKey) && e.key === 'z' && !e.shiftKey) { e.preventDefault(); undo(); toast.info('Undone') }
    if ((e.ctrlKey || e.metaKey) && (e.key === 'y' || (e.key === 'z' && e.shiftKey))) { e.preventDefault(); redo(); toast.info('Redone') }
    if (e.key === 'Escape') { setShowForm(false); setPrefillDate(null); setShowShortcuts(false) }
  }, [undo, redo, handleToggleSelectAll, handleToggleDashboard, dashboardEnabled, setCategoryFilter])

  useEffect(() => {
    window.addEventListener('keydown', handleKeyDown)
    return () => window.removeEventListener('keydown', handleKeyDown)
  }, [handleKeyDown])

  const handleAddTodoWithDate = (date) => {
    setPrefillDate(date)
    setShowForm(true)
  }

  if (!initialized) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-50 via-white to-indigo-50 dark:from-gray-950 dark:via-gray-900 dark:to-indigo-950 flex items-center justify-center">
        <BackgroundScene />
        <div className="relative z-10 text-center">
          <div className="glass-elevated inline-flex items-center justify-center w-16 h-16 rounded-2xl mb-4 animate-pulse">
            <svg className="w-8 h-8 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2m-6 9l2 2 4-4" />
            </svg>
          </div>
          <p className="text-gray-500 dark:text-gray-400">Loading...</p>
        </div>
      </div>
    )
  }

  if (!isAuthenticated) {
    return <LoginPage />
  }

  if (!loaded) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-50 via-white to-indigo-50 dark:from-gray-950 dark:via-gray-900 dark:to-indigo-950">
        <BackgroundScene />
        <div className="relative z-10 max-w-2xl mx-auto px-4 py-12" style={{ paddingLeft: 'max(1rem, env(safe-area-inset-left))', paddingRight: 'max(1rem, env(safe-area-inset-right))', paddingBottom: 'max(3rem, env(safe-area-inset-bottom))' }}>
          <div className="text-center mb-10">
            <div className="inline-flex items-center justify-center w-16 h-16 bg-indigo-600 rounded-2xl shadow-lg shadow-indigo-200 dark:shadow-indigo-900/50 mb-4 mx-auto" />
            <div className="skeleton h-10 w-48 mx-auto mb-2" />
            <div className="skeleton h-5 w-64 mx-auto" />
          </div>
          <Skeleton />
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-white to-indigo-50 dark:from-gray-950 dark:via-gray-900 dark:to-indigo-950 transition-colors duration-500">
      <BackgroundScene />
      <ThemeToggle />
      <FeatureGate feature="i18n"><LanguageToggle /></FeatureGate>
      <AnimatePresence>
        {showShortcuts && <ShortcutsPanel onClose={() => setShowShortcuts(false)} />}
      </AnimatePresence>
      <Toaster position="top-right" richColors closeButton />
      <OfflineBanner />
      <InstallPrompt />
      <UpdateNotification />

      <AnimatePresence>
        {showAdminLogin && !isAdmin && (
          <AdminLogin onLogin={() => { setShowAdminLogin(false); setShowAdminPortal(true) }} onClose={() => setShowAdminLogin(false)} />
        )}
      </AnimatePresence>

      <AnimatePresence>
        {showAdminPortal && isAdmin && (
          <AdminPortal onClose={() => setShowAdminPortal(false)} />
        )}
      </AnimatePresence>

      <div className="relative z-10 max-w-2xl mx-auto px-4 py-12" style={{ paddingLeft: 'max(1rem, env(safe-area-inset-left))', paddingRight: 'max(1rem, env(safe-area-inset-right))', paddingBottom: 'max(3rem, env(safe-area-inset-bottom))' }}>
        <div className="text-center mb-10">
          <div className="flex items-center justify-between mb-4">
            <div />
            <div className="flex items-center gap-3">
              {user?.picture && (
                <img
                  src={user.picture}
                  alt={user.name}
                  className="w-10 h-10 rounded-full border-2 border-white dark:border-gray-700 shadow-sm"
                />
              )}
              <div className="text-right">
                <p className="text-sm font-medium text-gray-900 dark:text-white">{user?.name}</p>
                <p className="text-xs text-gray-500 dark:text-gray-400">{user?.email}</p>
              </div>
              <button
                onClick={logout}
                className="icon-btn-3d p-2 text-gray-400 hover:text-red-500 dark:hover:text-red-400 rounded-xl cursor-pointer"
                title="Logout"
              >
                <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1" />
                </svg>
              </button>
            </div>
          </div>

          <div className="glass-elevated inline-flex items-center justify-center w-16 h-16 rounded-2xl mb-4">
            <svg className="w-8 h-8 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2m-6 9l2 2 4-4" />
            </svg>
          </div>
          <h1 className="text-4xl font-bold text-gray-900 dark:text-white tracking-tight">{t('appName')}</h1>
          <p className="text-gray-500 dark:text-gray-400 mt-2 text-lg">
            {stats.active === 0 ? 'You have nothing to do!' : `You have ${stats.active} task${stats.active === 1 ? '' : 's'} remaining`}
          </p>
          {stats.total > 0 && <div className="mt-4 flex justify-center"><ProgressRing percent={stats.percent} /></div>}

          <div className="mt-4 flex justify-center gap-2">
            <button
              onClick={() => isAdmin ? setShowAdminPortal(true) : setShowAdminLogin(true)}
              className="btn-3d flex items-center gap-2 px-4 py-2 text-sm font-medium text-gray-500 dark:text-gray-400 hover:text-indigo-600 dark:hover:text-indigo-400 rounded-xl cursor-pointer"
            >
              <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z" />
                <path strokeLinecap="round" strokeLinejoin="round" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
              </svg>
              {isAdmin ? 'Admin Portal' : 'Admin'}
              {isAdmin && <FeatureFlags />}
            </button>

          </div>
        </div>

        <div className="toolbar-glass flex justify-center items-center gap-2 mb-4 p-2 rounded-2xl w-fit mx-auto">
          <button onClick={() => { undo(); toast.info('Undone') }} disabled={history.length === 0}
            className="icon-btn-3d p-2.5 text-gray-500 hover:text-indigo-600 dark:text-gray-400 dark:hover:text-indigo-400 rounded-xl cursor-pointer disabled:opacity-30 disabled:cursor-not-allowed"
            aria-label="Undo" title="Undo (Ctrl+Z)">
            <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M3 10h10a5 5 0 015 5v2M3 10l4 4M3 10l4-4" /></svg>
          </button>
          <button onClick={() => { redo(); toast.info('Redone') }} disabled={future.length === 0}
            className="icon-btn-3d p-2.5 text-gray-500 hover:text-indigo-600 dark:text-gray-400 dark:hover:text-indigo-400 rounded-xl cursor-pointer disabled:opacity-30 disabled:cursor-not-allowed"
            aria-label="Redo" title="Redo (Ctrl+Y)">
            <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M21 10H11a5 5 0 00-5 5v2m15-7l-4 4m4-4l-4-4" /></svg>
          </button>
          <button onClick={() => setShowShortcuts((s) => !s)}
            className="icon-btn-3d p-2.5 text-gray-500 hover:text-indigo-600 dark:text-gray-400 dark:hover:text-indigo-400 rounded-xl cursor-pointer"
            aria-label="Keyboard shortcuts" title="Keyboard shortcuts (?)">
            <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M12 6V4m0 2a2 2 0 100 4m0-4a2 2 0 110 4m-6 8a2 2 0 100-4m0 4a2 2 0 110-4m0 4v2m0-6V4m6 6v10m6-2a2 2 0 100-4m0 4a2 2 0 110-4m0 4v2m0-6V4" /></svg>
          </button>


        </div>



        <div className="mb-8">
          <AnimatePresence mode="wait">
            {showForm ? (
              <Suspense fallback={<div className="skeleton h-48 rounded-2xl" />}>
                <LazyTodoForm key="form" prefillDate={prefillDate}
                  onSubmit={(data) => { addTodo(data); setShowForm(false); setPrefillDate(null); toast.success(t('todoAdded')) }}
                  onCancel={() => { setShowForm(false); setPrefillDate(null) }} />
              </Suspense>
            ) : (
              <motion.button key="add-btn" onClick={() => { setPrefillDate(null); setShowForm(true) }}
                whileHover={{ scale: 1.01 }} whileTap={{ scale: 0.99 }}
                className="btn-3d w-full py-4 px-6 rounded-2xl text-gray-400 hover:text-indigo-600 dark:hover:text-indigo-400 font-medium flex items-center justify-center gap-2 cursor-pointer">
                <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M12 4v16m8-8H4" /></svg>
                {t('addNewTodo')}
                <span className="text-xs text-gray-300 dark:text-gray-600 ml-2">{t('pressN')}</span>
              </motion.button>
            )}
          </AnimatePresence>
        </div>

        <TodoList onAddTodoWithDate={handleAddTodoWithDate} onDeleteWithUndo={handleDeleteWithUndo} />

        <div className="mt-4">
          <FeatureGate feature="reviews"><ReviewPrompts /></FeatureGate>
        </div>
      </div>

      <FeatureGate feature="bulkActions"><BulkActions /></FeatureGate>
      <FeatureGate feature="pomodoro"><PomodoroTimer /></FeatureGate>
    </div>
  )
}

export default function App() {
  return (
    <ErrorBoundary>
      <I18nProvider>
        <AppContent />
      </I18nProvider>
    </ErrorBoundary>
  )
}
