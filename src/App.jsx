import { useState, useEffect, useCallback, useRef, useMemo, Suspense, lazy } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import confetti from 'canvas-confetti'
import { Toaster, toast } from 'sonner'
import { useTodoStore } from './store/todoStore'
import { useThemeStore } from './store/themeStore'
import TodoList from './components/TodoList'
import BulkActions from './components/BulkActions'
import ErrorBoundary from './components/ErrorBoundary'
import BackgroundScene from './components/Background'
import ThemeToggle from './components/ThemeToggle'
import ProgressRing from './components/ProgressRing'
import Skeleton from './components/Skeleton'
import OfflineBanner from './components/OfflineBanner'
import InstallPrompt from './components/InstallPrompt'
import UpdateNotification from './components/UpdateNotification'

const LazyTodoForm = lazy(() => import('./components/TodoForm'))

function AppContent() {
  const { addTodo, undo, redo, deleteTodo, selectAll, history, future, checkReminders, todos } = useTodoStore()
  const getStats = useTodoStore((s) => s.getStats)
  const viewTab = useTodoStore((s) => s.viewTab)
  const setViewTab = useTodoStore((s) => s.setViewTab)
  const initTheme = useThemeStore((s) => s.initTheme)
  const [showForm, setShowForm] = useState(false)
  const [prefillDate, setPrefillDate] = useState(null)
  const [loaded, setLoaded] = useState(false)
  const [prefersReducedMotion, setPrefersReducedMotion] = useState(() => {
    return typeof window !== 'undefined' && window.matchMedia('(prefers-reduced-motion: reduce)').matches
  })
  const prevCompletedRef = useRef(0)
  // eslint-disable-next-line react-hooks/exhaustive-deps
  const stats = useMemo(() => getStats(), [todos, getStats])

  useEffect(() => { initTheme() }, [initTheme])
  useEffect(() => { const t = setTimeout(() => setLoaded(true), 300); return () => clearTimeout(t) }, [])
  useEffect(() => {
    const mq = window.matchMedia('(prefers-reduced-motion: reduce)')
    const handler = (e) => setPrefersReducedMotion(e.matches)
    mq.addEventListener('change', handler)
    return () => mq.removeEventListener('change', handler)
  }, [])

  useEffect(() => {
    checkReminders()
    const interval = setInterval(checkReminders, 60000)
    return () => clearInterval(interval)
  }, [checkReminders])

  useEffect(() => {
    if (Notification.permission === 'default' && stats.total > 0) {
      Notification.requestPermission()
    }
  }, [stats.total])

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
    if (e.key === 'd' && !isInput) { e.preventDefault(); handleToggleDashboard() }
    if ((e.ctrlKey || e.metaKey) && e.key === 'z' && !e.shiftKey) { e.preventDefault(); undo(); toast.info('Undone') }
    if ((e.ctrlKey || e.metaKey) && (e.key === 'y' || (e.key === 'z' && e.shiftKey))) { e.preventDefault(); redo(); toast.info('Redone') }
    if (e.key === 'Escape') { setShowForm(false); setPrefillDate(null) }
  }, [undo, redo, handleToggleSelectAll, handleToggleDashboard])

  useEffect(() => {
    window.addEventListener('keydown', handleKeyDown)
    return () => window.removeEventListener('keydown', handleKeyDown)
  }, [handleKeyDown])

  const handleAddTodoWithDate = (date) => {
    setPrefillDate(date)
    setShowForm(true)
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
      <Toaster position="top-right" richColors closeButton />
      <OfflineBanner />
      <InstallPrompt />
      <UpdateNotification />

      <div className="relative z-10 max-w-2xl mx-auto px-4 py-12" style={{ paddingLeft: 'max(1rem, env(safe-area-inset-left))', paddingRight: 'max(1rem, env(safe-area-inset-right))', paddingBottom: 'max(3rem, env(safe-area-inset-bottom))' }}>
        <div className="text-center mb-10">
          <div className="inline-flex items-center justify-center w-16 h-16 bg-indigo-600 rounded-2xl shadow-lg shadow-indigo-200 dark:shadow-indigo-900/50 mb-4">
            <svg className="w-8 h-8 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2m-6 9l2 2 4-4" />
            </svg>
          </div>
          <h1 className="text-4xl font-bold text-gray-900 dark:text-white tracking-tight">Todo App</h1>
          <p className="text-gray-500 dark:text-gray-400 mt-2 text-lg">
            {stats.active === 0 ? 'You have nothing to do!' : `You have ${stats.active} task${stats.active === 1 ? '' : 's'} remaining`}
          </p>
          {stats.total > 0 && <div className="mt-4 flex justify-center"><ProgressRing percent={stats.percent} /></div>}
        </div>

        <div className="flex justify-center items-center gap-2 mb-4 p-2 bg-white/60 dark:bg-gray-800/60 backdrop-blur-sm rounded-2xl border border-gray-200 dark:border-gray-700 shadow-sm w-fit mx-auto">
          <button onClick={() => { undo(); toast.info('Undone') }} disabled={history.length === 0}
            className="p-2.5 text-gray-500 hover:text-indigo-600 dark:text-gray-400 dark:hover:text-indigo-400 hover:bg-indigo-50 dark:hover:bg-indigo-900/30 rounded-xl transition-all cursor-pointer disabled:opacity-30 disabled:cursor-not-allowed"
            aria-label="Undo" title="Undo (Ctrl+Z)">
            <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M3 10h10a5 5 0 015 5v2M3 10l4 4M3 10l4-4" /></svg>
          </button>
          <button onClick={() => { redo(); toast.info('Redone') }} disabled={future.length === 0}
            className="p-2.5 text-gray-500 hover:text-indigo-600 dark:text-gray-400 dark:hover:text-indigo-400 hover:bg-indigo-50 dark:hover:bg-indigo-900/30 rounded-xl transition-all cursor-pointer disabled:opacity-30 disabled:cursor-not-allowed"
            aria-label="Redo" title="Redo (Ctrl+Y)">
            <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M21 10H11a5 5 0 00-5 5v2m15-7l-4 4m4-4l-4-4" /></svg>
          </button>
        </div>



        <div className="mb-8">
          <AnimatePresence mode="wait">
            {showForm ? (
              <Suspense fallback={<div className="skeleton h-48 rounded-2xl" />}>
                <LazyTodoForm key="form" prefillDate={prefillDate}
                  onSubmit={(data) => { addTodo(data); setShowForm(false); setPrefillDate(null); toast.success('Todo added!') }}
                  onCancel={() => { setShowForm(false); setPrefillDate(null) }} />
              </Suspense>
            ) : (
              <motion.button key="add-btn" onClick={() => { setPrefillDate(null); setShowForm(true) }}
                whileHover={{ scale: 1.01 }} whileTap={{ scale: 0.99 }}
                className="w-full py-4 px-6 bg-white/80 dark:bg-gray-800/80 backdrop-blur-sm hover:bg-indigo-50 dark:hover:bg-gray-700/80 border-2 border-dashed border-gray-200 dark:border-gray-700 hover:border-indigo-300 dark:hover:border-indigo-500 rounded-2xl text-gray-400 hover:text-indigo-600 dark:hover:text-indigo-400 font-medium transition-all duration-200 flex items-center justify-center gap-2 cursor-pointer shadow-sm hover:shadow-md">
                <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M12 4v16m8-8H4" /></svg>
                Add new todo
                <span className="text-xs text-gray-300 dark:text-gray-600 ml-2">(press n)</span>
              </motion.button>
            )}
          </AnimatePresence>
        </div>

        <TodoList onAddTodoWithDate={handleAddTodoWithDate} onDeleteWithUndo={handleDeleteWithUndo} />
      </div>

      <BulkActions />
    </div>
  )
}

export default function App() {
  return (
    <ErrorBoundary>
      <AppContent />
    </ErrorBoundary>
  )
}
