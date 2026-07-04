import { useState, useMemo, useCallback, Suspense, lazy } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { DndContext, closestCenter, PointerSensor, TouchSensor, useSensor, useSensors } from '@dnd-kit/core'
import { SortableContext, verticalListSortingStrategy, useSortable } from '@dnd-kit/sortable'
import { CSS } from '@dnd-kit/utilities'
import { useTodoStore } from '../store/todoStore'
import { VIEW_TABS, CATEGORY_FILTERS, SORT_OPTIONS, categoryIcons } from '../constants'
import { useI18n } from '../i18n/useI18n'
import { useFeatureFlag } from '../hooks/useFeatureFlag'
import TodoItem from './TodoItem'
import TrashView from './TrashView'
import RecurringView from './RecurringView'

const LazyDashboardView = lazy(() => import('./DashboardView'))
const LazyCalendarView = lazy(() => import('./CalendarView'))
const LazyKanbanView = lazy(() => import('./KanbanView'))
const LazyHabitTracker = lazy(() => import('./HabitTracker'))
const LazyActivityTimeline = lazy(() => import('./ActivityTimeline'))
const LazySharedListsView = lazy(() => import('./SharedListsView'))

function SortableTodoItem({ todo, onDeleteWithUndo }) {
  const { toggleTodo, deleteTodo, updateTodo } = useTodoStore()
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({ id: todo.id })
  const style = { transform: CSS.Transform.toString(transform), transition, opacity: isDragging ? 0.5 : 1, zIndex: isDragging ? 10 : 'auto' }

  const handleDelete = onDeleteWithUndo
    ? () => onDeleteWithUndo(todo.id, todo.text)
    : () => deleteTodo(todo.id)

  return (
    <div ref={setNodeRef} style={style} {...attributes} {...listeners}>
      <TodoItem todo={todo} onToggle={toggleTodo} onDelete={handleDelete} onUpdate={updateTodo} />
    </div>
  )
}

