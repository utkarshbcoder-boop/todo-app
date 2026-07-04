import { motion } from 'framer-motion'

const SHORTCUTS = [
  { keys: '/', desc: 'Focus search' },
  { keys: 'n', desc: 'New todo' },
  { keys: 'q', desc: 'Quick add' },
  { keys: 'x', desc: 'Toggle select all' },
  { keys: 'd', desc: 'Dashboard' },
  { keys: '1-6', desc: 'Filter by category' },
  { keys: 'Ctrl+Z', desc: 'Undo' },
  { keys: 'Ctrl+Y', desc: 'Redo' },
  { keys: '?', desc: 'Toggle shortcuts' },
  { keys: 'Esc', desc: 'Close form / panel' },
]

export default function ShortcutsPanel({ onClose }) {
  return (
    <motion.div initial={{ opacity: 0, y: -10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -10 }}
      className="fixed top-16 right-5 z-50 bg-white/95 dark:bg-gray-800/95 backdrop-blur-md rounded-2xl shadow-2xl border border-gray-200 dark:border-gray-700 p-5 w-72">
      <div className="flex items-center justify-between mb-3">
        <h3 className="text-sm font-semibold text-gray-800 dark:text-white">Keyboard Shortcuts</h3>
        <button onClick={onClose} className="text-gray-400 hover:text-gray-600 dark:hover:text-gray-300 cursor-pointer" aria-label="Close shortcuts panel">
          <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" /></svg>
        </button>
      </div>
      <div className="space-y-2">
        {SHORTCUTS.map((s) => (
          <div key={s.keys} className="flex items-center justify-between text-sm">
            <span className="text-gray-600 dark:text-gray-300">{s.desc}</span>
            <kbd className="px-2 py-0.5 text-xs font-mono bg-gray-100 dark:bg-gray-700 text-gray-500 dark:text-gray-400 rounded border border-gray-200 dark:border-gray-600">{s.keys}</kbd>
          </div>
        ))}
      </div>
    </motion.div>
  )
}
