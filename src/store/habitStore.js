import { create } from 'zustand'
import { persist } from 'zustand/middleware'
import { format } from 'date-fns/format'
import { subDays } from 'date-fns/subDays'
import { differenceInDays } from 'date-fns/differenceInDays'
import { parseISO } from 'date-fns/parseISO'

export const useHabitStore = create(
  persist(
    (set, get) => ({
      // habits: { [todoId]: { completionDates: string[], currentStreak: number, bestStreak: number } }
      habits: {},

      trackCompletion: (todoId) => {
        const state = get()
        const today = format(new Date(), 'yyyy-MM-dd')
        const habit = state.habits[todoId] || { completionDates: [], currentStreak: 0, bestStreak: 0 }

        // Don't double-track same day
        if (habit.completionDates.includes(today)) return

        const newDates = [...habit.completionDates, today].sort()
        const streaks = computeStreaks(newDates)

        set({
          habits: {
            ...state.habits,
            [todoId]: {
              completionDates: newDates,
              currentStreak: streaks.current,
              bestStreak: Math.max(habit.bestStreak, streaks.current),
            },
          },
        })
      },

      getHabitData: (todoId) => {
        const state = get()
        return state.habits[todoId] || { completionDates: [], currentStreak: 0, bestStreak: 0 }
      },

      getHeatmapData: (todoId, days = 365) => {
        const state = get()
        const habit = state.habits[todoId] || { completionDates: [] }
        const dateSet = new Set(habit.completionDates)
        const data = []
        const today = new Date()

        for (let i = days - 1; i >= 0; i--) {
          const date = subDays(today, i)
          const dateStr = format(date, 'yyyy-MM-dd')
          data.push({
            date: dateStr,
            count: dateSet.has(dateStr) ? 1 : 0,
            day: date.getDay(),
            week: Math.floor(i / 7),
          })
        }

        return data
      },

      getAllHabitStats: () => {
        const state = get()
        const today = format(new Date(), 'yyyy-MM-dd')

        return Object.entries(state.habits).map(([todoId, habit]) => {
          const streaks = computeStreaks(habit.completionDates)
          return {
            todoId,
            totalCompletions: habit.completionDates.length,
            currentStreak: streaks.current,
            bestStreak: Math.max(habit.bestStreak, streaks.current),
            completedToday: habit.completionDates.includes(today),
            lastCompleted: habit.completionDates.length > 0
              ? habit.completionDates[habit.completionDates.length - 1]
              : null,
          }
        })
      },
    }),
    {
      name: 'todo-habit-store',
    }
  )
)

function computeStreaks(sortedDates) {
  if (sortedDates.length === 0) return { current: 0 }

  const today = format(new Date(), 'yyyy-MM-dd')
  const yesterday = format(subDays(new Date(), 1), 'yyyy-MM-dd')

  let current = 0
  const lastDate = sortedDates[sortedDates.length - 1]

  // Only count streak if last completion is today or yesterday
  if (lastDate !== today && lastDate !== yesterday) return { current: 0 }

  current = 1
  for (let i = sortedDates.length - 2; i >= 0; i--) {
    const diff = differenceInDays(parseISO(sortedDates[i + 1]), parseISO(sortedDates[i]))
    if (diff === 1) {
      current++
    } else {
      break
    }
  }

  return { current }
}
