import { useState, useEffect } from 'react'
import { motion, AnimatePresence } from 'framer-motion'

export default function UpdateNotification() {
  const [updateAvailable, setUpdateAvailable] = useState(false)
  const [registration, setRegistration] = useState(null)

  useEffect(() => {
    if (!('serviceWorker' in navigator)) return

    const checkForUpdate = async () => {
      try {
        const reg = await navigator.serviceWorker.getRegistration()
        if (!reg) return

        if (reg.waiting) {
          setRegistration(reg)
          setUpdateAvailable(true)
        }

        reg.addEventListener('updatefound', () => {
          const newWorker = reg.installing
          if (!newWorker) return
          newWorker.addEventListener('statechange', () => {
            if (newWorker.state === 'installed' && navigator.serviceWorker.controller) {
              setRegistration(reg)
              setUpdateAvailable(true)
            }
          })
        })
      } catch {} // eslint-disable-line no-empty
    }

    checkForUpdate()
  }, [])

  const handleUpdate = () => {
    if (!registration?.waiting) return
    registration.waiting.postMessage({ type: 'SKIP_WAITING' })
    window.location.reload()
  }

  const handleDismiss = () => setUpdateAvailable(false)

  return (
    <AnimatePresence>
      {updateAvailable && (
        <motion.div
          initial={{ y: 80, opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          exit={{ y: 80, opacity: 0 }}
          className="fixed bottom-6 left-1/2 -translate-x-1/2 z-50 bg-white dark:bg-gray-800 rounded-2xl shadow-2xl border border-gray-200 dark:border-gray-700 p-4 max-w-sm w-[calc(100%-2rem)]"
          role="alert"
          aria-live="assertive"
        >
          <div className="flex items-start gap-3">
            <div className="flex-shrink-0 w-10 h-10 bg-blue-600 rounded-xl flex items-center justify-center">
              <svg className="w-5 h-5 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
              </svg>
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-sm font-semibold text-gray-900 dark:text-white">Update available</p>
              <p className="text-xs text-gray-500 dark:text-gray-400 mt-0.5">A new version of Todo App is ready</p>
            </div>
          </div>
          <div className="flex gap-2 mt-3 ml-13">
            <button onClick={handleUpdate}
              className="px-4 py-1.5 bg-blue-600 text-white text-sm font-medium rounded-lg hover:bg-blue-700 transition-colors cursor-pointer">
              Reload
            </button>
            <button onClick={handleDismiss}
              className="px-4 py-1.5 text-gray-500 dark:text-gray-400 text-sm font-medium rounded-lg hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors cursor-pointer">
              Later
            </button>
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  )
}
