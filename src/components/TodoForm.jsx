import { useState, useRef, useEffect } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { CATEGORIES, PRIORITIES, RECURRENCES, REMINDERS, categoryIcons } from '../constants'

export default function TodoForm({ onSubmit, initialData, onCancel, prefillDate }) {
  const [text, setText] = useState(initialData?.text || '')
  const [category, setCategory] = useState(initialData?.category || 'Personal')
  const [priority, setPriority] = useState(initialData?.priority || 'Medium')
  const [dueDate, setDueDate] = useState(initialData?.dueDate || prefillDate || '')
  const [notes, setNotes] = useState(initialData?.notes || '')
  const [recurrence, setRecurrence] = useState(initialData?.recurrence || 'none')
  const [reminderAt, setReminderAt] = useState(initialData?.reminderAt || 'none')
  const [tags, setTags] = useState(initialData?.tags || [])
  const [tagInput, setTagInput] = useState('')
  const [subtasks, setSubtasks] = useState(initialData?.subtasks || [])
  const [subtaskInput, setSubtaskInput] = useState('')
  const [showAdvanced, setShowAdvanced] = useState(false)
  const [showNotePreview, setShowNotePreview] = useState(false)
  const textRef = useRef(null)
  const subtaskInputRef = useRef(null)

  useEffect(() => {
    const timer = setTimeout(() => textRef.current?.focus(), 100)
    return () => clearTimeout(timer)
  }, [])

  const addTag = () => {
    const val = tagInput.trim()
    if (val && !tags.includes(val)) setTags([...tags, val])
    setTagInput('')
  }
  const removeTag = (tag) => setTags(tags.filter((t) => t !== tag))

  const addSubtask = () => {
    const val = subtaskInput.trim()
    if (val) setSubtasks([...subtasks, { id: crypto.randomUUID(), text: val, completed: false }])
    setSubtaskInput('')
    subtaskInputRef.current?.focus()
  }
  const removeSubtask = (id) => setSubtasks(subtasks.filter((s) => s.id !== id))

  const handleSubmit = (e) => {
    e.preventDefault()
    if (!text.trim()) return
    onSubmit({
      text: text.trim(),
      category,
      priority,
      dueDate: dueDate || null,
      notes: notes.trim(),
      tags,
      subtasks,
      recurrence,
      reminderAt,
    })
    if (!initialData) {
      setText('')
      setCategory('Personal')
      setPriority('Medium')
      setDueDate('')
      setNotes('')
      setTags([])
      setSubtasks([])
      setRecurrence('none')
      setReminderAt('none')
      setShowAdvanced(false)
    }
  }

  return (
    <motion.form
      layout
      initial={{ opacity: 0, y: -10, scale: 0.98 }}
      animate={{ opacity: 1, y: 0, scale: 1 }}
      exit={{ opacity: 0, y: -10, scale: 0.98 }}
      transition={{ type: 'spring', stiffness: 400, damping: 30 }}
      onSubmit={handleSubmit}
      className="bg-white/80 dark:bg-gray-800/80 backdrop-blur-sm rounded-2xl shadow-lg shadow-gray-200/50 dark:shadow-gray-900/50 border border-gray-100 dark:border-gray-700 p-6 space-y-4"
    >
      <div>
        <label htmlFor="todo-text" className="sr-only">Todo text</label>
        <input
          ref={textRef} id="todo-text" type="text" value={text} onChange={(e) => setText(e.target.value)}
          placeholder="What needs to be done?"
          className="w-full px-4 py-3 text-gray-800 dark:text-gray-100 bg-gray-50 dark:bg-gray-700/50 border border-gray-200 dark:border-gray-600 rounded-xl focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent transition-all placeholder:text-gray-400 dark:placeholder:text-gray-500" />
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
        <div>
          <label htmlFor="todo-category" className="block text-xs font-medium text-gray-500 dark:text-gray-400 mb-1.5 uppercase tracking-wide">Category</label>
          <select id="todo-category" value={category} onChange={(e) => setCategory(e.target.value)}
            className="w-full px-3 py-2.5 text-sm text-gray-700 dark:text-gray-200 bg-gray-50 dark:bg-gray-700/50 border border-gray-200 dark:border-gray-600 rounded-xl focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent transition-all">
            <option value="">None</option>
            {CATEGORIES.map((c) => <option key={c} value={c}>{categoryIcons[c]} {c}</option>)}
          </select>
        </div>
        <div>
          <label htmlFor="todo-priority" className="block text-xs font-medium text-gray-500 dark:text-gray-400 mb-1.5 uppercase tracking-wide">Priority</label>
          <select id="todo-priority" value={priority} onChange={(e) => setPriority(e.target.value)}
            className="w-full px-3 py-2.5 text-sm text-gray-700 dark:text-gray-200 bg-gray-50 dark:bg-gray-700/50 border border-gray-200 dark:border-gray-600 rounded-xl focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent transition-all">
            {PRIORITIES.map((p) => <option key={p} value={p}>{p}</option>)}
          </select>
        </div>
        <div>
          <label htmlFor="todo-due" className="block text-xs font-medium text-gray-500 dark:text-gray-400 mb-1.5 uppercase tracking-wide">Due Date</label>
          <input id="todo-due" type="date" value={dueDate} onChange={(e) => setDueDate(e.target.value)}
            className="w-full px-3 py-2.5 text-sm text-gray-700 dark:text-gray-200 bg-gray-50 dark:bg-gray-700/50 border border-gray-200 dark:border-gray-600 rounded-xl focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent transition-all" />
        </div>
      </div>

      <div>
        <label className="block text-xs font-medium text-gray-500 dark:text-gray-400 mb-1.5 uppercase tracking-wide">Tags</label>
        <div className="flex flex-wrap gap-1.5 mb-2">
          <AnimatePresence>
            {tags.map((tag) => (
              <motion.span key={tag} initial={{ opacity: 0, scale: 0.8 }} animate={{ opacity: 1, scale: 1 }} exit={{ opacity: 0, scale: 0.8 }}
                className="inline-flex items-center gap-1 px-2.5 py-1 text-xs font-medium bg-indigo-100 dark:bg-indigo-900/40 text-indigo-700 dark:text-indigo-300 rounded-full">
                #{tag}
                <button type="button" onClick={() => removeTag(tag)} className="hover:text-indigo-900 dark:hover:text-indigo-100 cursor-pointer" aria-label={`Remove tag ${tag}`}>×</button>
              </motion.span>
            ))}
          </AnimatePresence>
        </div>
        <div className="flex gap-2">
          <label htmlFor="todo-tag" className="sr-only">Add tag</label>
          <input id="todo-tag" type="text" value={tagInput} onChange={(e) => setTagInput(e.target.value)}
            onKeyDown={(e) => { if (e.key === 'Enter') { e.preventDefault(); addTag() } }}
            placeholder="Add tag..."
            className="flex-1 px-3 py-2 text-sm text-gray-700 dark:text-gray-200 bg-gray-50 dark:bg-gray-700/50 border border-gray-200 dark:border-gray-600 rounded-xl focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent transition-all placeholder:text-gray-400 dark:placeholder:text-gray-500" />
          <button type="button" onClick={addTag} className="px-3 py-2 text-sm font-medium text-indigo-600 dark:text-indigo-400 hover:bg-indigo-50 dark:hover:bg-indigo-900/30 rounded-xl transition-all cursor-pointer">Add</button>
        </div>
      </div>

      <div>
        <label className="block text-xs font-medium text-gray-500 dark:text-gray-400 mb-1.5 uppercase tracking-wide">Subtasks</label>
        <div className="space-y-1.5 mb-2">
          <AnimatePresence>
            {subtasks.map((st) => (
              <motion.div key={st.id} initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: 'auto' }} exit={{ opacity: 0, height: 0 }}
                className="flex items-center gap-2 text-sm">
                <span className="w-4 h-4 rounded border border-gray-300 dark:border-gray-600 flex-shrink-0" />
                <span className="flex-1 text-gray-700 dark:text-gray-200">{st.text}</span>
                <button type="button" onClick={() => removeSubtask(st.id)} className="text-gray-400 hover:text-red-500 cursor-pointer" aria-label={`Remove subtask ${st.text}`}>×</button>
              </motion.div>
            ))}
          </AnimatePresence>
        </div>
        <div className="flex gap-2">
          <label htmlFor="todo-subtask" className="sr-only">Add subtask</label>
          <input id="todo-subtask" ref={subtaskInputRef} type="text" value={subtaskInput} onChange={(e) => setSubtaskInput(e.target.value)}
            onKeyDown={(e) => { if (e.key === 'Enter') { e.preventDefault(); addSubtask() } }}
            placeholder="Add subtask..."
            className="flex-1 px-3 py-2 text-sm text-gray-700 dark:text-gray-200 bg-gray-50 dark:bg-gray-700/50 border border-gray-200 dark:border-gray-600 rounded-xl focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent transition-all placeholder:text-gray-400 dark:placeholder:text-gray-500" />
          <button type="button" onClick={addSubtask} className="px-3 py-2 text-sm font-medium text-indigo-600 dark:text-indigo-400 hover:bg-indigo-50 dark:hover:bg-indigo-900/30 rounded-xl transition-all cursor-pointer">Add</button>
        </div>
      </div>

      <button type="button" onClick={() => setShowAdvanced(!showAdvanced)}
        className="text-xs font-medium text-gray-400 hover:text-gray-600 dark:hover:text-gray-300 transition-all cursor-pointer">
        {showAdvanced ? '▾ Hide advanced' : '▸ Show advanced (notes, recurrence, reminder)'}
      </button>

      <AnimatePresence>
        {showAdvanced && (
          <motion.div initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: 'auto' }} exit={{ opacity: 0, height: 0 }} className="space-y-4 overflow-hidden">
            <div>
              <div className="flex items-center justify-between mb-1.5">
                <label htmlFor="todo-notes" className="text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wide">Notes</label>
                <button type="button" onClick={() => setShowNotePreview(!showNotePreview)}
                  className="text-xs text-indigo-500 hover:text-indigo-600 cursor-pointer">
                  {showNotePreview ? 'Edit' : 'Preview'}
                </button>
              </div>
              {showNotePreview ? (
                <div className="w-full px-4 py-3 text-sm text-gray-700 dark:text-gray-200 bg-gray-50 dark:bg-gray-700/50 border border-gray-200 dark:border-gray-600 rounded-xl min-h-[80px] prose prose-sm dark:prose-invert max-w-none">
                  {notes || <span className="text-gray-400 italic">Nothing to preview</span>}
                </div>
              ) : (
                <textarea id="todo-notes" value={notes} onChange={(e) => setNotes(e.target.value)} placeholder="Supports **markdown**..." rows={3}
                  className="w-full px-4 py-3 text-sm text-gray-700 dark:text-gray-200 bg-gray-50 dark:bg-gray-700/50 border border-gray-200 dark:border-gray-600 rounded-xl focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent transition-all resize-none placeholder:text-gray-400 dark:placeholder:text-gray-500 font-mono" />
              )}
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div>
                <label htmlFor="todo-recurrence" className="block text-xs font-medium text-gray-500 dark:text-gray-400 mb-1.5 uppercase tracking-wide">Repeat</label>
                <select id="todo-recurrence" value={recurrence} onChange={(e) => setRecurrence(e.target.value)}
                  className="w-full px-3 py-2.5 text-sm text-gray-700 dark:text-gray-200 bg-gray-50 dark:bg-gray-700/50 border border-gray-200 dark:border-gray-600 rounded-xl focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent transition-all">
                  {RECURRENCES.map((r) => <option key={r.value} value={r.value}>{r.label}</option>)}
                </select>
              </div>
              <div>
                <label htmlFor="todo-reminder" className="block text-xs font-medium text-gray-500 dark:text-gray-400 mb-1.5 uppercase tracking-wide">Reminder</label>
                <select id="todo-reminder" value={reminderAt} onChange={(e) => setReminderAt(e.target.value)}
                  className="w-full px-3 py-2.5 text-sm text-gray-700 dark:text-gray-200 bg-gray-50 dark:bg-gray-700/50 border border-gray-200 dark:border-gray-600 rounded-xl focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent transition-all">
                  {REMINDERS.map((r) => <option key={r.value} value={r.value}>{r.label}</option>)}
                </select>
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      <div className="flex gap-3">
        <motion.button type="submit" whileHover={{ scale: 1.01 }} whileTap={{ scale: 0.98 }}
          className="flex-1 py-3 px-4 bg-indigo-600 hover:bg-indigo-700 active:bg-indigo-800 text-white font-semibold rounded-xl transition-all shadow-md shadow-indigo-200 dark:shadow-indigo-900/50 hover:shadow-lg hover:shadow-indigo-300 dark:hover:shadow-indigo-800/50 cursor-pointer">
          {initialData ? 'Update Todo' : 'Add Todo'}
        </motion.button>
        {onCancel && (
          <motion.button type="button" onClick={onCancel} whileHover={{ scale: 1.01 }} whileTap={{ scale: 0.98 }}
            className="px-4 py-3 bg-gray-100 dark:bg-gray-700 hover:bg-gray-200 dark:hover:bg-gray-600 text-gray-600 dark:text-gray-300 font-medium rounded-xl transition-all cursor-pointer">
            Cancel
          </motion.button>
        )}
      </div>
    </motion.form>
  )
}
