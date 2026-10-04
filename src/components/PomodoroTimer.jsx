import { useEffect, useState } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { useTodoStore } from '../store/todoStore'
import { useI18n } from '../i18n/useI18n'

export default function PomodoroTimer() {
  const { t } = useI18n()
  const pomodoro = useTodoStore((s) => s.pomodoro)
  const startPomodoro = useTodoStore((s) => s.startPomodoro)
  const pausePomodoro = useTodoStore((s) => s.pausePomodoro)
  const resumePomodoro = useTodoStore((s) => s.resumePomodoro)
  const resetPomodoro = useTodoStore((s) => s.resetPomodoro)
  const tickPomodoro = useTodoStore((s) => s.tickPomodoro)
  const todos = useTodoStore((s) => s.todos)
  const [expanded, setExpanded] = useState(false)
  const [selectedTodoId, setSelectedTodoId] = useState(null)

  const activeTodos = todos.filter((t) => !t.completed)
  const selectedTodo = todos.find((t) => t.id === (pomodoro.todoId || selectedTodoId))

  useEffect(() => {
    if (!pomodoro.running) return
    const interval = setInterval(tickPomodoro, 1000)
    return () => clearInterval(interval)
  }, [pomodoro.running, tickPomodoro])

  const minutes = Math.floor(pomodoro.secondsLeft / 60)
  const seconds = pomodoro.secondsLeft % 60
  const isWork = pomodoro.mode === 'work'
  const totalSeconds = isWork ? 25 * 60 : 5 * 60
  const progress = ((totalSeconds - pomodoro.secondsLeft) / totalSeconds) * 100

  return (
    <div className="fixed bottom-4 right-4 z-50" style={{ paddingBottom: 'env(safe-area-inset-bottom)' }}>
      <AnimatePresence>
        {expanded && (
          <motion.div initial={{ opacity: 0, y: 20, scale: 0.9 }} animate={{ opacity: 1, y: 0, scale: 1 }} exit={{ opacity: 0, y: 20, scale: 0.9 }}
            className="mb-2 glass-elevated rounded-2xl p-4 w-56">
            <div className="text-center">
              <p className="text-xs font-medium text-gray-500 dark:text-gray-400 mb-1">
                {isWork ? t('work') : t('breakTime')}
              </p>
              {selectedTodo && (
                <p className="text-xs text-violet-600 dark:text-violet-300 truncate mb-1" title={selectedTodo.text}>
                  {selectedTodo.text.slice(0, 30)}{selectedTodo.text.length > 30 ? '...' : ''}
                </p>
              )}
              <p className="text-3xl font-bold text-gray-800 dark:text-white font-mono tabular-nums">
                {String(minutes).padStart(2, '0')}:{String(seconds).padStart(2, '0')}
              </p>
              <div className="mt-2 h-1.5 bg-gray-200 dark:bg-gray-700 rounded-full overflow-hidden">
                <motion.div className={`h-full rounded-full ${isWork ? 'bg-violet-500' : 'bg-emerald-500'}`}
                  style={{ width: `${progress}%` }} transition={{ duration: 0.5 }} />
              </div>
              {!pomodoro.running && activeTodos.length > 0 && (
                <select value={selectedTodoId || ''} onChange={(e) => setSelectedTodoId(e.target.value || null)}
                  className="w-full mt-2 px-2 py-1.5 text-xs text-gray-600 dark:text-gray-300 bg-gray-100 dark:bg-gray-700 border border-gray-200 dark:border-gray-600 rounded-lg focus:outline-none focus:ring-1 focus:ring-violet-500 cursor-pointer">
                  <option value="">No specific task</option>
                  {activeTodos.slice(0, 10).map((todo) => (
                    <option key={todo.id} value={todo.id}>{todo.text.slice(0, 35)}{todo.text.length > 35 ? '...' : ''}</option>
                  ))}
                </select>
              )}
              <div className="flex gap-2 mt-3">
                {!pomodoro.running ? (
                  <button onClick={pomodoro.todoId ? resumePomodoro : () => startPomodoro(selectedTodoId)}
                    className="flex-1 py-1.5 text-xs font-medium bg-violet-600 hover:bg-violet-700 text-white rounded-lg transition-all cursor-pointer">
                    {t('start')}
                  </button>
                ) : (
                  <button onClick={pausePomodoro}
                    className="flex-1 py-1.5 text-xs font-medium bg-amber-500 hover:bg-amber-600 text-white rounded-lg transition-all cursor-pointer">
                    {t('pause')}
                  </button>
                )}
                <button onClick={resetPomodoro}
                  className="px-3 py-1.5 text-xs font-medium bg-gray-200 dark:bg-gray-700 hover:bg-gray-300 dark:hover:bg-gray-600 text-gray-600 dark:text-gray-300 rounded-lg transition-all cursor-pointer">
                  {t('reset')}
                </button>
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
      <motion.button onClick={() => setExpanded(!expanded)} whileHover={{ scale: 1.05 }} whileTap={{ scale: 0.95 }}
        className={`w-14 h-14 rounded-full shadow-lg flex items-center justify-center cursor-pointer transition-colors ${
          pomodoro.running
            ? isWork ? 'bg-violet-600 hover:bg-violet-700 shadow-violet-500/40' : 'bg-emerald-500 hover:bg-emerald-600 shadow-emerald-500/40'
            : 'glass-elevated hover:bg-white/80 dark:hover:bg-gray-700/80'
        }`}>
        <svg className={`w-6 h-6 ${pomodoro.running ? 'text-white' : 'text-gray-600 dark:text-gray-300'}`} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
          <path strokeLinecap="round" strokeLinejoin="round" d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
        </svg>
      </motion.button>
    </div>
  )
}
