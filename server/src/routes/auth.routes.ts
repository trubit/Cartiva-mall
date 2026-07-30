import { Router } from 'express'
import * as authController from '../modules/auth/auth.controller.js'
import { authenticate } from '../middlewares/auth.middleware.js'
import { validate } from '../middlewares/validate.middleware.js'
import { authLimiter } from '../middlewares/rateLimiter.middleware.js'
import {
  loginSchema,
  registerSchema,
  forgotPasswordSchema,
  resetPasswordSchema,
} from '../../../src/shared/validators/auth.validators.js'
import { z } from 'zod'

const resendVerificationSchema = z.object({ email: z.string().email() })

const router = Router()

// Public routes
router.post('/register', authLimiter, validate(registerSchema), authController.register)
router.post('/login', authLimiter, validate(loginSchema), authController.login)
router.post(
  '/forgot-password',
  authLimiter,
  validate(forgotPasswordSchema),
  authController.forgotPassword,
)
router.post(
  '/reset-password',
  authLimiter,
  validate(resetPasswordSchema),
  authController.resetPassword,
)
router.post(
  '/resend-verification',
  authLimiter,
  validate(resendVerificationSchema),
  authController.resendVerification,
)
router.get('/verify-email', authController.verifyEmail)

// Token refresh (requires valid refresh cookie) — rate-limited to block token-refresh brute-force
router.post('/refresh', authLimiter, authController.refresh)

// Protected routes
router.post('/logout', authenticate, authController.logout)
router.get('/me', authenticate, authController.getMe)

export default router
