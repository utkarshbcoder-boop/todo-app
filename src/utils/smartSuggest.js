// ─── SMART SUGGESTION ENGINE ───
// Keyword-based heuristics for auto-suggesting category, priority, and due date

const CATEGORY_KEYWORDS = {
  Work: ['meeting', 'call', 'email', 'report', 'deadline', 'presentation', 'project', 'client', 'office', 'work', 'standup', 'review', 'sprint', 'deploy', 'release', 'manager', 'team', 'memo', 'proposal', 'interview', 'invoice'],
  Health: ['gym', 'run', 'workout', 'doctor', 'medicine', 'dentist', 'yoga', 'walk', 'diet', 'health', 'exercise', 'vitamin', 'appointment', 'therapy', 'sleep', 'meditate', 'stretch', 'checkup', 'prescription', 'hospital'],
  Shopping: ['buy', 'groceries', 'order', 'shop', 'amazon', 'purchase', 'store', 'milk', 'bread', 'eggs', 'pick up', 'return', 'delivery', 'cart', 'market', 'supplies'],
  Finance: ['pay', 'bill', 'invoice', 'tax', 'budget', 'bank', 'transfer', 'rent', 'loan', 'insurance', 'invest', 'salary', 'expense', 'refund', 'subscription', 'credit', 'debit', 'savings', 'mortgage'],
  Personal: ['birthday', 'anniversary', 'family', 'friend', 'gift', 'vacation', 'travel', 'book', 'read', 'movie', 'hobby', 'clean', 'organize', 'laundry', 'cook', 'recipe', 'party', 'date', 'plan'],
}

const PRIORITY_KEYWORDS = {
  High: ['urgent', 'asap', 'critical', 'important', 'deadline', 'overdue', 'rush', 'emergency', 'priority', 'immediately', 'today'],
  Low: ['later', 'someday', 'whenever', 'eventually', 'maybe', 'optional', 'low', 'backlog', 'nice to have'],
}

const TAG_PREFIXES = ['#']

/**
 * Analyze text and suggest category, priority based on keywords
 */
export function suggestFromText(text) {
  if (!text) return { suggestedCategory: null, suggestedPriority: null, confidence: 0 }

  const lower = text.toLowerCase()
  const words = lower.split(/\s+/)

  // Category detection
  let bestCategory = null
  let bestCategoryScore = 0

  for (const [category, keywords] of Object.entries(CATEGORY_KEYWORDS)) {
    let score = 0
    for (const keyword of keywords) {
      if (keyword.includes(' ')) {
        if (lower.includes(keyword)) score += 2
      } else {
        if (words.some(w => w === keyword || w.startsWith(keyword))) score += 1
      }
    }
    if (score > bestCategoryScore) {
      bestCategoryScore = score
      bestCategory = category
    }
  }

  // Priority detection
  let suggestedPriority = null
  for (const [priority, keywords] of Object.entries(PRIORITY_KEYWORDS)) {
    for (const keyword of keywords) {
      if (keyword.includes(' ')) {
        if (lower.includes(keyword)) { suggestedPriority = priority; break }
      } else {
        if (words.some(w => w === keyword)) { suggestedPriority = priority; break }
      }
    }
    if (suggestedPriority) break
  }

  const confidence = Math.min(1, (bestCategoryScore * 0.3 + (suggestedPriority ? 0.3 : 0)))

  return {
    suggestedCategory: bestCategoryScore > 0 ? bestCategory : null,
    suggestedPriority,
    confidence,
  }
}

/**
 * Parse inline tags from text (e.g., #shopping #urgent)
 */
export function extractInlineTags(text) {
  const tags = []
  const regex = /#([a-zA-Z0-9_-]+)/g
  let match
  while ((match = regex.exec(text)) !== null) {
    tags.push(match[1])
  }
  return tags
}

/**
 * Parse inline priority markers (e.g., !high, !urgent, !low)
 */
export function extractInlinePriority(text) {
  const match = text.match(/!(high|medium|low|urgent)/i)
  if (!match) return null
  const val = match[1].toLowerCase()
  if (val === 'urgent' || val === 'high') return 'High'
  if (val === 'medium') return 'Medium'
  if (val === 'low') return 'Low'
  return null
}

/**
 * Parse natural language date from text
 * Returns { date: string (YYYY-MM-DD) | null, matchedText: string }
 */
