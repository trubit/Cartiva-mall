import { Router } from 'express'
import { authenticate } from '../middlewares/auth.middleware.js'
import { validate } from '../middlewares/validate.middleware.js'
import {
  updateCheckoutSchema,
  selectShippingSchema,
  applyCouponSchema,
} from '../../../src/shared/validators/checkout.validators.js'
import * as checkoutController from '../modules/checkout/checkout.controller.js'
import { checkoutLimiter } from '../middlewares/rateLimiter.middleware.js'

const router = Router()

router.use(authenticate)

router.get('/', checkoutController.getCheckout)
router.put(
  '/update',
  checkoutLimiter,
  validate(updateCheckoutSchema),
  checkoutController.updateCheckout,
)
router.post(
  '/select-shipping',
  checkoutLimiter,
  validate(selectShippingSchema),
  checkoutController.selectShipping,
)
router.post(
  '/apply-coupon',
  checkoutLimiter,
  validate(applyCouponSchema),
  checkoutController.applyCoupon,
)
router.delete('/coupon', checkoutLimiter, checkoutController.removeCoupon)

export default router
