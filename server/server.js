import 'dotenv/config'
import express from 'express'
import cors from 'cors'
import crypto from 'crypto'
import bcrypt from 'bcryptjs'
import jwt from 'jsonwebtoken'
import cookieParser from 'cookie-parser'
import { OAuth2Client } from 'google-auth-library'
import nodemailer from 'nodemailer'
import rateLimit from 'express-rate-limit'
import { PrismaClient } from '@prisma/client'
import helmet from 'helmet'
import compression from 'compression'
import { fileURLToPath } from 'url'
import { dirname, join } from 'path'

const __filename = fileURLToPath(import.meta.url)
const __dirname = dirname(__filename)

const app = express()
const PORT = process.env.PORT || 3001
const IS_PRODUCTION = process.env.NODE_ENV === 'production'
const JWT_SECRET = process.env.JWT_SECRET || (() => {
  const s = crypto.randomBytes(64).toString('hex')
  console.warn('⚠  JWT_SECRET not set — using ephemeral secret. All sessions will invalidate on restart.')
  console.warn('   Generate a proper secret: node -e "console.log(require(\'crypto\').randomBytes(64).toString(\'hex\'))"')
  return s
})()
const ADMIN_PANEL_PASSWORD_HASH = process.env.ADMIN_PANEL_PASSWORD_HASH
const ADMIN_EMAILS = (process.env.ADMIN_EMAILS || '').split(',').filter(Boolean)
const FRONTEND_URL = process.env.FRONTEND_URL || (IS_PRODUCTION ? 'https://todo-app.vercel.app' : 'http://localhost:5173')

// Allowed attachment MIME types and max size (5MB)
const ALLOWED_ATTACHMENT_TYPES = [
  'image/jpeg', 'image/png', 'image/gif', 'image/webp', 'image/svg+xml',
  'application/pdf',
  'text/plain', 'text/markdown',
  'application/json',
  'application/zip',
]
const MAX_ATTACHMENT_SIZE = 5 * 1024 * 1024 // 5MB

// Whitelisted values for validated fields
const VALID_CATEGORIES = ['Personal', 'Work', 'Shopping', 'Health', 'Finance', 'Education', 'Other']
const VALID_PRIORITIES = ['Low', 'Medium', 'High', 'Urgent']
const VALID_RECURRENCES = ['none', 'daily', 'weekly', 'biweekly', 'monthly', 'yearly']

// Account lockout: track failed login attempts per email
const loginAttempts = new Map() // email -> { count, lockedUntil }
const MAX_LOGIN_ATTEMPTS = 5
const LOCKOUT_DURATION = 15 * 60 * 1000 // 15 minutes

const prisma = new PrismaClient()
const googleClient = new OAuth2Client(process.env.GOOGLE_CLIENT_ID || '')

// ─── SECURITY & PERFORMANCE ───

app.use(helmet({
  contentSecurityPolicy: {
    directives: {
      defaultSrc: ["'self'"],
      scriptSrc: ["'self'", "'unsafe-inline'", "https://accounts.google.com", "https://apis.google.com"],
      styleSrc: ["'self'", "'unsafe-inline'", "https://fonts.googleapis.com"],
      fontSrc: ["'self'", "https://fonts.gstatic.com"],
      imgSrc: ["'self'", "data:", "https:", "blob:"],
      connectSrc: ["'self'", "https://accounts.google.com"],
      frameSrc: ["https://accounts.google.com"],
      objectSrc: ["'none'"],
      baseUri: ["'self'"],
      formAction: ["'self'"],
      upgradeInsecureRequests: IS_PRODUCTION ? [] : null,
    },
  },
  crossOriginEmbedderPolicy: false,
  crossOriginResourcePolicy: { policy: 'cross-origin' },
}))

app.use(compression({
  filter: (req, res) => {
    if (req.headers['x-no-compression']) return false
    return compression.filter(req, res)
  },
  level: 6,
  threshold: 1024,
}))

// Cookie parser middleware
app.use(cookieParser())

if (IS_PRODUCTION) {
  app.use(cors({
    origin: FRONTEND_URL,
    credentials: true,
    methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
    allowedHeaders: ['Content-Type', 'Authorization'],
  }))
} else {
  app.use(cors({
    origin: FRONTEND_URL,
    credentials: true,
    methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
    allowedHeaders: ['Content-Type', 'Authorization'],
  }))
}

app.use(express.json({ limit: '10mb' }))

// Additional security headers
app.use((req, res, next) => {
  res.setHeader('X-Content-Type-Options', 'nosniff')
  res.setHeader('X-Frame-Options', 'DENY')
  res.setHeader('X-XSS-Protection', '1; mode=block')
  res.setHeader('Referrer-Policy', 'strict-origin-when-cross-origin')
  res.setHeader('Permissions-Policy', 'camera=(), microphone=(), geolocation=(), payment=()')
  if (IS_PRODUCTION) {
    res.setHeader('Strict-Transport-Security', 'max-age=31536000; includeSubDomains; preload')
  }
  next()
})

const authLimiter = rateLimit({ windowMs: 15 * 60 * 1000, max: 30, message: { error: 'Too many attempts, try again later' } })
const apiLimiter = rateLimit({ windowMs: 1 * 60 * 1000, max: 100, message: { error: 'Rate limit exceeded' } })

const transporter = nodemailer.createTransport({
  service: 'gmail',
  auth: {
    user: process.env.GMAIL_USER || '',
    pass: process.env.GMAIL_APP_PASSWORD || '',
  },
})

