import { useState, useMemo } from 'react'
import { motion } from 'framer-motion'
import { useTodoStore } from '../store/todoStore'
import { useHabitStore } from '../store/habitStore'
import { categoryIcons } from '../constants'
import { format } from 'date-fns/format'
import { subDays } from 'date-fns/subDays'

const HEATMAP_COLORS = [
  'fill-gray-100 dark:fill-gray-800',       // 0 completions
  'fill-emerald-200 dark:fill-emerald-900',  // completed
  'fill-emerald-400 dark:fill-emerald-700',  // completed (multi)
  'fill-emerald-600 dark:fill-emerald-500',  // completed (streak bonus)
]

const MONTHS = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec']

function MiniHeatmap({ todoId }) {
  const getHeatmapData = useHabitStore((s) => s.getHeatmapData)
  const data = useMemo(() => getHeatmapData(todoId, 182), [todoId, getHeatmapData]) // 6 months

  const weeks = useMemo(() => {
    const w = []
    for (let i = 0; i < data.length; i += 7) {
      w.push(data.slice(i, i + 7))
    }
    return w
  }, [data])

  return (
    <svg className="w-full h-16" viewBox={`0 0 ${weeks.length * 13 + 4} 90`} preserveAspectRatio="xMinYMin meet">
      {weeks.map((week, wi) => (
        week.map((day, di) => (
          <rect
            key={`${wi}-${di}`}
            x={wi * 13 + 2}
            y={di * 13 + 2}
            width="11"
            height="11"
            rx="2"
            className={`${day.count > 0 ? HEATMAP_COLORS[Math.min(day.count, 3)] : HEATMAP_COLORS[0]} transition-colors`}
          >
            <title>{day.date}: {day.count > 0 ? 'Completed' : 'Not completed'}</title>
          </rect>
        ))
      ))}
    </svg>
  )
}

function FullHeatmap({ todoId }) {
  const getHeatmapData = useHabitStore((s) => s.getHeatmapData)
  const data = useMemo(() => getHeatmapData(todoId, 365), [todoId, getHeatmapData])

  const weeks = useMemo(() => {
    const w = []
    for (let i = 0; i < data.length; i += 7) {
      w.push(data.slice(i, i + 7))
    }
    return w
  }, [data])

  // Month labels
  const monthLabels = useMemo(() => {
    const labels = []
    let lastMonth = -1
    weeks.forEach((week, wi) => {
      if (week.length > 0) {
        const d = new Date(week[0].date)
        if (d.getMonth() !== lastMonth) {
          labels.push({ x: wi * 14, label: MONTHS[d.getMonth()] })
          lastMonth = d.getMonth()
        }
      }
    })
    return labels
  }, [weeks])

  return (
    <div className="overflow-x-auto">
      <svg className="min-w-[700px] h-[130px]" viewBox={`0 0 ${weeks.length * 14 + 30} 130`}>
        {/* Month labels */}
        {monthLabels.map((m, i) => (
          <text key={i} x={m.x + 30} y={12} className="fill-gray-400 dark:fill-gray-500" fontSize="10" fontWeight="500">
            {m.label}
          </text>
        ))}

        {/* Day labels */}
        {['', 'Mon', '', 'Wed', '', 'Fri', ''].map((day, i) => (
          <text key={i} x={0} y={i * 14 + 32} className="fill-gray-400 dark:fill-gray-500" fontSize="9">
            {day}
          </text>
        ))}

        {/* Cells */}
        {weeks.map((week, wi) => (
          week.map((day, di) => (
            <rect
              key={`${wi}-${di}`}
              x={wi * 14 + 30}
              y={di * 14 + 20}
              width="12"
              height="12"
              rx="2"
              className={`${day.count > 0 ? HEATMAP_COLORS[Math.min(day.count, 3)] : HEATMAP_COLORS[0]} transition-colors hover:stroke-indigo-400 hover:stroke-1`}
            >
              <title>{day.date}: {day.count > 0 ? 'Completed ✓' : 'Missed'}</title>
            </rect>
          ))
        ))}
      </svg>
    </div>
  )
}

