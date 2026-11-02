import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen, fireEvent } from '@testing-library/react'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { MemoryRouter } from 'react-router-dom'
import ResetPasswordPage from '../../pages/auth/ResetPassword/index.js'

const mockVerifyResetOtp = vi.fn()
const mockResetPasswordWithOtp = vi.fn()
const mockResendOtp = vi.fn()
const mockResetWithToken = vi.fn()

vi.mock('../../hooks/useAuth.js', () => ({
  useVerifyResetOtp: () => ({
    mutate: mockVerifyResetOtp,
    isPending: false,
    isError: false,
    error: null,
  }),
  useResetPasswordWithOtp: () => ({
    mutate: mockResetPasswordWithOtp,
    isPending: false,
    isError: false,
    error: null,
  }),
  useResendOtp: () => ({
    mutate: mockResendOtp,
    isPending: false,
    isSuccess: false,
  }),
  useResetPassword: () => ({
    mutate: mockResetWithToken,
    isPending: false,
    isError: false,
    error: null,
  }),
}))

const createWrapper = (initialEntries = ['/reset-password']) => {
  const queryClient = new QueryClient({
    defaultOptions: { queries: { retry: false } },
  })
  return ({ children }: { children: React.ReactNode }) => (
    <QueryClientProvider client={queryClient}>
      <MemoryRouter initialEntries={initialEntries}>{children}</MemoryRouter>
    </QueryClientProvider>
  )
}

describe('ResetPasswordPage (6-Digit OTP & Password Reset)', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('renders 6-digit OTP input when reached with email query parameter', () => {
    render(<ResetPasswordPage />, {
      wrapper: createWrapper(['/reset-password?email=customer%40example.com']),
    })

    expect(screen.getByText(/password recovery/i)).toBeInTheDocument()
    // Displays masked email
    expect(screen.getByText(/c\*{3,6}r@example\.com/i)).toBeInTheDocument()
    // 6 digit inputs are mounted
    expect(screen.getByTestId('cartiva-otp-container')).toBeInTheDocument()
    for (let i = 0; i < 6; i++) {
      expect(screen.getByTestId(`otp-input-${i}`)).toBeInTheDocument()
    }

    // Verify Code button is mounted
    const verifyBtn = screen.getByRole('button', { name: /verify 6-digit code/i })
    expect(verifyBtn).toBeInTheDocument()
    expect(verifyBtn).toBeDisabled() // disabled until 6 digits entered
  })

  it('allows entering 6 digits and enables the Verify button', () => {
    render(<ResetPasswordPage />, {
      wrapper: createWrapper(['/reset-password?email=test%40cartiva.com']),
    })

    const digits = ['1', '2', '3', '4', '5', '6']
    digits.forEach((digit, idx) => {
      const input = screen.getByTestId(`otp-input-${idx}`)
      fireEvent.change(input, { target: { value: digit } })
    })

    const verifyBtn = screen.getByRole('button', { name: /verify 6-digit code/i })
    expect(verifyBtn).not.toBeDisabled()

    fireEvent.click(verifyBtn)
    expect(mockVerifyResetOtp).toHaveBeenCalledWith(
      { email: 'test@cartiva.com', otp: '123456' },
      expect.anything(),
    )
  })

  it('allows email input if accessed without email in search params', () => {
    render(<ResetPasswordPage />, {
      wrapper: createWrapper(['/reset-password']),
    })

    const emailInput = screen.getByLabelText(/email address/i)
    expect(emailInput).toBeInTheDocument()

    fireEvent.change(emailInput, { target: { value: 'custom@example.com' } })
    expect(emailInput).toHaveValue('custom@example.com')
  })

  it('renders legacy password reset form when token is provided in URL', () => {
    render(<ResetPasswordPage />, {
      wrapper: createWrapper(['/reset-password?token=legacy_sample_token_xyz']),
    })

    expect(screen.getByText(/enter your new password below/i)).toBeInTheDocument()
    expect(screen.getByLabelText(/^new password/i)).toBeInTheDocument()
    expect(screen.getByLabelText(/confirm new password/i)).toBeInTheDocument()
    expect(screen.getByRole('button', { name: /reset password/i })).toBeInTheDocument()
  })
})
