import { useState, useRef, memo, useCallback } from 'react'
import { motion } from 'framer-motion'
import { format } from 'date-fns/format'
import { isPast } from 'date-fns/isPast'
import { isToday } from 'date-fns/isToday'
import { parseISO } from 'date-fns/parseISO'
import Markdown from 'react-markdown'
import confetti from 'canvas-confetti'
import { useTodoStore } from '../store/todoStore'
import { categoryIcons, priorityColors } from '../constants'
import { useI18n } from '../i18n/useI18n'
import { useFeatureFlag } from '../hooks/useFeatureFlag'
import TodoForm from './TodoForm'

export default memo(function TodoItem({ todo, onToggle, onDelete, onUpdate }) {
  const { t } = useI18n()
  const [editing, setEditing] = useState(false)
  const [expanded, setExpanded] = useState(false)
  const [subtaskInput, setSubtaskInput] = useState('')
  const [swipeX, setSwipeX] = useState(0)
  const [isDragging, setIsDragging] = useState(false)
  const touchStartX = useRef(0)
  const touchStartY = useRef(0)

  const { addSubtask, toggleSubtask, deleteSubtask, selectTodo, selectedIds, snoozeTodo } = useTodoStore()
  const isSelected = selectedIds.includes(todo.id)

  const tagsEnabled = useFeatureFlag('tags')
  const subtasksEnabled = useFeatureFlag('subtasks')
  const notesEnabled = useFeatureFlag('notes')
  const recurrenceEnabled = useFeatureFlag('recurrence')
  const attachmentsEnabled = useFeatureFlag('attachments')
  const dependenciesEnabled = useFeatureFlag('dependencies')

  const dueDateObj = todo.dueDate ? parseISO(todo.dueDate) : null
  const isOverdue = dueDateObj && isPast(dueDateObj) && !isToday(dueDateObj) && !todo.completed
  const isDueToday = dueDateObj && isToday(dueDateObj) && !todo.completed

  const completedSubtasks = todo.subtasks?.filter((s) => s.completed).length || 0
  const totalSubtasks = todo.subtasks?.length || 0

  const isTouchDevice = typeof window !== 'undefined' && ('ontouchstart' in window || navigator.maxTouchPoints > 0)

  const handleToggle = useCallback(() => {
    onToggle(todo.id)
    if (!todo.completed) {
      const prefersReducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches
      if (!prefersReducedMotion) {
        confetti({ particleCount: 30, spread: 50, origin: { y: 0.7 }, colors: ['#6366f1', '#a855f7', '#ec4899'] })
      }
    }
  }, [todo.id, todo.completed, onToggle])

  const handleTouchStart = (e) => {
    if (editing) return
    touchStartX.current = e.touches[0].clientX
    touchStartY.current = e.touches[0].clientY
    setIsDragging(false)
  }
  const handleTouchMove = (e) => {
    if (editing) return
    const dx = e.touches[0].clientX - touchStartX.current
    const dy = e.touches[0].clientY - touchStartY.current
    if (Math.abs(dy) > Math.abs(dx)) return
    setIsDragging(true)
    setSwipeX(dx)
  }
  const handleTouchEnd = () => {
    if (Math.abs(swipeX) > 100) {
      if (swipeX > 0) handleToggle()
      else onDelete(todo.id)
    }
    setSwipeX(0)
    setTimeout(() => setIsDragging(false), 50)
  }

  const handleAddSubtask = () => {
    if (subtaskInput.trim()) {
      addSubtask(todo.id, subtaskInput.trim())
      setSubtaskInput('')
    }
  }

  if (editing) {
    return (
      <TodoForm
        initialData={todo}
        onSubmit={(data) => { onUpdate(todo.id, data); setEditing(false) }}
        onCancel={() => setEditing(false)}
      />
    )
  }

  return (
    <motion.div
      layout
      initial={{ opacity: 0, y: 20, scale: 0.95 }}
      animate={{
        opacity: 1, y: 0, scale: 1,
        x: isDragging ? swipeX : 0,
        backgroundColor: swipeX > 50 ? 'rgba(34, 197, 94, 0.1)' : swipeX < -50 ? 'rgba(239, 68, 68, 0.1)' : undefined,
      }}
      exit={{ opacity: 0, x: swipeX > 0 ? 200 : -200, scale: 0.9 }}
      transition={{
        layout: { type: 'spring', stiffness: 500, damping: 35 },
        opacity: { duration: 0.2 },
        default: { type: 'spring', stiffness: 400, damping: 30 },
      }}
      onTouchStart={handleTouchStart}
      onTouchMove={handleTouchMove}
      onTouchEnd={handleTouchEnd}
      className={`group todo-glass rounded-2xl p-4 ${
        isSelected ? 'border-indigo-400 dark:border-indigo-500 ring-2 ring-indigo-200 dark:ring-indigo-800' : ''
      } ${todo.completed ? 'opacity-60' : ''}`}
    >
      <div className="flex items-start gap-3">
        {/* Drag handle */}
        <div className="mt-1 flex-shrink-0 cursor-grab active:cursor-grabbing text-gray-300 dark:text-gray-600 hover:text-gray-400 dark:hover:text-gray-500" title="Drag to reorder">
          <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 24 24">
            <circle cx="8" cy="6" r="1.5" /><circle cx="16" cy="6" r="1.5" />
            <circle cx="8" cy="12" r="1.5" /><circle cx="16" cy="12" r="1.5" />
            <circle cx="8" cy="18" r="1.5" /><circle cx="16" cy="18" r="1.5" />
          </svg>
        </div>

        {/* Select checkbox */}
        <button onClick={() => selectTodo(todo.id)} role="checkbox" aria-checked={isSelected} aria-label={`Select todo: ${todo.text}`}
          className={`mt-0.5 flex-shrink-0 w-5 h-5 rounded border-2 flex items-center justify-center transition-all cursor-pointer ${
            isSelected ? 'bg-indigo-600 border-indigo-600' : 'border-gray-300 dark:border-gray-600 hover:border-indigo-400'
          }`}>
          {isSelected && <svg className="w-3 h-3 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={3}><path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" /></svg>}
        </button>

        {/* Complete toggle */}
        <button onClick={handleToggle} role="checkbox" aria-checked={todo.completed} aria-label={`Mark "${todo.text}" as ${todo.completed ? 'incomplete' : 'complete'}`}
          className={`mt-0.5 flex-shrink-0 w-6 h-6 rounded-full border-2 flex items-center justify-center transition-all cursor-pointer ${
            todo.completed ? 'bg-indigo-600 border-indigo-600' : 'border-gray-300 dark:border-gray-600 hover:border-indigo-500'
          }`}>
          {todo.completed && (
            <motion.svg initial={{ scale: 0 }} animate={{ scale: 1 }} className="w-3.5 h-3.5 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={3}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
            </motion.svg>
          )}
        </button>

        {/* Content */}
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 mb-1">
            <span className="text-base" aria-hidden="true">{categoryIcons[todo.category]}</span>
            <p className={`text-gray-800 dark:text-gray-100 font-medium leading-snug ${todo.completed ? 'line-through text-gray-400 dark:text-gray-500' : ''}`}>
              {todo.text}
            </p>
            {recurrenceEnabled && todo.recurrence !== 'none' && <span className="text-xs text-gray-400 dark:text-gray-500" title={`Repeats ${todo.recurrence}`}>🔁</span>}
          </div>

          {tagsEnabled && todo.tags?.length > 0 && (
            <div className="flex flex-wrap gap-1 mt-1.5">
              {todo.tags.map((tag) => (
                <span key={tag} className="text-xs px-2 py-0.5 bg-indigo-50 dark:bg-indigo-900/30 text-indigo-600 dark:text-indigo-400 rounded-full">#{tag}</span>
              ))}
            </div>
          )}

          <div className="flex items-center gap-2 mt-2 flex-wrap">
            <span className={`text-xs font-medium px-2.5 py-0.5 rounded-full border ${priorityColors[todo.priority]}`}>
              {todo.priority}
            </span>
            <span className="text-xs font-medium px-2.5 py-0.5 rounded-full bg-gray-100 dark:bg-gray-700 text-gray-600 dark:text-gray-400 border border-gray-200 dark:border-gray-600">
              {todo.category}
            </span>
            {subtasksEnabled && totalSubtasks > 0 && (
              <span className={`text-xs font-medium px-2.5 py-0.5 rounded-full border ${
                completedSubtasks === totalSubtasks
                  ? 'bg-emerald-50 dark:bg-emerald-900/20 text-emerald-600 dark:text-emerald-400 border-emerald-200 dark:border-emerald-800'
                  : 'bg-blue-50 dark:bg-blue-900/20 text-blue-600 dark:text-blue-400 border-blue-200 dark:border-blue-800'
              }`}>{completedSubtasks}/{totalSubtasks}</span>
            )}
            {dueDateObj && (
              <span className={`text-xs font-medium px-2.5 py-0.5 rounded-full border ${
                isOverdue ? 'bg-red-50 dark:bg-red-900/20 text-red-600 dark:text-red-400 border-red-200 dark:border-red-800' :
                isDueToday ? 'bg-amber-50 dark:bg-amber-900/20 text-amber-600 dark:text-amber-400 border-amber-200 dark:border-amber-800' :
                'bg-blue-50 dark:bg-blue-900/20 text-blue-600 dark:text-blue-400 border-blue-200 dark:border-blue-800'
              }`}>
                {isOverdue ? 'Overdue' : isDueToday ? 'Due today' : format(dueDateObj, 'MMM d, yyyy')}
              </span>
            )}
            {attachmentsEnabled && todo.attachments?.length > 0 && (
              <span className="text-xs font-medium px-2.5 py-0.5 rounded-full border bg-orange-50 dark:bg-orange-900/20 text-orange-600 dark:text-orange-400 border-orange-200 dark:border-orange-800">
                📎 {todo.attachments.length}
              </span>
            )}
            {dependenciesEnabled && todo.blockedBy?.length > 0 && (
              <span className="text-xs font-medium px-2.5 py-0.5 rounded-full border bg-red-50 dark:bg-red-900/20 text-red-600 dark:text-red-400 border-red-200 dark:border-red-800">
                🔗 {t('blockedBy')}
              </span>
            )}
          </div>

          {(notesEnabled && todo.notes || subtasksEnabled && totalSubtasks > 0 || attachmentsEnabled && todo.attachments?.length > 0) && (
            <button onClick={() => setExpanded(!expanded)}
              className="mt-2 text-xs font-medium text-gray-400 hover:text-gray-600 dark:hover:text-gray-300 transition-all cursor-pointer">
              {expanded ? '▾ Hide details' : `▸ ${notesEnabled && todo.notes ? 'Notes' : ''}${notesEnabled && todo.notes && subtasksEnabled && totalSubtasks > 0 ? ' · ' : ''}${subtasksEnabled && totalSubtasks > 0 ? `${totalSubtasks} subtasks` : ''}${(notesEnabled && todo.notes || subtasksEnabled && totalSubtasks > 0) && attachmentsEnabled && todo.attachments?.length > 0 ? ' · ' : ''}${attachmentsEnabled && todo.attachments?.length > 0 ? `${todo.attachments.length} files` : ''}`}
            </button>
          )}

          {expanded && (
            <motion.div initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: 'auto' }} exit={{ opacity: 0, height: 0 }} className="mt-2 space-y-2">
              {notesEnabled && todo.notes && (
                <div className="text-sm text-gray-500 dark:text-gray-400 pl-1 border-l-2 border-gray-200 dark:border-gray-600 ml-1 prose prose-sm dark:prose-invert max-w-none break-words">
                  <Markdown>{todo.notes}</Markdown>
                </div>
              )}
              {subtasksEnabled && totalSubtasks > 0 && (
                <div className="space-y-1">
                  {todo.subtasks.map((st) => (
                    <div key={st.id} className="flex items-center gap-2 text-sm">
                      <button onClick={() => toggleSubtask(todo.id, st.id)} role="checkbox" aria-checked={st.completed} aria-label={`Subtask: ${st.text}`}
                        className={`flex-shrink-0 w-4 h-4 rounded border flex items-center justify-center transition-all cursor-pointer ${st.completed ? 'bg-indigo-600 border-indigo-600' : 'border-gray-300 dark:border-gray-600'}`}>
                        {st.completed && <svg className="w-2.5 h-2.5 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={3}><path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" /></svg>}
                      </button>
                      <span className={`flex-1 ${st.completed ? 'line-through text-gray-400 dark:text-gray-500' : 'text-gray-700 dark:text-gray-200'}`}>{st.text}</span>
                      <button onClick={() => deleteSubtask(todo.id, st.id)} className="text-gray-400 hover:text-red-500 opacity-0 group-hover:opacity-100 transition-opacity cursor-pointer" aria-label={`Delete subtask ${st.text}`}>×</button>
                    </div>
                  ))}
                </div>
              )}
              {subtasksEnabled && (
              <div className="flex gap-2">
                <label htmlFor={`subtask-input-${todo.id}`} className="sr-only">Add subtask</label>
                <input id={`subtask-input-${todo.id}`} type="text" value={subtaskInput} onChange={(e) => setSubtaskInput(e.target.value)}
                  onKeyDown={(e) => { if (e.key === 'Enter') { e.preventDefault(); handleAddSubtask() } }}
                  placeholder="Add subtask..."
                  className="flex-1 px-3 py-1.5 text-sm text-gray-700 dark:text-gray-200 bg-gray-50 dark:bg-gray-700/50 border border-gray-200 dark:border-gray-600 rounded-lg focus:outline-none focus:ring-1 focus:ring-indigo-500 transition-all placeholder:text-gray-400 dark:placeholder:text-gray-500" />
                <button onClick={handleAddSubtask} className="px-2 py-1 text-xs font-medium text-indigo-600 dark:text-indigo-400 hover:bg-indigo-50 dark:hover:bg-indigo-900/30 rounded-lg transition-all cursor-pointer">Add</button>
              </div>
              )}
              {attachmentsEnabled && todo.attachments?.length > 0 && (
                <div className="space-y-1">
                  {todo.attachments.map((att) => (
                    <div key={att.id} className="flex items-center gap-2 text-sm p-2 bg-gray-50 dark:bg-gray-700/30 rounded-lg">
                      <span>📎</span>
                      <a href={att.dataUrl} download={att.name} className="flex-1 text-indigo-600 dark:text-indigo-400 hover:underline truncate">{att.name}</a>
                      <span className="text-xs text-gray-400">{(att.size / 1024).toFixed(1)}KB</span>
                    </div>
                  ))}
                </div>
              )}
            </motion.div>
          )}
        </div>

        {/* Actions */}
        <div className={`flex items-center gap-1 transition-opacity ${isTouchDevice ? 'opacity-100' : 'opacity-0 group-hover:opacity-100'}`}>
          {isOverdue && (
            <button onClick={() => snoozeTodo(todo.id)}
              className="p-2 text-gray-400 hover:text-amber-600 dark:hover:text-amber-400 hover:bg-amber-50 dark:hover:bg-amber-900/30 rounded-lg transition-all cursor-pointer"
              aria-label={`Snooze "${todo.text}" to tomorrow`} title="Snooze to tomorrow">
              <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
            </button>
          )}
          <button onClick={() => setEditing(true)}
            className="p-2 text-gray-400 hover:text-indigo-600 dark:hover:text-indigo-400 hover:bg-indigo-50 dark:hover:bg-indigo-900/30 rounded-lg transition-all cursor-pointer"
            aria-label={`Edit "${todo.text}"`} title="Edit">
            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
            </svg>
          </button>
          <button onClick={() => onDelete(todo.id)}
            className="p-2 text-gray-400 hover:text-red-600 dark:hover:text-red-400 hover:bg-red-50 dark:hover:bg-red-900/30 rounded-lg transition-all cursor-pointer"
            aria-label={`Delete "${todo.text}"`} title="Delete">
            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
            </svg>
          </button>
        </div>
      </div>
    </motion.div>
  )
})
