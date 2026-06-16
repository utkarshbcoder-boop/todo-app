import { describe, it, expect, beforeEach } from 'vitest'
import { useTodoStore } from '../store/todoStore'

describe('todoStore', () => {
  beforeEach(() => {
    useTodoStore.setState({
      todos: [],
      history: [],
      future: [],
      selectedIds: [],
      sortBy: 'created',
      sortAsc: true,
      viewTab: 'all',
      categoryFilter: 'All',
      searchQuery: '',
    })
  })

  const sampleTodo = { text: 'Test todo', category: 'Work', priority: 'High', dueDate: null, notes: '', tags: [], subtasks: [], recurrence: 'none' }

  describe('addTodo', () => {
    it('adds a todo', () => {
      useTodoStore.getState().addTodo(sampleTodo)
      const { todos } = useTodoStore.getState()
      expect(todos).toHaveLength(1)
      expect(todos[0].text).toBe('Test todo')
      expect(todos[0].completed).toBe(false)
      expect(todos[0].id).toBeDefined()
    })

    it('pushes to history', () => {
      useTodoStore.getState().addTodo(sampleTodo)
      useTodoStore.getState().addTodo({ ...sampleTodo, text: 'Second' })
      const { history } = useTodoStore.getState()
      expect(history).toHaveLength(2)
      expect(history[0]).toHaveLength(0)
      expect(history[1]).toHaveLength(1)
    })
  })

  describe('toggleTodo', () => {
    it('toggles completed state', () => {
      useTodoStore.getState().addTodo(sampleTodo)
      const { todos } = useTodoStore.getState()
      const id = todos[0].id
      useTodoStore.getState().toggleTodo(id)
      expect(useTodoStore.getState().todos[0].completed).toBe(true)
      useTodoStore.getState().toggleTodo(id)
      expect(useTodoStore.getState().todos[0].completed).toBe(false)
    })

    it('creates next recurring todo with advanced due date', () => {
      useTodoStore.getState().addTodo({ ...sampleTodo, dueDate: '2026-06-15', recurrence: 'weekly' })
      const id = useTodoStore.getState().todos[0].id
      useTodoStore.getState().toggleTodo(id)
      const { todos } = useTodoStore.getState()
      expect(todos).toHaveLength(2)
      expect(todos[0].completed).toBe(true)
      expect(todos[1].dueDate).toBe('2026-06-22')
      expect(todos[1].recurrence).toBe('weekly')
      expect(todos[1].completed).toBe(false)
    })

    it('creates daily recurring todo', () => {
      useTodoStore.getState().addTodo({ ...sampleTodo, dueDate: '2026-06-15', recurrence: 'daily' })
      const id = useTodoStore.getState().todos[0].id
      useTodoStore.getState().toggleTodo(id)
      expect(useTodoStore.getState().todos[1].dueDate).toBe('2026-06-16')
    })

    it('creates monthly recurring todo', () => {
      useTodoStore.getState().addTodo({ ...sampleTodo, dueDate: '2026-06-15', recurrence: 'monthly' })
      const id = useTodoStore.getState().todos[0].id
      useTodoStore.getState().toggleTodo(id)
      expect(useTodoStore.getState().todos[1].dueDate).toBe('2026-07-15')
    })
  })

  describe('deleteTodo', () => {
    it('removes a todo', () => {
      useTodoStore.getState().addTodo(sampleTodo)
      const id = useTodoStore.getState().todos[0].id
      useTodoStore.getState().deleteTodo(id)
      expect(useTodoStore.getState().todos).toHaveLength(0)
    })

    it('removes from selectedIds', () => {
      useTodoStore.getState().addTodo(sampleTodo)
      const id = useTodoStore.getState().todos[0].id
      useTodoStore.getState().selectTodo(id)
      expect(useTodoStore.getState().selectedIds).toContain(id)
      useTodoStore.getState().deleteTodo(id)
      expect(useTodoStore.getState().selectedIds).not.toContain(id)
    })
  })

  describe('undo/redo', () => {
    it('undoes an addTodo', () => {
      useTodoStore.getState().addTodo(sampleTodo)
      expect(useTodoStore.getState().todos).toHaveLength(1)
      useTodoStore.getState().undo()
      expect(useTodoStore.getState().todos).toHaveLength(0)
    })

    it('redoes an undone action', () => {
      useTodoStore.getState().addTodo(sampleTodo)
      useTodoStore.getState().undo()
      expect(useTodoStore.getState().todos).toHaveLength(0)
      useTodoStore.getState().redo()
      expect(useTodoStore.getState().todos).toHaveLength(1)
    })

    it('clears future on new action after undo', () => {
      useTodoStore.getState().addTodo(sampleTodo)
      useTodoStore.getState().undo()
      useTodoStore.getState().addTodo({ ...sampleTodo, text: 'New' })
      expect(useTodoStore.getState().future).toHaveLength(0)
      expect(useTodoStore.getState().todos).toHaveLength(1)
      expect(useTodoStore.getState().todos[0].text).toBe('New')
    })
  })

  describe('subtasks', () => {
    it('adds a subtask with undo history', () => {
      useTodoStore.getState().addTodo(sampleTodo)
      const todoId = useTodoStore.getState().todos[0].id
      const before = useTodoStore.getState().history.length
      useTodoStore.getState().addSubtask(todoId, 'Subtask 1')
      expect(useTodoStore.getState().todos[0].subtasks).toHaveLength(1)
      expect(useTodoStore.getState().history).toHaveLength(before + 1)
    })

    it('toggles a subtask with undo history', () => {
      useTodoStore.getState().addTodo(sampleTodo)
      const todoId = useTodoStore.getState().todos[0].id
      useTodoStore.getState().addSubtask(todoId, 'Sub 1')
      const subId = useTodoStore.getState().todos[0].subtasks[0].id
      const before = useTodoStore.getState().history.length
      useTodoStore.getState().toggleSubtask(todoId, subId)
      expect(useTodoStore.getState().todos[0].subtasks[0].completed).toBe(true)
      expect(useTodoStore.getState().history).toHaveLength(before + 1)
    })

    it('deletes a subtask with undo history', () => {
      useTodoStore.getState().addTodo(sampleTodo)
      const todoId = useTodoStore.getState().todos[0].id
      useTodoStore.getState().addSubtask(todoId, 'Sub 1')
      const subId = useTodoStore.getState().todos[0].subtasks[0].id
      const before = useTodoStore.getState().history.length
      useTodoStore.getState().deleteSubtask(todoId, subId)
      expect(useTodoStore.getState().todos[0].subtasks).toHaveLength(0)
      expect(useTodoStore.getState().history).toHaveLength(before + 1)
    })
  })

  describe('reorderTodos', () => {
    it('reorders with undo history', () => {
      useTodoStore.getState().addTodo({ ...sampleTodo, text: 'First' })
      useTodoStore.getState().addTodo({ ...sampleTodo, text: 'Second' })
      const [first, second] = useTodoStore.getState().todos
      const before = useTodoStore.getState().history.length
      useTodoStore.getState().reorderTodos(first.id, second.id)
      const { todos, history } = useTodoStore.getState()
      expect(todos[0].text).toBe('Second')
      expect(todos[1].text).toBe('First')
      expect(history).toHaveLength(before + 1)
    })
  })

  describe('bulk actions', () => {
    it('bulk completes selected', () => {
      useTodoStore.getState().addTodo(sampleTodo)
      useTodoStore.getState().addTodo({ ...sampleTodo, text: 'Second' })
      const [t1, t2] = useTodoStore.getState().todos
      useTodoStore.getState().selectTodo(t1.id)
      useTodoStore.getState().selectTodo(t2.id)
      useTodoStore.getState().bulkComplete()
      const { todos, selectedIds } = useTodoStore.getState()
      expect(todos.every((t) => t.completed)).toBe(true)
      expect(selectedIds).toHaveLength(0)
    })

    it('bulk deletes selected', () => {
      useTodoStore.getState().addTodo(sampleTodo)
      useTodoStore.getState().addTodo({ ...sampleTodo, text: 'Second' })
      const [t1, t2] = useTodoStore.getState().todos
      useTodoStore.getState().selectTodo(t1.id)
      useTodoStore.getState().bulkDelete()
      expect(useTodoStore.getState().todos).toHaveLength(1)
      expect(useTodoStore.getState().todos[0].id).toBe(t2.id)
    })
  })

  describe('clearCompleted', () => {
    it('removes all completed todos', () => {
      useTodoStore.getState().addTodo(sampleTodo)
      useTodoStore.getState().addTodo({ ...sampleTodo, text: 'Second' })
      const id = useTodoStore.getState().todos[0].id
      useTodoStore.getState().toggleTodo(id)
      useTodoStore.getState().clearCompleted()
      expect(useTodoStore.getState().todos).toHaveLength(1)
      expect(useTodoStore.getState().todos[0].text).toBe('Second')
    })
  })

  describe('snoozeTodo', () => {
    it('advances due date by one day', () => {
      useTodoStore.getState().addTodo({ ...sampleTodo, dueDate: '2026-06-15' })
      const id = useTodoStore.getState().todos[0].id
      useTodoStore.getState().snoozeTodo(id)
      expect(useTodoStore.getState().todos[0].dueDate).toBe('2026-06-16')
    })

    it('handles month boundary', () => {
      useTodoStore.getState().addTodo({ ...sampleTodo, dueDate: '2026-06-30' })
      const id = useTodoStore.getState().todos[0].id
      useTodoStore.getState().snoozeTodo(id)
      expect(useTodoStore.getState().todos[0].dueDate).toBe('2026-07-01')
    })
  })

  describe('importTodos', () => {
    it('imports valid todos', () => {
      const imported = [{ ...sampleTodo, id: 'import-1', completed: false, createdAt: new Date().toISOString(), tags: [], subtasks: [] }]
      const result = useTodoStore.getState().importTodos(imported)
      expect(result).toBe(1)
      expect(useTodoStore.getState().todos).toHaveLength(1)
    })

    it('deduplicates by id', () => {
      useTodoStore.getState().addTodo(sampleTodo)
      const existingId = useTodoStore.getState().todos[0].id
      const result = useTodoStore.getState().importTodos([{ ...sampleTodo, id: existingId, completed: false, createdAt: new Date().toISOString(), tags: [], subtasks: [] }])
      expect(result).toBe(0)
      expect(useTodoStore.getState().todos).toHaveLength(1)
    })

    it('rejects invalid data', () => {
      const result = useTodoStore.getState().importTodos('not an array')
      expect(result).toBe(false)
    })

    it('rejects empty array', () => {
      const result = useTodoStore.getState().importTodos([])
      expect(result).toBe(false)
    })
  })

  describe('getFilteredTodos', () => {
    it('filters by viewTab', () => {
      useTodoStore.getState().addTodo(sampleTodo)
      useTodoStore.getState().addTodo({ ...sampleTodo, text: 'Done' })
      const doneId = useTodoStore.getState().todos[1].id
      useTodoStore.getState().toggleTodo(doneId)
      useTodoStore.getState().setViewTab('active')
      expect(useTodoStore.getState().getFilteredTodos()).toHaveLength(1)
      useTodoStore.getState().setViewTab('completed')
      expect(useTodoStore.getState().getFilteredTodos()).toHaveLength(1)
      useTodoStore.getState().setViewTab('all')
      expect(useTodoStore.getState().getFilteredTodos()).toHaveLength(2)
    })

    it('filters by search query in text', () => {
      useTodoStore.getState().addTodo(sampleTodo)
      useTodoStore.getState().addTodo({ ...sampleTodo, text: 'Buy milk' })
      useTodoStore.getState().setSearchQuery('milk')
      expect(useTodoStore.getState().getFilteredTodos()).toHaveLength(1)
      expect(useTodoStore.getState().getFilteredTodos()[0].text).toBe('Buy milk')
    })

    it('filters by search query in tags', () => {
      useTodoStore.getState().addTodo({ ...sampleTodo, tags: ['urgent'] })
      useTodoStore.getState().addTodo(sampleTodo)
      useTodoStore.getState().setSearchQuery('urgent')
      expect(useTodoStore.getState().getFilteredTodos()).toHaveLength(1)
    })

    it('filters by category', () => {
      useTodoStore.getState().addTodo(sampleTodo)
      useTodoStore.getState().addTodo({ ...sampleTodo, category: 'Health' })
      useTodoStore.getState().setCategoryFilter('Health')
      expect(useTodoStore.getState().getFilteredTodos()).toHaveLength(1)
    })

    it('sorts by priority', () => {
      useTodoStore.getState().addTodo({ ...sampleTodo, priority: 'Low' })
      useTodoStore.getState().addTodo({ ...sampleTodo, text: 'High', priority: 'High' })
      useTodoStore.getState().addTodo({ ...sampleTodo, text: 'Med', priority: 'Medium' })
      useTodoStore.getState().setSortBy('priority')
      const filtered = useTodoStore.getState().getFilteredTodos()
      expect(filtered[0].priority).toBe('High')
      expect(filtered[1].priority).toBe('Medium')
      expect(filtered[2].priority).toBe('Low')
    })

    it('sorts alphabetically', () => {
      useTodoStore.getState().addTodo({ ...sampleTodo, text: 'Banana' })
      useTodoStore.getState().addTodo({ ...sampleTodo, text: 'Apple' })
      useTodoStore.getState().addTodo({ ...sampleTodo, text: 'Cherry' })
      useTodoStore.getState().setSortBy('alpha')
      const filtered = useTodoStore.getState().getFilteredTodos()
      expect(filtered[0].text).toBe('Apple')
      expect(filtered[1].text).toBe('Banana')
      expect(filtered[2].text).toBe('Cherry')
    })
  })

  describe('getStats', () => {
    it('returns correct stats', () => {
      useTodoStore.getState().addTodo(sampleTodo)
      useTodoStore.getState().addTodo({ ...sampleTodo, text: 'Done' })
      const doneId = useTodoStore.getState().todos[1].id
      useTodoStore.getState().toggleTodo(doneId)
      const stats = useTodoStore.getState().getStats()
      expect(stats.total).toBe(2)
      expect(stats.completed).toBe(1)
      expect(stats.active).toBe(1)
      expect(stats.percent).toBe(50)
    })

    it('returns 0% when no todos', () => {
      const stats = useTodoStore.getState().getStats()
      expect(stats.total).toBe(0)
      expect(stats.percent).toBe(0)
    })
  })

  describe('bulkCategorize', () => {
    it('categorizes multiple selected todos', () => {
      useTodoStore.setState({
        todos: [
          { id: '1', text: 'A', category: 'Work', completed: false, priority: 'Medium', dueDate: null, notes: '', tags: [], subtasks: [], recurrence: 'none', createdAt: new Date().toISOString() },
          { id: '2', text: 'B', category: 'Personal', completed: false, priority: 'Low', dueDate: null, notes: '', tags: [], subtasks: [], recurrence: 'none', createdAt: new Date().toISOString() },
        ],
        selectedIds: ['1', '2'],
      })
      useTodoStore.getState().bulkCategorize('Health')
      const { todos } = useTodoStore.getState()
      expect(todos[0].category).toBe('Health')
      expect(todos[1].category).toBe('Health')
    })
  })

  describe('snoozeTodo', () => {
    it('snoozes a todo by 1 day', () => {
      const tomorrow = new Date()
      tomorrow.setDate(tomorrow.getDate() + 1)
      const todayStr = tomorrow.toISOString().split('T')[0]
      useTodoStore.setState({
        todos: [
          { id: '1', text: 'Snooze me', category: 'Work', completed: false, priority: 'Medium', dueDate: todayStr, notes: '', tags: [], subtasks: [], recurrence: 'none', createdAt: new Date().toISOString() },
        ],
      })
      useTodoStore.getState().snoozeTodo('1')
      const { todos } = useTodoStore.getState()
      expect(todos[0].dueDate).not.toBe(todayStr)
    })
  })

  describe('clearCompleted', () => {
    it('removes all completed todos', () => {
      useTodoStore.setState({
        todos: [
          { id: '1', text: 'Done', completed: true, category: 'Work', priority: 'Medium', dueDate: null, notes: '', tags: [], subtasks: [], recurrence: 'none', createdAt: new Date().toISOString() },
          { id: '2', text: 'Active', completed: false, category: 'Work', priority: 'Medium', dueDate: null, notes: '', tags: [], subtasks: [], recurrence: 'none', createdAt: new Date().toISOString() },
        ],
      })
      useTodoStore.getState().clearCompleted()
      const { todos } = useTodoStore.getState()
      expect(todos).toHaveLength(1)
      expect(todos[0].id).toBe('2')
    })
  })
})
