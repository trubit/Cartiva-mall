import { describe, it, expect, vi, beforeEach, afterAll } from 'vitest'
import { render, screen, fireEvent } from '@testing-library/react'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { MemoryRouter } from 'react-router-dom'
import SocialLogin from '../../components/auth/SocialLogin/index.js'
import { isMobileOrTabletDevice } from '../../utils/device.js'

// Mock @react-oauth/google
vi.mock('@react-oauth/google', () => ({
  useGoogleLogin: vi.fn(({ onSuccess }: any) => {
    return vi.fn(() => onSuccess({ access_token: 'mock_access_token' }))
  }),
  useGoogleOAuth: vi.fn(() => ({
    clientId: 'test-client-id',
    scriptLoadedSuccessfully: true,
  })),
}))

const mockMutate = vi.fn()
vi.mock('../../hooks/useAuth.js', () => ({
  useGoogleAuth: () => ({
    mutate: mockMutate,
    isPending: false,
    isError: false,
    error: null,
  }),
}))

const createWrapper = () => {
  const queryClient = new QueryClient({
    defaultOptions: { queries: { retry: false } },
  })
  return ({ children }: { children: React.ReactNode }) => (
    <QueryClientProvider client={queryClient}>
      <MemoryRouter>{children}</MemoryRouter>
    </QueryClientProvider>
  )
}

describe('SocialLogin & Mobile Device Detection', () => {
  const originalNavigator = window.navigator

  beforeEach(() => {
    vi.clearAllMocks()
    window.location.hash = ''
    window.sessionStorage.clear()
  })

  describe('isMobileOrTabletDevice detection', () => {
    it('detects iPhone User-Agent', () => {
      Object.defineProperty(window, 'navigator', {
        value: {
          userAgent: 'Mozilla/5.0 (iPhone; CPU iPhone OS 17_0 like Mac OS X) AppleWebKit/605.1.15',
          maxTouchPoints: 5,
        },
        configurable: true,
      })
      expect(isMobileOrTabletDevice()).toBe(true)
    })

    it('detects iPad User-Agent', () => {
      Object.defineProperty(window, 'navigator', {
        value: {
          userAgent: 'Mozilla/5.0 (iPad; CPU OS 17_0 like Mac OS X) AppleWebKit/605.1.15',
          maxTouchPoints: 5,
        },
        configurable: true,
      })
      expect(isMobileOrTabletDevice()).toBe(true)
    })

    it('detects Android phone User-Agent', () => {
      Object.defineProperty(window, 'navigator', {
        value: {
          userAgent:
            'Mozilla/5.0 (Linux; Android 14; SM-S918B) AppleWebKit/537.36 Chrome/120.0.0.0 Mobile Safari/537.36',
          maxTouchPoints: 5,
        },
        configurable: true,
      })
      expect(isMobileOrTabletDevice()).toBe(true)
    })

    it('detects Android tablet User-Agent (Android without Mobile)', () => {
      Object.defineProperty(window, 'navigator', {
        value: {
          userAgent:
            'Mozilla/5.0 (Linux; Android 14; SM-X910) AppleWebKit/537.36 Chrome/120.0.0.0 Safari/537.36',
          maxTouchPoints: 5,
        },
        configurable: true,
      })
      expect(isMobileOrTabletDevice()).toBe(true)
    })

    it('returns false for standard desktop browser', () => {
      Object.defineProperty(window, 'navigator', {
        value: {
          userAgent:
            'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 Chrome/120.0.0.0 Safari/537.36',
          maxTouchPoints: 0,
        },
        configurable: true,
      })
      expect(isMobileOrTabletDevice()).toBe(false)
    })

    afterAll(() => {
      Object.defineProperty(window, 'navigator', {
        value: originalNavigator,
        configurable: true,
      })
    })
  })

  describe('SocialLogin Component Rendering', () => {
    it('renders continue with divider and exactly ONE Google button', () => {
      render(<SocialLogin role="user" />, { wrapper: createWrapper() })
      expect(screen.getByText(/or continue with/i)).toBeInTheDocument()
      const googleBtns = screen.getAllByRole('button', { name: /continue with google/i })
      expect(googleBtns).toHaveLength(1)
      expect(screen.getByTestId('google-auth-btn')).toBeInTheDocument()
    })

    it('renders role-appropriate labels for seller sign up with exactly ONE button', () => {
      render(<SocialLogin role="seller" />, { wrapper: createWrapper() })
      const sellerBtns = screen.getAllByRole('button', { name: /sign up with google/i })
      expect(sellerBtns).toHaveLength(1)
      expect(screen.getByText(/sign up with google/i)).toBeInTheDocument()
    })

    it('handles Google button click on desktop', () => {
      render(<SocialLogin role="user" />, { wrapper: createWrapper() })
      const customBtn = screen.getByRole('button', { name: /continue with google account/i })
      fireEvent.click(customBtn)
      expect(mockMutate).toHaveBeenCalledWith({
        token: 'mock_access_token',
        role: 'user',
      })
    })

    it('processes access_token from URL hash after mobile redirect', () => {
      window.location.hash = '#access_token=ya29.sample_oauth_token&token_type=Bearer'
      render(<SocialLogin role="user" />, { wrapper: createWrapper() })
      expect(mockMutate).toHaveBeenCalledWith({
        token: 'ya29.sample_oauth_token',
        role: 'user',
      })
    })

    it('rejects authentication and displays error when state nonce fails CSRF verification', () => {
      window.sessionStorage.setItem('cv_oauth_state', 'expected_valid_nonce_123')
      const forgedState = encodeURIComponent(
        JSON.stringify({ role: 'user', nonce: 'attacker_fake_nonce_999' }),
      )
      window.location.hash = `#access_token=ya29.attacker_token&state=${forgedState}`

      render(<SocialLogin role="user" />, { wrapper: createWrapper() })

      expect(mockMutate).not.toHaveBeenCalled()
      expect(screen.getByText(/security state verification failed/i)).toBeInTheDocument()
    })

    it('displays user cancellation message without crashing when error=access_denied is in hash', () => {
      window.location.hash = '#error=access_denied'
      render(<SocialLogin role="user" />, { wrapper: createWrapper() })
      expect(screen.getByText(/google sign-in was cancelled/i)).toBeInTheDocument()
    })
  })
})
