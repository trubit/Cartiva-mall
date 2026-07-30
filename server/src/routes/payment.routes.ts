import { Router } from 'express'
import * as paymentController from '../modules/payment/payment.controller.js'
import { authenticate } from '../middlewares/auth.middleware.js'
import { validate } from '../middlewares/validate.middleware.js'
import { refundSchema } from '../../../src/shared/validators/payment.validators.js'
import { paymentLimiter } from '../middlewares/rateLimiter.middleware.js'
import { z } from 'zod'

const paystackInitializeSchema = z.object({
  orderId: z.string().regex(/^[0-9a-fA-F]{24}$/, 'Invalid order ID'),
})

const paystackVerifySchema = z.object({
  reference: z.string().min(1).max(100),
})

const router = Router()

// ─── Public ───────────────────────────────────────────────────────────────────
router.get('/providers', paymentController.getProviders)

// ─── Protected ────────────────────────────────────────────────────────────────
router.use(authenticate)
router.use(paymentLimiter)

router.get('/history', paymentController.getPaymentHistory)
router.post('/refund', validate(refundSchema), paymentController.refundPayment)

// Paystack
router.post(
  '/paystack/initialize',
  validate(paystackInitializeSchema),
  paymentController.paystackInitialize,
)
router.post(
  '/paystack/verify',
  validate(paystackVerifySchema),
  paymentController.paystackVerify,
)

export default router
