import type { Request, Response, NextFunction } from 'express'
import jwt from 'jsonwebtoken'
import * as authService from './auth.service.js'
import { sendSuccess, sendCreated } from '../../utils/response.js'
import { AppError } from '../../middlewares/error.middleware.js'
import { env } from '../../config/env.js'

const REFRESH_COOKIE_OPTIONS = {
  httpOnly: true,
  secure: env.NODE_ENV !== 'development', // always secure except local dev
  sameSite: 'lax' as const,
  maxAge: 7 * 24 * 60 * 60 * 1000, // 7 days
  path: '/',
}

// POST /api/v1/auth/register
export const register = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const user = await authService.registerUser(req.body)
    sendCreated(
      res,
      {
        user: {
          email: user.email,
          firstName: user.firstName,
          lastName: user.lastName,
          emailVerified: false,
        },
      },
      'Account created! A 6-digit verification code has been sent to your email.',
    )
  } catch (err) {
    next(err)
  }
}

// POST /api/v1/auth/verify-otp
export const verifyEmailOtp = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { email, otp } = req.body
    const { user, tokens } = await authService.verifyEmailWithOtp(email, otp)

    res.cookie('refresh_token', tokens.refreshToken, REFRESH_COOKIE_OPTIONS)

    sendSuccess(
      res,
      {
        user,
        accessToken: tokens.accessToken,
        emailVerified: true,
      },
      'Email verified successfully! You are now logged in.',
    )
  } catch (err) {
    next(err)
  }
}

// POST /api/v1/auth/resend-otp
export const resendOtp = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { email, purpose } = req.body
    if (purpose === 'PASSWORD_RESET') {
      await authService.forgotPassword(email)
    } else {
      await authService.resendVerificationOtp(email)
    }

    sendSuccess(
      res,
      null,
      'If your email is registered, a new 6-digit verification code has been sent.',
    )
  } catch (err) {
    next(err)
  }
}

// POST /api/v1/auth/verify-reset-otp
export const verifyResetOtp = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { email, otp } = req.body
    await authService.verifyPasswordResetOtp(email, otp)
    sendSuccess(res, null, 'Verification code validated successfully.')
  } catch (err) {
    next(err)
  }
}

// POST /api/v1/auth/reset-password-otp
export const resetPasswordWithOtp = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { email, otp, password } = req.body
    await authService.resetPasswordWithOtp(email, otp, password)
    res.clearCookie('refresh_token', { httpOnly: true, path: '/' })
    sendSuccess(res, null, 'Password reset successfully. Please log in with your new password.')
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
    const refreshToken = (req.cookies?.refresh_token ||
      req.cookies?.refreshToken ||
      req.body?.refreshToken ||
      req.headers['x-refresh-token']) as string | undefined

    let userId = req.user?.userId
    if (!userId && refreshToken) {
      try {
        const decoded = jwt.verify(refreshToken, env.JWT_REFRESH_SECRET) as any
        userId = decoded?.userId || decoded?.id
      } catch {
        // Safe ignore on expired or malformed token
      }
    }

    if (userId && refreshToken) {
      await authService.logoutUser(userId, refreshToken).catch(() => {})
    }

    res.clearCookie('refresh_token', { httpOnly: true, path: '/' })
    res.clearCookie('refreshToken', { httpOnly: true, path: '/' })
    res.clearCookie('access_token', { httpOnly: true, path: '/' })
    sendSuccess(res, null, 'Logged out successfully')
  } catch (err) {
    next(err)
  }
}

// POST /api/v1/auth/refresh
export const refresh = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const refreshToken = (req.cookies?.refresh_token ||
      req.body?.refreshToken ||
      req.headers['x-refresh-token']) as string | undefined
    if (!refreshToken) {
      return next(new AppError('No refresh token provided', 401))
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
    sendSuccess(
      res,
      null,
      'If that email is registered, a 6-digit password reset code has been sent.',
    )
  } catch (err) {
    next(err)
  }
}

// POST /api/v1/auth/reset-password (link/token based backward compat)
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
    await authService.resendVerificationOtp(req.body.email)
    sendSuccess(
      res,
      null,
      'If that email is registered and unverified, a new 6-digit verification code has been sent.',
    )
  } catch (err) {
    next(err)
  }
}

// GET /api/v1/auth/verify-email (link based backward compat)
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

// POST /api/v1/auth/google
export const googleAuth = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { token, credential, code, role } = req.body
    const tokenOrCredentialOrCode = token || credential || code
    if (!tokenOrCredentialOrCode) {
      return next(new AppError('Google token, credential, or authorization code is required', 400))
    }
    const { user, accessToken, refreshToken } = await authService.authenticateGoogleUser(
      tokenOrCredentialOrCode,
      role,
    )
    res.cookie('refresh_token', refreshToken, REFRESH_COOKIE_OPTIONS)
    sendSuccess(res, { user, accessToken }, 'Google authentication successful')
  } catch (err) {
    next(err)
  }
}
