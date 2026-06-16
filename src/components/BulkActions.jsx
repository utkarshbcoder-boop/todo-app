import { useState, useRef, useEffect } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { useTodoStore } from '../store/todoStore'
import { CATEGORIES } from '../constants'
import { toast } from 'sonner'

export default function BulkActions() {
  const { selectedIds, clearSelection, bulkComplete, bulkDelete, bulkCategorize, undo } = useTodoStore()
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false)
  const [showCategoryMenu, setShowCategoryMenu] = useState(false)
  const categoryRef = useRef(null)

  useEffect(() => {
    const handleClick = (e) => {
      if (categoryRef.current && !categoryRef.current.contains(e.target)) setShowCategoryMenu(false)
    }
    if (showCategoryMenu) document.addEventListener('mousedown', handleClick)
    return () => document.removeEventListener('mousedown', handleClick)
  }, [showCategoryMenu])

  const handleBulkDelete = () => {
    const count = selectedIds.length
    setShowDeleteConfirm(false)
    bulkDelete()
    toast.info(`Deleted ${count} todos`, {
      action: { label: 'Undo', onClick: () => undo() },
      duration: 5000,
    })
  }

  return (
    <AnimatePresence>
      {selectedIds.length > 0 && (
        <>
          <motion.div
            initial={{ opacity: 0, y: 20, scale: 0.95 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 20, scale: 0.95 }}
            transition={{ type: 'spring', stiffness: 400, damping: 30 }}
            role="toolbar"
            aria-label="Bulk actions"
            className="fixed bottom-6 left-1/2 -translate-x-1/2 z-50 bg-white/95 dark:bg-gray-800/95 backdrop-blur-md rounded-2xl shadow-2xl shadow-gray-300/50 dark:shadow-gray-900/80 border border-gray-200 dark:border-gray-700 px-6 py-3 flex items-center gap-4"
          >
            <span className="text-sm font-medium text-gray-600 dark:text-gray-300">{selectedIds.length} selected</span>
            <div className="h-6 w-px bg-gray-200 dark:bg-gray-600" />
            <button onClick={bulkComplete}
              className="flex items-center gap-1.5 px-3 py-1.5 text-sm font-medium text-emerald-600 dark:text-emerald-400 hover:bg-emerald-50 dark:hover:bg-emerald-900/30 rounded-lg transition-all cursor-pointer"
              aria-label="Complete selected todos">
              <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" /></svg>
              Complete
            </button>
            <div className="relative" ref={categoryRef}>
              <button onClick={() => setShowCategoryMenu(!showCategoryMenu)}
                className="flex items-center gap-1.5 px-3 py-1.5 text-sm font-medium text-indigo-600 dark:text-indigo-400 hover:bg-indigo-50 dark:hover:bg-indigo-900/30 rounded-lg transition-all cursor-pointer"
                aria-label="Categorize selected todos" aria-haspopup="true" aria-expanded={showCategoryMenu}>
                <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M7 7h.01M7 3h5c.512 0 1.024.195 1.414.586l7 7a2 2 0 010 2.828l-7 7a2 2 0 01-2.828 0l-7-7A1.994 1.994 0 013 12V7a4 4 0 014-4z" /></svg>
                Categorize
              </button>
              <AnimatePresence>
                {showCategoryMenu && (
                  <motion.div initial={{ opacity: 0, y: 5 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: 5 }}
                    className="absolute bottom-full left-0 mb-2 bg-white dark:bg-gray-800 rounded-xl shadow-lg border border-gray-200 dark:border-gray-700 py-1 min-w-[140px] z-50">
                    {CATEGORIES.map((cat) => (
                      <button key={cat} onClick={() => { bulkCategorize(cat); setShowCategoryMenu(false) }}
                        className="w-full text-left px-4 py-2 text-sm text-gray-700 dark:text-gray-200 hover:bg-gray-100 dark:hover:bg-gray-700 transition-all cursor-pointer">{cat}</button>
                    ))}
                  </motion.div>
                )}
              </AnimatePresence>
            </div>
            <button onClick={() => setShowDeleteConfirm(true)}
              className="flex items-center gap-1.5 px-3 py-1.5 text-sm font-medium text-red-600 dark:text-red-400 hover:bg-red-50 dark:hover:bg-red-900/30 rounded-lg transition-all cursor-pointer"
              aria-label="Delete selected todos">
              <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" /></svg>
              Delete
            </button>
            <div className="h-6 w-px bg-gray-200 dark:border-gray-600" />
            <button onClick={clearSelection}
              className="p-1.5 text-gray-400 hover:text-gray-600 dark:hover:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg transition-all cursor-pointer"
              aria-label="Clear selection" title="Clear selection">
              <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" /></svg>
            </button>
          </motion.div>

          {/* Delete confirmation modal */}
          <AnimatePresence>
            {showDeleteConfirm && (
              <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
                className="fixed inset-0 z-[60] flex items-center justify-center bg-black/40 backdrop-blur-sm"
                onClick={() => setShowDeleteConfirm(false)}>
                <motion.div initial={{ scale: 0.95, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} exit={{ scale: 0.95, opacity: 0 }}
                  onClick={(e) => e.stopPropagation()}
                  className="bg-white dark:bg-gray-800 rounded-2xl shadow-2xl border border-gray-200 dark:border-gray-700 p-6 max-w-sm w-full mx-4">
                  <div className="text-center">
                    <div className="text-4xl mb-3">⚠️</div>
                    <h3 className="text-lg font-semibold text-gray-800 dark:text-white mb-1">Delete {selectedIds.length} todos?</h3>
                    <p className="text-sm text-gray-500 dark:text-gray-400 mb-6">This can be undone with the undo button within 5 seconds.</p>
                    <div className="flex gap-3 justify-center">
                      <button onClick={() => setShowDeleteConfirm(false)}
                        className="px-5 py-2.5 bg-gray-100 dark:bg-gray-700 hover:bg-gray-200 dark:hover:bg-gray-600 text-gray-600 dark:text-gray-300 font-medium rounded-xl transition-all cursor-pointer">
                        Cancel
                      </button>
                      <button onClick={handleBulkDelete}
                        className="px-5 py-2.5 bg-red-600 hover:bg-red-700 text-white font-medium rounded-xl transition-all cursor-pointer">
                        Delete
                      </button>
                    </div>
                  </div>
                </motion.div>
              </motion.div>
            )}
          </AnimatePresence>
        </>
      )}
    </AnimatePresence>
  )
}
