import { describe, it, expect, beforeEach, afterEach } from 'vitest'
import { render, screen, fireEvent, act } from '@testing-library/react'
import OfflineBanner from '../components/OfflineBanner'

describe('OfflineBanner', () => {
  beforeEach(() => {
    Object.defineProperty(navigator, 'onLine', { writable: true, configurable: true, value: true })
  })

  afterEach(() => {
    Object.defineProperty(navigator, 'onLine', { writable: true, configurable: true, value: true })
  })

  it('renders nothing when online', () => {
    render(<OfflineBanner />)
    expect(screen.queryByRole('alert')).not.toBeInTheDocument()
  })

  it('shows offline banner when going offline', () => {
    render(<OfflineBanner />)
    act(() => { fireEvent(window, new Event('offline')) })
    expect(screen.getByRole('alert')).toBeInTheDocument()
    expect(screen.getByText(/you're offline/i)).toBeInTheDocument()
  })

  it('hides offline banner when coming back online', () => {
    render(<OfflineBanner />)
    act(() => { fireEvent(window, new Event('offline')) })
    expect(screen.getByRole('alert')).toBeInTheDocument()
    act(() => { fireEvent(window, new Event('online')) })
    expect(screen.queryByText(/you're offline/i)).not.toBeInTheDocument()
  })

  it('shows reconnected message temporarily', () => {
    render(<OfflineBanner />)
    act(() => { fireEvent(window, new Event('offline')) })
    act(() => { fireEvent(window, new Event('online')) })
    expect(screen.getByText(/back online/i)).toBeInTheDocument()
    expect(screen.getByRole('status')).toBeInTheDocument()
  })

  it('starts offline if navigator.onLine is false', () => {
    Object.defineProperty(navigator, 'onLine', { writable: true, configurable: true, value: false })
    render(<OfflineBanner />)
    expect(screen.getByRole('alert')).toBeInTheDocument()
    expect(screen.getByText(/you're offline/i)).toBeInTheDocument()
  })
})
