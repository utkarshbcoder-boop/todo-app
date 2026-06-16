import { describe, it, expect, beforeEach, vi } from 'vitest'
import { render, screen, fireEvent, waitFor } from '@testing-library/react'
import UpdateNotification from '../components/UpdateNotification'

describe('UpdateNotification', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    delete navigator.serviceWorker
  })

  it('renders nothing when no service worker', () => {
    render(<UpdateNotification />)
    expect(screen.queryByRole('alert')).not.toBeInTheDocument()
  })

  it('renders nothing when no registration', async () => {
    Object.defineProperty(navigator, 'serviceWorker', {
      value: { getRegistration: vi.fn().mockResolvedValue(undefined) },
      configurable: true,
    })
    render(<UpdateNotification />)
    expect(screen.queryByRole('alert')).not.toBeInTheDocument()
  })

  it('shows update notification when waiting worker exists', async () => {
    Object.defineProperty(navigator, 'serviceWorker', {
      value: {
        getRegistration: vi.fn().mockResolvedValue({
          waiting: { postMessage: vi.fn() },
          addEventListener: vi.fn(),
        }),
      },
      configurable: true,
    })
    render(<UpdateNotification />)
    await screen.findByRole('alert')
    expect(screen.getByText(/update available/i)).toBeInTheDocument()
    expect(screen.getByText(/new version/i)).toBeInTheDocument()
  })

  it('calls postMessage on Reload click', async () => {
    const mockPostMessage = vi.fn()
    Object.defineProperty(navigator, 'serviceWorker', {
      value: {
        getRegistration: vi.fn().mockResolvedValue({
          waiting: { postMessage: mockPostMessage },
          addEventListener: vi.fn(),
        }),
      },
      configurable: true,
    })
    render(<UpdateNotification />)
    await screen.findByRole('alert')
    fireEvent.click(screen.getByText('Reload'))
    expect(mockPostMessage).toHaveBeenCalledWith({ type: 'SKIP_WAITING' })
  })

  it('dismisses when Later clicked', async () => {
    Object.defineProperty(navigator, 'serviceWorker', {
      value: {
        getRegistration: vi.fn().mockResolvedValue({
          waiting: { postMessage: vi.fn() },
          addEventListener: vi.fn(),
        }),
      },
      configurable: true,
    })
    render(<UpdateNotification />)
    await screen.findByRole('alert')
    fireEvent.click(screen.getByText('Later'))
    await waitFor(() => {
      expect(screen.queryByText(/update available/i)).not.toBeInTheDocument()
    })
  })
})