// ─── INPUT SANITIZATION ───

function sanitizeInput(str) {
  if (typeof str !== 'string') return str
  return str
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#x27;')
}

function validateAttachment(attachment) {
  if (!attachment || typeof attachment !== 'object') return false
  if (!attachment.name || typeof attachment.name !== 'string') return false
  if (!attachment.type || typeof attachment.type !== 'string') return false
  if (!attachment.dataUrl || typeof attachment.dataUrl !== 'string') return false
  if (attachment.size > MAX_ATTACHMENT_SIZE) return false
  if (!ALLOWED_ATTACHMENT_TYPES.includes(attachment.type)) return false
  // Validate dataUrl format
  if (!attachment.dataUrl.startsWith('data:')) return false
  return true
}

function validateCategory(cat) {
  return VALID_CATEGORIES.includes(cat)
}

function validatePriority(pri) {
  return VALID_PRIORITIES.includes(pri)
}

function validateRecurrence(rec) {
  return VALID_RECURRENCES.includes(rec)
}

// Account lockout helpers
function checkLockout(email) {
  const entry = loginAttempts.get(email)
  if (!entry) return false
  if (entry.lockedUntil && Date.now() < entry.lockedUntil) return true
  if (entry.lockedUntil && Date.now() >= entry.lockedUntil) {
    loginAttempts.delete(email)
    return false
  }
  return false
}

function recordFailedLogin(email) {
  const entry = loginAttempts.get(email) || { count: 0, lockedUntil: null }
  entry.count += 1
  if (entry.count >= MAX_LOGIN_ATTEMPTS) {
    entry.lockedUntil = Date.now() + LOCKOUT_DURATION
  }
  loginAttempts.set(email, entry)
}

function clearFailedLogins(email) {
  loginAttempts.delete(email)
}

const verificationCodes = new Map()

function generateCode() {
  return crypto.randomInt(100000, 999999).toString()
}

function generateToken(userId) {
  return jwt.sign({ userId }, JWT_SECRET, { expiresIn: '15m' })
}

function generateRefreshToken(userId) {
  return jwt.sign({ userId, jti: crypto.randomUUID() }, JWT_SECRET, { expiresIn: '30d' })
}

async function authMiddleware(req, res, next) {
  const header = req.headers.authorization
  if (!header || !header.startsWith('Bearer ')) {
    return res.status(401).json({ error: 'Authentication required' })
  }
  try {
    const decoded = jwt.verify(header.split(' ')[1], JWT_SECRET)
    const user = await prisma.user.findUnique({ where: { id: decoded.userId } })
    if (!user || user.status !== 'active') {
      return res.status(401).json({ error: 'Invalid or banned account' })
    }
    req.user = user
    req.userId = decoded.userId
    next()
  } catch {
    return res.status(401).json({ error: 'Invalid or expired token' })
  }
}

async function adminMiddleware(req, res, next) {
  if (!req.user || (req.user.role !== 'admin' && !ADMIN_EMAILS.includes(req.user.email))) {
    return res.status(403).json({ error: 'Admin access required' })
  }
  next()
}

async function trackActivity(userId, action, details = {}) {
  try {
    await prisma.activity.create({
      data: {
        userId,
        action,
        details: JSON.stringify(details),
      },
    })
  } catch (err) {
    console.error('Activity tracking error:', err.message)
  }
}

// ─── AUTH ROUTES ───

app.post('/api/auth/register', authLimiter, async (req, res) => {
  const { email, password, name } = req.body

  if (!email || !password || !name) {
    return res.status(400).json({ error: 'Email, password, and name are required' })
  }

  if (password.length < 6) {
    return res.status(400).json({ error: 'Password must be at least 6 characters' })
  }

  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/
  if (!emailRegex.test(email)) {
    return res.status(400).json({ error: 'Invalid email format' })
  }

  try {
    const existing = await prisma.user.findUnique({ where: { email: email.toLowerCase() } })
    if (existing) {
      return res.status(409).json({ error: 'Email already registered' })
    }

    const hashedPassword = await bcrypt.hash(password, 12)
    const role = ADMIN_EMAILS.includes(email.toLowerCase()) ? 'admin' : 'user'

    const user = await prisma.user.create({
      data: {
        email: email.toLowerCase(),
        name,
        password: hashedPassword,
        role,
      },
    })

    const token = generateToken(user.id)
    const refreshToken = generateRefreshToken(user.id)

    await prisma.session.create({
      data: {
        userId: user.id,
        token: refreshToken,
        userAgent: req.headers['user-agent'],
        ip: req.ip,
        expiresAt: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000),
      },
    })

    await trackActivity(user.id, 'register', { method: 'email' })

    // Set refresh token as httpOnly cookie for better security
    res.cookie('refreshToken', refreshToken, {
      httpOnly: true,
      secure: IS_PRODUCTION,
      sameSite: 'lax',
      maxAge: 30 * 24 * 60 * 60 * 1000, // 30 days
      path: '/api/auth',
    })

    res.json({
      success: true,
      token,
      user: { id: user.id, email: user.email, name: user.name, picture: user.picture, role: user.role },
    })
  } catch (err) {
    console.error('Registration error:', err)
    res.status(500).json({ error: 'Registration failed' })
  }
})

