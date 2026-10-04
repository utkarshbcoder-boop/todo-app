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
import { auth, googleProvider } from '../firebase'

const API_URL = import.meta.env.VITE_API_URL || '/api'

let _accessToken = null
let _refreshPromise = null

async function safeJson(res) {
  const text = await res.text()
  if (!text) return {}
  try { return JSON.parse(text) } catch { return { error: `Server error (HTTP ${res.status}): Server might be offline or unreachable.` } }
}

async function exchangeFirebaseToken(idToken) {
  const res = await fetch(`${API_URL}/auth/firebase`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    credentials: 'include',
    body: JSON.stringify({ idToken }),
  })
  const data = await safeJson(res)
  if (!res.ok) throw new Error(data.error || 'Authentication failed')
  _accessToken = data.token
  return data.user
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
        try {
          const fbUser = await new Promise((resolve) => {
            const unsub = onAuthStateChanged(auth, (u) => { unsub(); resolve(u) })
          })
          if (fbUser) {
            const idToken = await fbUser.getIdToken()
            const user = await exchangeFirebaseToken(idToken)
            set({ user, isAuthenticated: true, isLoading: false, error: null, _initialized: true })
          } else {
            const res = await fetch(`${API_URL}/auth/refresh`, {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              credentials: 'include',
              body: JSON.stringify({}),
            })
            const data = await safeJson(res)
            if (res.ok && data.token) {
              _accessToken = data.token
            } else {
              _accessToken = null
              set({ user: null, isAuthenticated: false })
            }
          }
        } catch {
          // Network error — keep state for offline use
        }
        set({ _initialized: true })
      },

      setUser: (user) => set({ user, isAuthenticated: !!user }),

      loginStart: () => set({ isLoading: true, error: null }),

      loginSuccess: (user, token) => {
        _accessToken = token
        set({ user, isAuthenticated: true, isLoading: false, error: null, _initialized: true })
      },

      loginFailure: (error) => set({ isLoading: false, error }),

      clearError: () => set({ error: null }),

      logout: async () => {
        try {
          await fetch(`${API_URL}/auth/logout`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${_accessToken || ''}` },
            credentials: 'include',
          }).catch(() => {})
          await signOut(auth).catch(() => {})
        } finally {
          _accessToken = null
          set({ user: null, isAuthenticated: false })
        }
      },

      updateUser: (updates) => set((state) => ({
        user: state.user ? { ...state.user, ...updates } : null,
      })),

      register: async (name, email, password) => {
        set({ isLoading: true, error: null })
        try {
          const cred = await createUserWithEmailAndPassword(auth, email, password)
          await updateProfile(cred.user, { displayName: name })
          const idToken = await cred.user.getIdToken()
          const user = await exchangeFirebaseToken(idToken)
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
          const idToken = await cred.user.getIdToken()
          const user = await exchangeFirebaseToken(idToken)
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
          const idToken = await cred.user.getIdToken()
          const user = await exchangeFirebaseToken(idToken)
          set({ user, isAuthenticated: true, isLoading: false, error: null, _initialized: true })
          return true
        } catch (err) {
          set({ isLoading: false, error: err.code === 'auth/popup-closed-by-user' ? 'Sign-in cancelled' : err.message })
          return false
        }
      },

      refreshAccessToken: async () => {
        if (_refreshPromise) return _refreshPromise
        _refreshPromise = (async () => {
          try {
            const res = await fetch(`${API_URL}/auth/refresh`, {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              credentials: 'include', // Send httpOnly cookies
              body: JSON.stringify({}),
            })
            const data = await safeJson(res)
            if (!res.ok) throw new Error('Refresh failed')
            _accessToken = data.token
            return true
          } catch {
            _accessToken = null
            set({ user: null, isAuthenticated: false })
            return false
          } finally {
            _refreshPromise = null
          }
        })()
        return _refreshPromise
      },

      fetchWithAuth: async (url, options = {}) => {
        const headers = { ...options.headers }

        if (_accessToken) headers.Authorization = `Bearer ${_accessToken}`

        let res = await fetch(`${API_URL}${url}`, { ...options, headers, credentials: 'include' })

        if (res.status === 401) {
          const refreshed = await get().refreshAccessToken()
          if (refreshed && _accessToken) {
            headers.Authorization = `Bearer ${_accessToken}`
            res = await fetch(`${API_URL}${url}`, { ...options, headers, credentials: 'include' })
          } else {
            return { ok: false, status: 401, data: null, error: 'Session expired' }
          }
        }

        try {
          const data = await safeJson(res)
          return { ok: res.ok, status: res.status, data, error: res.ok ? null : (data.error || 'Request failed') }
        } catch {
          return { ok: false, status: res.status, data: null, error: 'Network error' }
        }
      },

      logoutWithoutToken: () => {
        _accessToken = null
        set({ user: null, isAuthenticated: false })
      },

      getToken: () => _accessToken,
    }),
    {
      name: 'todo-user-store',
      partialize: (state) => ({
        user: state.user,
        isAuthenticated: state.isAuthenticated,
        // NOTE: refreshToken is NO LONGER stored in localStorage
        // It's now handled exclusively via httpOnly cookies
      }),
    }
  )
)

export function getAccessToken() { return _accessToken }
