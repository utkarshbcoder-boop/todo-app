import { useEffect, useState, useRef } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { useTodoStore } from '../store/todoStore'
import { useI18n } from '../i18n/useI18n'
import { toast } from 'sonner'

export default function PomodoroTimer() {
  const { t } = useI18n()
  const pomodoro = useTodoStore((s) => s.pomodoro)
  const startPomodoro = useTodoStore((s) => s.startPomodoro)
  const pausePomodoro = useTodoStore((s) => s.pausePomodoro)
  const resumePomodoro = useTodoStore((s) => s.resumePomodoro)
  const resetPomodoro = useTodoStore((s) => s.resetPomodoro)
  const failPomodoro = useTodoStore((s) => s.failPomodoro)
  const tickPomodoro = useTodoStore((s) => s.tickPomodoro)
  const toggleStrictMode = useTodoStore((s) => s.toggleStrictMode)
  const todos = useTodoStore((s) => s.todos)
  const studyLinks = useTodoStore((s) => s.studyLinks)
  const addStudyLink = useTodoStore((s) => s.addStudyLink)
  const deleteStudyLink = useTodoStore((s) => s.deleteStudyLink)

  const [expanded, setExpanded] = useState(false)
  const [selectedTodoId, setSelectedTodoId] = useState(null)
  const [showLinks, setShowLinks] = useState(false)
  const [newLinkUrl, setNewLinkUrl] = useState('')
  const [newLinkTitle, setNewLinkTitle] = useState('')

  const activeTodos = todos.filter((t) => !t.completed)
  const selectedTodo = todos.find((t) => t.id === (pomodoro.todoId || selectedTodoId))

  useEffect(() => {
    if (!pomodoro.running) return
    const interval = setInterval(tickPomodoro, 1000)
    return () => clearInterval(interval)
  }, [pomodoro.running, tickPomodoro])

  useEffect(() => {
    const handleVisibilityChange = () => {
      if (document.hidden && pomodoro.running && pomodoro.strictMode) {
        if (window.__exemptVisibilityUntil__ && Date.now() < window.__exemptVisibilityUntil__) return
        failPomodoro()
        toast.error('Focus Broken! Pomodoro Failed.')
      }
    }
    document.addEventListener('visibilitychange', handleVisibilityChange)
    return () => document.removeEventListener('visibilitychange', handleVisibilityChange)
  }, [pomodoro.running, pomodoro.strictMode, failPomodoro])

  const handleLinkClick = (url) => {
    window.__exemptVisibilityUntil__ = Date.now() + 30 * 60 * 1000
    window.open(url, '_blank')
  }

  const handleAddLink = () => {
    if (!newLinkTitle || !newLinkUrl) return
    addStudyLink(newLinkTitle, newLinkUrl)
    setNewLinkTitle('')
    setNewLinkUrl('')
  }

  const minutes = Math.floor(pomodoro.secondsLeft / 60)
  const seconds = pomodoro.secondsLeft % 60
  const isWork = pomodoro.mode === 'work'
  const totalSeconds = isWork ? 25 * 60 : 5 * 60
  const progress = ((totalSeconds - pomodoro.secondsLeft) / totalSeconds) * 100

  return (
    <div className="fixed bottom-4 sm:bottom-6 right-4 sm:right-6 z-50 flex flex-col items-end" style={{ paddingBottom: 'env(safe-area-inset-bottom)' }}>
      <AnimatePresence>
        {expanded && (
          <motion.div initial={{ opacity: 0, y: 20, scale: 0.9 }} animate={{ opacity: 1, y: 0, scale: 1 }} exit={{ opacity: 0, y: 20, scale: 0.9 }}
            className="mb-2 bg-white/95 dark:bg-gray-800/95 backdrop-blur-md rounded-2xl shadow-xl border border-gray-200 dark:border-gray-700 p-3 sm:p-4 w-56 sm:w-64">
            
            {showLinks ? (
              <div className="flex flex-col h-56 sm:h-64">
                <div className="flex justify-between items-center mb-2">
                  <h3 className="text-xs sm:text-sm font-semibold text-gray-800 dark:text-white">Study Links</h3>
                  <button onClick={() => setShowLinks(false)} className="text-[10px] sm:text-xs text-indigo-600 hover:underline">Back</button>
                </div>
                <div className="flex flex-col gap-1.5 sm:gap-2 mb-2">
                  <input type="text" placeholder="Title (e.g. Wiki)" value={newLinkTitle} onChange={(e) => setNewLinkTitle(e.target.value)} className="w-full text-[10px] sm:text-xs px-2 py-1 bg-gray-100 dark:bg-gray-700 rounded" />
                  <div className="flex gap-1">
                    <input type="url" placeholder="URL (https://...)" value={newLinkUrl} onChange={(e) => setNewLinkUrl(e.target.value)} className="flex-1 text-[10px] sm:text-xs px-2 py-1 bg-gray-100 dark:bg-gray-700 rounded" />
                    <button onClick={handleAddLink} className="bg-indigo-600 text-white px-2 rounded text-[10px] sm:text-xs">+</button>
                  </div>
                </div>
                <div className="flex-1 overflow-y-auto space-y-1 pr-1">
                  {studyLinks.map(link => (
                    <div key={link.id} className="flex justify-between items-center bg-gray-50 dark:bg-gray-700/50 p-1.5 rounded">
                      <button onClick={() => handleLinkClick(link.url)} className="text-[10px] sm:text-xs text-left truncate flex-1 hover:text-indigo-600 dark:hover:text-indigo-400" title={link.url}>{link.title}</button>
                      <button onClick={() => deleteStudyLink(link.id)} className="text-red-500 hover:text-red-700 px-1 text-[10px] sm:text-xs">×</button>
                    </div>
                  ))}
                  {studyLinks.length === 0 && <p className="text-[10px] sm:text-xs text-gray-500 text-center mt-4">No study links added.</p>}
                </div>
              </div>
            ) : (
              <div className="text-center">
                <p className="text-[10px] sm:text-xs font-medium text-gray-500 dark:text-gray-400 mb-1">
                  {isWork ? t('work') : t('breakTime')}
                </p>
                {selectedTodo && (
                  <p className="text-[10px] sm:text-xs text-indigo-600 dark:text-indigo-400 truncate mb-1" title={selectedTodo.text}>
                    {selectedTodo.text.slice(0, 30)}{selectedTodo.text.length > 30 ? '...' : ''}
                  </p>
                )}
                <p className="text-3xl sm:text-4xl font-bold text-gray-800 dark:text-white font-mono tabular-nums">
                  {String(minutes).padStart(2, '0')}:{String(seconds).padStart(2, '0')}
                </p>
                <div className="mt-2 h-1.5 bg-gray-200 dark:bg-gray-700 rounded-full overflow-hidden">
                  <motion.div className={`h-full rounded-full ${isWork ? 'bg-indigo-500' : 'bg-emerald-500'}`}
                    style={{ width: `${progress}%` }} transition={{ duration: 0.5 }} />
                </div>
                
                <div className="mt-2 sm:mt-3 flex items-center justify-between px-1">
                  <label className="flex items-center gap-1 sm:gap-1.5 cursor-pointer text-[10px] sm:text-xs font-medium text-gray-700 dark:text-gray-300">
                    <input type="checkbox" checked={pomodoro.strictMode} onChange={toggleStrictMode} className="rounded text-indigo-600 focus:ring-indigo-500 bg-gray-100 border-gray-300 dark:bg-gray-700 dark:border-gray-600" />
                    Strict
                  </label>
                  <button onClick={() => setShowLinks(true)} className="text-[10px] sm:text-xs font-medium text-indigo-600 dark:text-indigo-400 hover:underline">
                    Links
                  </button>
                </div>

                {!pomodoro.running && activeTodos.length > 0 && (
                  <select value={selectedTodoId || ''} onChange={(e) => setSelectedTodoId(e.target.value || null)}
                    className="w-full mt-2 sm:mt-3 px-2 py-1.5 text-[10px] sm:text-xs text-gray-600 dark:text-gray-300 bg-gray-100 dark:bg-gray-700 border border-gray-200 dark:border-gray-600 rounded-lg focus:outline-none focus:ring-1 focus:ring-indigo-500 cursor-pointer">
                    <option value="">No specific task</option>
                    {activeTodos.slice(0, 10).map((todo) => (
                      <option key={todo.id} value={todo.id}>{todo.text.slice(0, 35)}{todo.text.length > 35 ? '...' : ''}</option>
                    ))}
                  </select>
                )}
                
                <div className="flex gap-1.5 sm:gap-2 mt-2 sm:mt-3">
                  {!pomodoro.running ? (
                    <button onClick={pomodoro.todoId ? resumePomodoro : () => startPomodoro(selectedTodoId)}
                      className="flex-1 py-1.5 text-[10px] sm:text-xs font-medium bg-indigo-600 hover:bg-indigo-700 text-white rounded-lg transition-all cursor-pointer shadow-sm">
                      {t('start')}
                    </button>
                  ) : (
                    <button onClick={pausePomodoro}
                      className="flex-1 py-1.5 text-[10px] sm:text-xs font-medium bg-amber-500 hover:bg-amber-600 text-white rounded-lg transition-all cursor-pointer shadow-sm">
                      {t('pause')}
                    </button>
                  )}
                  <button onClick={resetPomodoro}
                    className="px-2 sm:px-3 py-1.5 text-[10px] sm:text-xs font-medium bg-gray-200 dark:bg-gray-700 hover:bg-gray-300 dark:hover:bg-gray-600 text-gray-600 dark:text-gray-300 rounded-lg transition-all cursor-pointer">
                    {t('reset')}
                  </button>
                </div>
              </div>
            )}
          </motion.div>
        )}
      </AnimatePresence>
      <motion.button onClick={() => setExpanded(!expanded)} whileHover={{ scale: 1.05 }} whileTap={{ scale: 0.95 }}
        className={`w-12 h-12 sm:w-14 sm:h-14 rounded-full shadow-lg flex items-center justify-center cursor-pointer transition-colors ${
          pomodoro.running
            ? isWork 
              ? pomodoro.strictMode ? 'bg-red-600 hover:bg-red-700 shadow-red-500/30 animate-pulse' : 'bg-indigo-600 hover:bg-indigo-700'
              : 'bg-emerald-500 hover:bg-emerald-600'
            : 'bg-white dark:bg-gray-800 hover:bg-gray-50 dark:hover:bg-gray-700 border border-gray-200 dark:border-gray-700'
        }`}>
        <svg className={`w-5 h-5 sm:w-6 sm:h-6 ${pomodoro.running ? 'text-white' : 'text-gray-600 dark:text-gray-300'}`} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
          <path strokeLinecap="round" strokeLinejoin="round" d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
        </svg>
      </motion.button>
    </div>
  )
}