app.post('/api/auth/login', authLimiter, async (req, res) => {
  const { email, password } = req.body

  if (!email || !password) {
    return res.status(400).json({ error: 'Email and password are required' })
  }

  const normalizedEmail = email.toLowerCase()

  // Check account lockout
  if (checkLockout(normalizedEmail)) {
    return res.status(429).json({ error: 'Too many failed attempts. Account temporarily locked. Try again later.' })
  }

  try {
    const user = await prisma.user.findUnique({ where: { email: normalizedEmail } })
    if (!user) {
      recordFailedLogin(normalizedEmail)
      return res.status(401).json({ error: 'Invalid credentials' })
    }

    if (user.status === 'banned' || user.status === 'suspended') {
      return res.status(403).json({ error: 'Account is not accessible. Contact support.' })
    }

    if (!user.password) {
      // Don't reveal which auth method is used
      return res.status(401).json({ error: 'Invalid credentials' })
    }

    const valid = await bcrypt.compare(password, user.password)
    if (!valid) {
      recordFailedLogin(normalizedEmail)
      return res.status(401).json({ error: 'Invalid credentials' })
    }

    // Successful login — clear failed attempts
    clearFailedLogins(normalizedEmail)

    const token = generateToken(user.id)
    const refreshToken = generateRefreshToken(user.id)

    await prisma.user.update({
      where: { id: user.id },
      data: { lastLogin: new Date(), loginCount: { increment: 1 } },
    })

    await prisma.session.create({
      data: {
        userId: user.id,
        token: refreshToken,
        userAgent: req.headers['user-agent'],
        ip: req.ip,
        expiresAt: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000),
      },
    })

    await trackActivity(user.id, 'login', { method: 'email' })

    // Set refresh token as httpOnly cookie for better security
    res.cookie('refreshToken', refreshToken, {
      httpOnly: true,
      secure: IS_PRODUCTION,
      sameSite: 'lax',
      maxAge: 30 * 24 * 60 * 60 * 1000, // 30 days
      path: '/api/auth',
    })

    res.json({
      success: true,
      token,
      user: { id: user.id, email: user.email, name: user.name, picture: user.picture, role: user.role },
    })
  } catch (err) {
    console.error('Login error:', err)
    res.status(500).json({ error: 'Login failed' })
  }
})

app.post('/api/auth/refresh', async (req, res) => {
  // Accept refresh token from body or httpOnly cookie
  const refreshToken = req.body.refreshToken || req.cookies?.refreshToken
  if (!refreshToken) return res.status(400).json({ error: 'Refresh token required' })

  try {
    const decoded = jwt.verify(refreshToken, JWT_SECRET)
    const session = await prisma.session.findUnique({ where: { token: refreshToken } })
    if (!session || new Date(session.expiresAt) < new Date()) {
      return res.status(401).json({ error: 'Invalid refresh token' })
    }

    const token = generateToken(decoded.userId)
    res.json({ success: true, token })
  } catch {
    res.status(401).json({ error: 'Invalid refresh token' })
  }
})

app.post('/api/auth/logout', async (req, res) => {
  const refreshToken = req.body.refreshToken || req.cookies?.refreshToken
  if (refreshToken) {
    try {
      const decoded = jwt.verify(refreshToken, JWT_SECRET)
      await prisma.session.deleteMany({ where: { token: refreshToken } })
      if (decoded?.userId) await trackActivity(decoded.userId, 'logout', {})
    } catch {
      await prisma.session.deleteMany({ where: { token: refreshToken } }).catch(() => {})
    }
  }

  // Clear refresh token cookie
  res.clearCookie('refreshToken', { path: '/api/auth' })
  res.json({ success: true })
})

app.post('/api/auth/google', async (req, res) => {
  const { credential } = req.body

  try {
    const ticket = await googleClient.verifyIdToken({
      idToken: credential,
      audience: process.env.GOOGLE_CLIENT_ID,
    })

    const payload = ticket.getPayload()
    const { sub, email, name, picture } = payload

    let user = await prisma.user.findFirst({
      where: { OR: [{ email: email.toLowerCase() }, { id: sub }] },
    })

    const isNewUser = !user

    if (!user) {
      const role = ADMIN_EMAILS.includes(email.toLowerCase()) ? 'admin' : 'user'
      user = await prisma.user.create({
        data: {
          id: sub,
          email: email.toLowerCase(),
          name,
          picture,
          role,
        },
      })
    } else {
      user = await prisma.user.update({
        where: { id: user.id },
        data: {
          lastLogin: new Date(),
          loginCount: { increment: 1 },
          picture: picture || user.picture,
          name: name || user.name,
        },
      })
    }

    if (user.status === 'banned') {
      return res.status(403).json({ error: 'Account is banned' })
    }

    const token = generateToken(user.id)
    const refreshToken = generateRefreshToken(user.id)

    await prisma.session.create({
      data: {
        userId: user.id,
        token: refreshToken,
        userAgent: req.headers['user-agent'],
        ip: req.ip,
        expiresAt: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000),
      },
    })

    await trackActivity(user.id, isNewUser ? 'register' : 'login', { method: 'google' })

    // Set refresh token as httpOnly cookie
    res.cookie('refreshToken', refreshToken, {
      httpOnly: true,
      secure: IS_PRODUCTION,
      sameSite: 'lax',
      maxAge: 30 * 24 * 60 * 60 * 1000,
      path: '/api/auth',
    })

    res.json({
      success: true,
      token,
      user: { id: user.id, email: user.email, name: user.name, picture: user.picture, role: user.role },
    })
  } catch (error) {
    console.error('Google auth error:', error)
    res.status(401).json({ error: 'Invalid Google credential' })
  }
})

