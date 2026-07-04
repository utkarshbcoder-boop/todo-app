import { useState, useCallback, useMemo } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { DndContext, closestCenter, PointerSensor, TouchSensor, useSensor, useSensors, DragOverlay } from '@dnd-kit/core'
import { SortableContext, verticalListSortingStrategy, useSortable } from '@dnd-kit/sortable'
import { CSS } from '@dnd-kit/utilities'
import { useTodoStore } from '../store/todoStore'
import { categoryIcons, priorityColors } from '../constants'
import { format } from 'date-fns/format'
import { parseISO } from 'date-fns/parseISO'
import { isPast } from 'date-fns/isPast'
import { isToday } from 'date-fns/isToday'

const COLUMNS = [
  { id: 'todo', label: 'To Do', color: 'from-blue-500 to-blue-600', bg: 'bg-blue-50 dark:bg-blue-900/20', border: 'border-blue-200 dark:border-blue-800', emoji: '📋' },
  { id: 'inProgress', label: 'In Progress', color: 'from-amber-500 to-orange-500', bg: 'bg-amber-50 dark:bg-amber-900/20', border: 'border-amber-200 dark:border-amber-800', emoji: '🔨' },
  { id: 'done', label: 'Done', color: 'from-emerald-500 to-emerald-600', bg: 'bg-emerald-50 dark:bg-emerald-900/20', border: 'border-emerald-200 dark:border-emerald-800', emoji: '✅' },
]

function KanbanCard({ todo, columnId }) {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({
    id: todo.id,
    data: { columnId },
  })

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging ? 0.3 : 1,
  }

  const dueDateObj = todo.dueDate ? parseISO(todo.dueDate) : null
  const isOverdue = dueDateObj && isPast(dueDateObj) && !isToday(dueDateObj) && !todo.completed
  const isDueToday = dueDateObj && isToday(dueDateObj) && !todo.completed

  return (
    <div ref={setNodeRef} style={style} {...attributes} {...listeners}>
      <motion.div
        layout
        initial={{ opacity: 0, scale: 0.95 }}
        animate={{ opacity: 1, scale: 1 }}
        className="bg-white dark:bg-gray-800 rounded-xl p-3 shadow-sm border border-gray-200 dark:border-gray-700 hover:shadow-md hover:border-indigo-300 dark:hover:border-indigo-600 transition-all cursor-grab active:cursor-grabbing group"
      >
        {/* Priority indicator */}
        <div className="flex items-start gap-2 mb-2">
          <span className="text-sm">{categoryIcons[todo.category]}</span>
          <p className={`flex-1 text-sm font-medium text-gray-800 dark:text-gray-100 leading-snug ${todo.completed ? 'line-through opacity-50' : ''}`}>
            {todo.text}
          </p>
        </div>

        <div className="flex items-center gap-1.5 flex-wrap">
          <span className={`text-[10px] font-semibold px-2 py-0.5 rounded-full ${priorityColors[todo.priority]}`}>
            {todo.priority}
          </span>

          {dueDateObj && (
            <span className={`text-[10px] font-medium px-2 py-0.5 rounded-full ${
              isOverdue ? 'bg-red-100 dark:bg-red-900/30 text-red-600 dark:text-red-400' :
              isDueToday ? 'bg-amber-100 dark:bg-amber-900/30 text-amber-600 dark:text-amber-400' :
              'bg-gray-100 dark:bg-gray-700 text-gray-500 dark:text-gray-400'
            }`}>
              {isOverdue ? 'Overdue' : isDueToday ? 'Today' : format(dueDateObj, 'MMM d')}
            </span>
          )}

          {todo.tags?.length > 0 && todo.tags.slice(0, 2).map(tag => (
            <span key={tag} className="text-[10px] px-1.5 py-0.5 bg-indigo-50 dark:bg-indigo-900/30 text-indigo-500 dark:text-indigo-400 rounded-full">
              #{tag}
            </span>
          ))}

          {todo.subtasks?.length > 0 && (
            <span className="text-[10px] text-gray-400 dark:text-gray-500 ml-auto">
              {todo.subtasks.filter(s => s.completed).length}/{todo.subtasks.length}
            </span>
          )}
        </div>
      </motion.div>
    </div>
  )
}

