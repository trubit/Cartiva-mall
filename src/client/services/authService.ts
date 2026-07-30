import api from './api.js'
import type { LoginInput, RegisterInput } from '../../shared/validators/auth.validators.js'
import type { IUser } from '../../shared/types/user.types.js'
import type { ApiResponse } from '../../shared/types/api.types.js'

interface AuthResponseData {
  user: IUser
  accessToken: string
  emailVerified: boolean
}

export const authService = {
  register: async (data: RegisterInput) => {
    const res = await api.post<ApiResponse<{ user: IUser }>>('/auth/register', data)
    return res.data
  },

  login: async (data: LoginInput) => {
    const res = await api.post<ApiResponse<AuthResponseData>>('/auth/login', data)
    return res.data
  },

  logout: async () => {
    const res = await api.post<ApiResponse<null>>('/auth/logout')
    return res.data
  },

  refresh: async () => {
    const res = await api.post<ApiResponse<{ accessToken: string; user: IUser }>>('/auth/refresh')
    return res.data
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
