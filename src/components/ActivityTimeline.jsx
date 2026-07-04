import { useState, useEffect, useMemo, useCallback, useRef } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { useUserStore } from '../store/userStore'

const ACTION_CONFIG = {
  register:         { icon: '🎉', label: 'Registered', color: 'from-purple-500 to-indigo-500', bg: 'bg-purple-100 dark:bg-purple-900/30' },
  login:            { icon: '🔑', label: 'Logged in', color: 'from-blue-500 to-cyan-500', bg: 'bg-blue-100 dark:bg-blue-900/30' },
  logout:           { icon: '👋', label: 'Logged out', color: 'from-gray-400 to-gray-500', bg: 'bg-gray-100 dark:bg-gray-800/50' },
  todo_created:     { icon: '✨', label: 'Created task', color: 'from-emerald-500 to-green-500', bg: 'bg-emerald-100 dark:bg-emerald-900/30' },
  todo_completed:   { icon: '✅', label: 'Completed task', color: 'from-green-500 to-emerald-600', bg: 'bg-green-100 dark:bg-green-900/30' },
  todo_uncompleted: { icon: '🔄', label: 'Reopened task', color: 'from-amber-500 to-orange-500', bg: 'bg-amber-100 dark:bg-amber-900/30' },
  todo_deleted:     { icon: '🗑️', label: 'Deleted task', color: 'from-red-500 to-rose-500', bg: 'bg-red-100 dark:bg-red-900/30' },
  admin_user_updated: { icon: '⚙️', label: 'Updated user', color: 'from-indigo-500 to-violet-500', bg: 'bg-indigo-100 dark:bg-indigo-900/30' },
}

const FILTER_OPTIONS = [
  { key: 'all', label: 'All' },
  { key: 'auth', label: 'Auth', actions: ['register', 'login', 'logout'] },
  { key: 'tasks', label: 'Tasks', actions: ['todo_created', 'todo_completed', 'todo_uncompleted', 'todo_deleted'] },
  { key: 'admin', label: 'Admin', actions: ['admin_user_updated'] },
]

function relativeTime(dateStr) {
  const diff = Date.now() - new Date(dateStr).getTime()
  const secs = Math.floor(diff / 1000)
  if (secs < 60) return 'Just now'
  const mins = Math.floor(secs / 60)
  if (mins < 60) return `${mins}m ago`
  const hrs = Math.floor(mins / 60)
  if (hrs < 24) return `${hrs}h ago`
  const days = Math.floor(hrs / 24)
  if (days < 7) return `${days}d ago`
  const weeks = Math.floor(days / 7)
  if (weeks < 4) return `${weeks}w ago`
  return new Date(dateStr).toLocaleDateString()
}

function groupByDate(activities) {
  const groups = new Map()
  activities.forEach(a => {
    const date = new Date(a.createdAt).toLocaleDateString('en-US', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })
    if (!groups.has(date)) groups.set(date, [])
    groups.get(date).push(a)
  })
  return Array.from(groups.entries())
}

