import { useState, useEffect, useRef, useCallback } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { useTodoStore } from '../store/todoStore'
import { categoryIcons, priorityColors } from '../constants'

const TIMER_PRESETS = [
  { label: '25 min', seconds: 25 * 60 },
  { label: '50 min', seconds: 50 * 60 },
  { label: '90 min', seconds: 90 * 60 },
]

const AMBIENT_SOUNDS = [
  { id: 'none', label: '🔇 Off', emoji: '🔇' },
  { id: 'rain', label: '🌧️ Rain', emoji: '🌧️' },
  { id: 'cafe', label: '☕ Café', emoji: '☕' },
  { id: 'waves', label: '🌊 Waves', emoji: '🌊' },
  { id: 'white', label: '📻 White Noise', emoji: '📻' },
]

// Simple noise generator using Web Audio API
function createNoiseGenerator(type) {
  try {
    const ctx = new (window.AudioContext || window.webkitAudioContext)()
    const bufferSize = 2 * ctx.sampleRate
    const buffer = ctx.createBuffer(1, bufferSize, ctx.sampleRate)
    const data = buffer.getChannelData(0)

    if (type === 'rain') {
      // Brown noise for rain
      let lastOut = 0
      for (let i = 0; i < bufferSize; i++) {
        const white = Math.random() * 2 - 1
        data[i] = (lastOut + (0.02 * white)) / 1.02
        lastOut = data[i]
        data[i] *= 3.5
      }
    } else if (type === 'cafe') {
      // Pink noise for café ambiance
      let b0 = 0, b1 = 0, b2 = 0, b3 = 0, b4 = 0, b5 = 0, b6 = 0
      for (let i = 0; i < bufferSize; i++) {
        const white = Math.random() * 2 - 1
        b0 = 0.99886 * b0 + white * 0.0555179
        b1 = 0.99332 * b1 + white * 0.0750759
        b2 = 0.96900 * b2 + white * 0.1538520
        b3 = 0.86650 * b3 + white * 0.3104856
        b4 = 0.55000 * b4 + white * 0.5329522
        b5 = -0.7616 * b5 - white * 0.0168980
        data[i] = (b0 + b1 + b2 + b3 + b4 + b5 + b6 + white * 0.5362) * 0.11
        b6 = white * 0.115926
      }
    } else if (type === 'waves') {
      // Modulated brown noise for waves
      let lastOut = 0
      for (let i = 0; i < bufferSize; i++) {
        const white = Math.random() * 2 - 1
        data[i] = (lastOut + (0.02 * white)) / 1.02
        lastOut = data[i]
        const mod = Math.sin(i / ctx.sampleRate * 0.15 * Math.PI * 2) * 0.5 + 0.5
        data[i] *= mod * 4
      }
    } else {
      // White noise
      for (let i = 0; i < bufferSize; i++) {
        data[i] = Math.random() * 2 - 1
      }
    }

    const source = ctx.createBufferSource()
    source.buffer = buffer
    source.loop = true

    const gain = ctx.createGain()
    gain.gain.value = 0.15

    source.connect(gain)
    gain.connect(ctx.destination)
    source.start()

    return { stop: () => { source.stop(); ctx.close() }, setVolume: (v) => { gain.gain.value = v } }
  } catch {
    return { stop: () => {}, setVolume: () => {} }
  }
}

function formatTime(seconds) {
  const m = Math.floor(seconds / 60)
  const s = seconds % 60
  return `${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}`
}

