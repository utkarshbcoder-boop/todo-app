import { useState, useMemo } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { isPast, parseISO } from 'date-fns'
import { isToday, isThisWeek, startOfMonth, endOfMonth } from 'date-fns'
import { useTodoStore } from '../store/todoStore'
import { useI18n } from '../i18n/useI18n'

export default function ReviewPrompts() {
  const { t } = useI18n()
  const todos = useTodoStore((s) => s.todos)
  const [showWeekly, setShowWeekly] = useState(false)
  const [showMonthly, setShowMonthly] = useState(false)
  const [dismissed, setDismissed] = useState({})

  const weeklyStats = useMemo(() => {
    const weekTodos = todos.filter((todo) => {
      if (!todo.dueDate) return false
      try { return isThisWeek(parseISO(todo.dueDate), { weekStartsOn: 1 }) } catch { return false }
    })
    return {
      completed: weekTodos.filter((t) => t.completed).length,
      pending: weekTodos.filter((t) => !t.completed).length,
      overdue: weekTodos.filter((t) => !t.completed && t.dueDate && isPast(parseISO(t.dueDate)) && !isToday(parseISO(t.dueDate))).length,
    }
  }, [todos])

  const monthlyStats = useMemo(() => {
    const now = new Date()
    const monthStart = startOfMonth(now)
    const monthEnd = endOfMonth(now)
    const monthTodos = todos.filter((todo) => {
      if (!todo.dueDate) return false
      try {
        const d = parseISO(todo.dueDate)
        return d >= monthStart && d <= monthEnd
      } catch { return false }
    })
    return {
      completed: monthTodos.filter((t) => t.completed).length,
      pending: monthTodos.filter((t) => !t.completed).length,
      overdue: monthTodos.filter((t) => !t.completed && t.dueDate && isPast(parseISO(t.dueDate)) && !isToday(parseISO(t.dueDate))).length,
    }
  }, [todos])

  const shouldShowWeekly = !dismissed.weekly && weeklyStats.completed + weeklyStats.pending > 0
  const shouldShowMonthly = !dismissed.monthly && monthlyStats.completed + monthlyStats.pending > 0

  if (!shouldShowWeekly && !shouldShowMonthly) return null

  return (
    <div className="space-y-3">
      <AnimatePresence>
        {shouldShowWeekly && !showWeekly && (
          <motion.button initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -10 }}
            onClick={() => setShowWeekly(true)}
            className="w-full text-left p-4 bg-gradient-to-r from-blue-50 to-indigo-50 dark:from-blue-900/20 dark:to-indigo-900/20 rounded-2xl border border-blue-200 dark:border-blue-800 cursor-pointer hover:shadow-md transition-shadow">
            <div className="flex items-center gap-3">
              <span className="text-2xl">📊</span>
              <div>
                <p className="text-sm font-semibold text-gray-700 dark:text-gray-200">{t('weeklyReview')}</p>
                <p className="text-xs text-gray-500 dark:text-gray-400">
                  {weeklyStats.completed} {t('reviewCompleted')} · {weeklyStats.pending} {t('reviewPending')}
                </p>
              </div>
            </div>
          </motion.button>
        )}
        {showWeekly && (
          <motion.div initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: 'auto' }} exit={{ opacity: 0, height: 0 }}
            className="p-4 bg-gradient-to-r from-blue-50 to-indigo-50 dark:from-blue-900/20 dark:to-indigo-900/20 rounded-2xl border border-blue-200 dark:border-blue-800">
            <div className="flex items-center justify-between mb-3">
              <h3 className="text-sm font-semibold text-gray-700 dark:text-gray-200">{t('weeklyReview')}</h3>
              <button onClick={() => { setShowWeekly(false); setDismissed((d) => ({ ...d, weekly: true })) }}
                className="text-xs text-gray-400 hover:text-gray-600 dark:hover:text-gray-300 cursor-pointer">{t('dismiss')}</button>
            </div>
            <div className="grid grid-cols-3 gap-3">
              <div className="text-center p-2 bg-white/60 dark:bg-gray-800/60 rounded-xl">
                <p className="text-2xl font-bold text-emerald-600 dark:text-emerald-400">{weeklyStats.completed}</p>
                <p className="text-xs text-gray-500 dark:text-gray-400">{t('reviewCompleted')}</p>
              </div>
              <div className="text-center p-2 bg-white/60 dark:bg-gray-800/60 rounded-xl">
                <p className="text-2xl font-bold text-amber-600 dark:text-amber-400">{weeklyStats.pending}</p>
                <p className="text-xs text-gray-500 dark:text-gray-400">{t('reviewPending')}</p>
              </div>
              <div className="text-center p-2 bg-white/60 dark:bg-gray-800/60 rounded-xl">
                <p className="text-2xl font-bold text-red-600 dark:text-red-400">{weeklyStats.overdue}</p>
                <p className="text-xs text-gray-500 dark:text-gray-400">{t('reviewOverdue')}</p>
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      <AnimatePresence>
        {shouldShowMonthly && !showMonthly && (
          <motion.button initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -10 }}
            onClick={() => setShowMonthly(true)}
            className="w-full text-left p-4 bg-gradient-to-r from-purple-50 to-pink-50 dark:from-purple-900/20 dark:to-pink-900/20 rounded-2xl border border-purple-200 dark:border-purple-800 cursor-pointer hover:shadow-md transition-shadow">
            <div className="flex items-center gap-3">
              <span className="text-2xl">📈</span>
              <div>
                <p className="text-sm font-semibold text-gray-700 dark:text-gray-200">{t('monthlyReview')}</p>
                <p className="text-xs text-gray-500 dark:text-gray-400">
                  {monthlyStats.completed} {t('reviewCompleted')} · {monthlyStats.pending} {t('reviewPending')}
                </p>
              </div>
            </div>
          </motion.button>
        )}
        {showMonthly && (
          <motion.div initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: 'auto' }} exit={{ opacity: 0, height: 0 }}
            className="p-4 bg-gradient-to-r from-purple-50 to-pink-50 dark:from-purple-900/20 dark:to-pink-900/20 rounded-2xl border border-purple-200 dark:border-purple-800">
            <div className="flex items-center justify-between mb-3">
              <h3 className="text-sm font-semibold text-gray-700 dark:text-gray-200">{t('monthlyReview')}</h3>
              <button onClick={() => { setShowMonthly(false); setDismissed((d) => ({ ...d, monthly: true })) }}
                className="text-xs text-gray-400 hover:text-gray-600 dark:hover:text-gray-300 cursor-pointer">{t('dismiss')}</button>
            </div>
            <div className="grid grid-cols-3 gap-3">
              <div className="text-center p-2 bg-white/60 dark:bg-gray-800/60 rounded-xl">
                <p className="text-2xl font-bold text-emerald-600 dark:text-emerald-400">{monthlyStats.completed}</p>
                <p className="text-xs text-gray-500 dark:text-gray-400">{t('reviewCompleted')}</p>
              </div>
              <div className="text-center p-2 bg-white/60 dark:bg-gray-800/60 rounded-xl">
                <p className="text-2xl font-bold text-amber-600 dark:text-amber-400">{monthlyStats.pending}</p>
                <p className="text-xs text-gray-500 dark:text-gray-400">{t('reviewPending')}</p>
              </div>
              <div className="text-center p-2 bg-white/60 dark:bg-gray-800/60 rounded-xl">
                <p className="text-2xl font-bold text-red-600 dark:text-red-400">{monthlyStats.overdue}</p>
                <p className="text-xs text-gray-500 dark:text-gray-400">{t('reviewOverdue')}</p>
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  )
}
