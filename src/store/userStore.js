import { create } from 'zustand'
import { persist } from 'zustand/middleware'

const API_URL = import.meta.env.VITE_API_URL || '/api'

let _accessToken = null
let _refreshPromise = null

async function safeJson(res) {
  const text = await res.text()
  if (!text) return {}
  try { return JSON.parse(text) } catch { return { error: `Server error (HTTP ${res.status}): Server might be offline or unreachable.` } }
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
        if (!state.isAuthenticated) {
          set({ _initialized: true })
          return
        }
        // Try to refresh using httpOnly cookie (sent automatically by browser)
        try {
          const res = await fetch(`${API_URL}/auth/refresh`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            credentials: 'include', // Send httpOnly cookies
            body: JSON.stringify({}),
          })
          const data = await safeJson(res)
          if (res.ok && data.token) {
            _accessToken = data.token
            set({ _initialized: true })
          } else {
            _accessToken = null
            set({ user: null, isAuthenticated: false, _initialized: true })
          }
        } catch {
          // Network error — keep state for offline use
          set({ _initialized: true })
        }
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
            credentials: 'include', // Send httpOnly cookies
          }).catch(() => {})
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
          const res = await fetch(`${API_URL}/auth/register`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            credentials: 'include', // Receive httpOnly cookies
            body: JSON.stringify({ name, email, password }),
          })
          const data = await safeJson(res)
          if (!res.ok) throw new Error(data.error || 'Registration failed')
          _accessToken = data.token
          set({ user: data.user, isAuthenticated: true, isLoading: false, error: null, _initialized: true })
          return true
        } catch (err) {
          set({ isLoading: false, error: err.message })
          return false
        }
      },

      login: async (email, password) => {
        set({ isLoading: true, error: null })
        try {
          const res = await fetch(`${API_URL}/auth/login`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            credentials: 'include', // Receive httpOnly cookies
            body: JSON.stringify({ email, password }),
          })
          const data = await safeJson(res)
          if (!res.ok) throw new Error(data.error || 'Login failed')
          _accessToken = data.token
          set({ user: data.user, isAuthenticated: true, isLoading: false, error: null, _initialized: true })
          return data
        } catch (err) {
          set({ isLoading: false, error: err.message })
          return null
        }
      },

      googleLogin: async (credential) => {
        set({ isLoading: true, error: null })
        try {
          const res = await fetch(`${API_URL}/auth/google`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            credentials: 'include', // Receive httpOnly cookies
            body: JSON.stringify({ credential }),
          })
          const data = await safeJson(res)
          if (!res.ok) throw new Error(data.error || 'Google login failed')
          _accessToken = data.token
          set({ user: data.user, isAuthenticated: true, isLoading: false, error: null, _initialized: true })
          return true
        } catch (err) {
          set({ isLoading: false, error: err.message })
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
