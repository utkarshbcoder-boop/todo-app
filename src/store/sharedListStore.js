import { create } from 'zustand'
import { toast } from 'sonner'
import { getAccessToken } from './userStore'

export const useSharedListStore = create((set, get) => ({
  lists: [],
  loading: false,
  error: null,

  fetchLists: async () => {
    try {
      set({ loading: true, error: null })
      const token = getAccessToken()
      const res = await fetch('/api/shared-lists', {
        headers: { Authorization: `Bearer ${token}` }
      })
      if (!res.ok) throw new Error('Failed to fetch lists')
      const data = await res.json()
      set({ lists: data.lists, loading: false })
    } catch (err) {
      set({ error: err.message, loading: false })
    }
  },

  createList: async (name) => {
    try {
      const token = getAccessToken()
      const res = await fetch('/api/shared-lists', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
        body: JSON.stringify({ name })
      })
      if (!res.ok) throw new Error('Failed to create list')
      const newList = await res.json()
      set({ lists: [...get().lists, newList] })
      toast.success('List created!')
    } catch (err) {
      toast.error(err.message)
    }
  },

  deleteList: async (id) => {
    try {
      const token = getAccessToken()
      const res = await fetch(`/api/shared-lists/${id}`, {
        method: 'DELETE',
        headers: { Authorization: `Bearer ${token}` }
      })
      if (!res.ok) throw new Error('Failed to delete list')
      set({ lists: get().lists.filter(l => l.id !== id) })
      toast.success('List deleted')
    } catch (err) {
      toast.error(err.message)
    }
  },

  addMember: async (listId, email) => {
    try {
      const token = getAccessToken()
      const res = await fetch(`/api/shared-lists/${listId}/members`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
        body: JSON.stringify({ email })
      })
      if (!res.ok) {
        const data = await res.json()
        throw new Error(data.error || 'Failed to add member')
      }
      const newMember = await res.json()
      set({
        lists: get().lists.map(l => l.id === listId ? { ...l, members: [...l.members, newMember] } : l)
      })
      toast.success('Member added!')
    } catch (err) {
      toast.error(err.message)
    }
  },

  removeMember: async (listId, userId) => {
    try {
      const token = getAccessToken()
      const res = await fetch(`/api/shared-lists/${listId}/members/${userId}`, {
        method: 'DELETE',
        headers: { Authorization: `Bearer ${token}` }
      })
      if (!res.ok) throw new Error('Failed to remove member')
      set({
        lists: get().lists.map(l => l.id === listId ? { ...l, members: l.members.filter(m => m.userId !== userId) } : l)
      })
      toast.success('Member removed')
    } catch (err) {
      toast.error(err.message)
    }
  },

  addTodo: async (listId, todoData) => {
    try {
      const token = getAccessToken()
      const res = await fetch(`/api/shared-lists/${listId}/todos`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
        body: JSON.stringify(todoData)
      })
      if (!res.ok) throw new Error('Failed to add todo')
      const newTodo = await res.json()
      set({
        lists: get().lists.map(l => l.id === listId ? { ...l, todos: [...l.todos, newTodo] } : l)
      })
    } catch (err) {
      toast.error(err.message)
    }
  },

  toggleTodo: async (listId, todoId, currentCompletedStatus) => {
    try {
      const token = getAccessToken()
      const res = await fetch(`/api/shared-lists/${listId}/todos/${todoId}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
        body: JSON.stringify({ completed: !currentCompletedStatus })
      })
      if (!res.ok) throw new Error('Failed to update todo')
      const updatedTodo = await res.json()
      set({
        lists: get().lists.map(l => l.id === listId ? {
          ...l, todos: l.todos.map(t => t.id === todoId ? updatedTodo : t)
        } : l)
      })
    } catch (err) {
      toast.error(err.message)
    }
  },

  deleteTodo: async (listId, todoId) => {
    try {
      const token = getAccessToken()
      const res = await fetch(`/api/shared-lists/${listId}/todos/${todoId}`, {
        method: 'DELETE',
        headers: { Authorization: `Bearer ${token}` }
      })
      if (!res.ok) throw new Error('Failed to delete todo')
      set({
        lists: get().lists.map(l => l.id === listId ? {
          ...l, todos: l.todos.filter(t => t.id !== todoId)
        } : l)
      })
    } catch (err) {
      toast.error(err.message)
    }
  }
}))
