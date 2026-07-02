import { useMemo } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { useTodoStore } from '../store/todoStore'
import { categoryIcons } from '../constants'
import { useI18n } from '../i18n/useI18n'

export default function RecurringView() {
  const { t } = useI18n()
  const todos = useTodoStore((s) => s.todos)
  const toggleTodo = useTodoStore((s) => s.toggleTodo)

  const recurringTodos = useMemo(() => todos.filter((todo) => todo.recurrence !== 'none'), [todos])

  const recurrenceLabels = {
    daily: '🔄 Daily',
    weekly: '📅 Weekly',
    monthly: '📆 Monthly',
  }

  return (
    <div className="space-y-4">
      <div>
        <h3 className="text-sm font-semibold text-gray-700 dark:text-gray-200">{t('recurring')}</h3>
        <p className="text-xs text-gray-400 dark:text-gray-500">{t('recurringDesc')}</p>
      </div>

      {recurringTodos.length === 0 ? (
        <div className="text-center py-16">
          <div className="text-5xl mb-4" aria-hidden="true">🔄</div>
          <p className="text-gray-400 dark:text-gray-500 text-lg font-medium">{t('noRecurring')}</p>
        </div>
      ) : (
        <div className="space-y-2">
          <AnimatePresence>
            {recurringTodos.map((todo) => (
              <motion.div key={todo.id} layout initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, x: -100 }}
                className="flex items-center gap-3 p-3 bg-white/60 dark:bg-gray-800/60 backdrop-blur-sm rounded-xl border border-gray-100 dark:border-gray-700">
                <button onClick={() => toggleTodo(todo.id)}
                  className={`flex-shrink-0 w-6 h-6 rounded-full border-2 flex items-center justify-center transition-all cursor-pointer ${
                    todo.completed ? 'bg-indigo-600 border-indigo-600' : 'border-gray-300 dark:border-gray-600 hover:border-indigo-500'
                  }`}>
                  {todo.completed && (
                    <svg className="w-3.5 h-3.5 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={3}>
                      <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
                    </svg>
                  )}
                </button>
                <span className="text-lg" aria-hidden="true">{categoryIcons[todo.category]}</span>
                <div className="flex-1 min-w-0">
                  <p className={`text-sm font-medium ${todo.completed ? 'line-through text-gray-400 dark:text-gray-500' : 'text-gray-700 dark:text-gray-200'}`}>
                    {todo.text}
                  </p>
                  <div className="flex items-center gap-2 mt-0.5">
                    <span className="text-xs px-2 py-0.5 bg-purple-50 dark:bg-purple-900/20 text-purple-600 dark:text-purple-400 rounded-full">
                      {recurrenceLabels[todo.recurrence] || todo.recurrence}
                    </span>
                    {todo.dueDate && (
                      <span className="text-xs text-gray-400 dark:text-gray-500">Due: {todo.dueDate}</span>
                    )}
                  </div>
                </div>
              </motion.div>
            ))}
          </AnimatePresence>
        </div>
      )}
    </div>
  )
}