// ─── USER PROFILE ───

app.get('/api/auth/me', authMiddleware, async (req, res) => {
  const user = await prisma.user.findUnique({
    where: { id: req.userId },
    select: { id: true, email: true, name: true, picture: true, role: true, status: true, createdAt: true },
  })
  res.json({ user })
})

// ─── TODO ROUTES ───

app.get('/api/todos', authMiddleware, async (req, res) => {
  try {
    const todos = await prisma.todo.findMany({
      where: { userId: req.userId },
      orderBy: { sortOrder: 'asc' },
    })

    const parsed = todos.map(t => ({
      ...t,
      tags: JSON.parse(t.tags || '[]'),
      subtasks: JSON.parse(t.subtasks || '[]'),
      attachments: JSON.parse(t.attachments || '[]'),
      blockedBy: JSON.parse(t.blockedBy || '[]'),
    }))

    res.json({ todos: parsed })
  } catch (err) {
    console.error('Fetch todos error:', err)
    res.status(500).json({ error: 'Failed to fetch todos' })
  }
})

app.post('/api/todos', authMiddleware, async (req, res) => {
  try {
    const { text, category, priority, dueDate, notes, tags, subtasks, recurrence, reminderAt, attachments, blockedBy } = req.body

    if (!text || !text.trim()) {
      return res.status(400).json({ error: 'Todo text is required' })
    }

    if (text.trim().length > 5000) {
      return res.status(400).json({ error: 'Todo text must be under 5000 characters' })
    }

    // Validate and sanitize attachments
    if (attachments && Array.isArray(attachments)) {
      for (const att of attachments) {
        if (!validateAttachment(att)) {
          return res.status(400).json({ error: 'Invalid attachment: check file type (max 5MB, images/PDF/text only)' })
        }
      }
    }

    const maxOrder = await prisma.todo.aggregate({ where: { userId: req.userId }, _max: { sortOrder: true } })

    const todo = await prisma.todo.create({
      data: {
        text: sanitizeInput(text.trim()),
        category: validateCategory(category) ? category : 'Personal',
        priority: validatePriority(priority) ? priority : 'Medium',
        dueDate: dueDate || null,
        notes: sanitizeInput(notes || ''),
        tags: JSON.stringify((tags || []).map(t => typeof t === 'string' ? sanitizeInput(t) : t)),
        subtasks: JSON.stringify(subtasks || []),
        recurrence: validateRecurrence(recurrence) ? recurrence : 'none',
        reminderAt: reminderAt || 'none',
        attachments: JSON.stringify(attachments || []),
        blockedBy: JSON.stringify(blockedBy || []),
        sortOrder: (maxOrder._max.sortOrder || 0) + 1,
        userId: req.userId,
      },
    })

    await trackActivity(req.userId, 'todo_created', { todoId: todo.id })

    res.json({
      todo: {
        ...todo,
        tags: JSON.parse(todo.tags),
        subtasks: JSON.parse(todo.subtasks),
        attachments: JSON.parse(todo.attachments),
        blockedBy: JSON.parse(todo.blockedBy),
      },
    })
  } catch (err) {
    console.error('Create todo error:', err)
    res.status(500).json({ error: 'Failed to create todo' })
  }
})

app.put('/api/todos/:id', authMiddleware, async (req, res) => {
  try {
    const existing = await prisma.todo.findFirst({ where: { id: req.params.id, userId: req.userId } })
    if (!existing) return res.status(404).json({ error: 'Todo not found' })

    const data = {}
    if (req.body.text !== undefined) data.text = sanitizeInput(req.body.text)
    if (req.body.completed !== undefined) data.completed = req.body.completed
    if (req.body.category !== undefined) data.category = validateCategory(req.body.category) ? req.body.category : existing.category
    if (req.body.priority !== undefined) data.priority = validatePriority(req.body.priority) ? req.body.priority : existing.priority
    if (req.body.dueDate !== undefined) data.dueDate = req.body.dueDate
    if (req.body.notes !== undefined) data.notes = sanitizeInput(req.body.notes)
    if (req.body.tags !== undefined) data.tags = JSON.stringify((req.body.tags || []).map(t => typeof t === 'string' ? sanitizeInput(t) : t))
    if (req.body.subtasks !== undefined) data.subtasks = JSON.stringify(req.body.subtasks)
    if (req.body.recurrence !== undefined) data.recurrence = validateRecurrence(req.body.recurrence) ? req.body.recurrence : existing.recurrence
    if (req.body.reminderAt !== undefined) data.reminderAt = req.body.reminderAt
    if (req.body.attachments !== undefined) {
      // Validate attachments
      if (Array.isArray(req.body.attachments)) {
        for (const att of req.body.attachments) {
          if (!validateAttachment(att)) {
            return res.status(400).json({ error: 'Invalid attachment: check file type (max 5MB, images/PDF/text only)' })
          }
        }
      }
      data.attachments = JSON.stringify(req.body.attachments)
    }
    if (req.body.blockedBy !== undefined) data.blockedBy = JSON.stringify(req.body.blockedBy)
    if (req.body.sortOrder !== undefined) data.sortOrder = req.body.sortOrder

    const todo = await prisma.todo.update({ where: { id: req.params.id }, data })

    if (req.body.completed !== undefined) {
      await trackActivity(req.userId, req.body.completed ? 'todo_completed' : 'todo_uncompleted', { todoId: todo.id })
    }

    res.json({
      todo: {
        ...todo,
        tags: JSON.parse(todo.tags),
        subtasks: JSON.parse(todo.subtasks),
        attachments: JSON.parse(todo.attachments),
        blockedBy: JSON.parse(todo.blockedBy),
      },
    })
  } catch (err) {
    console.error('Update todo error:', err)
    res.status(500).json({ error: 'Failed to update todo' })
  }
})

