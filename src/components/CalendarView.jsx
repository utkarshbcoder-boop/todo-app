import { motion } from 'framer-motion'
import { format } from 'date-fns/format'
import { startOfMonth } from 'date-fns/startOfMonth'
import { endOfMonth } from 'date-fns/endOfMonth'
import { eachDayOfInterval } from 'date-fns/eachDayOfInterval'
import { getDay } from 'date-fns/getDay'
import { addMonths } from 'date-fns/addMonths'
import { subMonths } from 'date-fns/subMonths'
import { isSameDay } from 'date-fns/isSameDay'
import { parseISO } from 'date-fns/parseISO'
import { isToday } from 'date-fns/isToday'
import { isPast } from 'date-fns/isPast'
import { useTodoStore } from '../store/todoStore'

export default function CalendarView({ onDayClick }) {
  const { todos, calendarDate, setCalendarDate } = useTodoStore()
  const currentMonth = calendarDate ? parseISO(calendarDate) : new Date()
  const monthStart = startOfMonth(currentMonth)
  const monthEnd = endOfMonth(currentMonth)
  const days = eachDayOfInterval({ start: monthStart, end: monthEnd })
  const startPadding = getDay(monthStart)

  const getTodosForDay = (day) => todos.filter((t) => t.dueDate && isSameDay(parseISO(t.dueDate), day))
  const weekDays = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat']

  return (
    <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: 10 }}
      className="bg-white/80 dark:bg-gray-800/80 backdrop-blur-sm rounded-2xl shadow-lg shadow-gray-200/50 dark:shadow-gray-900/50 border border-gray-100 dark:border-gray-700 p-6">
      <div className="flex items-center justify-between mb-4">
        <button onClick={() => setCalendarDate(subMonths(currentMonth, 1).toISOString())}
          className="p-2 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg transition-all cursor-pointer" aria-label="Previous month">
          <svg className="w-5 h-5 text-gray-600 dark:text-gray-300" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M15 19l-7-7 7-7" /></svg>
        </button>
        <h3 className="text-lg font-semibold text-gray-800 dark:text-white">{format(currentMonth, 'MMMM yyyy')}</h3>
        <button onClick={() => setCalendarDate(addMonths(currentMonth, 1).toISOString())}
          className="p-2 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg transition-all cursor-pointer" aria-label="Next month">
          <svg className="w-5 h-5 text-gray-600 dark:text-gray-300" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M9 5l7 7-7 7" /></svg>
        </button>
      </div>
      <div className="grid grid-cols-7 gap-1">
        {weekDays.map((d) => <div key={d} className="text-center text-xs font-medium text-gray-400 dark:text-gray-500 py-2">{d}</div>)}
        {Array.from({ length: startPadding }).map((_, i) => <div key={`pad-${i}`} />)}
        {days.map((day) => {
          const dayTodos = getTodosForDay(day)
          const hasOverdue = dayTodos.some((t) => !t.completed && isPast(day) && !isToday(day))
          return (
            <button key={day.toISOString()} onClick={() => onDayClick(format(day, 'yyyy-MM-dd'))}
              className={`min-h-[60px] p-1.5 rounded-lg border text-left transition-all hover:ring-2 hover:ring-indigo-300 dark:hover:ring-indigo-600 cursor-pointer ${
                isToday(day) ? 'border-indigo-300 dark:border-indigo-600 bg-indigo-50/50 dark:bg-indigo-900/20' : 'border-gray-100 dark:border-gray-700/50'
              }`}>
              <div className={`text-xs font-medium mb-1 ${isToday(day) ? 'text-indigo-600 dark:text-indigo-400' : 'text-gray-500 dark:text-gray-400'} ${hasOverdue ? 'text-red-500' : ''}`}>
                {format(day, 'd')}
              </div>
              <div className="space-y-0.5">
                {dayTodos.slice(0, 3).map((t) => (
                  <div key={t.id}
                    className={`text-[10px] leading-tight px-1 py-0.5 rounded truncate ${
                      t.completed ? 'bg-gray-100 dark:bg-gray-700 text-gray-400 line-through'
                      : t.dueDate && isPast(parseISO(t.dueDate)) && !isToday(parseISO(t.dueDate))
                      ? 'bg-red-100 dark:bg-red-900/30 text-red-600 dark:text-red-400'
                      : 'bg-indigo-100 dark:bg-indigo-900/30 text-indigo-600 dark:text-indigo-400'
                    }`}>{t.text}</div>
                ))}
                {dayTodos.length > 3 && <div className="text-[10px] text-gray-400 dark:text-gray-500 px-1">+{dayTodos.length - 3} more</div>}
              </div>
            </button>
          )
        })}
      </div>
    </motion.div>
  )
}
