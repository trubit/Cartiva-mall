import { Router } from 'express'
import * as authController from '../modules/auth/auth.controller.js'
import { authenticate, optionalAuthenticate } from '../middlewares/auth.middleware.js'
import { validate } from '../middlewares/validate.middleware.js'
import { authLimiter } from '../middlewares/rateLimiter.middleware.js'
import {
  loginSchema,
  registerSchema,
  forgotPasswordSchema,
  resetPasswordSchema,
  verifyEmailOtpSchema,
  resendOtpSchema,
  verifyOtpOnlySchema,
  resetPasswordOtpSchema,
} from '../../../src/shared/validators/auth.validators.js'

const router = Router()

// Public Registration & OTP Verification
router.post('/register', authLimiter, validate(registerSchema), authController.register)
router.post(
  '/verify-otp',
  authLimiter,
  validate(verifyEmailOtpSchema),
  authController.verifyEmailOtp,
)
router.post('/resend-otp', authLimiter, validate(resendOtpSchema), authController.resendOtp)

// Public Login & Social OAuth
router.post('/login', authLimiter, validate(loginSchema), authController.login)
router.post('/google', authLimiter, authController.googleAuth)

// Password Reset Flow (6-digit OTP & token backward compat)
router.post(
  '/forgot-password',
  authLimiter,
  validate(forgotPasswordSchema),
  authController.forgotPassword,
)
router.post(
  '/verify-reset-otp',
  authLimiter,
  validate(verifyOtpOnlySchema),
  authController.verifyResetOtp,
)
router.post(
  '/reset-password-otp',
  authLimiter,
  validate(resetPasswordOtpSchema),
  authController.resetPasswordWithOtp,
)
router.post(
  '/reset-password',
  authLimiter,
  validate(resetPasswordSchema),
  authController.resetPassword,
)

// Legacy link verification backward compatibility
router.post(
  '/resend-verification',
  authLimiter,
  validate(resendOtpSchema),
  authController.resendVerification,
)
router.get('/verify-email', authController.verifyEmail)

// Token refresh (supports both POST and GET for browser compatibility)
router.post('/refresh', authLimiter, authController.refresh)
router.get('/refresh', authLimiter, authController.refresh)

// Protected / Authenticated routes
router.post('/logout', optionalAuthenticate, authController.logout)
router.get('/me', authenticate, authController.getMe)

export default router
