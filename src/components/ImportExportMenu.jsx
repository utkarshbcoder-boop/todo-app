import { useState } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { useTodoStore } from '../store/todoStore'
import { toast } from 'sonner'

export default function ImportExportMenu() {
  const [open, setOpen] = useState(false)
  const { todos, importTodos } = useTodoStore()

  const exportJSON = () => {
    const blob = new Blob([JSON.stringify(todos, null, 2)], { type: 'application/json' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url; a.download = `todos-${new Date().toISOString().split('T')[0]}.json`; a.click()
    URL.revokeObjectURL(url)
    setOpen(false)
    toast.success('Exported as JSON')
  }

  const exportCSV = () => {
    const headers = ['Text', 'Category', 'Priority', 'Due Date', 'Completed', 'Tags', 'Notes', 'Recurrence', 'Created']
    const rows = todos.map((t) => [
      `"${t.text.replace(/"/g, '""')}"`, t.category, t.priority, t.dueDate || '',
      t.completed ? 'Yes' : 'No', `"${t.tags.join(', ')}"`, `"${(t.notes || '').replace(/"/g, '""')}"`,
      t.recurrence, t.createdAt,
    ])
    const csv = [headers.join(','), ...rows.map((r) => r.join(','))].join('\n')
    const blob = new Blob([csv], { type: 'text/csv' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url; a.download = `todos-${new Date().toISOString().split('T')[0]}.csv`; a.click()
    URL.revokeObjectURL(url)
    setOpen(false)
    toast.success('Exported as CSV')
  }

  const importJSON = () => {
    const input = document.createElement('input')
    input.type = 'file'; input.accept = '.json'
    input.onchange = (e) => {
      const file = e.target.files[0]
      if (!file) return
      const reader = new FileReader()
      reader.onload = (ev) => {
        try {
          const data = JSON.parse(ev.target.result)
          const result = importTodos(Array.isArray(data) ? data : data.todos || [])
          if (result === false) { toast.error('Invalid file format') }
          else { toast.success(`Imported ${result} todos`) }
        } catch { toast.error('Failed to parse file') }
      }
      reader.readAsText(file)
    }
    input.click()
    setOpen(false)
  }

  return (
    <div className="relative">
      <button onClick={() => setOpen(!open)}
        className={`p-2.5 rounded-xl transition-all cursor-pointer ${open ? 'text-indigo-600 dark:text-indigo-400 bg-indigo-50 dark:bg-indigo-900/30' : 'text-gray-500 hover:text-indigo-600 dark:text-gray-400 dark:hover:text-indigo-400 hover:bg-indigo-50 dark:hover:bg-indigo-900/30'}`}
        aria-label="Import/Export" aria-haspopup="true" aria-expanded={open}>
        <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
          <path strokeLinecap="round" strokeLinejoin="round" d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-8l-4-4m0 0L8 8m4-4v12" />
        </svg>
      </button>
      <AnimatePresence>
        {open && (
          <motion.div initial={{ opacity: 0, y: -5 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -5 }}
            className="absolute top-full right-0 mt-2 bg-white dark:bg-gray-800 rounded-xl shadow-lg border border-gray-200 dark:border-gray-700 py-1 min-w-[160px] z-50">
            <button onClick={exportJSON} className="w-full text-left px-4 py-2 text-sm text-gray-700 dark:text-gray-200 hover:bg-gray-100 dark:hover:bg-gray-700 transition-all cursor-pointer">Export JSON</button>
            <button onClick={exportCSV} className="w-full text-left px-4 py-2 text-sm text-gray-700 dark:text-gray-200 hover:bg-gray-100 dark:hover:bg-gray-700 transition-all cursor-pointer">Export CSV</button>
            <div className="border-t border-gray-100 dark:border-gray-700 my-1" />
            <button onClick={importJSON} className="w-full text-left px-4 py-2 text-sm text-gray-700 dark:text-gray-200 hover:bg-gray-100 dark:hover:bg-gray-700 transition-all cursor-pointer">Import JSON</button>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  )
}
