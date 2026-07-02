import { useState, useRef, useEffect, useMemo } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { CATEGORIES, PRIORITIES, RECURRENCES, REMINDERS, categoryIcons } from '../constants'
import { useTodoStore } from '../store/todoStore'
import { toast } from 'sonner'
import { useI18n } from '../i18n/useI18n'
import { useFeatureFlag } from '../hooks/useFeatureFlag'

function parseNaturalDate(input) {
  if (!input) return ''
  const str = input.trim().toLowerCase()
  const now = new Date()

  if (str === 'today' || str === 'hoy') return now.toISOString().split('T')[0]
  if (str === 'tomorrow' || str === 'mañana') {
    const d = new Date(now); d.setDate(d.getDate() + 1); return d.toISOString().split('T')[0]
  }
  if (str === 'next week' || str === 'próxima semana') {
    const d = new Date(now); d.setDate(d.getDate() + 7); return d.toISOString().split('T')[0]
  }
  if (str === 'next month' || str === 'próximo mes') {
    const d = new Date(now); d.setMonth(d.getMonth() + 1); return d.toISOString().split('T')[0]
  }

  const inMatch = str.match(/^in\s+(\d+)\s+(day|days|week|weeks|month|months)$/i)
  if (inMatch) {
    const num = parseInt(inMatch[1])
    const unit = inMatch[2].toLowerCase()
    const d = new Date(now)
    if (unit.startsWith('day')) d.setDate(d.getDate() + num)
    else if (unit.startsWith('week')) d.setDate(d.getDate() + num * 7)
    else if (unit.startsWith('month')) d.setMonth(d.getMonth() + num)
    return d.toISOString().split('T')[0]
  }

  const days = ['sunday', 'monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday']
  const daysEs = ['domingo', 'lunes', 'martes', 'miércoles', 'jueves', 'viernes', 'sábado']
  const nextMatch = str.match(/^(?:next\s+)?(\w+)$/)
  if (nextMatch) {
    let dayIdx = days.indexOf(nextMatch[1])
    if (dayIdx === -1) dayIdx = daysEs.indexOf(nextMatch[1])
    if (dayIdx !== -1) {
      const d = new Date(now)
      const diff = (dayIdx - d.getDay() + 7) % 7 || 7
      d.setDate(d.getDate() + diff)
      return d.toISOString().split('T')[0]
    }
  }

  return ''
}

