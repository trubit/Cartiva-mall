import { Router } from 'express'
import { authenticate, optionalAuthenticate } from '../middlewares/auth.middleware.js'
import { validate } from '../middlewares/validate.middleware.js'
import {
  addToCartSchema,
  updateCartItemSchema,
  syncCartSchema,
} from '../../../src/shared/validators/cart.validators.js'
import * as cartController from '../modules/cart/cart.controller.js'

const router = Router()

router.get('/', optionalAuthenticate, cartController.getCart)
router.get('/count', optionalAuthenticate, cartController.getCartCount)
router.post('/add', optionalAuthenticate, validate(addToCartSchema), cartController.addToCart)
router.post('/items', optionalAuthenticate, validate(addToCartSchema), cartController.addToCart)
router.post('/sync', optionalAuthenticate, validate(syncCartSchema), cartController.syncCart)
router.put(
  '/update/:productId',
  optionalAuthenticate,
  validate(updateCartItemSchema),
  cartController.updateCartItem,
)
router.patch('/items/:itemId', optionalAuthenticate, cartController.updateCartItem)
router.delete('/remove/:productId', optionalAuthenticate, cartController.removeFromCart)
router.delete('/items/:itemId', optionalAuthenticate, cartController.removeFromCart)
router.delete('/clear', optionalAuthenticate, cartController.clearCart)
router.delete('/', optionalAuthenticate, cartController.clearCart)

// Save for later endpoints (require authentication)
router.get('/save-for-later', authenticate, cartController.getSavedItems)
router.post('/save-for-later/:productId', authenticate, cartController.saveForLater)
router.post('/restore/:productId', authenticate, cartController.restoreSavedItem)
router.delete('/save-for-later/:productId', authenticate, cartController.removeSavedItem)

// Cart merge requires authentication
router.post('/merge', authenticate, cartController.mergeCart)

export default router
