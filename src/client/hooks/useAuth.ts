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
import type { LoginInput, RegisterInput } from '../../shared/validators/auth.validators.js'

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
    onSuccess: () => {
      navigate('/login?registered=true')
    },
  })
}

// ─── Logout ───────────────────────────────────────────────────────────────────
export const useLogout = () => {
  const navigate = useNavigate()

  return useMutation({
    mutationFn: () => authService.logout(),
    onSettled: () => {
      // Clear all user-specific state to prevent PII leakage between users on shared devices
      useAuthStore.getState().clearAuth()
      useCartStore.getState().clearServerCart()
      useCartStore.getState().clearGuestCart()
      useSellerStore.getState().reset()
      useDashboardStore.getState().clearAll()
      useOrderStore.getState().clearAll()
      usePaymentStore.getState().reset()
      useCheckoutStore.getState().reset()
      queryClient.clear()
      navigate('/login')
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
        // Keep Zustand user (emailVerified, role, etc.) in sync with server
        updateUser(res.data.user)
      }
      return res.data?.user
    },
    enabled: isAuthenticated,
    staleTime: 5 * 60 * 1000,
    refetchOnWindowFocus: true, // Picks up emailVerified change when user returns from email tab
  })
}

// ─── Forgot Password ──────────────────────────────────────────────────────────
export const useForgotPassword = () =>
  useMutation({
    mutationFn: (email: string) => authService.forgotPassword(email),
  })

// ─── Reset Password ───────────────────────────────────────────────────────────
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

// ─── Verify Email ─────────────────────────────────────────────────────────────
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