export default function HabitTracker() {
  const todos = useTodoStore((s) => s.todos)
  const habits = useHabitStore((s) => s.habits)
  const trackCompletion = useHabitStore((s) => s.trackCompletion)
  const getHabitData = useHabitStore((s) => s.getHabitData)
  const [expandedId, setExpandedId] = useState(null)

  // Show recurring todos as habits
  const recurringTodos = useMemo(() => {
    return todos.filter(t => t.recurrence !== 'none')
  }, [todos])

  const today = format(new Date(), 'yyyy-MM-dd')

  if (recurringTodos.length === 0) {
    return (
      <div className="text-center py-12">
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          className="space-y-3"
        >
          <div className="inline-flex items-center justify-center w-16 h-16 rounded-2xl bg-gradient-to-br from-amber-100 to-orange-100 dark:from-amber-900/30 dark:to-orange-900/30">
            <span className="text-3xl">🔥</span>
          </div>
          <h3 className="text-lg font-bold text-gray-900 dark:text-white">No Habits Yet</h3>
          <p className="text-sm text-gray-500 dark:text-gray-400 max-w-sm mx-auto">
            Create recurring tasks (daily/weekly/monthly) to track them as habits with streaks and heatmaps!
          </p>
        </motion.div>
      </div>
    )
  }

  return (
    <div className="space-y-4">
      <div className="text-center">
        <h2 className="text-lg font-bold text-gray-900 dark:text-white flex items-center justify-center gap-2">
          <span>🔥</span> Habit Tracker
        </h2>
        <p className="text-xs text-gray-400 dark:text-gray-500 mt-1">Track your daily habits and build streaks</p>
      </div>

      <div className="space-y-3">
        {recurringTodos.map((todo, i) => {
          const habitData = getHabitData(todo.id)
          const isExpanded = expandedId === todo.id
          const completedToday = habitData.completionDates.includes(today)

          return (
            <motion.div
              key={todo.id}
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: i * 0.05 }}
              className="todo-glass rounded-2xl p-4"
            >
              <div className="flex items-start gap-3">
                {/* Check-in button */}
                <motion.button
                  whileHover={{ scale: 1.1 }}
                  whileTap={{ scale: 0.9 }}
                  onClick={() => !completedToday && trackCompletion(todo.id)}
                  disabled={completedToday}
                  className={`mt-0.5 flex-shrink-0 w-8 h-8 rounded-full flex items-center justify-center transition-all cursor-pointer ${
                    completedToday
                      ? 'bg-emerald-500 text-white shadow-lg shadow-emerald-500/30'
                      : 'border-2 border-gray-300 dark:border-gray-600 hover:border-emerald-500 hover:bg-emerald-50 dark:hover:bg-emerald-900/30'
                  }`}
                  title={completedToday ? 'Completed today!' : 'Check in for today'}
                >
                  {completedToday ? (
                    <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={3}>
                      <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
                    </svg>
                  ) : (
                    <div className="w-3 h-3 rounded-full bg-gray-300 dark:bg-gray-600" />
                  )}
                </motion.button>

                {/* Info */}
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2">
                    <span>{categoryIcons[todo.category]}</span>
                    <p className="font-medium text-gray-800 dark:text-gray-100 text-sm">{todo.text}</p>
                    <span className="text-[10px] px-1.5 py-0.5 rounded-full bg-purple-100 dark:bg-purple-900/30 text-purple-600 dark:text-purple-400">
                      {todo.recurrence}
                    </span>
                  </div>

                  {/* Stats row */}
                  <div className="flex items-center gap-4 mt-2">
                    <div className="flex items-center gap-1">
                      <span className="text-lg">🔥</span>
                      <span className="text-sm font-bold text-amber-600 dark:text-amber-400">{habitData.currentStreak}</span>
                      <span className="text-[10px] text-gray-400 dark:text-gray-500">streak</span>
                    </div>
                    <div className="flex items-center gap-1">
                      <span className="text-sm">⭐</span>
                      <span className="text-sm font-semibold text-gray-600 dark:text-gray-300">{habitData.bestStreak}</span>
                      <span className="text-[10px] text-gray-400 dark:text-gray-500">best</span>
                    </div>
                    <div className="flex items-center gap-1">
                      <span className="text-sm">📊</span>
                      <span className="text-sm font-semibold text-gray-600 dark:text-gray-300">{habitData.completionDates.length}</span>
                      <span className="text-[10px] text-gray-400 dark:text-gray-500">total</span>
                    </div>
                  </div>

                  {/* Mini heatmap */}
                  <div className="mt-3">
                    <MiniHeatmap todoId={todo.id} />
                  </div>

                  {/* Expand for full heatmap */}
                  <button
                    onClick={() => setExpandedId(isExpanded ? null : todo.id)}
                    className="mt-2 text-[10px] font-medium text-indigo-500 hover:text-indigo-600 dark:text-indigo-400 dark:hover:text-indigo-300 cursor-pointer transition-colors"
                  >
                    {isExpanded ? '▾ Hide full heatmap' : '▸ Show full year'}
                  </button>

                  {isExpanded && (
                    <motion.div
                      initial={{ opacity: 0, height: 0 }}
                      animate={{ opacity: 1, height: 'auto' }}
                      className="mt-2"
                    >
                      <FullHeatmap todoId={todo.id} />
                    </motion.div>
                  )}
                </div>
              </div>
            </motion.div>
          )
        })}
      </div>
    </div>
  )
}
