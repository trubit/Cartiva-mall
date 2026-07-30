import { Router } from 'express'
import * as orderController from '../modules/order/order.controller.js'
import { authenticate, authorize } from '../middlewares/auth.middleware.js'
import { validate } from '../middlewares/validate.middleware.js'
import { createOrderSchema } from '../../../src/shared/validators/payment.validators.js'
import {
  cancelOrderSchema,
  updateOrderStatusSchema,
  returnRequestSchema,
  updateReturnStatusSchema,
} from '../../../src/shared/validators/order.validators.js'

const router = Router()

router.use(authenticate)

// ── Specific-prefix routes first (before :id to avoid param capture) ─────────
router.get('/seller', authorize('seller', 'admin'), orderController.getSellerOrders)

// ── Core CRUD ─────────────────────────────────────────────────────────────────
router.post('/', validate(createOrderSchema), orderController.createOrder)
router.get('/', orderController.getMyOrders)
router.get('/:id', orderController.getOrder)

// ── Sub-resource routes ───────────────────────────────────────────────────────
router.get('/:id/track', orderController.trackOrder)
router.put('/:id/cancel', validate(cancelOrderSchema), orderController.cancelOrder)
router.put(
  '/:id/status',
  authorize('seller', 'admin'),
  validate(updateOrderStatusSchema),
  orderController.updateOrderStatus,
)
router.post('/:id/return', validate(returnRequestSchema), orderController.requestReturn)
router.put(
  '/:id/return/status',
  authorize('admin'),
  validate(updateReturnStatusSchema),
  orderController.updateReturnStatus,
)

export default router