export default function FocusMode({ todoId, onClose }) {
  const todo = useTodoStore((s) => s.todos.find(t => t.id === todoId))
  const toggleTodo = useTodoStore((s) => s.toggleTodo)
  const [timerPreset, setTimerPreset] = useState(0)
  const [secondsLeft, setSecondsLeft] = useState(TIMER_PRESETS[0].seconds)
  const [running, setRunning] = useState(false)
  const [ambientSound, setAmbientSound] = useState('none')
  const audioRef = useRef(null)
  const intervalRef = useRef(null)

  // Timer logic
  useEffect(() => {
    if (running && secondsLeft > 0) {
      intervalRef.current = setInterval(() => {
        setSecondsLeft(s => {
          if (s <= 1) {
            setRunning(false)
            if (typeof Notification !== 'undefined' && Notification.permission === 'granted') {
              new Notification('Focus Session Complete! 🎯', { body: `Great work on: ${todo?.text}`, icon: '/favicon.svg' })
            }
            return 0
          }
          return s - 1
        })
      }, 1000)
      return () => clearInterval(intervalRef.current)
    }
  }, [running, secondsLeft, todo?.text])

  // Ambient sound
  useEffect(() => {
    if (audioRef.current) {
      audioRef.current.stop()
      audioRef.current = null
    }
    if (ambientSound !== 'none') {
      audioRef.current = createNoiseGenerator(ambientSound)
    }
    return () => {
      if (audioRef.current) {
        audioRef.current.stop()
        audioRef.current = null
      }
    }
  }, [ambientSound])

  // Keyboard shortcuts
  useEffect(() => {
    const handler = (e) => {
      if (e.key === 'Escape') onClose()
      if (e.key === ' ' && e.target.tagName !== 'INPUT' && e.target.tagName !== 'TEXTAREA') {
        e.preventDefault()
        setRunning(r => !r)
      }
    }
    window.addEventListener('keydown', handler)
    return () => window.removeEventListener('keydown', handler)
  }, [onClose])

  const selectPreset = (idx) => {
    setTimerPreset(idx)
    setSecondsLeft(TIMER_PRESETS[idx].seconds)
    setRunning(false)
  }

  const handleComplete = () => {
    if (todo && !todo.completed) {
      toggleTodo(todo.id)
    }
    onClose()
  }

  const progress = TIMER_PRESETS[timerPreset].seconds > 0
    ? ((TIMER_PRESETS[timerPreset].seconds - secondsLeft) / TIMER_PRESETS[timerPreset].seconds) * 100
    : 0

  const completedSubtasks = todo?.subtasks?.filter(s => s.completed).length || 0
  const totalSubtasks = todo?.subtasks?.length || 0

  if (!todo) return null

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      className="fixed inset-0 z-[100] bg-gradient-to-br from-gray-900/95 via-indigo-950/95 to-gray-900/95 backdrop-blur-xl flex items-center justify-center p-4"
    >
      {/* Background animated glow */}
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        <motion.div
          animate={{ scale: [1, 1.2, 1], opacity: [0.1, 0.2, 0.1] }}
          transition={{ duration: 8, repeat: Infinity, ease: 'easeInOut' }}
          className="absolute top-1/4 left-1/4 w-96 h-96 bg-indigo-500/20 rounded-full blur-3xl"
        />
        <motion.div
          animate={{ scale: [1.2, 1, 1.2], opacity: [0.1, 0.15, 0.1] }}
          transition={{ duration: 10, repeat: Infinity, ease: 'easeInOut' }}
          className="absolute bottom-1/4 right-1/4 w-96 h-96 bg-purple-500/20 rounded-full blur-3xl"
        />
      </div>

      <motion.div
        initial={{ scale: 0.9, y: 20 }}
        animate={{ scale: 1, y: 0 }}
        transition={{ type: 'spring', stiffness: 300, damping: 25 }}
        className="relative z-10 w-full max-w-lg text-center space-y-8"
      >
        {/* Close button */}
        <button onClick={onClose}
          className="absolute -top-4 right-0 p-2 text-gray-400 hover:text-white transition-colors cursor-pointer"
          title="Close (Esc)">
          <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
          </svg>
        </button>

        {/* Focus icon */}
        <motion.div
          animate={{ rotate: running ? 360 : 0 }}
          transition={{ duration: 4, repeat: running ? Infinity : 0, ease: 'linear' }}
          className="inline-flex items-center justify-center w-16 h-16 rounded-2xl bg-gradient-to-br from-indigo-500 to-purple-600 shadow-xl shadow-indigo-500/30 mx-auto"
        >
          <span className="text-3xl">🎯</span>
        </motion.div>

        {/* Task text */}
        <div>
          <div className="flex items-center justify-center gap-2 mb-2">
            <span className="text-2xl">{categoryIcons[todo.category]}</span>
            <span className={`text-xs font-medium px-2.5 py-0.5 rounded-full ${priorityColors[todo.priority]}`}>
              {todo.priority}
            </span>
          </div>
          <h2 className={`text-2xl font-bold text-white leading-relaxed ${todo.completed ? 'line-through opacity-50' : ''}`}>
            {todo.text}
          </h2>
          {totalSubtasks > 0 && (
            <p className="text-sm text-indigo-300 mt-2">
              Subtasks: {completedSubtasks}/{totalSubtasks} completed
            </p>
          )}
        </div>

        {/* Timer ring */}
        <div className="relative inline-flex items-center justify-center">
          <svg className="w-48 h-48 -rotate-90" viewBox="0 0 200 200">
            <circle cx="100" cy="100" r="88" fill="none" stroke="rgba(255,255,255,0.1)" strokeWidth="6" />
            <motion.circle
              cx="100" cy="100" r="88" fill="none"
              stroke="url(#focusGradient)" strokeWidth="6"
              strokeLinecap="round"
              strokeDasharray={2 * Math.PI * 88}
              strokeDashoffset={2 * Math.PI * 88 * (1 - progress / 100)}
              transition={{ duration: 0.5 }}
            />
            <defs>
              <linearGradient id="focusGradient" x1="0%" y1="0%" x2="100%" y2="100%">
                <stop offset="0%" stopColor="#818cf8" />
                <stop offset="100%" stopColor="#a855f7" />
              </linearGradient>
            </defs>
          </svg>
          <div className="absolute inset-0 flex flex-col items-center justify-center">
            <span className="text-4xl font-mono font-bold text-white tracking-wider">
              {formatTime(secondsLeft)}
            </span>
            <span className="text-xs text-indigo-300 mt-1">
              {running ? 'FOCUSING' : secondsLeft === 0 ? 'DONE!' : 'PAUSED'}
            </span>
          </div>
        </div>

        {/* Timer controls */}
        <div className="space-y-4">
          {/* Preset buttons */}
          <div className="flex justify-center gap-2">
            {TIMER_PRESETS.map((preset, i) => (
              <button key={preset.label} onClick={() => selectPreset(i)}
                className={`px-4 py-1.5 text-xs font-medium rounded-full transition-all cursor-pointer ${
                  timerPreset === i
                    ? 'bg-indigo-500 text-white shadow-lg shadow-indigo-500/30'
                    : 'bg-white/10 text-gray-300 hover:bg-white/20'
                }`}>
                {preset.label}
              </button>
            ))}
          </div>

          {/* Play/Pause + Reset */}
          <div className="flex justify-center gap-3">
            <motion.button
              whileHover={{ scale: 1.05 }} whileTap={{ scale: 0.95 }}
              onClick={() => setRunning(r => !r)}
              className="px-8 py-3 bg-gradient-to-r from-indigo-500 to-purple-600 text-white font-semibold rounded-xl shadow-lg shadow-indigo-500/30 cursor-pointer"
            >
              {running ? '⏸ Pause' : '▶ Start'}
            </motion.button>
            <button
              onClick={() => { setSecondsLeft(TIMER_PRESETS[timerPreset].seconds); setRunning(false) }}
              className="px-4 py-3 bg-white/10 text-gray-300 hover:bg-white/20 rounded-xl transition-all cursor-pointer"
            >
              ↺ Reset
            </button>
          </div>
        </div>

        {/* Ambient sound */}
        <div className="space-y-2">
          <p className="text-xs uppercase tracking-wider text-gray-400 font-semibold">Ambient Sound</p>
          <div className="flex justify-center gap-2">
            {AMBIENT_SOUNDS.map(s => (
              <button key={s.id} onClick={() => setAmbientSound(s.id)}
                className={`px-3 py-1.5 text-xs rounded-full transition-all cursor-pointer ${
                  ambientSound === s.id
                    ? 'bg-indigo-500/30 text-indigo-300 ring-1 ring-indigo-500'
                    : 'bg-white/5 text-gray-400 hover:bg-white/10'
                }`}>
                {s.label}
              </button>
            ))}
          </div>
        </div>

        {/* Complete task button */}
        {!todo.completed && (
          <motion.button
            whileHover={{ scale: 1.02 }} whileTap={{ scale: 0.98 }}
            onClick={handleComplete}
            className="w-full py-3 bg-emerald-500/20 text-emerald-400 font-semibold rounded-xl hover:bg-emerald-500/30 transition-all cursor-pointer border border-emerald-500/30"
          >
            ✓ Mark Complete & Exit
          </motion.button>
        )}

        {/* Keyboard hints */}
        <p className="text-xs text-gray-500">
          <kbd className="px-1.5 py-0.5 bg-white/10 rounded text-gray-400">Space</kbd> Play/Pause &nbsp;
          <kbd className="px-1.5 py-0.5 bg-white/10 rounded text-gray-400">Esc</kbd> Close
        </p>
      </motion.div>
    </motion.div>
  )
}
