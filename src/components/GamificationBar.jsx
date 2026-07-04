import { useState, useEffect } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { useGamificationStore } from '../store/gamificationStore'

function XPPopup({ popup, onDone }) {
  useEffect(() => {
    const t = setTimeout(onDone, 2000)
    return () => clearTimeout(t)
  }, [onDone])

  return (
    <motion.div
      initial={{ opacity: 0, y: 10, scale: 0.8 }}
      animate={{ opacity: 1, y: -20, scale: 1 }}
      exit={{ opacity: 0, y: -40, scale: 0.5 }}
      className="absolute -top-6 right-0 pointer-events-none z-50"
    >
      <span className="text-sm font-bold text-emerald-500 dark:text-emerald-400 drop-shadow-sm">
        +{popup.amount} XP
      </span>
    </motion.div>
  )
}

export default function GamificationBar() {
  const totalXP = useGamificationStore((s) => s.totalXP)
  const getLevelInfo = useGamificationStore((s) => s.getLevelInfo)
  const xpPopups = useGamificationStore((s) => s.xpPopups)
  const clearXPPopups = useGamificationStore((s) => s.clearXPPopups)
  const currentStreak = useGamificationStore((s) => s.currentStreak)
  const totalCompleted = useGamificationStore((s) => s.totalCompleted)
  const [shownPopups, setShownPopups] = useState([])

  const levelInfo = getLevelInfo()
  const progressPercent = levelInfo.xpForNext > 0
    ? Math.min((levelInfo.currentLevelXP / levelInfo.xpForNext) * 100, 100)
    : 0

  // Track new popups
  useEffect(() => {
    if (xpPopups.length > 0) {
      setShownPopups(xpPopups)
      clearXPPopups()
    }
  }, [xpPopups, clearXPPopups])

  const handlePopupDone = (id) => {
    setShownPopups(prev => prev.filter(p => p.id !== id))
  }

  return (
    <motion.div
      initial={{ opacity: 0, y: -10 }}
      animate={{ opacity: 1, y: 0 }}
      className="todo-glass rounded-2xl p-2.5 sm:p-3 mb-3 sm:mb-4"
    >
      <div className="flex items-center gap-2 sm:gap-3">
        {/* Level badge */}
        <motion.div
          whileHover={{ scale: 1.1, rotate: 5 }}
          className="flex-shrink-0 w-9 h-9 sm:w-10 sm:h-10 rounded-xl bg-gradient-to-br from-indigo-500 to-purple-600 flex items-center justify-center shadow-lg shadow-indigo-500/30"
        >
          <span className="text-white font-bold text-xs sm:text-sm">{levelInfo.level}</span>
        </motion.div>

        {/* XP bar */}
        <div className="flex-1 min-w-0 relative">
          <div className="flex items-center justify-between mb-0.5 sm:mb-1">
            <span className="text-[10px] sm:text-xs font-semibold text-gray-700 dark:text-gray-200">
              Level {levelInfo.level}
            </span>
            <span className="text-[8px] sm:text-[10px] text-gray-400 dark:text-gray-500">
              {levelInfo.currentLevelXP} / {levelInfo.xpForNext} XP
            </span>
          </div>
          <div className="h-1.5 sm:h-2 bg-gray-200 dark:bg-gray-700 rounded-full overflow-hidden">
            <motion.div
              initial={{ width: 0 }}
              animate={{ width: `${progressPercent}%` }}
              transition={{ type: 'spring', stiffness: 100, damping: 15 }}
              className="h-full bg-gradient-to-r from-indigo-500 via-purple-500 to-pink-500 rounded-full"
            />
          </div>

          {/* XP popups */}
          <AnimatePresence>
            {shownPopups.map(popup => (
              <XPPopup key={popup.id} popup={popup} onDone={() => handlePopupDone(popup.id)} />
            ))}
          </AnimatePresence>
        </div>

        {/* Stats */}
        <div className="flex items-center gap-2 sm:gap-3 flex-shrink-0">
          {currentStreak > 0 && (
            <div className="flex items-center gap-0.5 sm:gap-1" title={`${currentStreak}-day streak`}>
              <span className="text-xs sm:text-sm">🔥</span>
              <span className="text-[10px] sm:text-xs font-bold text-amber-600 dark:text-amber-400">{currentStreak}</span>
            </div>
          )}

          <div className="flex items-center gap-0.5 sm:gap-1" title={`${totalCompleted} tasks completed`}>
            <span className="text-xs sm:text-sm">✅</span>
            <span className="text-[10px] sm:text-xs font-bold text-gray-600 dark:text-gray-300">{totalCompleted}</span>
          </div>
        </div>
      </div>
    </motion.div>
  )
}
