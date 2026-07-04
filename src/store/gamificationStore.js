import { create } from 'zustand'
import { persist } from 'zustand/middleware'
import { toast } from 'sonner'

function xpForLevel(level) {
  // Diminishing returns curve: each level costs more
  return Math.floor(100 * Math.pow(1.15, level - 1))
}

function getLevelFromXP(totalXP) {
  let level = 1
  let xpNeeded = 0
  while (true) {
    const cost = xpForLevel(level)
    if (xpNeeded + cost > totalXP) break
    xpNeeded += cost
    level++
  }
  return { level, currentLevelXP: totalXP - xpNeeded, xpForNext: xpForLevel(level) }
}

export const useGamificationStore = create(
  persist(
    (set, get) => ({
      totalXP: 0,
      totalCompleted: 0,
      bestStreak: 0,
      currentStreak: 0,
      lastCompletionDate: null,
      earlyBirdCount: 0,
      nightOwlCount: 0,
      zeroInboxCount: 0,
      onTimeCount: 0,
      maxDailyCompletions: 0,
      dailyCompletions: {},  // { 'yyyy-mm-dd': count }
      xpPopups: [],          // transient, not persisted but kept for render cycle

      get level() {
        return getLevelFromXP(get().totalXP).level
      },

      getLevelInfo: () => {
        return getLevelFromXP(get().totalXP)
      },

      awardXP: (amount, reason) => {
        const state = get()
        const newXP = state.totalXP + amount
        const oldLevel = getLevelFromXP(state.totalXP).level
        const newLevel = getLevelFromXP(newXP).level

        set({
          totalXP: newXP,
          xpPopups: [...state.xpPopups, { id: Date.now(), amount, reason }],
        })

        if (newLevel > oldLevel) {
          toast.success(`🎉 Level Up! You're now Level ${newLevel}!`, { duration: 4000 })
        }
      },

      onTaskCompleted: (todo) => {
        const state = get()
        const now = new Date()
        const today = now.toISOString().slice(0, 10)
        const hour = now.getHours()

        // Base XP
        let xp = 10
        let reason = 'Task completed'

        // On-time bonus
        let newOnTimeCount = state.onTimeCount
        if (todo.dueDate) {
          const dueDate = new Date(todo.dueDate)
          if (now <= dueDate) {
            xp += 5
            reason = 'Completed on time!'
            newOnTimeCount++
          }
        }

        // Time-of-day tracking
        let newEarlyBird = state.earlyBirdCount
        let newNightOwl = state.nightOwlCount
        if (hour < 8) newEarlyBird++
        if (hour >= 23) newNightOwl++

        // Daily completions
        const newDailyCompletions = { ...state.dailyCompletions }
        newDailyCompletions[today] = (newDailyCompletions[today] || 0) + 1
        const newMaxDaily = Math.max(state.maxDailyCompletions, newDailyCompletions[today])

        // Streak calculation
        let newCurrentStreak = state.currentStreak
        let newBestStreak = state.bestStreak
        if (state.lastCompletionDate) {
          const lastDate = new Date(state.lastCompletionDate)
          const diffDays = Math.floor((now - lastDate) / (1000 * 60 * 60 * 24))
          if (diffDays <= 1) {
            if (state.lastCompletionDate !== today) {
              newCurrentStreak++
            }
          } else {
            newCurrentStreak = 1
          }
        } else {
          newCurrentStreak = 1
        }
        newBestStreak = Math.max(newBestStreak, newCurrentStreak)

        // Streak bonus XP
        if (newCurrentStreak >= 3) {
          xp += 15
          reason = `${newCurrentStreak}-day streak!`
        }

        set({
          totalCompleted: state.totalCompleted + 1,
          earlyBirdCount: newEarlyBird,
          nightOwlCount: newNightOwl,
          onTimeCount: newOnTimeCount,
          dailyCompletions: newDailyCompletions,
          maxDailyCompletions: newMaxDaily,
          currentStreak: newCurrentStreak,
          bestStreak: newBestStreak,
          lastCompletionDate: today,
        })

        // Award XP
        get().awardXP(xp, reason)
      },

      onZeroInbox: () => {
        const state = get()
        set({ zeroInboxCount: state.zeroInboxCount + 1 })
        get().awardXP(25, 'Zero inbox! 🎉')
      },

      clearXPPopups: () => {
        set({ xpPopups: [] })
      },
    }),
    {
      name: 'todo-gamification-store',
      partialize: (state) => {
        // Don't persist transient xpPopups
        const { xpPopups, ...rest } = state
        return rest
      },
    }
  )
)
