import api, { doRefresh } from './api.js'
import { useAuthStore } from '../store/authStore.js'
import type {
  LoginInput,
  RegisterInput,
  VerifyEmailOtpInput,
  ResetPasswordOtpInput,
  ResendOtpInput,
} from '../../shared/validators/auth.validators.js'
import type { IUser } from '../../shared/types/user.types.js'
import type { ApiResponse } from '../../shared/types/api.types.js'

interface AuthResponseData {
  user: IUser
  accessToken: string
  emailVerified: boolean
}

export const authService = {
  register: async (data: RegisterInput) => {
    const res = await api.post<ApiResponse<{ user: Partial<IUser> }>>('/auth/register', data)
    return res.data
  },

  verifyEmailOtp: async (data: VerifyEmailOtpInput) => {
    const res = await api.post<ApiResponse<AuthResponseData>>('/auth/verify-otp', data)
    return res.data
  },

  resendOtp: async (data: ResendOtpInput) => {
    const res = await api.post<ApiResponse<null>>('/auth/resend-otp', data)
    return res.data
  },

  verifyResetOtp: async (email: string, otp: string) => {
    const res = await api.post<ApiResponse<null>>('/auth/verify-reset-otp', {
      email,
      otp,
      purpose: 'PASSWORD_RESET',
    })
    return res.data
  },

  resetPasswordWithOtp: async (data: ResetPasswordOtpInput) => {
    const res = await api.post<ApiResponse<null>>('/auth/reset-password-otp', data)
    return res.data
  },

  login: async (data: LoginInput) => {
    const res = await api.post<ApiResponse<AuthResponseData>>('/auth/login', data)
    return res.data
  },

  googleAuth: async (data: {
    token?: string
    credential?: string
    code?: string
    role?: string
  }) => {
    const res = await api.post<ApiResponse<AuthResponseData>>('/auth/google', data)
    return res.data
  },

  logout: async () => {
    try {
      const res = await api.post<ApiResponse<null>>('/auth/logout')
      return res.data
    } catch {
      return { success: true, data: null, message: 'Logged out' }
    }
  },

  refresh: async () => {
    const token = await doRefresh()
    if (!token) return null
    const { user } = useAuthStore.getState()
    return user ? { success: true, data: { accessToken: token, user } } : null
  },

  getMe: async () => {
    const res = await api.get<ApiResponse<{ user: IUser }>>('/auth/me')
    return res.data
  },

  forgotPassword: async (email: string) => {
    const res = await api.post<ApiResponse<null>>('/auth/forgot-password', { email })
    return res.data
  },

  resetPassword: async (token: string, password: string, confirmPassword: string) => {
    const res = await api.post<ApiResponse<null>>('/auth/reset-password', {
      token,
      password,
      confirmPassword,
    })
    return res.data
  },

  verifyEmail: async (token: string) => {
    const res = await api.get<ApiResponse<null>>(`/auth/verify-email?token=${token}`)
    return res.data
  },

  resendVerification: async (email: string) => {
    const res = await api.post<ApiResponse<null>>('/auth/resend-verification', { email })
    return res.data
  },
}
