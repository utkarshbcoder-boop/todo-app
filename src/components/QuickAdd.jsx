import { useState, useRef, useEffect } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { useTodoStore } from '../store/todoStore'
import { parseNaturalInput } from '../utils/smartSuggest'
import { categoryIcons } from '../constants'
import { toast } from 'sonner'

export default function QuickAdd() {
  const [open, setOpen] = useState(false)
  const [text, setText] = useState('')
  const [parsed, setParsed] = useState(null)
  const inputRef = useRef(null)
  const addTodo = useTodoStore((s) => s.addTodo)

  useEffect(() => {
    if (open) {
      setTimeout(() => inputRef.current?.focus(), 100)
    }
  }, [open])

  // Listen for keyboard shortcut toggle
  useEffect(() => {
    const handler = () => setOpen(o => !o)
    window.addEventListener('toggleQuickAdd', handler)
    return () => window.removeEventListener('toggleQuickAdd', handler)
  }, [])

  // Real-time parsing
  useEffect(() => {
    if (!text || text.length < 3) {
      setParsed(null)
      return
    }
    const timer = setTimeout(() => {
      const result = parseNaturalInput(text)
      const has = result.dueDate || result.priority || result.tags.length > 0 || result.suggestedCategory
      setParsed(has ? result : null)
    }, 200)
    return () => clearTimeout(timer)
  }, [text])

  const handleSubmit = (e) => {
    e?.preventDefault()
    if (!text.trim()) return

    const result = parseNaturalInput(text)
    addTodo({
      text: result.cleanText || text.trim(),
      category: result.suggestedCategory || 'Personal',
      priority: result.priority || 'Medium',
      dueDate: result.dueDate || null,
      tags: result.tags || [],
    })

    toast.success('Task added!', { duration: 2000 })
    setText('')
    setParsed(null)
    setOpen(false)
  }

  const handleKeyDown = (e) => {
    if (e.key === 'Enter') handleSubmit()
    if (e.key === 'Escape') { setOpen(false); setText(''); setParsed(null) }
  }

  return (
    <>
      {/* Backdrop */}
      <AnimatePresence>
        {open && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-40 bg-black/20 backdrop-blur-sm"
            onClick={() => { setOpen(false); setText(''); setParsed(null) }}
          />
        )}
      </AnimatePresence>

      {/* Expanded quick-add input */}
      <AnimatePresence>
        {open && (
          <motion.div
            initial={{ opacity: 0, y: 20, scale: 0.9 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 20, scale: 0.9 }}
            transition={{ type: 'spring', stiffness: 400, damping: 30 }}
            className="fixed bottom-20 sm:bottom-24 right-4 sm:right-6 z-50 w-[calc(100%-2rem)] sm:w-80 md:w-96"
          >
            <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-2xl border border-gray-200 dark:border-gray-700 p-3 sm:p-4 space-y-2.5 sm:space-y-3">
              <div className="flex items-center gap-2">
                <span className="text-base sm:text-lg">⚡</span>
                <p className="text-[10px] sm:text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wider">Quick Add</p>
              </div>

              <input
                ref={inputRef}
                type="text"
                value={text}
                onChange={(e) => setText(e.target.value)}
                onKeyDown={handleKeyDown}
                placeholder="Buy milk tomorrow !high #shopping"
                className="w-full px-3 sm:px-4 py-2.5 sm:py-3 text-xs sm:text-sm text-gray-800 dark:text-gray-100 bg-gray-50 dark:bg-gray-700/50 border border-gray-200 dark:border-gray-600 rounded-xl focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent placeholder:text-gray-400 dark:placeholder:text-gray-500"
              />

              {/* Live parsed preview */}
              <AnimatePresence>
                {parsed && (
                  <motion.div
                    initial={{ opacity: 0, height: 0 }}
                    animate={{ opacity: 1, height: 'auto' }}
                    exit={{ opacity: 0, height: 0 }}
                    className="flex flex-wrap gap-1 sm:gap-1.5"
                  >
                    {parsed.dueDate && (
                      <span className="inline-flex items-center gap-1 px-1.5 sm:px-2 py-0.5 text-[8px] sm:text-[10px] font-medium bg-blue-50 dark:bg-blue-900/30 text-blue-600 dark:text-blue-400 rounded-full">
                        📅 {parsed.dueDate}
                      </span>
                    )}
                    {parsed.priority && (
                      <span className={`inline-flex items-center gap-1 px-1.5 sm:px-2 py-0.5 text-[8px] sm:text-[10px] font-medium rounded-full ${
                        parsed.priority === 'High' ? 'bg-red-50 dark:bg-red-900/30 text-red-600 dark:text-red-400' :
                        'bg-emerald-50 dark:bg-emerald-900/30 text-emerald-600 dark:text-emerald-400'
                      }`}>
                        ⚡ {parsed.priority}
                      </span>
                    )}
                    {parsed.suggestedCategory && (
                      <span className="inline-flex items-center gap-1 px-1.5 sm:px-2 py-0.5 text-[8px] sm:text-[10px] font-medium bg-purple-50 dark:bg-purple-900/30 text-purple-600 dark:text-purple-400 rounded-full">
                        {categoryIcons[parsed.suggestedCategory]} {parsed.suggestedCategory}
                      </span>
                    )}
                    {parsed.tags.map(tag => (
                      <span key={tag} className="inline-flex items-center px-1.5 sm:px-2 py-0.5 text-[8px] sm:text-[10px] font-medium bg-indigo-50 dark:bg-indigo-900/30 text-indigo-600 dark:text-indigo-400 rounded-full">
                        #{tag}
                      </span>
                    ))}
                  </motion.div>
                )}
              </AnimatePresence>

              <div className="flex gap-2">
                <motion.button
                  whileHover={{ scale: 1.02 }} whileTap={{ scale: 0.98 }}
                  onClick={handleSubmit}
                  disabled={!text.trim()}
                  className="flex-1 py-2 sm:py-2.5 bg-gradient-to-r from-indigo-500 to-purple-600 text-white text-xs sm:text-sm font-semibold rounded-xl shadow-lg shadow-indigo-500/20 disabled:opacity-40 disabled:cursor-not-allowed cursor-pointer"
                >
                  Add Task
                </motion.button>
                <button
                  onClick={() => { setOpen(false); setText(''); setParsed(null) }}
                  className="px-3 sm:px-4 py-2 sm:py-2.5 text-xs sm:text-sm text-gray-500 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-xl transition-all cursor-pointer"
                >
                  Cancel
                </button>
              </div>

              <p className="text-[8px] sm:text-[10px] text-gray-400 dark:text-gray-500 text-center">
                <kbd className="px-1 py-0.5 bg-gray-100 dark:bg-gray-700 rounded text-[7px] sm:text-[9px]">Enter</kbd> to add · <kbd className="px-1 py-0.5 bg-gray-100 dark:bg-gray-700 rounded text-[7px] sm:text-[9px]">Esc</kbd> to close
              </p>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* FAB button */}
      <motion.button
        whileHover={{ scale: 1.1 }}
        whileTap={{ scale: 0.9 }}
        onClick={() => setOpen(o => !o)}
        className={`fixed bottom-5 sm:bottom-6 right-4 sm:right-6 z-50 w-12 h-12 sm:w-14 sm:h-14 rounded-full shadow-xl flex items-center justify-center cursor-pointer transition-all ${
          open
            ? 'bg-gray-600 shadow-gray-500/30 rotate-45'
            : 'bg-gradient-to-br from-indigo-500 to-purple-600 shadow-indigo-500/40 hover:shadow-indigo-500/60'
        }`}
        aria-label="Quick add task"
        title="Quick add (q)"
      >
        <motion.svg
          animate={{ rotate: open ? 45 : 0 }}
          className="w-6 h-6 sm:w-7 sm:h-7 text-white"
          fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}
        >
          <path strokeLinecap="round" strokeLinejoin="round" d="M12 4v16m8-8H4" />
        </motion.svg>
      </motion.button>
    </>
  )
}
