import { create } from 'zustand'
import { persist } from 'zustand/middleware'
import { isPast } from 'date-fns/isPast'
import { isToday } from 'date-fns/isToday'
import { startOfWeek } from 'date-fns/startOfWeek'
import { endOfWeek } from 'date-fns/endOfWeek'
import { parseISO } from 'date-fns/parseISO'
import { addDays } from 'date-fns/addDays'
import { addMonths } from 'date-fns/addMonths'
import { format } from 'date-fns/format'

const PRIORITY_ORDER = { High: 0, Medium: 1, Low: 2 }
const MAX_HISTORY = 50

const toLocalDateStr = (date) => {
  const y = date.getFullYear()
  const m = String(date.getMonth() + 1).padStart(2, '0')
  const d = String(date.getDate()).padStart(2, '0')
  return `${y}-${m}-${d}`
}

const createTodo = ({ text, category, priority, dueDate, notes = '', tags = [], subtasks = [], recurrence = 'none', reminderAt = 'none' }) => ({
  id: crypto.randomUUID(),
  text,
  completed: false,
  category: category || 'Personal',
  priority: priority || 'Medium',
  dueDate: dueDate || null,
  notes,
  tags,
  subtasks,
  recurrence,
  reminderAt,
  createdAt: new Date().toISOString(),
})

const computeNextDueDate = (currentDueDate, recurrence) => {
  if (!currentDueDate || recurrence === 'none') return currentDueDate
  try {
    const date = parseISO(currentDueDate)
    switch (recurrence) {
      case 'daily': return toLocalDateStr(addDays(date, 1))
      case 'weekly': return toLocalDateStr(addDays(date, 7))
      case 'monthly': return toLocalDateStr(addMonths(date, 1))
      default: return currentDueDate
    }
  } catch {
    return currentDueDate
  }
}

const isValidTodo = (t) =>
  t && typeof t.id === 'string' && typeof t.text === 'string' && typeof t.completed === 'boolean'