export default function TodoForm({ onSubmit, initialData, onCancel, prefillDate }) {
  const { t } = useI18n()
  const [text, setText] = useState(initialData?.text || '')
  const [category, setCategory] = useState(initialData?.category || 'Personal')
  const [priority, setPriority] = useState(initialData?.priority || 'Medium')
  const [dueDate, setDueDate] = useState(initialData?.dueDate || prefillDate || '')
  const [dateInput, setDateInput] = useState('')
  const [notes, setNotes] = useState(initialData?.notes || '')
  const [recurrence, setRecurrence] = useState(initialData?.recurrence || 'none')
  const [reminderAt, setReminderAt] = useState(initialData?.reminderAt || 'none')
  const [tags, setTags] = useState(initialData?.tags || [])
  const [tagInput, setTagInput] = useState('')
  const [subtasks, setSubtasks] = useState(initialData?.subtasks || [])
  const [subtaskInput, setSubtaskInput] = useState('')
  const [attachments, setAttachments] = useState(initialData?.attachments || [])
  const [blockedBy, setBlockedBy] = useState(initialData?.blockedBy || [])
  const [showAdvanced, setShowAdvanced] = useState(false)
  const [showNotePreview, setShowNotePreview] = useState(false)
  const textRef = useRef(null)
  const subtaskInputRef = useRef(null)
  const fileInputRef = useRef(null)
  const todos = useTodoStore((s) => s.todos)

  const tagsEnabled = useFeatureFlag('tags')
  const subtasksEnabled = useFeatureFlag('subtasks')
  const notesEnabled = useFeatureFlag('notes')
  const recurrenceEnabled = useFeatureFlag('recurrence')
  const remindersEnabled = useFeatureFlag('reminders')
  const attachmentsEnabled = useFeatureFlag('attachments')
  const dependenciesEnabled = useFeatureFlag('dependencies')

  useEffect(() => {
    const timer = setTimeout(() => textRef.current?.focus(), 100)
    return () => clearTimeout(timer)
  }, [])

  const quickDateOptions = useMemo(() => {
    const today = new Date()
    const fmt = (d) => d.toISOString().split('T')[0]
    const addDays = (n) => { const d = new Date(today); d.setDate(d.getDate() + n); return d }
    return [
      { label: 'Today', date: fmt(today) },
      { label: 'Tomorrow', date: fmt(addDays(1)) },
      { label: 'Next week', date: fmt(addDays(7)) },
      { label: 'Next month', date: fmt(addDays(30)) },
    ]
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

  const handleDateInput = (val) => {
    setDateInput(val)
    const parsed = parseNaturalDate(val)
    if (parsed) setDueDate(parsed)
  }

  const MAX_FILE_SIZE = 5 * 1024 * 1024

  const handleFileAttach = (e) => {
    const files = Array.from(e.target.files || [])
    files.forEach((file) => {
      if (file.size > MAX_FILE_SIZE) {
        toast.error(`${file.name} exceeds 5MB limit`)
        return
      }
      const reader = new FileReader()
      reader.onload = () => {
        setAttachments((prev) => [...prev, { id: crypto.randomUUID(), name: file.name, size: file.size, type: file.type, dataUrl: reader.result }])
      }
      reader.readAsDataURL(file)
    })
    if (fileInputRef.current) fileInputRef.current.value = ''
  }

  const removeAttachment = (id) => setAttachments(attachments.filter((a) => a.id !== id))

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
      attachments,
      blockedBy,
    })
    if (!initialData) {
      setText('')
      setCategory('Personal')
      setPriority('Medium')
      setDueDate('')
      setNotes('')
      setTags([])
      setSubtasks([])
      setAttachments([])
      setBlockedBy([])
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
      className="glass-elevated rounded-2xl p-6 space-y-4"
    >
      <div>
        <label htmlFor="todo-text" className="sr-only">Todo text</label>
        <input
          ref={textRef} id="todo-text" type="text" value={text} onChange={(e) => setText(e.target.value)}
          placeholder="What needs to be done?"
          className="glass-input w-full px-4 py-3 text-gray-800 dark:text-gray-100 rounded-xl focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent placeholder:text-gray-400 dark:placeholder:text-gray-500" />
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
        <div>
          <label htmlFor="todo-category" className="block text-xs font-medium text-gray-500 dark:text-gray-400 mb-1.5 uppercase tracking-wide">Category</label>
          <select id="todo-category" value={category} onChange={(e) => setCategory(e.target.value)}
            className="glass-select w-full px-3 py-2.5 text-sm text-gray-700 dark:text-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent">
            <option value="">None</option>
            {CATEGORIES.map((c) => <option key={c} value={c}>{categoryIcons[c]} {c}</option>)}
          </select>
        </div>
        <div>
          <label htmlFor="todo-priority" className="block text-xs font-medium text-gray-500 dark:text-gray-400 mb-1.5 uppercase tracking-wide">Priority</label>
          <select id="todo-priority" value={priority} onChange={(e) => setPriority(e.target.value)}
            className="glass-select w-full px-3 py-2.5 text-sm text-gray-700 dark:text-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent">
            {PRIORITIES.map((p) => <option key={p} value={p}>{p}</option>)}
          </select>
        </div>
        <div>
          <label htmlFor="todo-due" className="block text-xs font-medium text-gray-500 dark:text-gray-400 mb-1.5 uppercase tracking-wide">{t('dueDate')}</label>
          <div className="space-y-1">
            <input id="todo-due-natural" type="text" value={dateInput} onChange={(e) => handleDateInput(e.target.value)}
              placeholder="e.g. tomorrow, next friday, in 3 days"
              className="glass-input w-full px-3 py-2.5 text-sm text-gray-700 dark:text-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent placeholder:text-gray-400 dark:placeholder:text-gray-500" />
            <input id="todo-due" type="date" value={dueDate} onChange={(e) => { setDueDate(e.target.value); setDateInput('') }}
              className="glass-input w-full px-3 py-2.5 text-sm text-gray-700 dark:text-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent" />
            <div className="flex gap-1 flex-wrap">
              {quickDateOptions.map((q) => (
                <button key={q.label} type="button" onClick={() => { setDueDate(q.date); setDateInput('') }}
                  className={`px-2 py-1 text-[10px] font-medium rounded-md transition-all cursor-pointer ${
                    dueDate === q.date
                      ? 'bg-indigo-100 dark:bg-indigo-900/40 text-indigo-600 dark:text-indigo-400'
                      : 'bg-gray-100 dark:bg-gray-700 text-gray-500 dark:text-gray-400 hover:bg-gray-200 dark:hover:bg-gray-600'
                  }`}>
                  {q.label}
                </button>
              ))}
            </div>
          </div>
        </div>
      </div>

      {tagsEnabled && (
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
            className="glass-input flex-1 px-3 py-2 text-sm text-gray-700 dark:text-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent placeholder:text-gray-400 dark:placeholder:text-gray-500" />
          <button type="button" onClick={addTag} className="btn-3d px-3 py-2 text-sm font-medium text-indigo-600 dark:text-indigo-400 hover:bg-indigo-50 dark:hover:bg-indigo-900/30 rounded-xl cursor-pointer">Add</button>
        </div>
      </div>
      )}

      {subtasksEnabled && (
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
            className="glass-input flex-1 px-3 py-2 text-sm text-gray-700 dark:text-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent placeholder:text-gray-400 dark:placeholder:text-gray-500" />
          <button type="button" onClick={addSubtask} className="btn-3d px-3 py-2 text-sm font-medium text-indigo-600 dark:text-indigo-400 hover:bg-indigo-50 dark:hover:bg-indigo-900/30 rounded-xl cursor-pointer">Add</button>
        </div>
      </div>
      )}

      <button type="button" onClick={() => setShowAdvanced(!showAdvanced)}
        className="text-xs font-medium text-gray-400 hover:text-gray-600 dark:hover:text-gray-300 transition-all cursor-pointer">
        {showAdvanced ? '▾ Hide advanced' : '▸ Show advanced (notes, recurrence, reminder)'}
      </button>

      <AnimatePresence>
        {showAdvanced && (
          <motion.div initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: 'auto' }} exit={{ opacity: 0, height: 0 }} className="space-y-4 overflow-hidden">
            {attachmentsEnabled && (
            <div>
              <label className="block text-xs font-medium text-gray-500 dark:text-gray-400 mb-1.5 uppercase tracking-wide">{t('attachments')}</label>
              <div className="space-y-1.5 mb-2">
                <AnimatePresence>
                  {attachments.map((att) => (
                    <motion.div key={att.id} initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: 'auto' }} exit={{ opacity: 0, height: 0 }}
                      className="flex items-center gap-2 text-sm">
                      <span className="text-gray-500">📎</span>
                      <span className="flex-1 text-gray-700 dark:text-gray-200 truncate">{att.name}</span>
                      <span className="text-xs text-gray-400">{(att.size / 1024).toFixed(1)}KB</span>
                      <button type="button" onClick={() => removeAttachment(att.id)} className="text-gray-400 hover:text-red-500 cursor-pointer" aria-label={`Remove ${att.name}`}>×</button>
                    </motion.div>
                  ))}
                </AnimatePresence>
              </div>
              <input ref={fileInputRef} type="file" multiple onChange={handleFileAttach} className="hidden" id="file-attach" />
              <button type="button" onClick={() => fileInputRef.current?.click()}
                className="px-3 py-2 text-sm font-medium text-indigo-600 dark:text-indigo-400 hover:bg-indigo-50 dark:hover:bg-indigo-900/30 rounded-xl transition-all cursor-pointer border border-dashed border-indigo-300 dark:border-indigo-700 w-full">
                {t('addAttachment')}
              </button>
            </div>
            )}

            {dependenciesEnabled && (
            <div>
              <label className="block text-xs font-medium text-gray-500 dark:text-gray-400 mb-1.5 uppercase tracking-wide">{t('blockedBy')}</label>
              <div className="space-y-1.5 mb-2">
                <AnimatePresence>
                  {blockedBy.map((blockerId) => {
                    const blocker = todos.find((t) => t.id === blockerId)
                    return (
                      <motion.div key={blockerId} initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: 'auto' }} exit={{ opacity: 0, height: 0 }}
                        className="flex items-center gap-2 text-sm">
                        <span className="text-red-400">🔗</span>
                        <span className="flex-1 text-gray-700 dark:text-gray-200 truncate">{blocker?.text || 'Unknown task'}</span>
                        <button type="button" onClick={() => setBlockedBy(blockedBy.filter((b) => b !== blockerId))} className="text-gray-400 hover:text-red-500 cursor-pointer" aria-label="Remove blocker">×</button>
                      </motion.div>
                    )
                  })}
                </AnimatePresence>
              </div>
              <select value="" onChange={(e) => { if (e.target.value && !blockedBy.includes(e.target.value)) setBlockedBy([...blockedBy, e.target.value]); e.target.value = '' }}
                className="w-full px-3 py-2.5 text-sm text-gray-700 dark:text-gray-200 bg-gray-50 dark:bg-gray-700/50 border border-gray-200 dark:border-gray-600 rounded-xl focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent transition-all">
                <option value="">{t('selectBlocker')}</option>
                {todos.filter((t) => t.id !== initialData?.id && !blockedBy.includes(t.id)).map((t) => (
                  <option key={t.id} value={t.id}>{t.text.slice(0, 50)}</option>
                ))}
              </select>
            </div>
            )}

            {notesEnabled && (
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
            )}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              {recurrenceEnabled && (
              <div>
                <label htmlFor="todo-recurrence" className="block text-xs font-medium text-gray-500 dark:text-gray-400 mb-1.5 uppercase tracking-wide">Repeat</label>
                <select id="todo-recurrence" value={recurrence} onChange={(e) => setRecurrence(e.target.value)}
                  className="w-full px-3 py-2.5 text-sm text-gray-700 dark:text-gray-200 bg-gray-50 dark:bg-gray-700/50 border border-gray-200 dark:border-gray-600 rounded-xl focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent transition-all">
                  {RECURRENCES.map((r) => <option key={r.value} value={r.value}>{r.label}</option>)}
                </select>
              </div>
              )}
              {remindersEnabled && (
              <div>
                <label htmlFor="todo-reminder" className="block text-xs font-medium text-gray-500 dark:text-gray-400 mb-1.5 uppercase tracking-wide">Reminder</label>
                <select id="todo-reminder" value={reminderAt} onChange={(e) => setReminderAt(e.target.value)}
                  className="w-full px-3 py-2.5 text-sm text-gray-700 dark:text-gray-200 bg-gray-50 dark:bg-gray-700/50 border border-gray-200 dark:border-gray-600 rounded-xl focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent transition-all">
                  {REMINDERS.map((r) => <option key={r.value} value={r.value}>{r.label}</option>)}
                </select>
              </div>
              )}
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      <div className="flex gap-3">
        <motion.button type="submit" whileHover={{ scale: 1.01 }} whileTap={{ scale: 0.98 }}
          className="btn-3d-primary flex-1 py-3 px-4 text-white font-semibold rounded-xl cursor-pointer">
          {initialData ? 'Update Todo' : 'Add Todo'}
        </motion.button>
        {onCancel && (
          <motion.button type="button" onClick={onCancel} whileHover={{ scale: 1.01 }} whileTap={{ scale: 0.98 }}
            className="btn-3d px-4 py-3 text-gray-600 dark:text-gray-300 font-medium rounded-xl cursor-pointer">
            Cancel
          </motion.button>
        )}
      </div>
    </motion.form>
  )
}
