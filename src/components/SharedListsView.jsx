import { useEffect, useState } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { useSharedListStore } from '../store/sharedListStore'
import { useUserStore } from '../store/userStore'
import { categoryIcons, priorityColors } from '../constants'

export default function SharedListsView() {
  const { lists, fetchLists, createList, deleteList, addMember, removeMember, addTodo, toggleTodo, deleteTodo, loading, error } = useSharedListStore()
  const user = useUserStore(s => s.user)
  const [newListName, setNewListName] = useState('')
  const [activeListId, setActiveListId] = useState(null)
  const [newTodoText, setNewTodoText] = useState('')
  const [inviteEmail, setInviteEmail] = useState('')

  useEffect(() => {
    fetchLists()
  }, [fetchLists])

  // Default to first list if none selected
  useEffect(() => {
    if (lists.length > 0 && !activeListId) {
      setActiveListId(lists[0].id)
    } else if (lists.length === 0 && activeListId) {
      setActiveListId(null)
    }
  }, [lists, activeListId])

  const handleCreateList = (e) => {
    e.preventDefault()
    if (!newListName.trim()) return
    createList(newListName.trim())
    setNewListName('')
  }

  const activeList = lists.find(l => l.id === activeListId)

  if (loading && lists.length === 0) {
    return (
      <div className="space-y-4 py-4 animate-pulse">
        <div className="h-10 bg-gray-200 dark:bg-gray-700 rounded-xl w-1/3 mx-auto" />
        <div className="h-64 bg-gray-100 dark:bg-gray-800 rounded-2xl" />
      </div>
    )
  }

  return (
    <div className="space-y-6">
      <div className="text-center">
        <h2 className="text-lg font-bold text-gray-900 dark:text-white flex items-center justify-center gap-2">
          <span>🤝</span> Shared Lists
        </h2>
        <p className="text-xs text-gray-400 dark:text-gray-500 mt-1">Collaborate on tasks with others</p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
        {/* Sidebar: List of lists */}
        <div className="md:col-span-1 space-y-4">
          <form onSubmit={handleCreateList} className="flex gap-2">
            <input
              type="text"
              value={newListName}
              onChange={(e) => setNewListName(e.target.value)}
              placeholder="New list..."
              className="w-full px-3 py-2 text-sm bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-xl focus:outline-none focus:ring-2 focus:ring-indigo-500"
            />
            <button
              type="submit"
              disabled={!newListName.trim()}
              className="px-3 py-2 bg-indigo-600 text-white rounded-xl hover:bg-indigo-700 disabled:opacity-50 text-sm font-medium"
            >
              +
            </button>
          </form>

          <div className="space-y-2">
            {lists.length === 0 ? (
              <p className="text-xs text-gray-500 text-center py-4">No shared lists yet.</p>
            ) : (
              lists.map(list => (
                <button
                  key={list.id}
                  onClick={() => setActiveListId(list.id)}
                  className={`w-full text-left px-3 py-2 rounded-xl text-sm font-medium transition-all flex items-center justify-between ${
                    activeListId === list.id
                      ? 'bg-indigo-100 dark:bg-indigo-900/40 text-indigo-700 dark:text-indigo-300'
                      : 'bg-white dark:bg-gray-800 text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-700/50 border border-transparent'
                  }`}
                >
                  <span className="truncate">{list.name}</span>
                  <span className="text-[10px] px-1.5 py-0.5 rounded-full bg-black/5 dark:bg-white/10">
                    {list.todos?.length || 0}
                  </span>
                </button>
              ))
            )}
          </div>
        </div>

        {/* Main Content: Active List */}
        <div className="md:col-span-3 bg-white dark:bg-gray-800 rounded-2xl shadow-sm border border-gray-200 dark:border-gray-700 p-4 md:p-6 min-h-[400px]">
          {activeList ? (
            <div className="space-y-6">
              {/* List Header */}
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-gray-100 dark:border-gray-700 pb-4">
                <div>
                  <h3 className="text-xl font-bold text-gray-900 dark:text-white flex items-center gap-2">
                    {activeList.name}
                  </h3>
                  <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
                    Owned by {activeList.ownerId === user?.id ? 'you' : activeList.owner?.name || 'Someone'}
                  </p>
                </div>
                
                {activeList.ownerId === user?.id && (
                  <button
                    onClick={() => {
                      if (confirm('Are you sure you want to delete this list?')) {
                        deleteList(activeList.id)
                      }
                    }}
                    className="text-xs text-red-500 hover:text-red-700 px-3 py-1.5 rounded-lg hover:bg-red-50 dark:hover:bg-red-900/20 transition-colors"
                  >
                    Delete List
                  </button>
                )}
              </div>

              {/* Members Section */}
              <div className="bg-gray-50 dark:bg-gray-900/50 rounded-xl p-4">
                <h4 className="text-sm font-semibold text-gray-700 dark:text-gray-300 mb-3">Members</h4>
                <div className="flex flex-wrap gap-2 mb-3">
                  {/* Owner */}
                  <div className="flex items-center gap-2 bg-white dark:bg-gray-800 px-2 py-1 rounded-full border border-gray-200 dark:border-gray-700">
                    {activeList.owner?.picture && <img src={activeList.owner.picture} className="w-5 h-5 rounded-full" alt="" />}
                    <span className="text-xs font-medium">{activeList.owner?.name || 'Owner'} <span className="text-[10px] text-gray-400">(Owner)</span></span>
                  </div>
                  
                  {/* Other Members */}
                  {activeList.members?.map(m => (
                    <div key={m.userId} className="flex items-center gap-2 bg-white dark:bg-gray-800 px-2 py-1 rounded-full border border-gray-200 dark:border-gray-700 group">
                      {m.user?.picture && <img src={m.user.picture} className="w-5 h-5 rounded-full" alt="" />}
                      <span className="text-xs font-medium">{m.user?.name}</span>
                      {(activeList.ownerId === user?.id || m.userId === user?.id) && (
                        <button
                          onClick={() => removeMember(activeList.id, m.userId)}
                          className="w-4 h-4 rounded-full bg-red-100 text-red-500 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity"
                        >
                          ×
                        </button>
                      )}
                    </div>
                  ))}
                </div>

                {activeList.ownerId === user?.id && (
                  <form onSubmit={(e) => { e.preventDefault(); if (inviteEmail) { addMember(activeList.id, inviteEmail); setInviteEmail(''); } }} className="flex gap-2 max-w-sm">
                    <input
                      type="email"
                      value={inviteEmail}
                      onChange={(e) => setInviteEmail(e.target.value)}
                      placeholder="Invite by email..."
                      className="flex-1 px-3 py-1.5 text-xs bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg focus:outline-none focus:ring-1 focus:ring-indigo-500"
                    />
                    <button type="submit" disabled={!inviteEmail} className="px-3 py-1.5 bg-indigo-100 text-indigo-700 dark:bg-indigo-900/30 dark:text-indigo-400 rounded-lg text-xs font-medium hover:bg-indigo-200 dark:hover:bg-indigo-900/50">
                      Invite
                    </button>
                  </form>
                )}
              </div>

              {/* Todos Section */}
              <div>
                <form onSubmit={(e) => { e.preventDefault(); if (newTodoText) { addTodo(activeList.id, { text: newTodoText }); setNewTodoText(''); } }} className="mb-4">
                  <input
                    type="text"
                    value={newTodoText}
                    onChange={(e) => setNewTodoText(e.target.value)}
                    placeholder="Add a task to this list..."
                    className="w-full px-4 py-3 bg-gray-50 dark:bg-gray-900 border border-gray-200 dark:border-gray-700 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
                  />
                </form>

                <div className="space-y-2">
                  {(!activeList.todos || activeList.todos.length === 0) ? (
                    <p className="text-center text-sm text-gray-500 py-8">No tasks in this list yet.</p>
                  ) : (
                    activeList.todos.map(todo => (
                      <motion.div
                        key={todo.id}
                        initial={{ opacity: 0, y: 5 }}
                        animate={{ opacity: 1, y: 0 }}
                        className={`flex items-center gap-3 p-3 rounded-xl border transition-colors ${
                          todo.completed
                            ? 'bg-gray-50 dark:bg-gray-800/50 border-transparent opacity-60'
                            : 'bg-white dark:bg-gray-800 border-gray-200 dark:border-gray-700'
                        }`}
                      >
                        <button
                          onClick={() => toggleTodo(activeList.id, todo.id, todo.completed)}
                          className={`w-5 h-5 rounded-md flex items-center justify-center border transition-colors ${
                            todo.completed ? 'bg-indigo-500 border-indigo-500 text-white' : 'border-gray-300 dark:border-gray-600 text-transparent hover:border-indigo-400'
                          }`}
                        >
                          <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={3}>
                            <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
                          </svg>
                        </button>
                        
                        <span className={`flex-1 text-sm font-medium ${todo.completed ? 'line-through text-gray-500' : 'text-gray-800 dark:text-gray-200'}`}>
                          {todo.text}
                        </span>

                        <button
                          onClick={() => { if (confirm('Delete this task?')) deleteTodo(activeList.id, todo.id) }}
                          className="p-1.5 text-gray-400 hover:text-red-500 rounded-lg hover:bg-red-50 dark:hover:bg-red-900/20 transition-colors"
                        >
                          <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                            <path strokeLinecap="round" strokeLinejoin="round" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                          </svg>
                        </button>
                      </motion.div>
                    ))
                  )}
                </div>
              </div>
            </div>
          ) : (
            <div className="flex flex-col items-center justify-center h-full text-center opacity-50 py-12">
              <span className="text-4xl mb-3">👈</span>
              <p className="text-sm font-medium">Select a shared list or create a new one</p>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
