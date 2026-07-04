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
import { getAccessToken } from './userStore'

const PRIORITY_ORDER = { High: 0, Medium: 1, Low: 2 }
const MAX_HISTORY = 50
const API_URL = import.meta.env.VITE_API_URL || '/api'

const toLocalDateStr = (date) => {
  const y = date.getFullYear()
  const m = String(date.getMonth() + 1).padStart(2, '0')
  const d = String(date.getDate()).padStart(2, '0')
  return `${y}-${m}-${d}`
}

const TRASH_RETENTION_DAYS = 30

const createTodo = ({ text, category, priority, dueDate, notes = '', tags = [], subtasks = [], recurrence = 'none', reminderAt = 'none', attachments = [], blockedBy = [] }) => ({
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
  attachments,
  blockedBy,
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

function serializeTodoForServer(todo) {
  return {
    id: todo.id,
    text: todo.text,
    completed: todo.completed,
    category: todo.category,
    priority: todo.priority,
    dueDate: todo.dueDate,
    notes: todo.notes,
    tags: todo.tags,
    subtasks: todo.subtasks,
    recurrence: todo.recurrence,
    reminderAt: todo.reminderAt,
    attachments: todo.attachments,
    blockedBy: todo.blockedBy,
    sortOrder: todo.sortOrder ?? 0,
    createdAt: todo.createdAt,
  }
}

async function apiRequest(method, path, body = null) {
  const token = getAccessToken()
  if (!token) return { ok: false, error: 'No auth token' }

  const opts = {
    method,
    headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
  }
  if (body) opts.body = JSON.stringify(body)

  try {
    let res = await fetch(`${API_URL}${path}`, opts)

    if (res.status === 401) {
      const { useUserStore } = await import('./userStore.js')
      const refreshed = await useUserStore.getState().refreshAccessToken()
      if (refreshed) {
        const newToken = getAccessToken()
        opts.headers.Authorization = `Bearer ${newToken}`
        res = await fetch(`${API_URL}${path}`, opts)
      } else {
        return { ok: false, status: 401, error: 'Session expired' }
      }
    }

    const text = await res.text().catch(() => '')
    let data = {}
    try { data = text ? JSON.parse(text) : {} } catch {}
    return { ok: res.ok, status: res.status, data, error: res.ok ? null : (data.error || `Server error (HTTP ${res.status})`) }
  } catch {
    return { ok: false, error: 'Network error - offline' }
  }
}

const _syncQueue = []
let _syncing = false

async function flushSyncQueue() {
  if (_syncing || _syncQueue.length === 0) return
  _syncing = true
  try {
    while (_syncQueue.length > 0) {
      const batch = _syncQueue.splice(0, 1)[0]
      if (batch.type === 'full') {
        await apiRequest('PUT', '/todos', { todos: batch.todos.map(serializeTodoForServer) })
      } else if (batch.type === 'create') {
        await apiRequest('POST', '/todos', serializeTodoForServer(batch.todo))
      } else if (batch.type === 'update') {
        await apiRequest('PUT', `/todos/${batch.id}`, batch.updates)
      } else if (batch.type === 'delete') {
        await apiRequest('DELETE', `/todos/${batch.id}`)
      }
    }
  } finally {
    _syncing = false
    if (_syncQueue.length > 0) flushSyncQueue()
  }
}

function queueSync(type, payload) {
  _syncQueue.push({ type, ...payload })
  queueMicrotask(flushSyncQueue)
}

export const useTodoStore = create(
  persist(
    (set, get) => ({
      todos: [],
      trash: [],
      history: [],
      future: [],
      selectedIds: [],
      sortBy: 'created',
      sortAsc: true,
      viewTab: 'all',
      categoryFilter: 'All',
      tagFilter: '',
      searchQuery: '',
      calendarDate: new Date().toISOString(),
      completions: [],
      pomodoro: { running: false, secondsLeft: 25 * 60, todoId: null, mode: 'work' },
      _serverLoaded: false,

      loadFromServer: async () => {
        const token = getAccessToken()
        if (!token) return
        const result = await apiRequest('GET', '/todos')
        if (!result.ok || !result.data) return

        const serverTodos = result.data.todos || []
        const state = get()

        if (state.todos.length === 0) {
          set({ todos: serverTodos, _serverLoaded: true })
          return
        }

        const serverMap = new Map(serverTodos.map(t => [t.id, t]))
        const serverIds = new Set(serverTodos.map(t => t.id))

        const merged = []
        const seenIds = new Set()

        for (const localTodo of state.todos) {
          const serverTodo = serverMap.get(localTodo.id)
          if (serverTodo) {
            const localTime = new Date(localTodo.createdAt).getTime()
            const serverTime = new Date(serverTodo.createdAt).getTime()
            merged.push(serverTime > localTime ? serverTodo : localTodo)
          } else if (!serverIds.has(localTodo.id)) {
            merged.push(localTodo)
          }
          seenIds.add(localTodo.id)
        }

        for (const serverTodo of serverTodos) {
          if (!seenIds.has(serverTodo.id)) {
            merged.push(serverTodo)
          }
        }

        set({ todos: merged, _serverLoaded: true })
      },

      addTodo: (data) => {
        const todo = createTodo(data)
        const state = get()
        set({
          history: [...state.history.slice(-MAX_HISTORY), state.todos],
          future: [],
          todos: [...state.todos, todo],
        })
        queueSync('create', { todo })
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
          if (existing) {
            newCompletions[newCompletions.indexOf(existing)] = { ...existing, count: existing.count + 1 }
          } else {
            newCompletions.push({ date: today, count: 1 })
          }
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
          queueSync('create', { todo: next })
        }

        set({
          history: [...state.history.slice(-MAX_HISTORY), state.todos],
          future: [],
          todos: newTodos,
        })
        queueSync('update', { id, updates: { completed: newCompleted } })
      },

      deleteTodo: (id) => {
        const state = get()
        const todo = state.todos.find((t) => t.id === id)
        if (!todo) return
        const trashedTodo = { ...todo, deletedAt: new Date().toISOString() }
        set({
          history: [...state.history.slice(-MAX_HISTORY), state.todos],
          future: [],
          todos: state.todos.filter((t) => t.id !== id),
          trash: [...state.trash, trashedTodo],
          selectedIds: state.selectedIds.filter((sid) => sid !== id),
        })
        queueSync('delete', { id })
      },

      updateTodo: (id, updates) => {
        const state = get()
        set({
          history: [...state.history.slice(-MAX_HISTORY), state.todos],
          future: [],
          todos: state.todos.map((t) => (t.id === id ? { ...t, ...updates } : t)),
        })
        queueSync('update', { id, updates })
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
        queueSync('update', { id, updates: { dueDate } })
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
        queueSync('full', { todos: newTodos })
      },

      addSubtask: (todoId, text) => {
        const state = get()
        const subtaskId = crypto.randomUUID()
        const subtask = { id: subtaskId, text, completed: false }
        set({
          history: [...state.history.slice(-MAX_HISTORY), state.todos],
          future: [],
          todos: state.todos.map((t) =>
            t.id === todoId ? { ...t, subtasks: [...t.subtasks, subtask] } : t
          ),
        })
        const todo = state.todos.find(t => t.id === todoId)
        if (todo) {
          queueSync('update', { id: todoId, updates: { subtasks: [...todo.subtasks, subtask] } })
        }
      },

      toggleSubtask: (todoId, subtaskId) => {
        const state = get()
        const todo = state.todos.find(t => t.id === todoId)
        if (!todo) return
        const newSubtasks = todo.subtasks.map(s => s.id === subtaskId ? { ...s, completed: !s.completed } : s)
        set({
          history: [...state.history.slice(-MAX_HISTORY), state.todos],
          future: [],
          todos: state.todos.map((t) =>
            t.id === todoId ? { ...t, subtasks: newSubtasks } : t
          ),
        })
        queueSync('update', { id: todoId, updates: { subtasks: newSubtasks } })
      },

      deleteSubtask: (todoId, subtaskId) => {
        const state = get()
        const todo = state.todos.find(t => t.id === todoId)
        if (!todo) return
        const newSubtasks = todo.subtasks.filter(s => s.id !== subtaskId)
        set({
          history: [...state.history.slice(-MAX_HISTORY), state.todos],
          future: [],
          todos: state.todos.map((t) =>
            t.id === todoId ? { ...t, subtasks: newSubtasks } : t
          ),
        })
        queueSync('update', { id: todoId, updates: { subtasks: newSubtasks } })
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
        queueSync('full', { todos: prev })
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
        queueSync('full', { todos: next })
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
        const newTodos = state.todos.map((t) =>
          state.selectedIds.includes(t.id) ? { ...t, completed: true } : t
        )
        set({
          history: [...state.history.slice(-MAX_HISTORY), state.todos],
          future: [],
          todos: newTodos,
          selectedIds: [],
        })
        queueSync('full', { todos: newTodos })
      },

      bulkDelete: () => {
        const state = get()
        const newTodos = state.todos.filter((t) => !state.selectedIds.includes(t.id))
        set({
          history: [...state.history.slice(-MAX_HISTORY), state.todos],
          future: [],
          todos: newTodos,
          selectedIds: [],
        })
        queueSync('full', { todos: newTodos })
      },

      bulkCategorize: (category) => {
        const state = get()
        const newTodos = state.todos.map((t) =>
          state.selectedIds.includes(t.id) ? { ...t, category } : t
        )
        set({
          history: [...state.history.slice(-MAX_HISTORY), state.todos],
          future: [],
          todos: newTodos,
          selectedIds: [],
        })
        queueSync('full', { todos: newTodos })
      },

      clearCompleted: () => {
        const state = get()
        const newTodos = state.todos.filter((t) => !t.completed)
        set({
          history: [...state.history.slice(-MAX_HISTORY), state.todos],
          future: [],
          todos: newTodos,
        })
        queueSync('full', { todos: newTodos })
      },

      setSortBy: (sortBy) => set({ sortBy }),
      toggleSortAsc: () => set((s) => ({ sortAsc: !s.sortAsc })),
      setViewTab: (viewTab) => set({ viewTab }),
      setCategoryFilter: (categoryFilter) => set({ categoryFilter }),
      setSearchQuery: (searchQuery) => set({ searchQuery }),
      setCalendarDate: (calendarDate) => set({ calendarDate }),
      setTagFilter: (tagFilter) => set({ tagFilter }),

      restoreTodo: (id) => {
        const state = get()
        const todo = state.trash.find((t) => t.id === id)
        if (!todo) return
        const restored = { ...todo }
        delete restored.deletedAt
        set({
          trash: state.trash.filter((t) => t.id !== id),
          todos: [...state.todos, restored],
        })
        queueSync('create', { todo: restored })
      },

      permanentDeleteTodo: (id) => {
        const state = get()
        set({ trash: state.trash.filter((t) => t.id !== id) })
      },

      emptyTrash: () => set({ trash: [] }),

      purgeExpiredTrash: () => {
        const state = get()
        const cutoff = Date.now() - TRASH_RETENTION_DAYS * 24 * 60 * 60 * 1000
        set({ trash: state.trash.filter((t) => new Date(t.deletedAt).getTime() > cutoff) })
      },

      restoreAll: () => {
        const state = get()
        const restored = state.trash.map((t) => { const r = { ...t }; delete r.deletedAt; return r })
        const newTodos = [...state.todos, ...restored]
        set({ todos: newTodos, trash: [] })
        queueSync('full', { todos: newTodos })
      },

      startPomodoro: (todoId) => set({ pomodoro: { running: true, secondsLeft: 25 * 60, todoId, mode: 'work' } }),
      pausePomodoro: () => set((s) => ({ pomodoro: { ...s.pomodoro, running: false } })),
      resumePomodoro: () => set((s) => ({ pomodoro: { ...s.pomodoro, running: true } })),
      resetPomodoro: () => set({ pomodoro: { running: false, secondsLeft: 25 * 60, todoId: null, mode: 'work' } }),
      tickPomodoro: () => {
        const state = get()
        if (!state.pomodoro.running || state.pomodoro.secondsLeft <= 0) return
        const newSeconds = state.pomodoro.secondsLeft - 1
        if (newSeconds <= 0) {
          const isWork = state.pomodoro.mode === 'work'
          set({
            pomodoro: {
              running: false,
              secondsLeft: isWork ? 5 * 60 : 25 * 60,
              todoId: isWork ? state.pomodoro.todoId : null,
              mode: isWork ? 'break' : 'work',
            },
          })
          if (typeof Notification !== 'undefined' && Notification.permission === 'granted') {
            new Notification('Pomodoro', { body: isWork ? 'Break time!' : 'Work time!', icon: '/favicon.svg' })
          }
        } else {
          set({ pomodoro: { ...state.pomodoro, secondsLeft: newSeconds } })
        }
      },

      importTodos: (newTodos) => {
        if (!Array.isArray(newTodos)) return false
        const valid = newTodos.filter(isValidTodo)
        if (valid.length === 0) return false
        const state = get()
        const existingIds = new Set(state.todos.map((t) => t.id))
        const deduped = valid.filter((t) => !existingIds.has(t.id))
        const merged = [...state.todos, ...deduped]
        set({
          history: [...state.history.slice(-MAX_HISTORY), state.todos],
          future: [],
          todos: merged,
        })
        queueSync('full', { todos: merged })
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
        trash: state.trash,
        sortBy: state.sortBy,
        sortAsc: state.sortAsc,
        viewTab: state.viewTab,
        completions: state.completions,
      }),
    }
  )
)

function computeFilteredTodos({ todos, viewTab, categoryFilter, tagFilter, searchQuery, sortBy, sortAsc }) {
  let filtered = todos.filter((todo) => {
    if (viewTab === 'active' && todo.completed) return false
    if (viewTab === 'completed' && !todo.completed) return false
    if (viewTab === 'dashboard') return false
    if (viewTab === 'recurring' && todo.recurrence === 'none') return false
    if (categoryFilter !== 'All' && todo.category !== categoryFilter) return false
    if (tagFilter && !todo.tags.includes(tagFilter)) return false
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
