import '@testing-library/jest-dom'
import { vi } from 'vitest'

vi.mock('canvas-confetti', () => ({ default: vi.fn() }))

// Mock window.matchMedia for jsdom
Object.defineProperty(window, 'matchMedia', {
  writable: true,
  value: (query) => ({
    matches: false,
    media: query,
    onchange: null,
    addListener: () => {},
    removeListener: () => {},
    addEventListener: () => {},
    removeEventListener: () => {},
    dispatchEvent: () => false,
  }),
})

// Mock Notification API
Object.defineProperty(globalThis, 'Notification', {
  value: {
    permission: 'default',
    requestPermission: async () => 'default',
  },
})