export default function KanbanView() {
  const todos = useTodoStore((s) => s.todos)
  const toggleTodo = useTodoStore((s) => s.toggleTodo)
  const updateTodo = useTodoStore((s) => s.updateTodo)
  const [kanbanStatuses, setKanbanStatuses] = useState(() => {
    // Initialize from existing state: completed → done, others → todo
    const map = {}
    todos.forEach(t => {
      map[t.id] = t.completed ? 'done' : 'todo'
    })
    return map
  })

  // Derive column data
  const columns = useMemo(() => {
    const result = { todo: [], inProgress: [], done: [] }
    todos.forEach(t => {
      const status = kanbanStatuses[t.id] || (t.completed ? 'done' : 'todo')
      if (result[status]) result[status].push(t)
    })
    return result
  }, [todos, kanbanStatuses])

  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 5 } }),
    useSensor(TouchSensor, { activationConstraint: { delay: 200, tolerance: 5 } })
  )

  const handleDragEnd = useCallback((event) => {
    const { active, over } = event
    if (!over) return

    const activeId = active.id
    const overId = over.id

    // Determine target column
    let targetColumn = null
    if (COLUMNS.some(c => c.id === overId)) {
      targetColumn = overId
    } else {
      // Dropped on another card — find which column it's in
      for (const col of COLUMNS) {
        if (columns[col.id].some(t => t.id === overId)) {
          targetColumn = col.id
          break
        }
      }
    }

    if (!targetColumn) return

    const currentStatus = kanbanStatuses[activeId] || 'todo'
    if (currentStatus === targetColumn) return

    // Update status
    setKanbanStatuses(prev => ({ ...prev, [activeId]: targetColumn }))

    // Sync completion state
    const todo = todos.find(t => t.id === activeId)
    if (todo) {
      if (targetColumn === 'done' && !todo.completed) {
        toggleTodo(activeId)
      } else if (targetColumn !== 'done' && todo.completed) {
        toggleTodo(activeId)
      }
    }
  }, [columns, kanbanStatuses, todos, toggleTodo])

  return (
    <div className="space-y-4">
      <div className="text-center">
        <h2 className="text-lg font-bold text-gray-900 dark:text-white flex items-center justify-center gap-2">
          <span>📊</span> Kanban Board
        </h2>
        <p className="text-xs text-gray-400 dark:text-gray-500 mt-1">Drag tasks between columns</p>
      </div>

      <DndContext sensors={sensors} collisionDetection={closestCenter} onDragEnd={handleDragEnd}>
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
          {COLUMNS.map(col => (
            <div key={col.id} className={`rounded-2xl p-3 ${col.bg} border ${col.border} min-h-[200px]`}>
              {/* Column header */}
              <div className="flex items-center gap-2 mb-3 pb-2 border-b border-gray-200/50 dark:border-gray-700/50">
                <span>{col.emoji}</span>
                <h3 className="text-sm font-bold text-gray-700 dark:text-gray-200">{col.label}</h3>
                <span className="ml-auto text-xs font-medium px-2 py-0.5 rounded-full bg-white/60 dark:bg-gray-800/60 text-gray-500 dark:text-gray-400">
                  {columns[col.id].length}
                </span>
              </div>

              {/* Droppable area */}
              <SortableContext items={columns[col.id].map(t => t.id)} strategy={verticalListSortingStrategy}>
                <div className="space-y-2 min-h-[100px]">
                  {columns[col.id].length === 0 && (
                    <div className="flex items-center justify-center h-24 border-2 border-dashed border-gray-200 dark:border-gray-700 rounded-xl">
                      <p className="text-xs text-gray-400 dark:text-gray-500">Drop tasks here</p>
                    </div>
                  )}
                  {columns[col.id].map(todo => (
                    <KanbanCard key={todo.id} todo={todo} columnId={col.id} />
                  ))}
                </div>
              </SortableContext>
            </div>
          ))}
        </div>
      </DndContext>
    </div>
  )
}
