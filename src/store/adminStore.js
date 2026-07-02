import { create } from 'zustand'
import { persist } from 'zustand/middleware'
import { getAccessToken } from './userStore'

const API_URL = import.meta.env.VITE_API_URL || '/api'

const defaultFeatures = {
  subtasks: { enabled: true, name: 'Subtasks', description: 'Add subtasks to your todos' },
  tags: { enabled: true, name: 'Tags', description: 'Add tags to organize todos' },
  notes: { enabled: true, name: 'Notes', description: 'Add markdown notes to todos' },
  recurrence: { enabled: true, name: 'Recurring Tasks', description: 'Set up recurring tasks' },
  reminders: { enabled: true, name: 'Reminders', description: 'Get browser notifications' },
  calendar: { enabled: true, name: 'Calendar View', description: 'View todos in calendar' },
  dashboard: { enabled: true, name: 'Dashboard', description: 'View statistics and charts' },
  importExport: { enabled: true, name: 'Import/Export', description: 'Import and export todos' },
  bulkActions: { enabled: true, name: 'Bulk Actions', description: 'Select and manage multiple todos' },
  dragDrop: { enabled: true, name: 'Drag & Drop', description: 'Reorder todos by dragging' },
  trash: { enabled: true, name: 'Trash', description: 'Recover deleted todos for 30 days' },
  pomodoro: { enabled: true, name: 'Pomodoro Timer', description: 'Focus timer with work/break cycles' },
  attachments: { enabled: true, name: 'Attachments', description: 'Attach files to todos' },
  dependencies: { enabled: true, name: 'Dependencies', description: 'Set task blockers' },
  i18n: { enabled: true, name: 'Multi-language', description: 'Support for multiple languages' },
  reviews: { enabled: true, name: 'Reviews', description: 'Weekly and monthly review prompts' },
  tagFilter: { enabled: true, name: 'Tag Filter', description: 'Filter todos by tags' },
  recurringView: { enabled: true, name: 'Recurring View', description: 'View all recurring tasks' },
}

async function fetchServerFeatures() {
  try {
    const res = await fetch(`${API_URL}/features`)
    if (!res.ok) return null
    const data = await res.json()
    return data.features || null
  } catch {
    return null
  }
}

async function persistFeatures(features) {
  const token = getAccessToken()
  if (!token) return
  try {
    await fetch(`${API_URL}/admin/features`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
      body: JSON.stringify({ features }),
    })
  } catch {
    // silent
  }
}

export const useAdminStore = create(
  persist(
    (set, get) => ({
      isAuthenticated: false,
      adminEmail: null,
      features: defaultFeatures,
      _serverLoaded: false,

      loadFeaturesFromServer: async () => {
        const serverFeatures = await fetchServerFeatures()
        if (serverFeatures && Object.keys(serverFeatures).length > 0) {
          set({ features: serverFeatures, _serverLoaded: true })
        } else {
          set({ _serverLoaded: true })
        }
      },

      login: (email) => {
        set({ isAuthenticated: true, adminEmail: email })
        return true
      },

      logout: () => set({ isAuthenticated: false, adminEmail: null }),

      toggleFeature: (featureKey) => {
        const state = get()
        const feature = state.features[featureKey]
        if (feature) {
          const newFeatures = {
            ...state.features,
            [featureKey]: { ...feature, enabled: !feature.enabled },
          }
          set({ features: newFeatures })
          persistFeatures(newFeatures)
        }
      },

      updateFeature: (featureKey, updates) => {
        const state = get()
        const feature = state.features[featureKey]
        if (feature) {
          const newFeatures = {
            ...state.features,
            [featureKey]: { ...feature, ...updates },
          }
          set({ features: newFeatures })
          persistFeatures(newFeatures)
        }
      },

      addFeature: (key, name, description) => {
        const state = get()
        if (!state.features[key]) {
          const newFeatures = {
            ...state.features,
            [key]: { enabled: true, name, description },
          }
          set({ features: newFeatures })
          persistFeatures(newFeatures)
        }
      },

      removeFeature: (key) => {
        const state = get()
        const features = { ...state.features }
        delete features[key]
        set({ features })
        persistFeatures(features)
      },

      isFeatureEnabled: (featureKey) => {
        const state = get()
        return state.features[featureKey]?.enabled ?? false
      },

      resetFeatures: () => {
        set({ features: defaultFeatures })
        persistFeatures(defaultFeatures)
      },
    }),
    {
      name: 'todo-admin-store',
      partialize: (state) => ({
        features: state.features,
      }),
    }
  )
)