export function extractNaturalDate(text) {
  if (!text) return { date: null, matchedText: '' }

  const lower = text.toLowerCase()
  const now = new Date()
  const fmt = (d) => {
    const y = d.getFullYear()
    const m = String(d.getMonth() + 1).padStart(2, '0')
    const dd = String(d.getDate()).padStart(2, '0')
    return `${y}-${m}-${dd}`
  }

  // "today"
  if (/\btoday\b/.test(lower)) return { date: fmt(now), matchedText: 'today' }

  // "tomorrow" / "tmr" / "tmrw"
  if (/\b(tomorrow|tmr|tmrw)\b/.test(lower)) {
    const d = new Date(now); d.setDate(d.getDate() + 1)
    return { date: fmt(d), matchedText: lower.match(/\b(tomorrow|tmr|tmrw)\b/)[0] }
  }

  // "next week"
  if (/\bnext\s+week\b/.test(lower)) {
    const d = new Date(now); d.setDate(d.getDate() + 7)
    return { date: fmt(d), matchedText: 'next week' }
  }

  // "next month"
  if (/\bnext\s+month\b/.test(lower)) {
    const d = new Date(now); d.setMonth(d.getMonth() + 1)
    return { date: fmt(d), matchedText: 'next month' }
  }

  // "in N days/weeks/months"
  const inMatch = lower.match(/\bin\s+(\d+)\s+(day|days|week|weeks|month|months)\b/)
  if (inMatch) {
    const num = parseInt(inMatch[1])
    const unit = inMatch[2].toLowerCase()
    const d = new Date(now)
    if (unit.startsWith('day')) d.setDate(d.getDate() + num)
    else if (unit.startsWith('week')) d.setDate(d.getDate() + num * 7)
    else if (unit.startsWith('month')) d.setMonth(d.getMonth() + num)
    return { date: fmt(d), matchedText: inMatch[0] }
  }

  // Day names: "monday", "next tuesday", etc
  const days = ['sunday', 'monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday']
  const dayMatch = lower.match(/\b(?:next\s+)?(monday|tuesday|wednesday|thursday|friday|saturday|sunday)\b/)
  if (dayMatch) {
    const dayIdx = days.indexOf(dayMatch[1])
    if (dayIdx !== -1) {
      const d = new Date(now)
      const diff = (dayIdx - d.getDay() + 7) % 7 || 7
      d.setDate(d.getDate() + diff)
      return { date: fmt(d), matchedText: dayMatch[0] }
    }
  }

  // "by DATE" or "due DATE" patterns: "by jan 15", "due 2025-01-15"
  const byMatch = lower.match(/\b(?:by|due|on|before)\s+(.+?)(?:\s+!|\s+#|$)/)
  if (byMatch) {
    try {
      const parsed = new Date(byMatch[1])
      if (!isNaN(parsed.getTime()) && parsed > new Date('2020-01-01')) {
        return { date: fmt(parsed), matchedText: byMatch[0].trim() }
      }
    } catch { /* ignore */ }
  }

  return { date: null, matchedText: '' }
}

/**
 * Full natural language parser: extracts everything from a single input line
 * "Buy milk tomorrow !high #shopping" → { cleanText, dueDate, priority, tags, suggestedCategory }
 */
export function parseNaturalInput(text) {
  if (!text) return { cleanText: '', dueDate: null, priority: null, tags: [], suggestedCategory: null }

  let remaining = text

  // Extract inline tags
  const tags = extractInlineTags(remaining)
  remaining = remaining.replace(/#[a-zA-Z0-9_-]+/g, '').trim()

  // Extract inline priority
  const priority = extractInlinePriority(remaining)
  remaining = remaining.replace(/!(high|medium|low|urgent)/gi, '').trim()

  // Extract date
  const { date, matchedText } = extractNaturalDate(remaining)
  if (matchedText) {
    remaining = remaining.replace(new RegExp(`\\b${matchedText.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}\\b`, 'i'), '').trim()
  }

  // Clean up extra whitespace
  remaining = remaining.replace(/\s+/g, ' ').trim()

  // Smart category suggestion from the clean text
  const { suggestedCategory } = suggestFromText(remaining)

  return {
    cleanText: remaining,
    dueDate: date,
    priority,
    tags,
    suggestedCategory,
  }
}
