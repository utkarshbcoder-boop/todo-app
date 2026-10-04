import { create } from 'zustand'
import { persist } from 'zustand/middleware'
import {
  createUserWithEmailAndPassword,
  signInWithEmailAndPassword,
  signInWithPopup,
  signOut,
  updateProfile,
  onAuthStateChanged,
} from 'firebase/auth'
import { doc, getDoc, setDoc } from 'firebase/firestore'
import { auth, db, googleProvider } from '../firebase'

const API_URL = import.meta.env.VITE_API_URL || '/api'

async function getIdToken() {
  return auth.currentUser ? auth.currentUser.getIdToken() : null
}

async function safeJson(res) {
  const text = await res.text()
  if (!text) return {}
  try { return JSON.parse(text) } catch { return { error: `Server error (HTTP ${res.status})` } }
}

async function ensureUserDoc(fbUser) {
  const ref = doc(db, 'users', fbUser.uid)
  const snap = await getDoc(ref)
  if (!snap.exists()) {
    const data = {
      id: fbUser.uid,
      email: (fbUser.email || '').toLowerCase(),
      name: fbUser.displayName || (fbUser.email || '').split('@')[0],
      picture: fbUser.photoURL || null,
      role: 'user',
      status: 'active',
      createdAt: new Date().toISOString(),
      lastLogin: new Date().toISOString(),
      loginCount: 1,
    }
    await setDoc(ref, data)
    return data
  }
  const data = snap.data()
  await setDoc(ref, { lastLogin: new Date().toISOString(), loginCount: (data.loginCount || 0) + 1, picture: fbUser.photoURL || data.picture || null, name: fbUser.displayName || data.name }, { merge: true })
  return { ...data, id: fbUser.uid, email: data.email || fbUser.email }
}

export const useUserStore = create(
  persist(
    (set, get) => ({
      user: null,
      isAuthenticated: false,
      isLoading: false,
      error: null,
      _initialized: false,

      initialize: async () => {
        const state = get()
        if (state._initialized) return
        onAuthStateChanged(auth, async (fbUser) => {
          if (fbUser) {
            try {
              const user = await ensureUserDoc(fbUser)
              set({ user, isAuthenticated: true, error: null, _initialized: true })
            } catch (err) {
              set({ error: err.message, _initialized: true })
            }
          } else {
            set({ user: null, isAuthenticated: false, _initialized: true })
          }
        })
        set({ _initialized: true })
      },

      setUser: (user) => set({ user, isAuthenticated: !!user }),

      loginStart: () => set({ isLoading: true, error: null }),

      loginSuccess: (user) => {
        set({ user, isAuthenticated: true, isLoading: false, error: null, _initialized: true })
      },

      loginFailure: (error) => set({ isLoading: false, error }),

      clearError: () => set({ error: null }),

      register: async (name, email, password) => {
        set({ isLoading: true, error: null })
        try {
          const cred = await createUserWithEmailAndPassword(auth, email, password)
          await updateProfile(cred.user, { displayName: name })
          const user = await ensureUserDoc({ ...cred.user, displayName: name })
          set({ user: { ...user, name: user.name || name }, isAuthenticated: true, isLoading: false, error: null, _initialized: true })
          return true
        } catch (err) {
          set({ isLoading: false, error: err.code === 'auth/email-already-in-use' ? 'Email already registered' : err.message })
          return false
        }
      },

      login: async (email, password) => {
        set({ isLoading: true, error: null })
        try {
          const cred = await signInWithEmailAndPassword(auth, email, password)
          const user = await ensureUserDoc(cred.user)
          set({ user, isAuthenticated: true, isLoading: false, error: null, _initialized: true })
          return user
        } catch {
          set({ isLoading: false, error: 'Invalid email or password' })
          return null
        }
      },

      googleLogin: async () => {
        set({ isLoading: true, error: null })
        try {
          const cred = await signInWithPopup(auth, googleProvider)
          const user = await ensureUserDoc(cred.user)
          set({ user, isAuthenticated: true, isLoading: false, error: null, _initialized: true })
          return true
        } catch (err) {
          set({ isLoading: false, error: err.code === 'auth/popup-closed-by-user' ? 'Sign-in cancelled' : err.message })
          return false
        }
      },

      logout: async () => {
        try {
          await signOut(auth)
        } finally {
          set({ user: null, isAuthenticated: false })
        }
      },

      updateUser: (updates) => set((state) => ({
        user: state.user ? { ...state.user, ...updates } : null,
      })),

      refreshAccessToken: async () => true,

      fetchWithAuth: async (url, options = {}) => {
        const token = await getIdToken()
        const headers = { ...options.headers }
        if (options.body && !headers['Content-Type']) headers['Content-Type'] = 'application/json'
        if (token) headers.Authorization = `Bearer ${token}`
        try {
          const res = await fetch(`${API_URL}${url}`, { ...options, headers })
          const data = await safeJson(res)
          return { ok: res.ok, status: res.status, data, error: res.ok ? null : (data.error || 'Request failed') }
        } catch {
          return { ok: false, status: 0, data: null, error: 'Network error' }
        }
      },

      logoutWithoutToken: () => set({ user: null, isAuthenticated: false }),

      getToken: async () => getIdToken(),
    }),
    {
      name: 'todo-user-store',
      partialize: (state) => ({
        user: state.user,
        isAuthenticated: state.isAuthenticated,
      }),
    }
  )
)

export async function getAccessToken() { return getIdToken() }