export default function TodoList({ onAddTodoWithDate, onDeleteWithUndo }) {
  const { t } = useI18n()
  const todos = useTodoStore((s) => s.todos)
  const viewTab = useTodoStore((s) => s.viewTab)
  const categoryFilter = useTodoStore((s) => s.categoryFilter)
  const tagFilter = useTodoStore((s) => s.tagFilter)
  const searchQuery = useTodoStore((s) => s.searchQuery)
  const sortBy = useTodoStore((s) => s.sortBy)
  const sortAsc = useTodoStore((s) => s.sortAsc)
  const selectedIds = useTodoStore((s) => s.selectedIds)
  const setViewTab = useTodoStore((s) => s.setViewTab)
  const setCategoryFilter = useTodoStore((s) => s.setCategoryFilter)
  const setTagFilter = useTodoStore((s) => s.setTagFilter)
  const setSearchQuery = useTodoStore((s) => s.setSearchQuery)
  const setSortBy = useTodoStore((s) => s.setSortBy)
  const toggleSortAsc = useTodoStore((s) => s.toggleSortAsc)
  const reorderTodos = useTodoStore((s) => s.reorderTodos)
  const selectAll = useTodoStore((s) => s.selectAll)
  const clearCompleted = useTodoStore((s) => s.clearCompleted)
  const getFilteredTodos = useTodoStore((s) => s.getFilteredTodos)
  const getStats = useTodoStore((s) => s.getStats)

  const calendarEnabled = useFeatureFlag('calendar')
  const dashboardEnabled = useFeatureFlag('dashboard')
  const trashEnabled = useFeatureFlag('trash')
  const recurringEnabled = useFeatureFlag('recurringView')
  const dragDropEnabled = useFeatureFlag('dragDrop')
  const tagFilterEnabled = useFeatureFlag('tagFilter')
  const kanbanEnabled = useFeatureFlag('kanban')
  const habitsEnabled = useFeatureFlag('habits')
  const activityEnabled = useFeatureFlag('activity')
  const sharedEnabled = useFeatureFlag('shared')

  const [showCalendar, setShowCalendar] = useState(false)
  // eslint-disable-next-line react-hooks/exhaustive-deps
  const filtered = useMemo(() => getFilteredTodos(), [viewTab, categoryFilter, tagFilter, searchQuery, sortBy, sortAsc, getFilteredTodos, todos])
  // eslint-disable-next-line react-hooks/exhaustive-deps
  const stats = useMemo(() => getStats(), [todos, getStats])

  const allTags = useMemo(() => {
    const tagSet = new Set()
    todos.forEach((t) => t.tags?.forEach((tag) => tagSet.add(tag)))
    return [...tagSet].sort()
  }, [todos])

  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 8 } }),
    useSensor(TouchSensor, { activationConstraint: { delay: 200, tolerance: 5 } })
  )
  const handleDragEnd = useCallback((event) => {
    const { active, over } = event
    if (active.id !== over?.id) reorderTodos(active.id, over.id)
  }, [reorderTodos])
  const allVisibleSelected = filtered.length > 0 && filtered.every((t) => selectedIds.includes(t.id))

  const isDashboard = viewTab === 'dashboard'

  return (
    <div className="space-y-4">
      <div className="relative">
        <label htmlFor="search-input" className="sr-only">Search todos</label>
        <svg className="absolute left-3 sm:left-4 top-1/2 -translate-y-1/2 w-4 h-4 sm:w-5 sm:h-5 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
          <path strokeLinecap="round" strokeLinejoin="round" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
        </svg>
        <input id="search-input" type="text" value={searchQuery} onChange={(e) => setSearchQuery(e.target.value)}
          placeholder={t('searchPlaceholder')}
          className="glass-input w-full pl-10 sm:pl-12 pr-4 py-2.5 sm:py-3 text-sm sm:text-base text-gray-700 dark:text-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent placeholder:text-gray-400 dark:placeholder:text-gray-500" />
      </div>

      <div className="flex flex-col items-center gap-2 sm:gap-3">
        <div className="toolbar-glass flex rounded-xl p-1 gap-0.5 tabs-scroll scrollbar-hide w-full sm:w-fit" role="tablist" aria-label="Filter by status">
          {VIEW_TABS.filter(tab => {
            if (tab.key === 'trash') return trashEnabled
            if (tab.key === 'recurring') return recurringEnabled
            if (tab.key === 'dashboard') return dashboardEnabled
            if (tab.key === 'kanban') return kanbanEnabled
            if (tab.key === 'habits') return habitsEnabled
            if (tab.key === 'activity') return activityEnabled
            if (tab.key === 'shared') return sharedEnabled
            return true
          }).map((tab) => {
            const count = tab.key === 'overdue' ? stats.overdue : tab.key === 'today' ? stats.dueToday : tab.key === 'active' ? stats.active : tab.key === 'completed' ? stats.completed : stats.total
            return (
              <button key={tab.key} onClick={() => setViewTab(tab.key)} role="tab" aria-selected={viewTab === tab.key}
                className={`tab-glass px-2.5 py-1.5 text-[10px] sm:text-xs font-medium rounded-lg cursor-pointer whitespace-nowrap flex-shrink-0 ${
                  viewTab === tab.key ? 'active text-indigo-600 dark:text-indigo-400'
                  : `text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-200 ${tab.color || ''}`
                }`}>
                {tab.label}
                {count > 0 && tab.key !== 'all' && (
                  <span className={`ml-1 text-[8px] sm:text-[10px] px-1 py-0.5 rounded-full ${viewTab === tab.key ? 'bg-indigo-100 dark:bg-indigo-900/40' : 'bg-gray-200 dark:bg-gray-600'}`}>{count}</span>
                )}
              </button>
            )
          })}
        </div>
        <div className="flex items-center gap-2">
          {calendarEnabled && (
          <button onClick={() => setShowCalendar(!showCalendar)}
            className={`p-1.5 sm:p-2 rounded-lg transition-all cursor-pointer ${showCalendar ? 'bg-indigo-100 dark:bg-indigo-900/40 text-indigo-600 dark:text-indigo-400' : 'text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-700'}`}
            title="Calendar view" aria-label="Toggle calendar view" aria-pressed={showCalendar}>
            <svg className="w-4 h-4 sm:w-5 sm:h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
            </svg>
          </button>
          )}
          <select id="sort-select" aria-label="Sort by" value={sortBy} onChange={(e) => setSortBy(e.target.value)}
            className="glass-select px-2 sm:px-3 py-1.5 text-xs sm:text-sm text-gray-600 dark:text-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500 cursor-pointer">
            {SORT_OPTIONS.map((opt) => <option key={opt.key} value={opt.key}>{opt.label}</option>)}
          </select>
          <button onClick={toggleSortAsc}
            className="icon-btn-3d p-1.5 text-gray-400 rounded-lg cursor-pointer"
            title={sortAsc ? 'Ascending' : 'Descending'} aria-label={sortAsc ? 'Sort ascending' : 'Sort descending'}>
            <svg className={`w-3.5 h-3.5 sm:w-4 sm:h-4 transition-transform ${sortAsc ? '' : 'rotate-180'}`} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M5 15l7-7 7 7" />
            </svg>
          </button>
        </div>
      </div>

      <div className="flex gap-1 sm:gap-1.5 flex-wrap" role="group" aria-label="Filter by category">
        {CATEGORY_FILTERS.map((cat) => (
          <button key={cat} onClick={() => setCategoryFilter(cat)}
            className={`btn-3d px-2 sm:px-3 py-1 sm:py-1.5 text-[10px] sm:text-xs font-medium rounded-lg cursor-pointer ${
              categoryFilter === cat ? 'bg-indigo-600 text-white border-indigo-500'
              : 'text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-200'
            }`}>
            {cat !== 'All' && <span aria-hidden="true">{categoryIcons[cat]} </span>}{cat}
          </button>
        ))}
      </div>

      {tagFilterEnabled && allTags.length > 0 && (
        <div className="flex gap-1 sm:gap-1.5 flex-wrap" role="group" aria-label="Filter by tag">
          <button onClick={() => setTagFilter('')}
            className={`btn-3d px-2 sm:px-3 py-1 sm:py-1.5 text-[10px] sm:text-xs font-medium rounded-lg cursor-pointer ${
              !tagFilter ? 'bg-purple-600 text-white border-purple-500'
              : 'text-purple-500 dark:text-purple-400 hover:bg-purple-100 dark:hover:bg-purple-900/40'
            }`}>
            All tags
          </button>
          {allTags.map((tag) => (
            <button key={tag} onClick={() => setTagFilter(tag === tagFilter ? '' : tag)}
              className={`btn-3d px-2 sm:px-3 py-1 sm:py-1.5 text-[10px] sm:text-xs font-medium rounded-lg cursor-pointer ${
                tagFilter === tag ? 'bg-purple-600 text-white border-purple-500'
                : 'text-purple-500 dark:text-purple-400 hover:bg-purple-100 dark:hover:bg-purple-900/40'
              }`}>
              #{tag}
            </button>
          ))}
        </div>
      )}

      <AnimatePresence>{showCalendar && !isDashboard && <Suspense fallback={<div className="skeleton h-64 rounded-2xl" />}><LazyCalendarView onDayClick={(date) => onAddTodoWithDate?.(date)} /></Suspense>}</AnimatePresence>

      {viewTab === 'trash' && trashEnabled ? (
        <TrashView />
      ) : viewTab === 'recurring' && recurringEnabled ? (
        <RecurringView />
      ) : isDashboard && dashboardEnabled ? (
        <Suspense fallback={<div className="skeleton h-64 rounded-2xl" />}><LazyDashboardView /></Suspense>
      ) : viewTab === 'kanban' && kanbanEnabled ? (
        <Suspense fallback={<div className="skeleton h-64 rounded-2xl" />}><LazyKanbanView /></Suspense>
      ) : viewTab === 'habits' && habitsEnabled ? (
        <Suspense fallback={<div className="skeleton h-64 rounded-2xl" />}><LazyHabitTracker /></Suspense>
      ) : viewTab === 'activity' && activityEnabled ? (
        <Suspense fallback={<div className="skeleton h-64 rounded-2xl" />}><LazyActivityTimeline /></Suspense>
      ) : viewTab === 'shared' && sharedEnabled ? (
        <Suspense fallback={<div className="skeleton h-64 rounded-2xl" />}><LazySharedListsView /></Suspense>
      ) : (
        <>
          {filtered.length > 0 && (
            <div className="flex items-center justify-between">
              {dragDropEnabled && (
              <button onClick={selectAll}
                className={`flex items-center gap-1.5 sm:gap-2 px-2 sm:px-3 py-1.5 text-[10px] sm:text-xs font-medium rounded-lg transition-all cursor-pointer ${
                  allVisibleSelected ? 'bg-indigo-100 dark:bg-indigo-900/40 text-indigo-600 dark:text-indigo-400' : 'text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-700'
                }`} role="checkbox" aria-checked={allVisibleSelected} aria-label="Select all visible todos">
                <div className={`w-3.5 h-3.5 sm:w-4 sm:h-4 rounded border flex items-center justify-center ${allVisibleSelected ? 'bg-indigo-600 border-indigo-600' : 'border-gray-300 dark:border-gray-600'}`}>
                  {allVisibleSelected && <svg className="w-2 h-2 sm:w-2.5 sm:h-2.5 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={3}><path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" /></svg>}
                </div>
                <span className="hidden sm:inline">Select all</span>
                <span className="sm:hidden">All</span>
              </button>
              )}
              {stats.completed > 0 && (
                <button onClick={clearCompleted}
                  className="text-[10px] sm:text-xs font-medium text-gray-400 hover:text-red-500 dark:hover:text-red-400 transition-all cursor-pointer px-2 sm:px-3 py-1.5 rounded-lg hover:bg-red-50 dark:hover:bg-red-900/20"
                  aria-label={`Clear ${stats.completed} completed todos`}>
                  <span className="hidden sm:inline">Clear completed ({stats.completed})</span>
                  <span className="sm:hidden">Clear ({stats.completed})</span>
                </button>
              )}
            </div>
          )}

          {dragDropEnabled ? (
          <DndContext sensors={sensors} collisionDetection={closestCenter} onDragEnd={handleDragEnd}>
            <SortableContext items={filtered.map((t) => t.id)} strategy={verticalListSortingStrategy}>
              <div className="space-y-3" role="list" aria-label="Todo list">
                <AnimatePresence mode="popLayout">
                  {filtered.length === 0 ? (
                    <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }} className="text-center py-16">
                      <div className="text-5xl mb-4" aria-hidden="true">
                        {viewTab === 'completed' ? '🎯' : viewTab === 'active' ? '✨' : viewTab === 'overdue' ? '⏰' : viewTab === 'today' ? '📅' : '📝'}
                      </div>
                      <p className="text-gray-400 dark:text-gray-500 text-lg font-medium">
                        {viewTab === 'completed' ? 'No completed todos yet' : viewTab === 'active' ? 'All done! Great work!' : viewTab === 'overdue' ? 'No overdue todos!' : viewTab === 'today' ? 'Nothing due today' : 'No todos yet. Add one above!'}
                      </p>
                    </motion.div>
                  ) : (
                    filtered.map((todo) => <SortableTodoItem key={todo.id} todo={todo} onDeleteWithUndo={onDeleteWithUndo} />)
                  )}
                </AnimatePresence>
              </div>
            </SortableContext>
          </DndContext>
          ) : (
            <div className="space-y-3" role="list" aria-label="Todo list">
              <AnimatePresence mode="popLayout">
                {filtered.length === 0 ? (
                  <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }} className="text-center py-16">
                    <div className="text-5xl mb-4" aria-hidden="true">
                      {viewTab === 'completed' ? '🎯' : viewTab === 'active' ? '✨' : viewTab === 'overdue' ? '⏰' : viewTab === 'today' ? '📅' : '📝'}
                    </div>
                    <p className="text-gray-400 dark:text-gray-500 text-lg font-medium">
                      {viewTab === 'completed' ? 'No completed todos yet' : viewTab === 'active' ? 'All done! Great work!' : viewTab === 'overdue' ? 'No overdue todos!' : viewTab === 'today' ? 'Nothing due today' : 'No todos yet. Add one above!'}
                    </p>
                  </motion.div>
                ) : (
                  filtered.map((todo) => (
                    <div key={todo.id} role="listitem">
                      <TodoItem todo={todo}
                        onDelete={onDeleteWithUndo ? () => onDeleteWithUndo(todo.id, todo.text) : (id) => useTodoStore.getState().deleteTodo(id)} />
                    </div>
                  ))
                )}
              </AnimatePresence>
            </div>
          )}
        </>
      )}

      {stats.total > 0 && (
        <div className="text-center text-sm text-gray-400 dark:text-gray-500 pt-2">
          {stats.active} active · {stats.completed} completed · {stats.total} total
          {stats.overdue > 0 && <span className="text-red-400"> · {stats.overdue} overdue</span>}
        </div>
      )}
    </div>
  )
}
