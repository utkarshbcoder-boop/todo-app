export default function ProgressRing({ percent }) {
  const r = 28, c = 2 * Math.PI * r, offset = c - (percent / 100) * c
  const prefersReducedMotion = typeof window !== 'undefined' && window.matchMedia('(prefers-reduced-motion: reduce)').matches
  return (
    <div className="relative inline-flex items-center justify-center glow-ring" role="progressbar" aria-valuenow={percent} aria-valuemin={0} aria-valuemax={100} aria-label={`Progress: ${percent}% complete`}>
      <svg width="72" height="72" viewBox="0 0 72 72">
        <circle cx="36" cy="36" r={r} fill="none" stroke="currentColor" strokeWidth="5" className="text-gray-200 dark:text-gray-700" />
        <circle cx="36" cy="36" r={r} fill="none" stroke="url(#progressGradient)" strokeWidth="5" strokeLinecap="round"
          strokeDasharray={c} strokeDashoffset={offset}
          style={prefersReducedMotion ? { transition: 'none' } : { transition: 'stroke-dashoffset 0.6s ease' }}
          transform="rotate(-90 36 36)" />
        <defs>
          <linearGradient id="progressGradient" x1="0%" y1="0%" x2="100%" y2="100%">
            <stop offset="0%" stopColor="#8b5cf6" />
            <stop offset="50%" stopColor="#d946ef" />
            <stop offset="100%" stopColor="#ec4899" />
          </linearGradient>
        </defs>
      </svg>
      <span className="absolute text-sm font-bold text-gray-700 dark:text-gray-200">{percent}%</span>
    </div>
  )
}
