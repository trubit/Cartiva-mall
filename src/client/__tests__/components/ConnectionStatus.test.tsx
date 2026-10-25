import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen, fireEvent, act } from '@testing-library/react'
import ConnectionStatus from '../../components/common/ConnectionStatus/index.js'
import * as networkHook from '../../hooks/useNetworkStatus.js'

describe('ConnectionStatus Component', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('renders nothing when there is no active status message', () => {
    vi.spyOn(networkHook, 'useNetworkStatus').mockReturnValue({
      isOnline: true,
      isBackendReachable: true,
      statusMessage: null,
      statusType: null,
      checkConnection: vi.fn(),
    })

    const { container } = render(<ConnectionStatus />)
    expect(container.firstChild).toBeNull()
  })

  it('renders offline alert banner with retry button when offline', async () => {
    const mockCheck = vi.fn().mockResolvedValue(false)
    vi.spyOn(networkHook, 'useNetworkStatus').mockReturnValue({
      isOnline: false,
      isBackendReachable: false,
      statusMessage: "You're offline. You can continue using available saved information.",
      statusType: 'offline',
      checkConnection: mockCheck,
    })

    render(<ConnectionStatus />)

    const banner = screen.getByRole('status')
    expect(banner).toBeInTheDocument()
    expect(banner).toHaveClass('cartiva-connection-banner--offline')
    expect(
      screen.getByText("You're offline. You can continue using available saved information."),
    ).toBeInTheDocument()

    const retryBtn = screen.getByRole('button', { name: /retry/i })
    expect(retryBtn).toBeInTheDocument()

    await act(async () => {
      fireEvent.click(retryBtn)
    })
    expect(mockCheck).toHaveBeenCalledTimes(1)
  })

  it('renders connection restored banner when connectivity returns', () => {
    vi.spyOn(networkHook, 'useNetworkStatus').mockReturnValue({
      isOnline: true,
      isBackendReachable: true,
      statusMessage: 'Connection restored. Checking for pending updates.',
      statusType: 'restored',
      checkConnection: vi.fn(),
    })

    render(<ConnectionStatus />)

    const banner = screen.getByRole('status')
    expect(banner).toBeInTheDocument()
    expect(banner).toHaveClass('cartiva-connection-banner--restored')
    expect(
      screen.getByText('Connection restored. Checking for pending updates.'),
    ).toBeInTheDocument()
  })

  it('renders server-error banner when backend is unreachable', async () => {
    const mockCheck = vi.fn().mockResolvedValue(false)
    vi.spyOn(networkHook, 'useNetworkStatus').mockReturnValue({
      isOnline: true,
      isBackendReachable: false,
      statusMessage: "We couldn't reach the server. Please try again.",
      statusType: 'server-error',
      checkConnection: mockCheck,
    })

    render(<ConnectionStatus />)

    const banner = screen.getByRole('status')
    expect(banner).toBeInTheDocument()
    expect(banner).toHaveClass('cartiva-connection-banner--server-error')
    expect(screen.getByText("We couldn't reach the server. Please try again.")).toBeInTheDocument()

    const retryBtn = screen.getByRole('button', { name: /retry/i })
    await act(async () => {
      fireEvent.click(retryBtn)
    })
    expect(mockCheck).toHaveBeenCalledTimes(1)
  })
})
