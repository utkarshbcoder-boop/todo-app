import { describe, it, expect, beforeEach, vi } from 'vitest'
import { render, screen, fireEvent } from '@testing-library/react'
import InstallPrompt from '../components/InstallPrompt'

describe('InstallPrompt', () => {
  beforeEach(() => {
    localStorage.clear()
    delete window.__deferredPrompt
  })

  it('renders nothing when no beforeinstallprompt event', () => {
    render(<InstallPrompt />)
    expect(screen.queryByRole('dialog')).not.toBeInTheDocument()
  })

  it('shows install dialog when beforeinstallprompt fires', () => {
    render(<InstallPrompt />)
    const event = new Event('beforeinstallprompt')
    event.preventDefault = vi.fn()
    event.prompt = vi.fn()
    event.userChoice = Promise.resolve({ outcome: 'dismissed' })
    fireEvent(window, event)
    expect(screen.getByRole('dialog')).toBeInTheDocument()
    expect(screen.getByText(/install todo app/i)).toBeInTheDocument()
  })

  it('calls prompt when Install clicked', async () => {
    const mockPrompt = vi.fn()
    const mockUserChoice = Promise.resolve({ outcome: 'accepted' })
    render(<InstallPrompt />)
    const event = new Event('beforeinstallprompt')
    event.preventDefault = vi.fn()
    event.prompt = mockPrompt
    event.userChoice = mockUserChoice
    fireEvent(window, event)
    fireEvent.click(screen.getByText('Install'))
    expect(mockPrompt).toHaveBeenCalled()
  })

  it('hides when Not now clicked', () => {
    render(<InstallPrompt />)
    const event = new Event('beforeinstallprompt')
    event.preventDefault = vi.fn()
    event.prompt = vi.fn()
    event.userChoice = Promise.resolve({ outcome: 'dismissed' })
    fireEvent(window, event)
    expect(screen.getByRole('dialog')).toBeInTheDocument()
    fireEvent.click(screen.getByText('Not now'))
    expect(screen.queryByRole('dialog')).not.toBeInTheDocument()
  })

  it('does not show after dismissal (localStorage)', () => {
    localStorage.setItem('pwa-install-dismissed', 'true')
    render(<InstallPrompt />)
    const event = new Event('beforeinstallprompt')
    event.preventDefault = vi.fn()
    event.prompt = vi.fn()
    event.userChoice = Promise.resolve({ outcome: 'dismissed' })
    fireEvent(window, event)
    expect(screen.queryByRole('dialog')).not.toBeInTheDocument()
  })

  it('hides when appinstalled event fires', () => {
    render(<InstallPrompt />)
    const event = new Event('beforeinstallprompt')
    event.preventDefault = vi.fn()
    event.prompt = vi.fn()
    event.userChoice = Promise.resolve({ outcome: 'dismissed' })
    fireEvent(window, event)
    expect(screen.getByRole('dialog')).toBeInTheDocument()
    fireEvent(window, new Event('appinstalled'))
    expect(screen.queryByRole('dialog')).not.toBeInTheDocument()
  })
})
