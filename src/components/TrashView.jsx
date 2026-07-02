import { motion, AnimatePresence } from 'framer-motion'
import { useTodoStore } from '../store/todoStore'
import { useI18n } from '../i18n/useI18n'

export default function TrashView() {
  const { t } = useI18n()
  const trash = useTodoStore((s) => s.trash)
  const restoreTodo = useTodoStore((s) => s.restoreTodo)
  const permanentDeleteTodo = useTodoStore((s) => s.permanentDeleteTodo)
  const emptyTrash = useTodoStore((s) => s.emptyTrash)
  const restoreAll = useTodoStore((s) => s.restoreAll)

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <h3 className="text-sm font-semibold text-gray-700 dark:text-gray-200">{t('trash')}</h3>
          <p className="text-xs text-gray-400 dark:text-gray-500">{t('trashDesc')}</p>
        </div>
        {trash.length > 0 && (
          <div className="flex gap-2">
            <button onClick={restoreAll}
              className="px-3 py-1.5 text-xs font-medium text-emerald-600 dark:text-emerald-400 hover:bg-emerald-50 dark:hover:bg-emerald-900/20 rounded-lg transition-all cursor-pointer">
              {t('restoreAll')}
            </button>
            <button onClick={emptyTrash}
              className="px-3 py-1.5 text-xs font-medium text-red-500 hover:bg-red-50 dark:hover:bg-red-900/20 rounded-lg transition-all cursor-pointer">
              {t('emptyTrash')}
            </button>
          </div>
        )}
      </div>

      {trash.length === 0 ? (
        <div className="text-center py-16">
          <div className="text-5xl mb-4" aria-hidden="true">🗑️</div>
          <p className="text-gray-400 dark:text-gray-500 text-lg font-medium">{t('trashEmpty')}</p>
        </div>
      ) : (
        <div className="space-y-2">
          <AnimatePresence>
            {trash.map((todo) => (
              <motion.div key={todo.id} layout initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, x: -100 }}
                className="flex items-center gap-3 p-3 bg-white/60 dark:bg-gray-800/60 backdrop-blur-sm rounded-xl border border-gray-100 dark:border-gray-700">
                <span className="text-lg" aria-hidden="true">📋</span>
                <div className="flex-1 min-w-0">
                  <p className="text-sm text-gray-600 dark:text-gray-300 truncate">{todo.text}</p>
                  <p className="text-xs text-gray-400 dark:text-gray-500">
                    Deleted {new Date(todo.deletedAt).toLocaleDateString()}
                  </p>
                </div>
                <button onClick={() => restoreTodo(todo.id)}
                  className="px-3 py-1.5 text-xs font-medium text-emerald-600 dark:text-emerald-400 hover:bg-emerald-50 dark:hover:bg-emerald-900/20 rounded-lg transition-all cursor-pointer">
                  {t('restore')}
                </button>
                <button onClick={() => permanentDeleteTodo(todo.id)}
                  className="px-3 py-1.5 text-xs font-medium text-red-500 hover:bg-red-50 dark:hover:bg-red-900/20 rounded-lg transition-all cursor-pointer">
                  {t('permanentDelete')}
                </button>
              </motion.div>
            ))}
          </AnimatePresence>
        </div>
      )}
    </div>
  )
}
