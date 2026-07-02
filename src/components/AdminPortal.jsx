import { useState, useEffect, useCallback } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { toast } from 'sonner'
import { useAdminStore } from '../store/adminStore'
import { useUserStore } from '../store/userStore'

export default function AdminPortal({ onClose }) {
  const { features, toggleFeature, addFeature, removeFeature, resetFeatures, logout: adminLogout } = useAdminStore()
  const { fetchWithAuth } = useUserStore()
  const [activeTab, setActiveTab] = useState('overview')
  const [users, setUsers] = useState([])
  const [stats, setStats] = useState(null)
  const [selectedUser, setSelectedUser] = useState(null)
  const [userTodos, setUserTodos] = useState([])
  const [userDetails, setUserDetails] = useState(null)
  const [loading, setLoading] = useState(true)
  const [searchQuery, setSearchQuery] = useState('')
  const [filterStatus, setFilterStatus] = useState('all')
  const [showAddFeature, setShowAddFeature] = useState(false)
  const [newFeature, setNewFeature] = useState({ key: '', name: '', description: '' })
  const [editingTodo, setEditingTodo] = useState(null)
  const [userSubTab, setUserSubTab] = useState('list')

  const fetchUsers = useCallback(async () => {
    const res = await fetchWithAuth('/admin/users')
    if (res.ok) setUsers(res.data?.users || [])
    else toast.error(res.error || 'Failed to fetch users')
    setLoading(false)
  }, [fetchWithAuth])

  const fetchStats = useCallback(async () => {
    const res = await fetchWithAuth('/admin/stats')
    if (res.ok) setStats(res.data?.stats)
    else toast.error(res.error || 'Failed to fetch stats')
  }, [fetchWithAuth])

  const fetchUserDetails = useCallback(async (userId) => {
    const res = await fetchWithAuth(`/admin/user/${userId}`)
    if (res.ok) {
      setUserDetails(res.data)
      setSelectedUser(res.data.user)
      setUserTodos(res.data.todos || [])
      setUserSubTab('todos')
    } else {
      toast.error(res.error || 'Failed to fetch user details')
    }
  }, [fetchWithAuth])

  const updateUserStatus = useCallback(async (userId, status) => {
    const res = await fetchWithAuth(`/admin/user/${userId}`, {
      method: 'PUT', body: JSON.stringify({ status }),
    })
    if (res.ok) {
      toast.success('User status updated')
      fetchUsers()
      if (selectedUser?.id === userId) fetchUserDetails(userId)
    } else {
      toast.error(res.error || 'Failed to update user')
    }
  }, [fetchWithAuth, fetchUsers, selectedUser, fetchUserDetails])

  const updateUserRole = useCallback(async (userId, role) => {
    const res = await fetchWithAuth(`/admin/user/${userId}`, {
      method: 'PUT', body: JSON.stringify({ role }),
    })
    if (res.ok) {
      toast.success('User role updated')
      fetchUsers()
      if (selectedUser?.id === userId) fetchUserDetails(userId)
    } else {
      toast.error(res.error || 'Failed to update user role')
    }
  }, [fetchWithAuth, fetchUsers, selectedUser, fetchUserDetails])

  const deleteUser = useCallback(async (userId) => {
    if (!confirm('Are you sure? This will delete the user and ALL their data permanently.')) return
    const res = await fetchWithAuth(`/admin/user/${userId}`, { method: 'DELETE' })
    if (res.ok) {
      toast.success('User deleted')
      setUsers(users.filter(u => u.id !== userId))
      setSelectedUser(null)
      setUserDetails(null)
      fetchStats()
    } else {
      toast.error(res.error || 'Failed to delete user')
    }
  }, [fetchWithAuth, users, fetchStats])

  const updateTodo = useCallback(async (userId, todoId, updates) => {
    const res = await fetchWithAuth(`/admin/user/${userId}/todo/${todoId}`, {
      method: 'PUT', body: JSON.stringify(updates),
    })
    if (res.ok) {
      setUserTodos(todos => todos.map(t => t.id === todoId ? { ...t, ...updates } : t))
    } else {
      toast.error(res.error || 'Failed to update todo')
    }
  }, [fetchWithAuth])

  const deleteTodo = useCallback(async (userId, todoId) => {
    if (!confirm('Delete this todo permanently?')) return
    const res = await fetchWithAuth(`/admin/user/${userId}/todo/${todoId}`, { method: 'DELETE' })
    if (res.ok) {
      toast.success('Todo deleted')
      setUserTodos(todos => todos.filter(t => t.id !== todoId))
    } else {
      toast.error(res.error || 'Failed to delete todo')
    }
  }, [fetchWithAuth])

  const handleAddFeature = (e) => {
    e.preventDefault()
    if (newFeature.key && newFeature.name) {
      addFeature(newFeature.key, newFeature.name, newFeature.description)
      setNewFeature({ key: '', name: '', description: '' })
      setShowAddFeature(false)
    }
  }

  const handleLogout = () => {
    adminLogout()
    onClose?.()
  }

  useEffect(() => {
    let cancelled = false
    const loadAll = async () => {
      await Promise.all([fetchUsers(), fetchStats()])
    }
    if (!cancelled) loadAll()
    return () => { cancelled = true }
  }, [fetchUsers, fetchStats])

  const filteredUsers = users.filter(user => {
    const matchesSearch = user.name?.toLowerCase().includes(searchQuery.toLowerCase()) ||
      user.email?.toLowerCase().includes(searchQuery.toLowerCase())
    const matchesStatus = filterStatus === 'all' || user.status === filterStatus
    return matchesSearch && matchesStatus
  })

  const formatDate = (dateString) => {
    if (!dateString) return 'N/A'
    return new Date(dateString).toLocaleDateString('en-US', {
      year: 'numeric', month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit',
    })
  }

  const getStatusColor = (status) => {
    switch (status) {
      case 'active': return 'bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-400'
      case 'banned': return 'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400'
      case 'suspended': return 'bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400'
      default: return 'bg-gray-100 text-gray-700 dark:bg-gray-900/30 dark:text-gray-400'
    }
  }

  return (
    <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
      className="fixed inset-0 z-50 bg-black/50 backdrop-blur-sm flex items-center justify-center p-4">
      <motion.div initial={{ scale: 0.95, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} exit={{ scale: 0.95, opacity: 0 }}
        className="w-full max-w-5xl max-h-[90vh] bg-white dark:bg-gray-800 rounded-3xl shadow-2xl border border-gray-200 dark:border-gray-700 overflow-hidden flex flex-col">

        <div className="p-6 border-b border-gray-200 dark:border-gray-700 shrink-0">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 bg-indigo-600 rounded-xl flex items-center justify-center">
                <svg className="w-5 h-5 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z" />
                  <path strokeLinecap="round" strokeLinejoin="round" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                </svg>
              </div>
              <div>
                <h2 className="text-xl font-bold text-gray-900 dark:text-white">Admin Portal</h2>
                <p className="text-sm text-gray-500 dark:text-gray-400">Full control over users, todos, and features</p>
              </div>
            </div>
            <div className="flex items-center gap-2">
              <button onClick={() => { fetchUsers(); fetchStats() }}
                className="p-2 text-gray-400 hover:text-indigo-600 dark:hover:text-indigo-400 rounded-lg cursor-pointer" title="Refresh">
                <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
                </svg>
              </button>
              <button onClick={handleLogout}
                className="px-4 py-2 text-sm font-medium text-gray-600 dark:text-gray-400 hover:text-red-600 dark:hover:text-red-400 hover:bg-red-50 dark:hover:bg-red-900/20 rounded-xl transition-colors cursor-pointer">
                Logout
              </button>
            </div>
          </div>
        </div>

        <div className="flex border-b border-gray-200 dark:border-gray-700 shrink-0">
          {['overview', 'users', 'features'].map(tab => (
            <button key={tab} onClick={() => setActiveTab(tab)}
              className={`flex-1 px-4 py-3 font-medium text-sm border-b-2 transition-colors ${
                activeTab === tab ? 'border-indigo-600 text-indigo-600 dark:text-indigo-400' : 'border-transparent text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-300'
              }`}>
              {tab === 'overview' ? 'Overview' : tab === 'users' ? 'Users & Todos' : 'Feature Flags'}
            </button>
          ))}
        </div>

        <div className="p-6 overflow-y-auto flex-1">
          {activeTab === 'overview' && (
            <div className="space-y-6">
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                <div className="bg-indigo-50 dark:bg-indigo-900/20 rounded-2xl p-4">
                  <p className="text-sm text-indigo-600 dark:text-indigo-400 font-medium">Total Users</p>
                  <p className="text-2xl font-bold text-indigo-700 dark:text-indigo-300">{stats?.totalUsers || 0}</p>
                </div>
                <div className="bg-emerald-50 dark:bg-emerald-900/20 rounded-2xl p-4">
                  <p className="text-sm text-emerald-600 dark:text-emerald-400 font-medium">Active Users</p>
                  <p className="text-2xl font-bold text-emerald-700 dark:text-emerald-300">{stats?.activeUsers || 0}</p>
                </div>
                <div className="bg-amber-50 dark:bg-amber-900/20 rounded-2xl p-4">
                  <p className="text-sm text-amber-600 dark:text-amber-400 font-medium">Total Todos</p>
                  <p className="text-2xl font-bold text-amber-700 dark:text-amber-300">{stats?.totalTodos || 0}</p>
                </div>
                <div className="bg-red-50 dark:bg-red-900/20 rounded-2xl p-4">
                  <p className="text-sm text-red-600 dark:text-red-400 font-medium">Banned</p>
                  <p className="text-2xl font-bold text-red-700 dark:text-red-300">{stats?.bannedUsers || 0}</p>
                </div>
              </div>
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                <div className="bg-gray-50 dark:bg-gray-700/50 rounded-2xl p-4">
                  <p className="text-sm text-gray-600 dark:text-gray-400 font-medium">Completed Todos</p>
                  <p className="text-2xl font-bold text-gray-700 dark:text-gray-300">{stats?.completedTodos || 0}</p>
                </div>
                <div className="bg-gray-50 dark:bg-gray-700/50 rounded-2xl p-4">
                  <p className="text-sm text-gray-600 dark:text-gray-400 font-medium">New This Week</p>
                  <p className="text-2xl font-bold text-gray-700 dark:text-gray-300">{stats?.newUsersThisWeek || 0}</p>
                </div>
                <div className="bg-gray-50 dark:bg-gray-700/50 rounded-2xl p-4">
                  <p className="text-sm text-gray-600 dark:text-gray-400 font-medium">Recent Logins</p>
                  <p className="text-2xl font-bold text-gray-700 dark:text-gray-300">{stats?.recentLogins || 0}</p>
                </div>
                <div className="bg-gray-50 dark:bg-gray-700/50 rounded-2xl p-4">
                  <p className="text-sm text-gray-600 dark:text-gray-400 font-medium">Active Todos</p>
                  <p className="text-2xl font-bold text-gray-700 dark:text-gray-300">{stats?.activeTodos || 0}</p>
                </div>
              </div>

              <div className="bg-gray-50 dark:bg-gray-700/50 rounded-2xl p-6">
                <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">Quick Actions</h3>
                <div className="grid grid-cols-2 gap-3">
                  <button onClick={() => setActiveTab('users')}
                    className="p-4 bg-white dark:bg-gray-600 rounded-xl border border-gray-200 dark:border-gray-500 hover:border-indigo-300 dark:hover:border-indigo-500 transition-colors text-left">
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 bg-indigo-100 dark:bg-indigo-900/30 rounded-lg flex items-center justify-center">
                        <svg className="w-5 h-5 text-indigo-600 dark:text-indigo-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                          <path strokeLinecap="round" strokeLinejoin="round" d="M12 4.354a4 4 0 110 5.292M15 21H3v-1a6 6 0 0112 0v1zm0 0h6v-1a6 6 0 00-9-5.197M13 7a4 4 0 11-8 0 4 4 0 018 0z" />
                        </svg>
                      </div>
                      <div>
                        <p className="font-medium text-gray-900 dark:text-white">Manage Users</p>
                        <p className="text-sm text-gray-500 dark:text-gray-400">{users.length} users registered</p>
                      </div>
                    </div>
                  </button>
                  <button onClick={() => setActiveTab('features')}
                    className="p-4 bg-white dark:bg-gray-600 rounded-xl border border-gray-200 dark:border-gray-500 hover:border-indigo-300 dark:hover:border-indigo-500 transition-colors text-left">
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 bg-emerald-100 dark:bg-emerald-900/30 rounded-lg flex items-center justify-center">
                        <svg className="w-5 h-5 text-emerald-600 dark:text-emerald-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                          <path strokeLinecap="round" strokeLinejoin="round" d="M12 6V4m0 2a2 2 0 100 4m0-4a2 2 0 110 4m-6 8a2 2 0 100-4m0 4a2 2 0 110-4m0 4v2m0-6V4m6 6v10m6-2a2 2 0 100-4m0 4a2 2 0 110-4m0 4v2m0-6V4" />
                        </svg>
                      </div>
                      <div>
                        <p className="font-medium text-gray-900 dark:text-white">Feature Flags</p>
                        <p className="text-sm text-gray-500 dark:text-gray-400">{Object.values(features).filter(f => f.enabled).length}/{Object.keys(features).length} enabled</p>
                      </div>
                    </div>
                  </button>
                </div>
              </div>
            </div>
          )}

          {activeTab === 'users' && (
            <div className="space-y-4">
              {loading ? (
                <div className="flex items-center justify-center p-8">
                  <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-indigo-600" />
                </div>
              ) : (
                <>
                  {!selectedUser ? (
                    <>
                      <div className="flex flex-col sm:flex-row gap-3">
                        <input type="text" placeholder="Search users by name or email..." value={searchQuery}
                          onChange={(e) => setSearchQuery(e.target.value)}
                          className="flex-1 px-4 py-2 bg-gray-50 dark:bg-gray-700 border border-gray-200 dark:border-gray-600 rounded-xl text-gray-900 dark:text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-indigo-500" />
                        <select value={filterStatus} onChange={(e) => setFilterStatus(e.target.value)}
                          className="px-4 py-2 bg-gray-50 dark:bg-gray-700 border border-gray-200 dark:border-gray-600 rounded-xl text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-indigo-500">
                          <option value="all">All Status</option>
                          <option value="active">Active</option>
                          <option value="banned">Banned</option>
                          <option value="suspended">Suspended</option>
                        </select>
                      </div>

                      <div className="bg-gray-50 dark:bg-gray-700/50 rounded-xl overflow-hidden">
                        <div className="overflow-x-auto">
                          <table className="w-full">
                            <thead>
                              <tr className="border-b border-gray-200 dark:border-gray-600">
                                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase">User</th>
                                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase">Status</th>
                                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase">Role</th>
                                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase">Todos</th>
                                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase">Joined</th>
                                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase">Actions</th>
                              </tr>
                            </thead>
                            <tbody className="divide-y divide-gray-200 dark:divide-gray-600">
                              {filteredUsers.map(user => (
                                <tr key={user.id} className="hover:bg-gray-100 dark:hover:bg-gray-600/50">
                                  <td className="px-4 py-3">
                                    <div className="flex items-center gap-3">
                                      {user.picture ? (
                                        <img src={user.picture} alt={user.name} className="w-10 h-10 rounded-full" />
                                      ) : (
                                        <div className="w-10 h-10 rounded-full bg-indigo-100 dark:bg-indigo-900/30 flex items-center justify-center">
                                          <span className="text-indigo-600 dark:text-indigo-400 font-medium">{user.name?.charAt(0).toUpperCase() || '?'}</span>
                                        </div>
                                      )}
                                      <div>
                                        <p className="font-medium text-gray-900 dark:text-white">{user.name}</p>
                                        <p className="text-sm text-gray-500 dark:text-gray-400">{user.email}</p>
                                      </div>
                                    </div>
                                  </td>
                                  <td className="px-4 py-3">
                                    <span className={`px-2 py-1 text-xs font-medium rounded-full ${getStatusColor(user.status)}`}>{user.status || 'active'}</span>
                                  </td>
                                  <td className="px-4 py-3">
                                    <select value={user.role || 'user'} onChange={(e) => updateUserRole(user.id, e.target.value)}
                                      className="px-2 py-1 bg-white dark:bg-gray-600 border border-gray-200 dark:border-gray-500 rounded-lg text-xs text-gray-900 dark:text-white">
                                      <option value="user">User</option>
                                      <option value="moderator">Moderator</option>
                                      <option value="admin">Admin</option>
                                    </select>
                                  </td>
                                  <td className="px-4 py-3">
                                    <span className="text-sm text-gray-700 dark:text-gray-300">{user.todoCount || 0}</span>
                                  </td>
                                  <td className="px-4 py-3">
                                    <span className="text-sm text-gray-500 dark:text-gray-400">{formatDate(user.createdAt)}</span>
                                  </td>
                                  <td className="px-4 py-3">
                                    <div className="flex items-center gap-1">
                                      <button onClick={() => fetchUserDetails(user.id)}
                                        className="p-1.5 text-gray-400 hover:text-indigo-600 dark:hover:text-indigo-400 rounded-lg" title="View Details & Todos">
                                        <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                                          <path strokeLinecap="round" strokeLinejoin="round" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                                          <path strokeLinecap="round" strokeLinejoin="round" d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
                                        </svg>
                                      </button>
                                      {user.status !== 'banned' ? (
                                        <button onClick={() => updateUserStatus(user.id, 'banned')}
                                          className="p-1.5 text-gray-400 hover:text-red-600 dark:hover:text-red-400 rounded-lg" title="Ban">
                                          <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                                            <path strokeLinecap="round" strokeLinejoin="round" d="M18.364 18.364A9 9 0 005.636 5.636m12.728 12.728A9 9 0 015.636 5.636m12.728 12.728L5.636 5.636" />
                                          </svg>
                                        </button>
                                      ) : (
                                        <button onClick={() => updateUserStatus(user.id, 'active')}
                                          className="p-1.5 text-gray-400 hover:text-emerald-600 dark:hover:text-emerald-400 rounded-lg" title="Unban">
                                          <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                                            <path strokeLinecap="round" strokeLinejoin="round" d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                                          </svg>
                                        </button>
                                      )}
                                      <button onClick={() => deleteUser(user.id)}
                                        className="p-1.5 text-gray-400 hover:text-red-600 dark:hover:text-red-400 rounded-lg" title="Delete">
                                        <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                                          <path strokeLinecap="round" strokeLinejoin="round" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                                        </svg>
                                      </button>
                                    </div>
                                  </td>
                                </tr>
                              ))}
                            </tbody>
                          </table>
                        </div>
                        {filteredUsers.length === 0 && (
                          <div className="p-8 text-center text-gray-500 dark:text-gray-400">No users found</div>
                        )}
                      </div>
                    </>
                  ) : (
                    <div className="space-y-4">
                      <button onClick={() => { setSelectedUser(null); setUserDetails(null); setUserTodos([]) }}
                        className="flex items-center gap-2 text-sm text-gray-500 dark:text-gray-400 hover:text-indigo-600 dark:hover:text-indigo-400 cursor-pointer">
                        <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                          <path strokeLinecap="round" strokeLinejoin="round" d="M15 19l-7-7 7-7" />
                        </svg>
                        Back to Users
                      </button>

                      <div className="bg-gray-50 dark:bg-gray-700/50 rounded-2xl p-6">
                        <div className="flex items-center gap-4 mb-4">
                          {selectedUser.picture ? (
                            <img src={selectedUser.picture} alt="" className="w-16 h-16 rounded-full" />
                          ) : (
                            <div className="w-16 h-16 rounded-full bg-indigo-100 dark:bg-indigo-900/30 flex items-center justify-center">
                              <span className="text-indigo-600 dark:text-indigo-400 text-xl font-medium">{selectedUser.name?.charAt(0).toUpperCase()}</span>
                            </div>
                          )}
                          <div>
                            <h3 className="text-xl font-semibold text-gray-900 dark:text-white">{selectedUser.name}</h3>
                            <p className="text-gray-500 dark:text-gray-400">{selectedUser.email}</p>
                            <span className={`inline-block mt-1 px-2 py-0.5 text-xs font-medium rounded-full ${getStatusColor(selectedUser.status)}`}>{selectedUser.status}</span>
                          </div>
                        </div>

                        <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mb-4">
                          <div className="bg-white dark:bg-gray-600 rounded-xl p-3">
                            <p className="text-xs text-gray-500 dark:text-gray-400">Role</p>
                            <select value={selectedUser.role} onChange={(e) => updateUserRole(selectedUser.id, e.target.value)}
                              className="mt-1 w-full px-2 py-1 bg-gray-50 dark:bg-gray-700 border border-gray-200 dark:border-gray-500 rounded-lg text-sm text-gray-900 dark:text-white">
                              <option value="user">User</option>
                              <option value="moderator">Moderator</option>
                              <option value="admin">Admin</option>
                            </select>
                          </div>
                          <div className="bg-white dark:bg-gray-600 rounded-xl p-3">
                            <p className="text-xs text-gray-500 dark:text-gray-400">Todos</p>
                            <p className="text-xl font-bold text-gray-900 dark:text-white">{userDetails?.stats?.totalTodos || 0}</p>
                          </div>
                          <div className="bg-white dark:bg-gray-600 rounded-xl p-3">
                            <p className="text-xs text-gray-500 dark:text-gray-400">Completed</p>
                            <p className="text-xl font-bold text-emerald-600 dark:text-emerald-400">{userDetails?.stats?.completedTodos || 0}</p>
                          </div>
                          <div className="bg-white dark:bg-gray-600 rounded-xl p-3">
                            <p className="text-xs text-gray-500 dark:text-gray-400">Logins</p>
                            <p className="text-xl font-bold text-gray-900 dark:text-white">{selectedUser.loginCount || 0}</p>
                          </div>
                        </div>

                        <div className="flex gap-2">
                          {selectedUser.status !== 'banned' ? (
                            <button onClick={() => updateUserStatus(selectedUser.id, 'banned')}
                              className="px-4 py-2 bg-red-100 dark:bg-red-900/20 hover:bg-red-200 dark:hover:bg-red-900/30 text-red-700 dark:text-red-400 font-medium rounded-xl text-sm cursor-pointer">Ban User</button>
                          ) : (
                            <button onClick={() => updateUserStatus(selectedUser.id, 'active')}
                              className="px-4 py-2 bg-emerald-100 dark:bg-emerald-900/20 hover:bg-emerald-200 dark:hover:bg-emerald-900/30 text-emerald-700 dark:text-emerald-400 font-medium rounded-xl text-sm cursor-pointer">Unban User</button>
                          )}
                          <button onClick={() => deleteUser(selectedUser.id)}
                            className="px-4 py-2 bg-red-600 hover:bg-red-700 text-white font-medium rounded-xl text-sm cursor-pointer">Delete User</button>
                        </div>
                      </div>

                      <div className="flex gap-2 border-b border-gray-200 dark:border-gray-700">
                        {['todos', 'activity'].map(tab => (
                          <button key={tab} onClick={() => setUserSubTab(tab)}
                            className={`px-4 py-2 font-medium text-sm border-b-2 transition-colors ${
                              userSubTab === tab ? 'border-indigo-600 text-indigo-600 dark:text-indigo-400' : 'border-transparent text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-300'
                            }`}>
                            {tab === 'todos' ? `Todos (${userTodos.length})` : 'Activity Log'}
                          </button>
                        ))}
                      </div>

                      {userSubTab === 'todos' && (
                        <div className="space-y-2">
                          {userTodos.length === 0 ? (
                            <div className="p-8 text-center text-gray-500 dark:text-gray-400 bg-gray-50 dark:bg-gray-700/50 rounded-xl">No todos yet</div>
                          ) : (
                            userTodos.map(todo => (
                              <div key={todo.id} className={`p-4 bg-gray-50 dark:bg-gray-700/50 rounded-xl flex items-center gap-3 ${todo.completed ? 'opacity-60' : ''}`}>
                                <button onClick={() => updateTodo(selectedUser.id, todo.id, { completed: !todo.completed })}
                                  className={`w-5 h-5 rounded-full border-2 flex items-center justify-center shrink-0 cursor-pointer ${
                                    todo.completed ? 'bg-emerald-500 border-emerald-500' : 'border-gray-300 dark:border-gray-500'
                                  }`}>
                                  {todo.completed && <svg className="w-3 h-3 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={3}><path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" /></svg>}
                                </button>
                                <div className="flex-1 min-w-0">
                                  <p className={`text-sm font-medium ${todo.completed ? 'line-through text-gray-500 dark:text-gray-400' : 'text-gray-900 dark:text-white'}`}>{todo.text}</p>
                                  <div className="flex gap-2 mt-1">
                                    <span className="text-xs px-2 py-0.5 bg-indigo-100 dark:bg-indigo-900/30 text-indigo-600 dark:text-indigo-400 rounded-full">{todo.category}</span>
                                    <span className="text-xs px-2 py-0.5 bg-gray-100 dark:bg-gray-600 text-gray-600 dark:text-gray-400 rounded-full">{todo.priority}</span>
                                    {todo.dueDate && <span className="text-xs text-gray-400 dark:text-gray-500">Due: {todo.dueDate}</span>}
                                  </div>
                                </div>
                                {editingTodo === todo.id ? (
                                  <div className="flex gap-1">
                                    <input type="text" defaultValue={todo.text}
                                      onBlur={(e) => { updateTodo(selectedUser.id, todo.id, { text: e.target.value }); setEditingTodo(null) }}
                                      onKeyDown={(e) => { if (e.key === 'Enter') { updateTodo(selectedUser.id, todo.id, { text: e.target.value }); setEditingTodo(null) } }}
                                      className="px-2 py-1 bg-white dark:bg-gray-600 border border-gray-200 dark:border-gray-500 rounded text-sm text-gray-900 dark:text-white w-48" autoFocus />
                                  </div>
                                ) : (
                                  <button onClick={() => setEditingTodo(todo.id)}
                                    className="p-1.5 text-gray-400 hover:text-indigo-600 dark:hover:text-indigo-400 rounded-lg" title="Edit">
                                    <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                                      <path strokeLinecap="round" strokeLinejoin="round" d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
                                    </svg>
                                  </button>
                                )}
                                <button onClick={() => deleteTodo(selectedUser.id, todo.id)}
                                  className="p-1.5 text-gray-400 hover:text-red-600 dark:hover:text-red-400 rounded-lg" title="Delete">
                                  <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                                    <path strokeLinecap="round" strokeLinejoin="round" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                                  </svg>
                                </button>
                              </div>
                            ))
                          )}
                        </div>
                      )}

                      {userSubTab === 'activity' && (
                        <div className="space-y-2">
                          {(userDetails?.activities || []).length === 0 ? (
                            <div className="p-8 text-center text-gray-500 dark:text-gray-400 bg-gray-50 dark:bg-gray-700/50 rounded-xl">No activity yet</div>
                          ) : (
                            userDetails?.activities?.map(activity => (
                              <div key={activity.id} className="flex items-center gap-3 p-3 bg-gray-50 dark:bg-gray-700/50 rounded-xl">
                                <div className="w-2 h-2 rounded-full bg-indigo-500 shrink-0" />
                                <div className="flex-1">
                                  <p className="text-sm text-gray-900 dark:text-white">{activity.action.replace(/_/g, ' ')}</p>
                                  <p className="text-xs text-gray-400 dark:text-gray-500">{formatDate(activity.createdAt)}</p>
                                </div>
                              </div>
                            ))
                          )}
                        </div>
                      )}
                    </div>
                  )}
                </>
              )}
            </div>
          )}

          {activeTab === 'features' && (
            <div className="space-y-4">
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-lg font-semibold text-gray-900 dark:text-white">Feature Flags</h3>
                <div className="flex gap-2">
                  <button onClick={() => setShowAddFeature(true)}
                    className="px-3 py-1.5 text-sm font-medium text-indigo-600 dark:text-indigo-400 hover:bg-indigo-50 dark:hover:bg-indigo-900/20 rounded-lg cursor-pointer">+ Add Feature</button>
                  <button onClick={resetFeatures}
                    className="px-3 py-1.5 text-sm font-medium text-gray-600 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg cursor-pointer">Reset All</button>
                </div>
              </div>

              <div className="space-y-2">
                {Object.entries(features).map(([key, feature]) => (
                  <motion.div key={key} layout className="flex items-center justify-between p-4 bg-gray-50 dark:bg-gray-700/50 rounded-xl">
                    <div className="flex-1">
                      <p className="font-medium text-gray-900 dark:text-white">{feature.name}</p>
                      <p className="text-sm text-gray-500 dark:text-gray-400">{feature.description}</p>
                      <p className="text-xs text-gray-400 dark:text-gray-500 mt-1 font-mono">{key}</p>
                    </div>
                    <div className="flex items-center gap-3">
                      <button onClick={() => removeFeature(key)}
                        className="p-1.5 text-gray-400 hover:text-red-500 dark:hover:text-red-400 rounded-lg cursor-pointer" title="Remove">
                        <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                          <path strokeLinecap="round" strokeLinejoin="round" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                        </svg>
                      </button>
                      <button onClick={() => toggleFeature(key)}
                        className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors cursor-pointer ${feature.enabled ? 'bg-indigo-600' : 'bg-gray-300 dark:bg-gray-600'}`}>
                        <span className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${feature.enabled ? 'translate-x-6' : 'translate-x-1'}`} />
                      </button>
                    </div>
                  </motion.div>
                ))}
              </div>

              <AnimatePresence>
                {showAddFeature && (
                  <motion.div initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: 'auto' }} exit={{ opacity: 0, height: 0 }}>
                    <form onSubmit={handleAddFeature} className="p-4 bg-indigo-50 dark:bg-indigo-900/20 rounded-xl space-y-3">
                      <h4 className="font-medium text-gray-900 dark:text-white">Add New Feature</h4>
                      <div className="grid grid-cols-2 gap-3">
                        <input type="text" placeholder="Feature key (e.g., darkMode)" value={newFeature.key}
                          onChange={(e) => setNewFeature({ ...newFeature, key: e.target.value })} required
                          className="px-3 py-2 bg-white dark:bg-gray-700 border border-gray-200 dark:border-gray-600 rounded-lg text-sm text-gray-900 dark:text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-indigo-500" />
                        <input type="text" placeholder="Feature name" value={newFeature.name}
                          onChange={(e) => setNewFeature({ ...newFeature, name: e.target.value })} required
                          className="px-3 py-2 bg-white dark:bg-gray-700 border border-gray-200 dark:border-gray-600 rounded-lg text-sm text-gray-900 dark:text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-indigo-500" />
                      </div>
                      <input type="text" placeholder="Description (optional)" value={newFeature.description}
                        onChange={(e) => setNewFeature({ ...newFeature, description: e.target.value })}
                        className="w-full px-3 py-2 bg-white dark:bg-gray-700 border border-gray-200 dark:border-gray-600 rounded-lg text-sm text-gray-900 dark:text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-indigo-500" />
                      <div className="flex gap-2">
                        <button type="submit" className="px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white text-sm font-medium rounded-lg cursor-pointer">Add Feature</button>
                        <button type="button" onClick={() => setShowAddFeature(false)}
                          className="px-4 py-2 bg-gray-200 dark:bg-gray-600 hover:bg-gray-300 dark:hover:bg-gray-500 text-gray-700 dark:text-gray-300 text-sm font-medium rounded-lg cursor-pointer">Cancel</button>
                      </div>
                    </form>
                  </motion.div>
                )}
              </AnimatePresence>
            </div>
          )}
        </div>

        <div className="p-4 border-t border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-700/50 shrink-0">
          <button onClick={onClose}
            className="w-full py-2.5 bg-gray-200 dark:bg-gray-600 hover:bg-gray-300 dark:hover:bg-gray-500 text-gray-700 dark:text-gray-300 font-medium rounded-xl transition-colors cursor-pointer">
            Close Admin Portal
          </button>
        </div>
      </motion.div>
    </motion.div>
  )
}
