import { useMemo, useState } from 'react'
import { motion } from 'framer-motion'
import { PieChart, Pie, Cell, BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, LineChart, Line, CartesianGrid } from 'recharts'
import { useTodoStore } from '../store/todoStore'

const CATEGORY_COLORS = { Work: '#6366f1', Personal: '#a855f7', Health: '#ef4444', Finance: '#f59e0b', Other: '#6b7280' }

const CustomTooltip = ({ active, payload, label }) => {
  if (!active || !payload?.length) return null
  return (
    <div className="bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg px-3 py-2 shadow-lg text-sm">
      <p className="text-gray-500 dark:text-gray-400">{label}</p>
      {payload.map((p, i) => (
        <p key={i} className="font-medium text-gray-800 dark:text-gray-100">{p.name}: {p.value}</p>
      ))}
    </div>
  )
}

export default function DashboardView() {
  const { todos, completions } = useTodoStore()
  const [trendDays, setTrendDays] = useState(7)

  const categoryData = useMemo(() => {
    const counts = {}
    todos.forEach((t) => { counts[t.category] = (counts[t.category] || 0) + 1 })
    return Object.entries(counts).map(([name, value]) => ({ name, value }))
  }, [todos])

  const priorityData = useMemo(() => {
    const counts = { High: 0, Medium: 0, Low: 0 }
    todos.forEach((t) => { if (counts[t.category] !== undefined || t.priority) counts[t.priority] = (counts[t.priority] || 0) + 1 })
    return Object.entries(counts).map(([name, value]) => ({ name, value }))
  }, [todos])

  const statusData = useMemo(() => {
    const completed = todos.filter((t) => t.completed).length
    const active = todos.length - completed
    return [
      { name: 'Active', value: active },
      { name: 'Completed', value: completed },
    ]
  }, [todos])

  const completionTrend = useMemo(() => {
    const data = []
    const now = new Date()
    for (let i = trendDays - 1; i >= 0; i--) {
      const d = new Date(now)
      d.setDate(d.getDate() - i)
      const dateStr = d.toISOString().split('T')[0]
      const label = trendDays <= 7
        ? d.toLocaleDateString('en', { weekday: 'short' })
        : d.toLocaleDateString('en', { month: 'short', day: 'numeric' })
      const entry = completions.find((c) => c.date === dateStr)
      data.push({ name: label, completions: entry?.count || 0 })
    }
    return data
  }, [completions, trendDays])

  const stats = useMemo(() => {
    const total = todos.length
    const completed = todos.filter((t) => t.completed).length
    const overdue = todos.filter((t) => {
      if (!t.dueDate || t.completed) return false
      try {
        const d = new Date(t.dueDate)
        return d < new Date() && d.toDateString() !== new Date().toDateString()
      } catch { return false }
    }).length
    return { total, completed, active: total - completed, overdue, percent: total ? Math.round((completed / total) * 100) : 0 }
  }, [todos])

  const totalCompletions = useMemo(() => completions.reduce((sum, c) => sum + c.count, 0), [completions])

  if (todos.length === 0) {
    return (
      <div className="text-center py-16">
        <div className="text-5xl mb-4">📊</div>
        <p className="text-gray-400 dark:text-gray-500 text-lg font-medium">Add some todos to see stats</p>
      </div>
    )
  }

  return (
    <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} className="space-y-6">
      {/* Summary cards */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        {[
          { label: 'Total', value: stats.total, color: 'text-indigo-600 dark:text-indigo-400' },
          { label: 'Active', value: stats.active, color: 'text-blue-600 dark:text-blue-400' },
          { label: 'Completed', value: stats.completed, color: 'text-emerald-600 dark:text-emerald-400' },
          { label: 'Overdue', value: stats.overdue, color: 'text-red-600 dark:text-red-400' },
        ].map((s) => (
          <div key={s.label} className="bg-white/80 dark:bg-gray-800/80 backdrop-blur-sm rounded-xl border border-gray-100 dark:border-gray-700 p-4 text-center">
            <div className={`text-2xl font-bold ${s.color}`}>{s.value}</div>
            <div className="text-xs text-gray-400 dark:text-gray-500 mt-1">{s.label}</div>
          </div>
        ))}
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        {/* Status pie */}
        <div className="bg-white/80 dark:bg-gray-800/80 backdrop-blur-sm rounded-2xl border border-gray-100 dark:border-gray-700 p-5">
          <h3 className="text-sm font-semibold text-gray-700 dark:text-gray-200 mb-3">Status</h3>
          <ResponsiveContainer width="100%" height={180}>
            <PieChart>
              <Pie data={statusData} cx="50%" cy="50%" innerRadius={50} outerRadius={75} paddingAngle={4} dataKey="value">
                <Cell fill="#6366f1" />
                <Cell fill="#10b981" />
              </Pie>
              <Tooltip content={<CustomTooltip />} />
            </PieChart>
          </ResponsiveContainer>
          <div className="flex justify-center gap-4 text-xs text-gray-500 dark:text-gray-400">
            <span className="flex items-center gap-1"><span className="w-2.5 h-2.5 rounded-full bg-indigo-500" /> Active ({stats.active})</span>
            <span className="flex items-center gap-1"><span className="w-2.5 h-2.5 rounded-full bg-emerald-500" /> Done ({stats.completed})</span>
          </div>
        </div>

        {/* Category breakdown */}
        <div className="bg-white/80 dark:bg-gray-800/80 backdrop-blur-sm rounded-2xl border border-gray-100 dark:border-gray-700 p-5">
          <h3 className="text-sm font-semibold text-gray-700 dark:text-gray-200 mb-3">By Category</h3>
          <ResponsiveContainer width="100%" height={180}>
            <BarChart data={categoryData} layout="vertical" margin={{ left: 10 }}>
              <XAxis type="number" hide />
              <YAxis type="category" dataKey="name" width={70} tick={{ fontSize: 12, fill: '#9ca3af' }} />
              <Tooltip content={<CustomTooltip />} />
              <Bar dataKey="value" name="Todos" radius={[0, 6, 6, 0]}>
                {categoryData.map((entry) => (
                  <Cell key={entry.name} fill={CATEGORY_COLORS[entry.name] || '#6b7280'} />
                ))}
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        </div>

        {/* Priority distribution */}
        <div className="bg-white/80 dark:bg-gray-800/80 backdrop-blur-sm rounded-2xl border border-gray-100 dark:border-gray-700 p-5">
          <h3 className="text-sm font-semibold text-gray-700 dark:text-gray-200 mb-3">By Priority</h3>
          <ResponsiveContainer width="100%" height={180}>
            <BarChart data={priorityData}>
              <XAxis dataKey="name" tick={{ fontSize: 12, fill: '#9ca3af' }} />
              <YAxis hide />
              <Tooltip content={<CustomTooltip />} />
              <Bar dataKey="value" name="Todos" radius={[6, 6, 0, 0]}>
                <Cell fill="#ef4444" />
                <Cell fill="#f59e0b" />
                <Cell fill="#10b981" />
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        </div>

        {/* Completion trend */}
        <div className="bg-white/80 dark:bg-gray-800/80 backdrop-blur-sm rounded-2xl border border-gray-100 dark:border-gray-700 p-5">
          <div className="flex items-center justify-between mb-3">
            <h3 className="text-sm font-semibold text-gray-700 dark:text-gray-200">{trendDays}-Day Trend</h3>
            <div className="flex gap-1">
              {[7, 14, 30].map((days) => (
                <button key={days} onClick={() => setTrendDays(days)}
                  className={`px-2 py-0.5 text-[10px] font-medium rounded-md transition-all cursor-pointer ${
                    trendDays === days
                      ? 'bg-indigo-100 dark:bg-indigo-900/40 text-indigo-600 dark:text-indigo-400'
                      : 'text-gray-400 hover:text-gray-600 dark:hover:text-gray-300'
                  }`}>
                  {days}d
                </button>
              ))}
            </div>
          </div>
          <ResponsiveContainer width="100%" height={180}>
            <LineChart data={completionTrend}>
              <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" />
              <XAxis dataKey="name" tick={{ fontSize: 12, fill: '#9ca3af' }} />
              <YAxis allowDecimals={false} tick={{ fontSize: 12, fill: '#9ca3af' }} />
              <Tooltip content={<CustomTooltip />} />
              <Line type="monotone" dataKey="completions" stroke="#6366f1" strokeWidth={2} dot={{ fill: '#6366f1', r: 4 }} activeDot={{ r: 6 }} />
            </LineChart>
          </ResponsiveContainer>
        </div>
      </div>

      <div className="text-center text-sm text-gray-400 dark:text-gray-500">
        {totalCompletions} total completions tracked · {stats.percent}% completion rate
      </div>
    </motion.div>
  )
}
