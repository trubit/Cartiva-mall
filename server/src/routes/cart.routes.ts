import { Router } from 'express'
import { authenticate } from '../middlewares/auth.middleware.js'
import { validate } from '../middlewares/validate.middleware.js'
import {
  addToCartSchema,
  updateCartItemSchema,
  syncCartSchema,
} from '../../../src/shared/validators/cart.validators.js'
import * as cartController from '../modules/cart/cart.controller.js'

const router = Router()

router.use(authenticate)

router.get('/', cartController.getCart)
router.post('/add', validate(addToCartSchema), cartController.addToCart)
router.put('/update/:productId', validate(updateCartItemSchema), cartController.updateCartItem)
router.delete('/remove/:productId', cartController.removeFromCart)
router.delete('/clear', cartController.clearCart)
router.post('/sync', validate(syncCartSchema), cartController.syncCart)

export default router