app.put('/api/todos', authMiddleware, async (req, res) => {
  try {
    const { todos } = req.body
    if (!Array.isArray(todos)) return res.status(400).json({ error: 'Todos array required' })

    await prisma.$transaction(async (tx) => {
      await tx.todo.deleteMany({ where: { userId: req.userId } })

      if (todos.length > 0) {
        await tx.todo.createMany({
          data: todos.map((t, i) => ({
            id: t.id,
            text: sanitizeInput(t.text || ''),
            completed: t.completed,
            category: validateCategory(t.category) ? t.category : 'Other',
            priority: validatePriority(t.priority) ? t.priority : 'Medium',
            dueDate: t.dueDate || null,
            notes: sanitizeInput(t.notes || ''),
            tags: JSON.stringify((t.tags || []).map(tag => typeof tag === 'string' ? sanitizeInput(tag) : tag)),
            subtasks: JSON.stringify(t.subtasks || []),
            recurrence: validateRecurrence(t.recurrence) ? t.recurrence : 'none',
            reminderAt: t.reminderAt || 'none',
            attachments: JSON.stringify(t.attachments || []),
            blockedBy: JSON.stringify(t.blockedBy || []),
            sortOrder: t.sortOrder ?? i,
            userId: req.userId,
            createdAt: t.createdAt ? new Date(t.createdAt) : new Date(),
          })),
        })
      }
    })

    res.json({ success: true, count: todos.length })
  } catch (err) {
    console.error('Bulk update todos error:', err)
    res.status(500).json({ error: 'Failed to sync todos' })
  }
})

app.delete('/api/todos/:id', authMiddleware, async (req, res) => {
  try {
    const existing = await prisma.todo.findFirst({ where: { id: req.params.id, userId: req.userId } })
    if (!existing) return res.status(404).json({ error: 'Todo not found' })

    await prisma.todo.delete({ where: { id: req.params.id } })
    await trackActivity(req.userId, 'todo_deleted', { todoId: req.params.id })

    res.json({ success: true })
  } catch (err) {
    console.error('Delete todo error:', err)
    res.status(500).json({ error: 'Failed to delete todo' })
  }
})

// ─── ADMIN ROUTES ───

app.get('/api/admin/users', authMiddleware, adminMiddleware, async (req, res) => {
  try {
    const users = await prisma.user.findMany({
      include: {
        _count: { select: { todos: true, activities: true, sessions: true } },
      },
      orderBy: { createdAt: 'desc' },
    })

    const result = users.map(u => ({
      id: u.id,
      email: u.email,
      name: u.name,
      picture: u.picture,
      role: u.role,
      status: u.status,
      createdAt: u.createdAt,
      lastLogin: u.lastLogin,
      loginCount: u.loginCount,
      todoCount: u._count.todos,
      activityCount: u._count.activities,
      sessionCount: u._count.sessions,
    }))

    res.json({ users: result, total: result.length })
  } catch (err) {
    console.error('Admin users error:', err)
    res.status(500).json({ error: 'Failed to fetch users' })
  }
})

app.get('/api/admin/stats', authMiddleware, adminMiddleware, async (req, res) => {
  try {
    const now = new Date()
    const today = new Date(now.getFullYear(), now.getMonth(), now.getDate())
    const thisWeek = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000)
    const thisMonth = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000)

    const [totalUsers, activeUsers, bannedUsers, newToday, newThisWeek, newThisMonth, recentLogins, totalTodos, completedTodos] = await Promise.all([
      prisma.user.count(),
      prisma.user.count({ where: { status: 'active' } }),
      prisma.user.count({ where: { status: 'banned' } }),
      prisma.user.count({ where: { createdAt: { gte: today } } }),
      prisma.user.count({ where: { createdAt: { gte: thisWeek } } }),
      prisma.user.count({ where: { createdAt: { gte: thisMonth } } }),
      prisma.user.count({ where: { lastLogin: { gte: thisWeek } } }),
      prisma.todo.count(),
      prisma.todo.count({ where: { completed: true } }),
    ])

    res.json({
      stats: {
        totalUsers,
        activeUsers,
        bannedUsers,
        newUsersToday: newToday,
        newUsersThisWeek: newThisWeek,
        newUsersThisMonth: newThisMonth,
        recentLogins,
        totalTodos,
        completedTodos,
        activeTodos: totalTodos - completedTodos,
      },
    })
  } catch (err) {
    console.error('Admin stats error:', err)
    res.status(500).json({ error: 'Failed to fetch stats' })
  }
})