export const useTodoStore = create(
  persist(
    (set, get) => ({
      todos: [],
      history: [],
      future: [],
      selectedIds: [],
      sortBy: 'created',
      sortAsc: true,
      viewTab: 'all',
      categoryFilter: 'All',
      searchQuery: '',
      calendarDate: new Date().toISOString(),
      completions: [],

      addTodo: (data) => {
        const state = get()
        set({
          history: [...state.history.slice(-MAX_HISTORY), state.todos],
          future: [],
          todos: [...state.todos, createTodo(data)],
        })
      },

      toggleTodo: (id) => {
        const state = get()
        const toggled = state.todos.find((t) => t.id === id)
        if (!toggled) return

        const newCompleted = !toggled.completed
        let newTodos = state.todos.map((t) => (t.id === id ? { ...t, completed: newCompleted } : t))

        if (newCompleted) {
          const today = format(new Date(), 'yyyy-MM-dd')
          const newCompletions = [...state.completions]
          const existing = newCompletions.find((c) => c.date === today)
          if (existing) existing.count++
          else newCompletions.push({ date: today, count: 1 })
          set({ completions: newCompletions.slice(-90) })
        }

        if (!toggled.completed && toggled.recurrence !== 'none') {
          const next = createTodo({
            text: toggled.text,
            category: toggled.category,
            priority: toggled.priority,
            dueDate: computeNextDueDate(toggled.dueDate, toggled.recurrence),
            notes: toggled.notes,
            tags: toggled.tags,
            subtasks: toggled.subtasks.map((s) => ({ ...s, completed: false })),
            recurrence: toggled.recurrence,
            reminderAt: toggled.reminderAt,
          })
          newTodos = [...newTodos, next]
        }

        set({
          history: [...state.history.slice(-MAX_HISTORY), state.todos],
          future: [],
          todos: newTodos,
        })
      },

      deleteTodo: (id) => {
        const state = get()
        set({
          history: [...state.history.slice(-MAX_HISTORY), state.todos],
          future: [],
          todos: state.todos.filter((t) => t.id !== id),
          selectedIds: state.selectedIds.filter((sid) => sid !== id),
        })
      },

      updateTodo: (id, updates) => {
        const state = get()
        set({
          history: [...state.history.slice(-MAX_HISTORY), state.todos],
          future: [],
          todos: state.todos.map((t) => (t.id === id ? { ...t, ...updates } : t)),
        })
      },

      snoozeTodo: (id) => {
        const state = get()
        const todo = state.todos.find((t) => t.id === id)
        if (!todo) return
        const baseDate = todo.dueDate || toLocalDateStr(new Date())
        const dueDate = toLocalDateStr(addDays(parseISO(baseDate), 1))
        set({
          history: [...state.history.slice(-MAX_HISTORY), state.todos],
          future: [],
          todos: state.todos.map((t) => (t.id === id ? { ...t, dueDate } : t)),
        })
      },

      reorderTodos: (activeId, overId) => {
        const state = get()
        const oldIdx = state.todos.findIndex((t) => t.id === activeId)
        const newIdx = state.todos.findIndex((t) => t.id === overId)
        if (oldIdx === -1 || newIdx === -1) return
        const newTodos = [...state.todos]
        const [moved] = newTodos.splice(oldIdx, 1)
        newTodos.splice(newIdx, 0, moved)
        set({
          history: [...state.history.slice(-MAX_HISTORY), state.todos],
          future: [],
          todos: newTodos,
        })
      },

      addSubtask: (todoId, text) => {
        const state = get()
        set({
          history: [...state.history.slice(-MAX_HISTORY), state.todos],
          future: [],
          todos: state.todos.map((t) =>
            t.id === todoId
              ? { ...t, subtasks: [...t.subtasks, { id: crypto.randomUUID(), text, completed: false }] }
              : t
          ),
        })
      },

      toggleSubtask: (todoId, subtaskId) => {
        const state = get()
        set({
          history: [...state.history.slice(-MAX_HISTORY), state.todos],
          future: [],
          todos: state.todos.map((t) =>
            t.id === todoId
              ? { ...t, subtasks: t.subtasks.map((s) => (s.id === subtaskId ? { ...s, completed: !s.completed } : s)) }
              : t
          ),
        })
      },

      deleteSubtask: (todoId, subtaskId) => {
        const state = get()
        set({
          history: [...state.history.slice(-MAX_HISTORY), state.todos],
          future: [],
          todos: state.todos.map((t) =>
            t.id === todoId ? { ...t, subtasks: t.subtasks.filter((s) => s.id !== subtaskId) } : t
          ),
        })
      },

      undo: () => {
        const state = get()
        if (state.history.length === 0) return
        const prev = state.history[state.history.length - 1]
        set({
          future: [state.todos, ...state.future.slice(0, MAX_HISTORY)],
          history: state.history.slice(0, -1),
          todos: prev,
        })
      },

      redo: () => {
        const state = get()
        if (state.future.length === 0) return
        const next = state.future[0]
        set({
          history: [...state.history, state.todos],
          future: state.future.slice(1),
          todos: next,
        })
      },

      selectTodo: (id) => {
        const state = get()
        const isSelected = state.selectedIds.includes(id)
        set({
          selectedIds: isSelected
            ? state.selectedIds.filter((sid) => sid !== id)
            : [...state.selectedIds, id],
        })
      },

      selectAll: () => {
        const state = get()
        const filtered = computeFilteredTodos(state)
        const allSelected = filtered.every((t) => state.selectedIds.includes(t.id))
        set({ selectedIds: allSelected ? [] : filtered.map((t) => t.id) })
      },

      clearSelection: () => set({ selectedIds: [] }),

      bulkComplete: () => {
        const state = get()
        set({
          history: [...state.history.slice(-MAX_HISTORY), state.todos],
          future: [],
          todos: state.todos.map((t) =>
            state.selectedIds.includes(t.id) ? { ...t, completed: true } : t
          ),
          selectedIds: [],
        })
      },

      bulkDelete: () => {
        const state = get()
        set({
          history: [...state.history.slice(-MAX_HISTORY), state.todos],
          future: [],
          todos: state.todos.filter((t) => !state.selectedIds.includes(t.id)),
          selectedIds: [],
        })
      },

      bulkCategorize: (category) => {
        const state = get()
        set({
          history: [...state.history.slice(-MAX_HISTORY), state.todos],
          future: [],
          todos: state.todos.map((t) =>
            state.selectedIds.includes(t.id) ? { ...t, category } : t
          ),
          selectedIds: [],
        })
      },

      clearCompleted: () => {
        const state = get()
        set({
          history: [...state.history.slice(-MAX_HISTORY), state.todos],
          future: [],
          todos: state.todos.filter((t) => !t.completed),
        })
      },

      setSortBy: (sortBy) => set({ sortBy }),
      toggleSortAsc: () => set((s) => ({ sortAsc: !s.sortAsc })),
      setViewTab: (viewTab) => set({ viewTab }),
      setCategoryFilter: (categoryFilter) => set({ categoryFilter }),
      setSearchQuery: (searchQuery) => set({ searchQuery }),
      setCalendarDate: (calendarDate) => set({ calendarDate }),

      importTodos: (newTodos) => {
        if (!Array.isArray(newTodos)) return false
        const valid = newTodos.filter(isValidTodo)
        if (valid.length === 0) return false
        const state = get()
        const existingIds = new Set(state.todos.map((t) => t.id))
        const deduped = valid.filter((t) => !existingIds.has(t.id))
        set({
          history: [...state.history.slice(-MAX_HISTORY), state.todos],
          future: [],
          todos: [...state.todos, ...deduped],
        })
        return deduped.length
      },

      checkReminders: () => {
        if (typeof Notification === 'undefined' || Notification.permission !== 'granted') return
        const { todos } = get()
        const now = new Date()
        todos.forEach((todo) => {
          if (todo.completed || !todo.dueDate || todo.reminderAt === 'none') return
          try {
            const due = parseISO(todo.dueDate)
            const diff = due.getTime() - now.getTime()
            const minsLeft = diff / (1000 * 60)
            const notifiedKey = `notified-${todo.id}`
            if (sessionStorage.getItem(notifiedKey)) return
            let shouldNotify = false
            if (todo.reminderAt === 'atTime' && isToday(due) && minsLeft <= 0 && minsLeft > -60) shouldNotify = true
            if (todo.reminderAt === '15minBefore' && minsLeft > 0 && minsLeft <= 15) shouldNotify = true
            if (todo.reminderAt === '1hourBefore' && minsLeft > 0 && minsLeft <= 60) shouldNotify = true
            if (shouldNotify) {
              new Notification('Todo Reminder', { body: todo.text, icon: '/favicon.svg' })
              sessionStorage.setItem(notifiedKey, '1')
            }
          } catch { /* ignore parse errors */ }
        })
      },

      getFilteredTodos: () => computeFilteredTodos(get()),
      getStats: () => computeStats(get()),
    }),
    {
      name: 'todo-app-store',
      partialize: (state) => ({
        todos: state.todos,
        sortBy: state.sortBy,
        sortAsc: state.sortAsc,
        completions: state.completions,
      }),
    }
  )
)

