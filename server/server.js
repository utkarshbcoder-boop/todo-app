import 'dotenv/config'
import express from 'express'
import cors from 'cors'
import admin from 'firebase-admin'
import rateLimit from 'express-rate-limit'
import helmet from 'helmet'
import compression from 'compression'
import { fileURLToPath } from 'url'
import { dirname, join } from 'path'

const __filename = fileURLToPath(import.meta.url)
const __dirname = dirname(__filename)

const app = express()
const PORT = process.env.PORT || 3001
const IS_PRODUCTION = process.env.NODE_ENV === 'production'
const ADMIN_EMAILS = (process.env.ADMIN_EMAILS || '').split(',').map(e => e.trim().toLowerCase()).filter(Boolean)
const FRONTEND_URL = process.env.FRONTEND_URL || (IS_PRODUCTION ? 'https://todo-app.vercel.app' : 'http://localhost:5173')

if (!admin.apps.length) {
  const initOptions = { projectId: process.env.FIREBASE_PROJECT_ID || 'todo-app-5b920' }
  if (process.env.FIREBASE_SERVICE_ACCOUNT_JSON) {
    initOptions.credential = admin.credential.cert(JSON.parse(process.env.FIREBASE_SERVICE_ACCOUNT_JSON))
  }
  try {
    admin.initializeApp(initOptions)
  } catch (err) {
    console.error('Firebase admin init error:', err.message)
  }
}

const db = admin.firestore()