app.get('/api/admin/user/:id', authMiddleware, adminMiddleware, async (req, res) => {
  try {
    const user = await prisma.user.findUnique({
      where: { id: req.params.id },
      include: {
        todos: { orderBy: { createdAt: 'desc' } },
        activities: { orderBy: { createdAt: 'desc' }, take: 50 },
        sessions: { orderBy: { createdAt: 'desc' }, take: 20 },
      },
    })

    if (!user) return res.status(404).json({ error: 'User not found' })

    const parsedTodos = user.todos.map(t => ({
      ...t,
      tags: JSON.parse(t.tags || '[]'),
      subtasks: JSON.parse(t.subtasks || '[]'),
      attachments: JSON.parse(t.attachments || '[]'),
      blockedBy: JSON.parse(t.blockedBy || '[]'),
    }))

    const parsedActivities = user.activities.map(a => ({
      ...a,
      details: JSON.parse(a.details || '{}'),
    }))

    res.json({
      user: {
        id: user.id,
        email: user.email,
        name: user.name,
        picture: user.picture,
        role: user.role,
        status: user.status,
        createdAt: user.createdAt,
        lastLogin: user.lastLogin,
        loginCount: user.loginCount,
      },
      todos: parsedTodos,
      activities: parsedActivities,
      sessions: user.sessions,
      stats: {
        totalTodos: user.todos.length,
        completedTodos: user.todos.filter(t => t.completed).length,
        totalLogins: user.loginCount,
        sessionCount: user.sessions.length,
        activityCount: user.activities.length,
      },
    })
  } catch (err) {
    console.error('Admin user detail error:', err)
    res.status(500).json({ error: 'Failed to fetch user details' })
  }
})

app.put('/api/admin/user/:id', authMiddleware, adminMiddleware, async (req, res) => {
  try {
    const user = await prisma.user.findUnique({ where: { id: req.params.id } })
    if (!user) return res.status(404).json({ error: 'User not found' })

    const data = {}
    if (req.body.status) data.status = req.body.status
    if (req.body.role) data.role = req.body.role
    if (req.body.name) data.name = req.body.name

    const updated = await prisma.user.update({ where: { id: req.params.id }, data })

    await trackActivity(req.userId, 'admin_user_updated', { targetUserId: req.params.id, changes: Object.keys(data) })

    res.json({ success: true, user: updated })
  } catch (err) {
    console.error('Admin update user error:', err)
    res.status(500).json({ error: 'Failed to update user' })
  }
})

app.delete('/api/admin/user/:id', authMiddleware, adminMiddleware, async (req, res) => {
  try {
    const user = await prisma.user.findUnique({ where: { id: req.params.id } })
    if (!user) return res.status(404).json({ error: 'User not found' })

    if (ADMIN_EMAILS.includes(user.email)) {
      return res.status(403).json({ error: 'Cannot delete admin users' })
    }

    await prisma.user.delete({ where: { id: req.params.id } })

    res.json({ success: true, message: 'User deleted' })
  } catch (err) {
    console.error('Admin delete user error:', err)
    res.status(500).json({ error: 'Failed to delete user' })
  }
})

app.get('/api/admin/user/:id/todos', authMiddleware, adminMiddleware, async (req, res) => {
  try {
    const todos = await prisma.todo.findMany({
      where: { userId: req.params.id },
      orderBy: { createdAt: 'desc' },
    })

    const parsed = todos.map(t => ({
      ...t,
      tags: JSON.parse(t.tags || '[]'),
      subtasks: JSON.parse(t.subtasks || '[]'),
      attachments: JSON.parse(t.attachments || '[]'),
      blockedBy: JSON.parse(t.blockedBy || '[]'),
    }))

    res.json({ todos: parsed, total: parsed.length })
  } catch (err) {
    console.error('Admin user todos error:', err)
    res.status(500).json({ error: 'Failed to fetch user todos' })
  }
})

app.put('/api/admin/user/:id/todo/:todoId', authMiddleware, adminMiddleware, async (req, res) => {
  try {
    const todo = await prisma.todo.findFirst({ where: { id: req.params.todoId, userId: req.params.id } })
    if (!todo) return res.status(404).json({ error: 'Todo not found' })

    const data = {}
    if (req.body.completed !== undefined) data.completed = req.body.completed
    if (req.body.text !== undefined) data.text = req.body.text
    if (req.body.priority !== undefined) data.priority = req.body.priority
    if (req.body.category !== undefined) data.category = req.body.category

    const updated = await prisma.todo.update({ where: { id: req.params.todoId }, data })

    res.json({
      todo: {
        ...updated,
        tags: JSON.parse(updated.tags),
        subtasks: JSON.parse(updated.subtasks),
        attachments: JSON.parse(updated.attachments),
        blockedBy: JSON.parse(updated.blockedBy),
      },
    })
  } catch (err) {
    console.error('Admin update todo error:', err)
    res.status(500).json({ error: 'Failed to update todo' })
  }
})

app.delete('/api/admin/user/:id/todo/:todoId', authMiddleware, adminMiddleware, async (req, res) => {
  try {
    const todo = await prisma.todo.findFirst({ where: { id: req.params.todoId, userId: req.params.id } })
    if (!todo) return res.status(404).json({ error: 'Todo not found' })

    await prisma.todo.delete({ where: { id: req.params.todoId } })

    res.json({ success: true })
  } catch (err) {
    console.error('Admin delete todo error:', err)
    res.status(500).json({ error: 'Failed to delete todo' })
  }
})

app.get('/api/admin/activity', authMiddleware, adminMiddleware, async (req, res) => {
  try {
    const activities = await prisma.activity.findMany({
      include: { user: { select: { id: true, name: true, email: true, picture: true } } },
      orderBy: { createdAt: 'desc' },
      take: 200,
    })

    const parsed = activities.map(a => ({
      ...a,
      details: JSON.parse(a.details || '{}'),
    }))

    res.json({ activities: parsed })
  } catch (err) {
    console.error('Admin activity error:', err)
    res.status(500).json({ error: 'Failed to fetch activity' })
  }
})

