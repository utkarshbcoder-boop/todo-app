export const CATEGORIES = ['Work', 'Personal', 'Health', 'Finance', 'Other']
export const PRIORITIES = ['Low', 'Medium', 'High']
export const RECURRENCES = [
  { value: 'none', label: 'No repeat' },
  { value: 'daily', label: 'Daily' },
  { value: 'weekly', label: 'Weekly' },
  { value: 'monthly', label: 'Monthly' },
]
export const REMINDERS = [
  { value: 'none', label: 'No reminder' },
  { value: 'atTime', label: 'At time of due' },
  { value: '15minBefore', label: '15 min before' },
  { value: '1hourBefore', label: '1 hour before' },
]
export const SORT_OPTIONS = [
  { key: 'created', label: 'Date Created' },
  { key: 'dueDate', label: 'Due Date' },
  { key: 'priority', label: 'Priority' },
  { key: 'alpha', label: 'Alphabetical' },
]
export const VIEW_TABS = [
  { key: 'all', label: 'All' },
  { key: 'active', label: 'Active' },
  { key: 'completed', label: 'Done' },
  { key: 'overdue', label: 'Overdue', color: 'text-red-500' },
  { key: 'today', label: 'Today', color: 'text-amber-500' },
  { key: 'week', label: 'This Week' },
  { key: 'recurring', label: 'Recurring', color: 'text-purple-500' },
  { key: 'trash', label: 'Trash', color: 'text-gray-500' },
  { key: 'dashboard', label: 'Stats' },
  { key: 'kanban', label: 'Kanban', color: 'text-blue-500' },
  { key: 'habits', label: 'Habits', color: 'text-amber-500' },
  { key: 'activity', label: 'Activity', color: 'text-cyan-500' },
  { key: 'shared', label: 'Shared', color: 'text-pink-500' },
]
export const CATEGORY_FILTERS = ['All', 'Work', 'Personal', 'Health', 'Finance', 'Other']

export const categoryIcons = {
  Work: '💼',
  Personal: '👤',
  Health: '❤️',
  Finance: '💰',
  Other: '📌',
}

export const priorityColors = {
  High: 'bg-red-100 text-red-700 border-red-200 dark:bg-red-900/30 dark:text-red-400 dark:border-red-800',
  Medium: 'bg-amber-100 text-amber-700 border-amber-200 dark:bg-amber-900/30 dark:text-amber-400 dark:border-amber-800',
  Low: 'bg-emerald-100 text-emerald-700 border-emerald-200 dark:bg-emerald-900/30 dark:text-emerald-400 dark:border-emerald-800',
}