export default function ActivityTimeline() {
  const [activities, setActivities] = useState([])
  const [loading, setLoading] = useState(true)
  const [filter, setFilter] = useState('all')
  const [page, setPage] = useState(1)
  const [hasMore, setHasMore] = useState(true)
  const [loadingMore, setLoadingMore] = useState(false)
  const loadMoreRef = useRef(null)
  const isAuthenticated = useUserStore((s) => s.isAuthenticated)

  const fetchActivities = useCallback(async (pageNum = 1, filterType = 'all', append = false) => {
    if (!isAuthenticated) return
    try {
      if (pageNum === 1) setLoading(true)
      else setLoadingMore(true)

      const typeParam = filterType !== 'all'
        ? `&type=${FILTER_OPTIONS.find(f => f.key === filterType)?.actions?.join(',') || ''}`
        : ''
      const resp = await fetch(`/api/activities?page=${pageNum}&limit=30${typeParam}`, {
        credentials: 'include',
      })
      if (!resp.ok) throw new Error('Failed to fetch')
      const data = await resp.json()

      if (append) {
        setActivities(prev => [...prev, ...data.activities])
      } else {
        setActivities(data.activities)
      }
      setHasMore(data.hasMore)
    } catch (err) {
      console.error('Failed to load activities:', err)
    } finally {
      setLoading(false)
      setLoadingMore(false)
    }
  }, [isAuthenticated])

  useEffect(() => {
    setPage(1)
    fetchActivities(1, filter)
  }, [filter, fetchActivities])

  const handleLoadMore = useCallback(() => {
    if (!loadingMore && hasMore) {
      const nextPage = page + 1
      setPage(nextPage)
      fetchActivities(nextPage, filter, true)
    }
  }, [page, filter, hasMore, loadingMore, fetchActivities])

  // Intersection observer for infinite scroll
  useEffect(() => {
    const ref = loadMoreRef.current
    if (!ref) return
    const observer = new IntersectionObserver(
      (entries) => {
        if (entries[0].isIntersecting && hasMore && !loadingMore) {
          handleLoadMore()
        }
      },
      { threshold: 0.5 }
    )
    observer.observe(ref)
    return () => observer.disconnect()
  }, [hasMore, loadingMore, handleLoadMore])

  const grouped = useMemo(() => groupByDate(activities), [activities])

  if (loading) {
    return (
      <div className="space-y-4 py-4">
        <div className="text-center">
          <h2 className="text-lg font-bold text-gray-900 dark:text-white flex items-center justify-center gap-2">
            <span>📜</span> Activity Timeline
          </h2>
        </div>
        {[1, 2, 3, 4, 5].map(i => (
          <div key={i} className="flex gap-3 items-start animate-pulse">
            <div className="w-8 h-8 rounded-full bg-gray-200 dark:bg-gray-700 flex-shrink-0" />
            <div className="flex-1 space-y-2">
              <div className="h-4 bg-gray-200 dark:bg-gray-700 rounded w-3/4" />
              <div className="h-3 bg-gray-100 dark:bg-gray-800 rounded w-1/2" />
            </div>
          </div>
        ))}
      </div>
    )
  }

  return (
    <div className="space-y-4">
      <div className="text-center">
        <h2 className="text-lg font-bold text-gray-900 dark:text-white flex items-center justify-center gap-2">
          <span>📜</span> Activity Timeline
        </h2>
        <p className="text-xs text-gray-400 dark:text-gray-500 mt-1">Everything you've done, at a glance</p>
      </div>

      {/* Filter pills */}
      <div className="flex justify-center gap-2 flex-wrap">
        {FILTER_OPTIONS.map(opt => (
          <button
            key={opt.key}
            onClick={() => setFilter(opt.key)}
            className={`px-3 py-1.5 text-xs font-medium rounded-full transition-all cursor-pointer ${
              filter === opt.key
                ? 'bg-indigo-600 text-white shadow-sm'
                : 'bg-gray-100 dark:bg-gray-800 text-gray-500 dark:text-gray-400 hover:bg-gray-200 dark:hover:bg-gray-700'
            }`}
          >
            {opt.label}
          </button>
        ))}
      </div>

      {activities.length === 0 ? (
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          className="text-center py-12"
        >
          <div className="inline-flex items-center justify-center w-16 h-16 rounded-2xl bg-gradient-to-br from-cyan-100 to-blue-100 dark:from-cyan-900/30 dark:to-blue-900/30">
            <span className="text-3xl">📜</span>
          </div>
          <h3 className="text-lg font-bold text-gray-900 dark:text-white mt-3">No Activity Yet</h3>
          <p className="text-sm text-gray-500 dark:text-gray-400 max-w-sm mx-auto">
            Your activity timeline will appear here as you use the app.
          </p>
        </motion.div>
      ) : (
        <div className="relative">
          {/* Timeline line */}
          <div className="absolute left-4 top-0 bottom-0 w-px bg-gradient-to-b from-indigo-300 via-purple-300 to-transparent dark:from-indigo-700 dark:via-purple-700" />

          {grouped.map(([date, items], gi) => (
            <div key={date} className="mb-6">
              {/* Date header */}
              <motion.div
                initial={{ opacity: 0, x: -10 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ delay: gi * 0.05 }}
                className="sticky top-0 z-10 ml-10 mb-3"
              >
                <span className="inline-block text-xs font-bold text-gray-500 dark:text-gray-400 bg-gray-50 dark:bg-gray-900 px-3 py-1 rounded-full border border-gray-200 dark:border-gray-700">
                  {date}
                </span>
              </motion.div>

              {/* Items */}
              <AnimatePresence>
                {items.map((activity, i) => {
                  const config = ACTION_CONFIG[activity.action] || {
                    icon: '📝',
                    label: activity.action,
                    color: 'from-gray-400 to-gray-500',
                    bg: 'bg-gray-100 dark:bg-gray-800',
                  }

                  let details = {}
                  try { details = JSON.parse(activity.details || '{}') } catch { /* ignore */ }

                  return (
                    <motion.div
                      key={activity.id}
                      initial={{ opacity: 0, x: -15, y: 5 }}
                      animate={{ opacity: 1, x: 0, y: 0 }}
                      transition={{ delay: (gi * items.length + i) * 0.03, type: 'spring', stiffness: 300, damping: 25 }}
                      className="relative flex items-start gap-3 mb-3 ml-0"
                    >
                      {/* Timeline dot */}
                      <div className={`relative z-10 flex-shrink-0 w-8 h-8 rounded-full flex items-center justify-center bg-gradient-to-br ${config.color} shadow-sm`}>
                        <span className="text-sm">{config.icon}</span>
                      </div>

                      {/* Content card */}
                      <div className={`flex-1 ${config.bg} rounded-xl px-3 py-2 border border-gray-200/50 dark:border-gray-700/50`}>
                        <div className="flex items-center justify-between gap-2">
                          <p className="text-sm font-medium text-gray-800 dark:text-gray-100">
                            {config.label}
                          </p>
                          <span className="text-[10px] text-gray-400 dark:text-gray-500 whitespace-nowrap">
                            {relativeTime(activity.createdAt)}
                          </span>
                        </div>

                        {/* Detail chips */}
                        {Object.keys(details).length > 0 && (
                          <div className="flex flex-wrap gap-1 mt-1">
                            {details.method && (
                              <span className="text-[10px] px-1.5 py-0.5 rounded-full bg-white/50 dark:bg-gray-800/50 text-gray-500 dark:text-gray-400">
                                via {details.method}
                              </span>
                            )}
                            {details.todoId && (
                              <span className="text-[10px] px-1.5 py-0.5 rounded-full bg-white/50 dark:bg-gray-800/50 text-gray-500 dark:text-gray-400 font-mono">
                                #{details.todoId.slice(0, 8)}
                              </span>
                            )}
                          </div>
                        )}
                      </div>
                    </motion.div>
                  )
                })}
              </AnimatePresence>
            </div>
          ))}

          {/* Load more sentinel */}
          {hasMore && (
            <div ref={loadMoreRef} className="flex justify-center py-4">
              {loadingMore ? (
                <div className="flex items-center gap-2 text-sm text-gray-400 dark:text-gray-500">
                  <div className="w-4 h-4 border-2 border-gray-300 dark:border-gray-600 border-t-indigo-500 rounded-full animate-spin" />
                  Loading more...
                </div>
              ) : (
                <button
                  onClick={handleLoadMore}
                  className="text-xs font-medium text-indigo-500 hover:text-indigo-600 dark:text-indigo-400 dark:hover:text-indigo-300 cursor-pointer px-4 py-2 rounded-xl hover:bg-indigo-50 dark:hover:bg-indigo-900/20 transition-colors"
                >
                  Load more
                </button>
              )}
            </div>
          )}
        </div>
      )}
    </div>
  )
}