// ─── FEATURE FLAGS ───

app.get('/api/features', async (req, res) => {
  try {
    const features = await prisma.featureFlag.findMany()
    const result = {}
    features.forEach(f => { result[f.key] = { enabled: f.enabled, name: f.name, description: f.description } })
    res.json({ features: result })
  } catch (err) {
    res.status(500).json({ error: 'Failed to fetch features' })
  }
})

app.put('/api/admin/features', authMiddleware, adminMiddleware, async (req, res) => {
  try {
    const { features } = req.body
    if (!features || typeof features !== 'object') return res.status(400).json({ error: 'Features object required' })

    for (const [key, feature] of Object.entries(features)) {
      await prisma.featureFlag.upsert({
        where: { key },
        update: { enabled: feature.enabled, name: feature.name, description: feature.description || '' },
        create: { key, enabled: feature.enabled, name: feature.name, description: feature.description || '' },
      })
    }

    res.json({ success: true })
  } catch (err) {
    console.error('Update features error:', err)
    res.status(500).json({ error: 'Failed to update features' })
  }
})

// ─── EMAIL VERIFICATION (Registration & Admin) ───

app.post('/api/send-code', authLimiter, async (req, res) => {
  const { email, purpose } = req.body

  // For admin verification, only allow admin emails
  if (purpose === 'admin' && !ADMIN_EMAILS.includes(email)) {
    return res.status(403).json({ error: 'Unauthorized email' })
  }

  // For registration, check if email is already registered
  if (purpose === 'register') {
    const existing = await prisma.user.findUnique({ where: { email: email.toLowerCase() } })
    if (existing) {
      return res.status(409).json({ error: 'Email already registered' })
    }
  }

  const code = generateCode()
  verificationCodes.set(email, { code, purpose, expires: Date.now() + 5 * 60 * 1000 })

  try {
    const subject = purpose === 'admin' ? 'Admin Portal Verification Code' : 'Email Verification Code'
    await transporter.sendMail({
      from: process.env.GMAIL_USER || '',
      to: email,
      subject,
      html: `
        <div style="font-family: Arial, sans-serif; max-width: 400px; margin: 0 auto; padding: 20px;">
          <h2 style="color: #4f46e5;">Verification Code</h2>
          <p>Your verification code is:</p>
          <div style="background: #f3f4f6; padding: 20px; text-align: center; border-radius: 10px; margin: 20px 0;">
            <span style="font-size: 32px; font-weight: bold; letter-spacing: 8px; color: #4f46e5;">${code}</span>
          </div>
          <p style="color: #6b7280; font-size: 14px;">This code expires in 5 minutes.</p>
        </div>
      `,
    })
    res.json({ success: true, message: 'Verification code sent' })
  } catch (error) {
    console.error('Email error:', error)
    res.status(500).json({ error: 'Failed to send email' })
  }
})

app.post('/api/verify-code', authLimiter, (req, res) => {
  const { email, code, purpose } = req.body
  const stored = verificationCodes.get(email)

  if (!stored) return res.status(400).json({ error: 'No verification code found' })
  if (Date.now() > stored.expires) { verificationCodes.delete(email); return res.status(400).json({ error: 'Code expired' }) }
  if (stored.code !== code) return res.status(400).json({ error: 'Invalid code' })
  if (purpose && stored.purpose !== purpose) return res.status(400).json({ error: 'Invalid code purpose' })

  verificationCodes.delete(email)
  res.json({ success: true, verified: true })
})

// ─── DEV BYPASS ───

app.post('/api/auth/dev-login', async (req, res) => {
  if (process.env.ENABLE_DEV_LOGIN !== 'true') {
    return res.status(403).json({ error: 'Dev login is disabled. Set ENABLE_DEV_LOGIN=true to enable.' })
  }

  try {
    let user = await prisma.user.findUnique({ where: { email: 'dev@localhost' } })
    if (!user) {
      user = await prisma.user.create({
        data: { email: 'dev@localhost', name: 'Dev User', role: 'admin' },
      })
    }

    const token = generateToken(user.id)
    const refreshToken = generateRefreshToken(user.id)

    await prisma.user.update({ where: { id: user.id }, data: { lastLogin: new Date(), loginCount: { increment: 1 } } })
    await prisma.session.create({ data: { userId: user.id, token: refreshToken, expiresAt: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000) } })
    await trackActivity(user.id, 'login', { method: 'dev' })

    res.json({ success: true, token, refreshToken, user: { id: user.id, email: user.email, name: user.name, picture: user.picture, role: user.role } })
  } catch (err) {
    console.error('Dev login error:', err)
    res.status(500).json({ error: 'Dev login failed' })
  }
})

// ─── ADMIN PANEL AUTH ───

app.post('/api/admin/auth', authMiddleware, async (req, res) => {
  const { password } = req.body
  if (!password) return res.status(400).json({ error: 'Password required' })

  if (req.user.role !== 'admin' && !ADMIN_EMAILS.includes(req.user.email)) {
    return res.status(403).json({ error: 'Admin access required' })
  }

  if (!ADMIN_PANEL_PASSWORD_HASH) {
    return res.status(500).json({ error: 'Admin panel password not configured' })
  }

  const isValid = await bcrypt.compare(password, ADMIN_PANEL_PASSWORD_HASH)
  if (!isValid) {
    return res.status(401).json({ error: 'Invalid admin password' })
  }

  res.json({ success: true, verified: true })
})