function computeFilteredTodos({ todos, viewTab, categoryFilter, searchQuery, sortBy, sortAsc }) {
  let filtered = todos.filter((todo) => {
    if (viewTab === 'active' && todo.completed) return false
    if (viewTab === 'completed' && !todo.completed) return false
    if (viewTab === 'dashboard') return false
    if (categoryFilter !== 'All' && todo.category !== categoryFilter) return false
    if (searchQuery) {
      const q = searchQuery.toLowerCase()
      const matchText = todo.text.toLowerCase().includes(q)
      const matchTags = todo.tags.some((t) => t.toLowerCase().includes(q))
      const matchNotes = todo.notes.toLowerCase().includes(q)
      if (!matchText && !matchTags && !matchNotes) return false
    }
    if (viewTab === 'overdue') {
      if (!todo.dueDate || todo.completed) return false
      try {
        const d = parseISO(todo.dueDate)
        if (!isPast(d) || isToday(d)) return false
      } catch { return false }
    }
    if (viewTab === 'today') {
      if (!todo.dueDate) return false
      try { if (!isToday(parseISO(todo.dueDate))) return false } catch { return false }
    }
    if (viewTab === 'week') {
      if (!todo.dueDate) return false
      try {
        const d = parseISO(todo.dueDate)
        const now = new Date()
        if (d < startOfWeek(now, { weekStartsOn: 1 }) || d > endOfWeek(now, { weekStartsOn: 1 })) return false
      } catch { return false }
    }
    return true
  })

  filtered.sort((a, b) => {
    let cmp
    switch (sortBy) {
      case 'dueDate':
        if (!a.dueDate && !b.dueDate) cmp = 0
        else if (!a.dueDate) cmp = 1
        else if (!b.dueDate) cmp = -1
        else cmp = a.dueDate.localeCompare(b.dueDate)
        break
      case 'priority':
        cmp = PRIORITY_ORDER[a.priority] - PRIORITY_ORDER[b.priority]
        break
      case 'alpha':
        cmp = a.text.localeCompare(b.text)
        break
      case 'created':
      default:
        cmp = a.createdAt.localeCompare(b.createdAt)
        break
    }
    return sortAsc ? cmp : -cmp
  })

  return filtered
}

function computeStats({ todos }) {
  const total = todos.length
  const completed = todos.filter((t) => t.completed).length
  const active = total - completed
  const overdue = todos.filter((t) => {
    if (!t.dueDate || t.completed) return false
    try { return isPast(parseISO(t.dueDate)) && !isToday(parseISO(t.dueDate)) } catch { return false }
  }).length
  const dueToday = todos.filter((t) => {
    if (!t.dueDate || t.completed) return false
    try { return isToday(parseISO(t.dueDate)) } catch { return false }
  }).length
  return { total, completed, active, overdue, dueToday, percent: total ? Math.round((completed / total) * 100) : 0 }
}