app.use(helmet({
  contentSecurityPolicy: {
    directives: {
      defaultSrc: ["'self'"],
      scriptSrc: ["'self'", "https://apis.google.com"],
      styleSrc: ["'self'", "'unsafe-inline'", "https://fonts.googleapis.com"],
      fontSrc: ["'self'", "https://fonts.gstatic.com"],
      imgSrc: ["'self'", "data:", "https:", "blob:"],
      connectSrc: ["'self'", "https://*.googleapis.com", "https://*.firebaseio.com", "https://*.firebasedatabase.app", "wss://*.firebaseio.com"],
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

app.use(compression())

app.use(cors({
  origin: FRONTEND_URL,
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization'],
}))

app.use(express.json({ limit: '2mb' }))

app.use((req, res, next) => {
  res.setHeader('X-Content-Type-Options', 'nosniff')
  res.setHeader('X-Frame-Options', 'DENY')
  res.setHeader('Referrer-Policy', 'strict-origin-when-cross-origin')
  if (IS_PRODUCTION) {
    res.setHeader('Strict-Transport-Security', 'max-age=31536000; includeSubDomains; preload')
  }
  next()
})

const authLimiter = rateLimit({ windowMs: 15 * 60 * 1000, max: 60, message: { error: 'Too many attempts, try again later' } })
const apiLimiter = rateLimit({ windowMs: 60 * 1000, max: 120, message: { error: 'Rate limit exceeded' } })

const parseJson = (v, fallback) => {
  if (v === undefined || v === null) return fallback
  if (typeof v === 'string') { try { return JSON.parse(v) } catch { return fallback } }
  return v
}

const serializeTodo = (docSnap) => {
  const t = docSnap.data()
  return {
    ...t,
    id: docSnap.id,
    tags: parseJson(t.tags, []),
    subtasks: parseJson(t.subtasks, []),
    attachments: parseJson(t.attachments, []),
    blockedBy: parseJson(t.blockedBy, []),
  }
}

async function trackActivity(userId, action, details = {}) {
  try {
    await db.collection('activities').add({
      userId,
      action,
      details: JSON.stringify(details),
      createdAt: new Date().toISOString(),
    })
  } catch (err) {
    console.error('Activity tracking error:', err.message)
  }
}

async function authMiddleware(req, res, next) {
  const header = req.headers.authorization
  if (!header || !header.startsWith('Bearer ')) {
    return res.status(401).json({ error: 'Authentication required' })
  }
  try {
    const decoded = await admin.auth().verifyIdToken(header.split(' ')[1])
    const userSnap = await db.collection('users').doc(decoded.uid).get()
    let user = userSnap.exists ? userSnap.data() : null
    if (!user && decoded.email) {
      user = { id: decoded.uid, email: decoded.email, name: decoded.name || decoded.email.split('@')[0], picture: decoded.picture || null, role: 'user', status: 'active' }
      await db.collection('users').doc(decoded.uid).set({ ...user, createdAt: new Date().toISOString(), lastLogin: new Date().toISOString(), loginCount: 1 })
    }
    if (!user || user.status === 'banned' || user.status === 'suspended') {
      return res.status(403).json({ error: 'Account is not accessible' })
    }
    user.id = decoded.uid
    req.user = user
    req.userId = decoded.uid
    next()
  } catch {
    return res.status(401).json({ error: 'Invalid or expired token' })
  }
}

function adminMiddleware(req, res, next) {
  const isAdmin = req.user && (req.user.role === 'admin' || ADMIN_EMAILS.includes((req.user.email || '').toLowerCase()))
  if (!isAdmin) return res.status(403).json({ error: 'Admin access required' })
  next()
}

// ─── HEALTH ───

app.get('/api/health', (req, res) => {
  res.json({ status: 'ok', timestamp: new Date().toISOString() })
})

// ─── ADMIN ROUTES ───

app.get('/api/admin/users', authLimiter, authMiddleware, adminMiddleware, async (req, res) => {
  try {
    const usersSnap = await db.collection('users').orderBy('createdAt', 'desc').get()
    const result = await Promise.all(usersSnap.docs.map(async (d) => {
      const u = d.data()
      const [todoSnap, activitySnap] = await Promise.all([
        db.collection('todos').where('userId', '==', d.id).get(),
        db.collection('activities').where('userId', '==', d.id).get(),
      ])
      return {
        id: d.id,
        email: u.email,
        name: u.name,
        picture: u.picture,
        role: u.role || 'user',
        status: u.status || 'active',
        createdAt: u.createdAt,
        lastLogin: u.lastLogin,
        loginCount: u.loginCount || 0,
        todoCount: todoSnap.size,
        activityCount: activitySnap.size,
      }
    }))
    res.json({ users: result, total: result.length })
  } catch (err) {
    console.error('Admin users error:', err)
    res.status(500).json({ error: 'Failed to fetch users' })
  }
})

app.get('/api/admin/stats', authLimiter, authMiddleware, adminMiddleware, async (req, res) => {
  try {
    const now = new Date()
    const today = new Date(now.getFullYear(), now.getMonth(), now.getDate()).toISOString()
    const thisWeek = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000).toISOString()
    const thisMonth = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000).toISOString()

    const usersSnap = await db.collection('users').get()
    const todosSnap = await db.collection('todos').get()

    const users = usersSnap.docs.map(d => d.data())
    const completedTodos = todosSnap.docs.filter(d => d.data().completed === true).length

    res.json({
      stats: {
        totalUsers: users.length,
        activeUsers: users.filter(u => (u.status || 'active') === 'active').length,
        bannedUsers: users.filter(u => u.status === 'banned').length,
        newUsersToday: users.filter(u => u.createdAt >= today).length,
        newUsersThisWeek: users.filter(u => u.createdAt >= thisWeek).length,
        newUsersThisMonth: users.filter(u => u.createdAt >= thisMonth).length,
        recentLogins: users.filter(u => u.lastLogin && u.lastLogin >= thisWeek).length,
        totalTodos: todosSnap.size,
        completedTodos,
        activeTodos: todosSnap.size - completedTodos,
      },
    })
  } catch (err) {
    console.error('Admin stats error:', err)
    res.status(500).json({ error: 'Failed to fetch stats' })
  }
})

app.get('/api/admin/user/:id', authMiddleware, adminMiddleware, async (req, res) => {
  try {
    const userSnap = await db.collection('users').doc(req.params.id).get()
    if (!userSnap.exists) return res.status(404).json({ error: 'User not found' })
    const u = userSnap.data()

    const [todosSnap, activitiesSnap] = await Promise.all([
      db.collection('todos').where('userId', '==', req.params.id).get(),
      db.collection('activities').where('userId', '==', req.params.id).get(),
    ])

    const todos = todosSnap.docs.map(serializeTodo).sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt))
    const activities = activitiesSnap.docs
      .map(d => ({ id: d.id, ...d.data(), details: parseJson(d.data().details, {}) }))
      .sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt))
      .slice(0, 50)

    res.json({
      user: { id: userSnap.id, email: u.email, name: u.name, picture: u.picture, role: u.role || 'user', status: u.status || 'active', createdAt: u.createdAt, lastLogin: u.lastLogin, loginCount: u.loginCount || 0 },
      todos,
      activities,
      stats: {
        totalTodos: todos.length,
        completedTodos: todos.filter(t => t.completed).length,
        totalLogins: u.loginCount || 0,
        activityCount: activities.length,
      },
    })
  } catch (err) {
    console.error('Admin user detail error:', err)
    res.status(500).json({ error: 'Failed to fetch user details' })
  }
})

