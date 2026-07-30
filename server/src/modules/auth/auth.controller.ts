import type { Request, Response, NextFunction } from 'express'
import * as authService from './auth.service.js'
import { sendSuccess, sendCreated } from '../../utils/response.js'
import { AppError } from '../../middlewares/error.middleware.js'
import { env } from '../../config/env.js'

const REFRESH_COOKIE_OPTIONS = {
  httpOnly: true,
  secure: env.NODE_ENV !== 'development', // always secure except local dev
  sameSite: 'strict' as const,
  maxAge: 7 * 24 * 60 * 60 * 1000, // 7 days
  path: '/',
}

// POST /api/v1/auth/register
export const register = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const user = await authService.registerUser(req.body)
    sendCreated(res, { user }, 'Account created! Please check your email to verify your account.')
  } catch (err) {
    next(err)
  }
}

// POST /api/v1/auth/login
export const login = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { email, password } = req.body
    const { user, tokens } = await authService.loginUser(email, password)

    res.cookie('refresh_token', tokens.refreshToken, REFRESH_COOKIE_OPTIONS)

    sendSuccess(
      res,
      {
        user,
        accessToken: tokens.accessToken,
        emailVerified: user.emailVerified,
      },
      'Login successful',
    )
  } catch (err) {
    next(err)
  }
}

// POST /api/v1/auth/logout
export const logout = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const refreshToken = req.cookies?.refresh_token as string | undefined
    if (req.user && refreshToken) {
      await authService.logoutUser(req.user.userId, refreshToken)
    }
    res.clearCookie('refresh_token', { httpOnly: true, path: '/' })
    sendSuccess(res, null, 'Logged out successfully')
  } catch (err) {
    next(err)
  }
}

// POST /api/v1/auth/refresh
export const refresh = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const refreshToken = req.cookies?.refresh_token as string | undefined
    if (!refreshToken) {
      return next(new AppError('No refresh token', 401))
    }

    const { user, tokens } = await authService.refreshTokens(refreshToken)
    res.cookie('refresh_token', tokens.refreshToken, REFRESH_COOKIE_OPTIONS)

    sendSuccess(res, { accessToken: tokens.accessToken, user }, 'Token refreshed')
  } catch (err) {
    next(err)
  }
}

// POST /api/v1/auth/forgot-password
export const forgotPassword = async (req: Request, res: Response, next: NextFunction) => {
  try {
    await authService.forgotPassword(req.body.email)
    sendSuccess(res, null, 'If that email is registered, a password reset link has been sent.')
  } catch (err) {
    next(err)
  }
}

// POST /api/v1/auth/reset-password
export const resetPassword = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { token, password } = req.body
    await authService.resetPassword(token, password)
    res.clearCookie('refresh_token', { httpOnly: true, path: '/' })
    sendSuccess(res, null, 'Password reset successfully. Please log in.')
  } catch (err) {
    next(err)
  }
}

// POST /api/v1/auth/resend-verification
export const resendVerification = async (req: Request, res: Response, next: NextFunction) => {
  try {
    await authService.resendVerificationEmail(req.body.email)
    sendSuccess(
      res,
      null,
      'If that email is registered and unverified, a new verification link has been sent.',
    )
  } catch (err) {
    next(err)
  }
}

// GET /api/v1/auth/verify-email
export const verifyEmail = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const token = req.query.token as string
    if (!token) return next(Object.assign(new Error('Token is required'), { statusCode: 400 }))
    await authService.verifyEmail(token)
    sendSuccess(res, null, 'Email verified successfully!')
  } catch (err) {
    next(err)
  }
}

// GET /api/v1/auth/me
export const getMe = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const user = await authService.getCurrentUser(req.user!.userId)
    sendSuccess(res, { user }, 'User fetched')
  } catch (err) {
    next(err)
  }
}
