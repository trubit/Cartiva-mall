import { useMutation, useQuery } from '@tanstack/react-query'
import { useNavigate } from 'react-router-dom'
import { authService } from '../services/authService.js'
import { useAuthStore } from '../store/authStore.js'
import { useCartStore } from '../store/cartStore.js'
import { useSellerStore } from '../store/sellerStore.js'
import { useDashboardStore } from '../store/dashboardStore.js'
import { useOrderStore } from '../store/orderStore.js'
import { usePaymentStore } from '../store/paymentStore.js'
import { useCheckoutStore } from '../store/checkoutStore.js'
import { cartService } from '../services/cartService.js'
import { queryClient } from '../services/queryClient.js'
import { CART_KEY } from './useCart.js'
import type {
  LoginInput,
  RegisterInput,
  VerifyEmailOtpInput,
  ResetPasswordOtpInput,
  ResendOtpInput,
} from '../../shared/validators/auth.validators.js'

// ─── Login ────────────────────────────────────────────────────────────────────
export const useLogin = () => {
  const { setAuth } = useAuthStore()
  const navigate = useNavigate()
  const { guestItems, clearGuestCart, setServerCart } = useCartStore()

  return useMutation({
    mutationFn: (data: LoginInput) => authService.login(data),
    onSuccess: async (res) => {
      if (res.data) {
        setAuth(res.data.user, res.data.accessToken)

        // Merge guest cart into server cart then clear local
        if (guestItems.length > 0) {
          try {
            const synced = await cartService.syncCart({
              items: guestItems.map((i) => ({ productId: i.product._id, quantity: i.quantity })),
            })
            setServerCart(synced)
            queryClient.setQueryData(CART_KEY, synced)
            clearGuestCart()
          } catch {
            // Non-fatal — proceed to login even if sync fails
          }
        }

        navigate('/')
      }
    },
  })
}

// ─── Register ─────────────────────────────────────────────────────────────────
export const useRegister = () => {
  const navigate = useNavigate()

  return useMutation({
    mutationFn: (data: RegisterInput) => authService.register(data),
    onSuccess: (_res, variables) => {
      navigate(`/verify-email?email=${encodeURIComponent(variables.email)}`)
    },
  })
}

// ─── Verify Email with 6-Digit OTP ───────────────────────────────────────────
export const useVerifyEmailOtp = () => {
  const { setAuth } = useAuthStore()
  const navigate = useNavigate()
  const { guestItems, clearGuestCart, setServerCart } = useCartStore()

  return useMutation({
    mutationFn: (data: VerifyEmailOtpInput) => authService.verifyEmailOtp(data),
    onSuccess: async (res) => {
      if (res.data?.user && res.data?.accessToken) {
        setAuth(res.data.user, res.data.accessToken)

        if (guestItems.length > 0) {
          try {
            const synced = await cartService.syncCart({
              items: guestItems.map((i) => ({ productId: i.product._id, quantity: i.quantity })),
            })
            setServerCart(synced)
            queryClient.setQueryData(CART_KEY, synced)
            clearGuestCart()
          } catch {
            // non-fatal
          }
        }

        navigate('/?verified=true')
      } else {
        navigate('/login?verified=true')
      }
    },
  })
}

// ─── Resend OTP ───────────────────────────────────────────────────────────────
export const useResendOtp = () =>
  useMutation({
    mutationFn: (data: ResendOtpInput) => authService.resendOtp(data),
  })

// ─── Reset Password with OTP ──────────────────────────────────────────────────
export const useResetPasswordWithOtp = () => {
  const navigate = useNavigate()
  return useMutation({
    mutationFn: (data: ResetPasswordOtpInput) => authService.resetPasswordWithOtp(data),
    onSuccess: () => {
      navigate('/login?reset=true')
    },
  })
}

// ─── Logout ───────────────────────────────────────────────────────────────────
export const useLogout = () => {
  const navigate = useNavigate()

  return useMutation({
    mutationFn: () => authService.logout(),
    onMutate: () => {
      // Clear immediately so UI reacts with 0 latency
      useAuthStore.getState().clearAuth()
      useCartStore.getState().clearServerCart()
      useCartStore.getState().clearGuestCart()
      useSellerStore.getState().reset()
      useDashboardStore.getState().clearAll()
      useOrderStore.getState().clearAll()
      usePaymentStore.getState().reset()
      useCheckoutStore.getState().reset()
      queryClient.clear()
    },
    onSettled: () => {
      navigate('/login', { replace: true })
    },
  })
}

// ─── Current User ─────────────────────────────────────────────────────────────
export const useMe = () => {
  const { isAuthenticated, updateUser } = useAuthStore()

  return useQuery({
    queryKey: ['auth', 'me'],
    queryFn: async () => {
      const res = await authService.getMe()
      if (res.data?.user) {
        updateUser(res.data.user)
      }
      return res.data?.user
    },
    enabled: isAuthenticated,
    staleTime: 5 * 60 * 1000,
    refetchOnWindowFocus: true,
  })
}

// ─── Forgot Password ──────────────────────────────────────────────────────────
export const useForgotPassword = () =>
  useMutation({
    mutationFn: (email: string) => authService.forgotPassword(email),
  })

// ─── Reset Password (Token/Link backward compat) ──────────────────────────────
export const useResetPassword = () => {
  const navigate = useNavigate()
  return useMutation({
    mutationFn: ({
      token,
      password,
      confirmPassword,
    }: {
      token: string
      password: string
      confirmPassword: string
    }) => authService.resetPassword(token, password, confirmPassword),
    onSuccess: () => {
      navigate('/login?reset=true')
    },
  })
}

// ─── Verify Email (Token/Link backward compat) ────────────────────────────────
export const useVerifyEmail = (token: string) =>
  useQuery({
    queryKey: ['auth', 'verify-email', token],
    queryFn: () => authService.verifyEmail(token),
    enabled: !!token,
    retry: false,
  })

// ─── Resend Verification Email ────────────────────────────────────────────────
export const useResendVerification = () =>
  useMutation({
    mutationFn: (email: string) => authService.resendVerification(email),
  })

// ─── Google OAuth ─────────────────────────────────────────────────────────────
export const useGoogleAuth = () => {
  const { setAuth } = useAuthStore()
  const navigate = useNavigate()
  const { guestItems, clearGuestCart, setServerCart } = useCartStore()

  return useMutation({
    mutationFn: (data: { token?: string; credential?: string; code?: string; role?: string }) =>
      authService.googleAuth(data),
    onSuccess: async (res) => {
      if (res.data?.user && res.data?.accessToken) {
        setAuth(res.data.user, res.data.accessToken)

        if (guestItems.length > 0) {
          try {
            const synced = await cartService.syncCart({
              items: guestItems.map((i) => ({ productId: i.product._id, quantity: i.quantity })),
            })
            setServerCart(synced)
            queryClient.setQueryData(CART_KEY, synced)
            clearGuestCart()
          } catch {
            // Non-fatal
          }
        }

        if (res.data.user.role === 'seller') {
          navigate('/seller', { replace: true })
        } else {
          navigate('/', { replace: true })
        }
      }
    },
  })
}
