import { useState, useEffect, useCallback } from 'react'
import { motion, AnimatePresence } from 'framer-motion'

const API_URL = import.meta.env.VITE_API_URL || '/api'

export default function UserManagement() {
  const [users, setUsers] = useState([])
  const [stats, setStats] = useState(null)
  const [activities, setActivities] = useState([])
  const [selectedUser, setSelectedUser] = useState(null)
  const [userDetails, setUserDetails] = useState(null)
  const [loading, setLoading] = useState(true)
  const [searchQuery, setSearchQuery] = useState('')
  const [filterStatus, setFilterStatus] = useState('all')
  const [activeTab, setActiveTab] = useState('users')

  const fetchUsers = useCallback(async () => {
    try {
      const res = await fetch(`${API_URL}/admin/users`)
      const data = await res.json()
      setUsers(data.users)
    } catch (error) {
      console.error('Failed to fetch users:', error)
    } finally {
      setLoading(false)
    }
  }, [])

  const fetchStats = useCallback(async () => {
    try {
      const res = await fetch(`${API_URL}/admin/stats`)
      const data = await res.json()
      setStats(data.stats)
    } catch (error) {
      console.error('Failed to fetch stats:', error)
    }
  }, [])

  const fetchActivities = useCallback(async () => {
    try {
      const res = await fetch(`${API_URL}/admin/activity`)
      const data = await res.json()
      setActivities(data.activities)
    } catch (error) {
      console.error('Failed to fetch activities:', error)
    }
  }, [])

  const fetchUserDetails = useCallback(async (userId) => {
    try {
      const res = await fetch(`${API_URL}/admin/user/${userId}`)
      const data = await res.json()
      setUserDetails(data)
      setSelectedUser(data.user)
    } catch (error) {
      console.error('Failed to fetch user details:', error)
    }
  }, [])

  const updateUserStatus = useCallback(async (userId, status) => {
    try {
      await fetch(`${API_URL}/admin/user/${userId}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status }),
      })
      fetchUsers()
      if (selectedUser?.id === userId) {
        fetchUserDetails(userId)
      }
    } catch (error) {
      console.error('Failed to update user:', error)
    }
  }, [fetchUsers, selectedUser, fetchUserDetails])

  const updateUserRole = useCallback(async (userId, role) => {
    try {
      await fetch(`${API_URL}/admin/user/${userId}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ role }),
      })
      fetchUsers()
      if (selectedUser?.id === userId) {
        fetchUserDetails(userId)
      }
    } catch (error) {
      console.error('Failed to update user:', error)
    }
  }, [fetchUsers, selectedUser, fetchUserDetails])

  const deleteUser = useCallback(async (userId) => {
    if (!confirm('Are you sure you want to delete this user? This action cannot be undone.')) {
      return
    }
    try {
      await fetch(`${API_URL}/admin/user/${userId}`, { method: 'DELETE' })
      setUsers(users.filter(u => u.id !== userId))
      setSelectedUser(null)
      setUserDetails(null)
      fetchStats()
    } catch (error) {
      console.error('Failed to delete user:', error)
    }
  }, [users, fetchStats])

  useEffect(() => {
    let cancelled = false

    const loadData = async () => {
      await Promise.all([fetchUsers(), fetchStats(), fetchActivities()])
    }

    if (!cancelled) {
      loadData()
    }

    return () => {
      cancelled = true
    }
  }, [fetchUsers, fetchStats, fetchActivities])

  const filteredUsers = users.filter(user => {
    const matchesSearch = user.name?.toLowerCase().includes(searchQuery.toLowerCase()) ||
      user.email?.toLowerCase().includes(searchQuery.toLowerCase())
    const matchesStatus = filterStatus === 'all' || user.status === filterStatus
    return matchesSearch && matchesStatus
  })

  const formatDate = (dateString) => {
    if (!dateString) return 'N/A'
    return new Date(dateString).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
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

  if (loading) {
    return (
      <div className="flex items-center justify-center p-8">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-indigo-600" />
      </div>
    )
  }

  return (
    <div className="space-y-6">
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <div className="bg-indigo-50 dark:bg-indigo-900/20 rounded-2xl p-4">
          <p className="text-sm text-indigo-600 dark:text-indigo-400 font-medium">Total Users</p>
          <p className="text-2xl font-bold text-indigo-700 dark:text-indigo-300">{stats?.totalUsers || 0}</p>
        </div>
        <div className="bg-emerald-50 dark:bg-emerald-900/20 rounded-2xl p-4">
          <p className="text-sm text-emerald-600 dark:text-emerald-400 font-medium">Active</p>
          <p className="text-2xl font-bold text-emerald-700 dark:text-emerald-300">{stats?.activeUsers || 0}</p>
        </div>
        <div className="bg-amber-50 dark:bg-amber-900/20 rounded-2xl p-4">
          <p className="text-sm text-amber-600 dark:text-amber-400 font-medium">New This Week</p>
          <p className="text-2xl font-bold text-amber-700 dark:text-amber-300">{stats?.newUsersThisWeek || 0}</p>
        </div>
        <div className="bg-red-50 dark:bg-red-900/20 rounded-2xl p-4">
          <p className="text-sm text-red-600 dark:text-red-400 font-medium">Banned</p>
          <p className="text-2xl font-bold text-red-700 dark:text-red-300">{stats?.bannedUsers || 0}</p>
        </div>
      </div>

      <div className="flex gap-2 border-b border-gray-200 dark:border-gray-700">
        {['users', 'activity'].map(tab => (
          <button
            key={tab}
            onClick={() => setActiveTab(tab)}
            className={`px-4 py-2 font-medium text-sm border-b-2 transition-colors ${
              activeTab === tab
                ? 'border-indigo-600 text-indigo-600 dark:text-indigo-400'
                : 'border-transparent text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-300'
            }`}
          >
            {tab === 'users' ? 'Users' : 'Activity Log'}
          </button>
        ))}
      </div>

      {activeTab === 'users' && (
        <div className="space-y-4">
          <div className="flex flex-col sm:flex-row gap-3">
            <div className="flex-1">
              <input
                type="text"
                placeholder="Search users..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full px-4 py-2 bg-gray-50 dark:bg-gray-700 border border-gray-200 dark:border-gray-600 rounded-xl text-gray-900 dark:text-white placeholder-gray-400 dark:placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-indigo-500"
              />
            </div>
            <select
              value={filterStatus}
              onChange={(e) => setFilterStatus(e.target.value)}
              className="px-4 py-2 bg-gray-50 dark:bg-gray-700 border border-gray-200 dark:border-gray-600 rounded-xl text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-indigo-500"
            >
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
                              <span className="text-indigo-600 dark:text-indigo-400 font-medium">
                                {user.name?.charAt(0).toUpperCase() || '?'}
                              </span>
                            </div>
                          )}
                          <div>
                            <p className="font-medium text-gray-900 dark:text-white">{user.name}</p>
                            <p className="text-sm text-gray-500 dark:text-gray-400">{user.email}</p>
                          </div>
                        </div>
                      </td>
                      <td className="px-4 py-3">
                        <span className={`px-2 py-1 text-xs font-medium rounded-full ${getStatusColor(user.status)}`}>
                          {user.status || 'active'}
                        </span>
                      </td>
                      <td className="px-4 py-3">
                        <span className="text-sm text-gray-700 dark:text-gray-300 capitalize">{user.role || 'user'}</span>
                      </td>
                      <td className="px-4 py-3">
                        <span className="text-sm text-gray-500 dark:text-gray-400">{formatDate(user.createdAt)}</span>
                      </td>
                      <td className="px-4 py-3">
                        <div className="flex items-center gap-2">
                          <button
                            onClick={() => fetchUserDetails(user.id)}
                            className="p-1.5 text-gray-400 hover:text-indigo-600 dark:hover:text-indigo-400 rounded-lg transition-colors"
                            title="View Details"
                          >
                            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                              <path strokeLinecap="round" strokeLinejoin="round" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                              <path strokeLinecap="round" strokeLinejoin="round" d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
                            </svg>
                          </button>
                          {user.status !== 'banned' ? (
                            <button
                              onClick={() => updateUserStatus(user.id, 'banned')}
                              className="p-1.5 text-gray-400 hover:text-red-600 dark:hover:text-red-400 rounded-lg transition-colors"
                              title="Ban User"
                            >
                              <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                                <path strokeLinecap="round" strokeLinejoin="round" d="M18.364 18.364A9 9 0 005.636 5.636m12.728 12.728A9 9 0 015.636 5.636m12.728 12.728L5.636 5.636" />
                              </svg>
                            </button>
                          ) : (
                            <button
                              onClick={() => updateUserStatus(user.id, 'active')}
                              className="p-1.5 text-gray-400 hover:text-emerald-600 dark:hover:text-emerald-400 rounded-lg transition-colors"
                              title="Unban User"
                            >
                              <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                                <path strokeLinecap="round" strokeLinejoin="round" d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                              </svg>
                            </button>
                          )}
                          <button
                            onClick={() => deleteUser(user.id)}
                            className="p-1.5 text-gray-400 hover:text-red-600 dark:hover:text-red-400 rounded-lg transition-colors"
                            title="Delete User"
                          >
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
              <div className="p-8 text-center text-gray-500 dark:text-gray-400">
                No users found
              </div>
            )}
          </div>
        </div>
      )}

      {activeTab === 'activity' && (
        <div className="space-y-2">
          {activities.length === 0 ? (
            <div className="p-8 text-center text-gray-500 dark:text-gray-400 bg-gray-50 dark:bg-gray-700/50 rounded-xl">
              No activity recorded yet
            </div>
          ) : (
            activities.map(activity => (
              <div
                key={activity.id}
                className="flex items-center gap-4 p-4 bg-gray-50 dark:bg-gray-700/50 rounded-xl"
              >
                {activity.user?.picture ? (
                  <img src={activity.user.picture} alt="" className="w-8 h-8 rounded-full" />
                ) : (
                  <div className="w-8 h-8 rounded-full bg-indigo-100 dark:bg-indigo-900/30 flex items-center justify-center">
                    <span className="text-indigo-600 dark:text-indigo-400 text-sm font-medium">
                      {activity.user?.name?.charAt(0).toUpperCase() || '?'}
                    </span>
                  </div>
                )}
                <div className="flex-1">
                  <p className="text-sm text-gray-900 dark:text-white">
                    <span className="font-medium">{activity.user?.name || 'Unknown'}</span>
                    {' '}
                    <span className="text-gray-500 dark:text-gray-400">{activity.action.replace('_', ' ')}</span>
                  </p>
                  <p className="text-xs text-gray-400 dark:text-gray-500">{formatDate(activity.timestamp)}</p>
                </div>
              </div>
            ))
          )}
        </div>
      )}

      <AnimatePresence>
        {selectedUser && userDetails && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-50 bg-black/50 backdrop-blur-sm flex items-center justify-center p-4"
            onClick={() => { setSelectedUser(null); setUserDetails(null) }}
          >
            <motion.div
              initial={{ scale: 0.95, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.95, opacity: 0 }}
              className="w-full max-w-lg bg-white dark:bg-gray-800 rounded-3xl shadow-2xl border border-gray-200 dark:border-gray-700 overflow-hidden"
              onClick={(e) => e.stopPropagation()}
            >
              <div className="p-6 border-b border-gray-200 dark:border-gray-700">
                <div className="flex items-center justify-between">
                  <h3 className="text-lg font-semibold text-gray-900 dark:text-white">User Details</h3>
                  <button
                    onClick={() => { setSelectedUser(null); setUserDetails(null) }}
                    className="p-2 text-gray-400 hover:text-gray-600 dark:hover:text-gray-300 rounded-lg"
                  >
                    <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                      <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
                    </svg>
                  </button>
                </div>
              </div>

              <div className="p-6 space-y-6">
                <div className="flex items-center gap-4">
                  {selectedUser.picture ? (
                    <img src={selectedUser.picture} alt="" className="w-16 h-16 rounded-full" />
                  ) : (
                    <div className="w-16 h-16 rounded-full bg-indigo-100 dark:bg-indigo-900/30 flex items-center justify-center">
                      <span className="text-indigo-600 dark:text-indigo-400 text-xl font-medium">
                        {selectedUser.name?.charAt(0).toUpperCase() || '?'}
                      </span>
                    </div>
                  )}
                  <div>
                    <h4 className="text-xl font-semibold text-gray-900 dark:text-white">{selectedUser.name}</h4>
                    <p className="text-gray-500 dark:text-gray-400">{selectedUser.email}</p>
                    <span className={`inline-block mt-1 px-2 py-0.5 text-xs font-medium rounded-full ${getStatusColor(selectedUser.status)}`}>
                      {selectedUser.status || 'active'}
                    </span>
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div className="bg-gray-50 dark:bg-gray-700/50 rounded-xl p-4">
                    <p className="text-sm text-gray-500 dark:text-gray-400">Role</p>
                    <select
                      value={selectedUser.role || 'user'}
                      onChange={(e) => updateUserRole(selectedUser.id, e.target.value)}
                      className="mt-1 w-full px-3 py-1.5 bg-white dark:bg-gray-600 border border-gray-200 dark:border-gray-500 rounded-lg text-sm text-gray-900 dark:text-white"
                    >
                      <option value="user">User</option>
                      <option value="moderator">Moderator</option>
                      <option value="admin">Admin</option>
                    </select>
                  </div>
                  <div className="bg-gray-50 dark:bg-gray-700/50 rounded-xl p-4">
                    <p className="text-sm text-gray-500 dark:text-gray-400">Total Logins</p>
                    <p className="text-2xl font-bold text-gray-900 dark:text-white">{userDetails.stats?.totalLogins || 0}</p>
                  </div>
                  <div className="bg-gray-50 dark:bg-gray-700/50 rounded-xl p-4">
                    <p className="text-sm text-gray-500 dark:text-gray-400">Joined</p>
                    <p className="text-sm font-medium text-gray-900 dark:text-white">{formatDate(selectedUser.createdAt)}</p>
                  </div>
                  <div className="bg-gray-50 dark:bg-gray-700/50 rounded-xl p-4">
                    <p className="text-sm text-gray-500 dark:text-gray-400">Last Login</p>
                    <p className="text-sm font-medium text-gray-900 dark:text-white">{formatDate(selectedUser.lastLogin)}</p>
                  </div>
                </div>

                {userDetails.activities?.length > 0 && (
                  <div>
                    <h5 className="text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">Recent Activity</h5>
                    <div className="space-y-2 max-h-40 overflow-y-auto">
                      {userDetails.activities.slice(-5).reverse().map(activity => (
                        <div key={activity.id} className="flex items-center gap-2 text-sm">
                          <div className="w-2 h-2 rounded-full bg-indigo-500" />
                          <span className="text-gray-600 dark:text-gray-400">{activity.action.replace('_', ' ')}</span>
                          <span className="text-gray-400 dark:text-gray-500 text-xs">{formatDate(activity.timestamp)}</span>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                <div className="flex gap-2">
                  {selectedUser.status !== 'banned' ? (
                    <button
                      onClick={() => updateUserStatus(selectedUser.id, 'banned')}
                      className="flex-1 py-2 px-4 bg-red-100 dark:bg-red-900/20 hover:bg-red-200 dark:hover:bg-red-900/30 text-red-700 dark:text-red-400 font-medium rounded-xl transition-colors"
                    >
                      Ban User
                    </button>
                  ) : (
                    <button
                      onClick={() => updateUserStatus(selectedUser.id, 'active')}
                      className="flex-1 py-2 px-4 bg-emerald-100 dark:bg-emerald-900/20 hover:bg-emerald-200 dark:hover:bg-emerald-900/30 text-emerald-700 dark:text-emerald-400 font-medium rounded-xl transition-colors"
                    >
                      Unban User
                    </button>
                  )}
                  <button
                    onClick={() => deleteUser(selectedUser.id)}
                    className="flex-1 py-2 px-4 bg-red-600 hover:bg-red-700 text-white font-medium rounded-xl transition-colors"
                  >
                    Delete User
                  </button>
                </div>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  )
}