app.put('/api/admin/user/:id', authMiddleware, adminMiddleware, async (req, res) => {
  try {
    const ref = db.collection('users').doc(req.params.id)
    const snap = await ref.get()
    if (!snap.exists) return res.status(404).json({ error: 'User not found' })

    const data = {}
    if (req.body.status) data.status = req.body.status
    if (req.body.role) data.role = req.body.role
    if (req.body.name) data.name = req.body.name

    await ref.update(data)
    await trackActivity(req.userId, 'admin_user_updated', { targetUserId: req.params.id, changes: Object.keys(data) })
    res.json({ success: true, user: { id: req.params.id, ...snap.data(), ...data } })
  } catch (err) {
    console.error('Admin update user error:', err)
    res.status(500).json({ error: 'Failed to update user' })
  }
})

app.delete('/api/admin/user/:id', authMiddleware, adminMiddleware, async (req, res) => {
  try {
    const snap = await db.collection('users').doc(req.params.id).get()
    if (!snap.exists) return res.status(404).json({ error: 'User not found' })
    if (ADMIN_EMAILS.includes((snap.data().email || '').toLowerCase())) {
      return res.status(403).json({ error: 'Cannot delete admin users' })
    }

    const todosSnap = await db.collection('todos').where('userId', '==', req.params.id).get()
    const wb = db.batch()
    todosSnap.docs.forEach(d => wb.delete(d.ref))
    wb.delete(snap.ref)
    await wb.commit()

    try { await admin.auth().deleteUser(req.params.id) } catch { /* already gone */ }
    res.json({ success: true, message: 'User deleted' })
  } catch (err) {
    console.error('Admin delete user error:', err)
    res.status(500).json({ error: 'Failed to delete user' })
  }
})

app.get('/api/admin/user/:id/todos', authMiddleware, adminMiddleware, async (req, res) => {
  try {
    const todosSnap = await db.collection('todos').where('userId', '==', req.params.id).get()
    const todos = todosSnap.docs.map(serializeTodo).sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt))
    res.json({ todos, total: todos.length })
  } catch (err) {
    res.status(500).json({ error: 'Failed to fetch user todos' })
  }
})

app.put('/api/admin/user/:id/todo/:todoId', authMiddleware, adminMiddleware, async (req, res) => {
  try {
    const ref = db.collection('todos').doc(req.params.todoId)
    const snap = await ref.get()
    if (!snap.exists || snap.data().userId !== req.params.id) return res.status(404).json({ error: 'Todo not found' })

    const data = {}
    if (req.body.completed !== undefined) data.completed = req.body.completed
    if (req.body.text !== undefined) data.text = req.body.text
    if (req.body.priority !== undefined) data.priority = req.body.priority
    if (req.body.category !== undefined) data.category = req.body.category

    await ref.update(data)
    const updated = await ref.get()
    res.json({ todo: serializeTodo(updated) })
  } catch (err) {
    res.status(500).json({ error: 'Failed to update todo' })
  }
})

app.delete('/api/admin/user/:id/todo/:todoId', authMiddleware, adminMiddleware, async (req, res) => {
  try {
    const ref = db.collection('todos').doc(req.params.todoId)
    const snap = await ref.get()
    if (!snap.exists || snap.data().userId !== req.params.id) return res.status(404).json({ error: 'Todo not found' })
    await ref.delete()
    res.json({ success: true })
  } catch (err) {
    res.status(500).json({ error: 'Failed to delete todo' })
  }
})

app.get('/api/admin/activity', authMiddleware, adminMiddleware, async (req, res) => {
  try {
    const activitiesSnap = await db.collection('activities').orderBy('createdAt', 'desc').limit(200).get()
    const userCache = {}
    const activities = await Promise.all(activitiesSnap.docs.map(async (d) => {
      const a = d.data()
      if (!userCache[a.userId]) {
        const uSnap = await db.collection('users').doc(a.userId).get()
        userCache[a.userId] = uSnap.exists ? uSnap.data() : null
      }
      const u = userCache[a.userId]
      return {
        id: d.id,
        ...a,
        details: parseJson(a.details, {}),
        user: u ? { id: a.userId, name: u.name, email: u.email, picture: u.picture } : null,
      }
    }))
    res.json({ activities })
  } catch (err) {
    res.status(500).json({ error: 'Failed to fetch activity' })
  }
})

// ─── FRONTEND (Production, non-Vercel) ───

if (IS_PRODUCTION && !process.env.VERCEL) {
  const distPath = join(__dirname, '..', 'dist')
  app.use(express.static(distPath, { maxAge: '1y', etag: true, lastModified: true }))
  app.get('*', (req, res, next) => {
    if (req.path.startsWith('/api')) return next()
    res.sendFile(join(distPath, 'index.html'))
  })
} else {
  app.get('*', (req, res) => {
    res.status(404).json({ error: 'Not found' })
  })
}

if (!process.env.VERCEL) {
  app.listen(PORT, () => console.log(`Server running on http://localhost:${PORT}`))
}

export default app