// ─── HEALTH ───

app.get('/api/health', (req, res) => {
  res.json({ status: 'ok', timestamp: new Date().toISOString() })
})

// ─── SERVE FRONTEND (Production) ───

if (IS_PRODUCTION) {
  const distPath = join(__dirname, '..', 'dist')

  app.use(express.static(distPath, {
    maxAge: '1y',
    etag: true,
    lastModified: true,
    setHeaders(res, filePath) {
      if (filePath.endsWith('.html')) {
        res.setHeader('Cache-Control', 'no-cache')
      }
    },
  }))

  app.get('*', (req, res) => {
    res.setHeader('Cache-Control', 'no-cache')
    res.sendFile(join(distPath, 'index.html'))
  })
} else {
  app.get('*', (req, res) => {
    res.status(404).json({ error: 'Not found' })
  })
}

// ─── STARTUP ───

async function seedDefaultAdmin() {
  for (const email of ADMIN_EMAILS) {
    const existing = await prisma.user.findUnique({ where: { email: email.trim() } })
    if (!existing) {
      // Generate a random password for admin if no default password is set
      const defaultPassword = process.env.ADMIN_DEFAULT_PASSWORD || crypto.randomBytes(16).toString('hex')
      const hashed = await bcrypt.hash(defaultPassword, 12)
      await prisma.user.create({
        data: {
          email: email.trim(),
          name: 'Admin',
          password: hashed,
          role: 'admin',
        },
      })
      console.log(`Default admin created: ${email.trim()}`)
      if (!process.env.ADMIN_DEFAULT_PASSWORD) {
        // Write to a one-time file instead of console (avoids log aggregation leaks)
        const fs = await import('fs')
        const pwFile = join(__dirname, '.admin-initial-password')
        fs.writeFileSync(pwFile, `Admin: ${email.trim()}\nPassword: ${defaultPassword}\n\nDelete this file after reading!\n`)
        console.log(`⚠  Generated admin password written to: ${pwFile} — READ AND DELETE IT!`)
      }
    }
  }
}

async function seedDefaultFeatures() {
  const defaults = {
    subtasks: { name: 'Subtasks', description: 'Add subtasks to your todos' },
    tags: { name: 'Tags', description: 'Add tags to organize todos' },
    notes: { name: 'Notes', description: 'Add markdown notes to todos' },
    recurrence: { name: 'Recurring Tasks', description: 'Set up recurring tasks' },
    reminders: { name: 'Reminders', description: 'Get browser notifications' },
    calendar: { name: 'Calendar View', description: 'View todos in calendar' },
    dashboard: { name: 'Dashboard', description: 'View statistics and charts' },
    importExport: { name: 'Import/Export', description: 'Import and export todos' },
    bulkActions: { name: 'Bulk Actions', description: 'Select and manage multiple todos' },
    dragDrop: { name: 'Drag & Drop', description: 'Reorder todos by dragging' },
    trash: { name: 'Trash', description: 'Recover deleted todos for 30 days' },
    pomodoro: { name: 'Pomodoro Timer', description: 'Focus timer with work/break cycles' },
    attachments: { name: 'Attachments', description: 'Attach files to todos' },
    dependencies: { name: 'Dependencies', description: 'Set task blockers' },
    i18n: { name: 'Multi-language', description: 'Support for multiple languages' },
    reviews: { name: 'Reviews', description: 'Weekly and monthly review prompts' },
    tagFilter: { name: 'Tag Filter', description: 'Filter todos by tags' },
    recurringView: { name: 'Recurring View', description: 'View all recurring tasks' },
  }

  for (const [key, feature] of Object.entries(defaults)) {
    await prisma.featureFlag.upsert({
      where: { key },
      update: {},
      create: { key, name: feature.name, description: feature.description, enabled: true },
    })
  }
}

async function cleanupExpiredSessions() {
  try {
    await prisma.session.deleteMany({ where: { expiresAt: { lt: new Date() } } })
  } catch { /* ignore */ }
}

function cleanupVerificationCodes() {
  const now = Date.now()
  for (const [email, entry] of verificationCodes) {
    if (now > entry.expires) verificationCodes.delete(email)
  }
}

async function start() {
  try {
    await prisma.$connect()
    console.log('Database connected')

    if (!ADMIN_PANEL_PASSWORD_HASH) console.warn('⚠  ADMIN_PANEL_PASSWORD_HASH not set — admin panel verification will fail')
    if (!process.env.JWT_SECRET) console.warn('⚠  JWT_SECRET not set — using ephemeral secret (sessions invalidate on restart)')
    if (!ADMIN_EMAILS.length) console.warn('⚠  ADMIN_EMAILS not set — no admin emails configured')

    await seedDefaultAdmin()
    await seedDefaultFeatures()
    await cleanupExpiredSessions()

    setInterval(cleanupExpiredSessions, 60 * 60 * 1000)
    setInterval(cleanupVerificationCodes, 5 * 60 * 1000)

    app.listen(PORT, () => {
      console.log(`Server running on http://localhost:${PORT}`)
    })
  } catch (err) {
    console.error('Failed to start server:', err)
    process.exit(1)
  }
}

start()

process.on('SIGTERM', async () => {
  await prisma.$disconnect()
  process.exit(0)
})

process.on('SIGINT', async () => {
  await prisma.$disconnect()
  process.exit(0)
})
