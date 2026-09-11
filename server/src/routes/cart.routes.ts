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

// Optional authentication middleware wrapper — populates req.user if JWT present, but does not reject guest requests
const optionalAuth = (req: any, res: any, next: any) => {
  if (req.headers.authorization) {
    return authenticate(req, res, next)
  }
  next()
}

router.get('/', optionalAuth, cartController.getCart)
router.get('/count', optionalAuth, cartController.getCartCount)
router.post('/add', optionalAuth, validate(addToCartSchema), cartController.addToCart)
router.post('/items', optionalAuth, validate(addToCartSchema), cartController.addToCart)
router.post('/sync', optionalAuth, validate(syncCartSchema), cartController.syncCart)
router.put(
  '/update/:productId',
  optionalAuth,
  validate(updateCartItemSchema),
  cartController.updateCartItem,
)
router.patch('/items/:itemId', optionalAuth, cartController.updateCartItem)
router.delete('/remove/:productId', optionalAuth, cartController.removeFromCart)
router.delete('/items/:itemId', optionalAuth, cartController.removeFromCart)
router.delete('/clear', optionalAuth, cartController.clearCart)
router.delete('/', optionalAuth, cartController.clearCart)

// Save for later endpoints (require authentication)
router.get('/save-for-later', authenticate, cartController.getSavedItems)
router.post('/save-for-later/:productId', authenticate, cartController.saveForLater)
router.post('/restore/:productId', authenticate, cartController.restoreSavedItem)
router.delete('/save-for-later/:productId', authenticate, cartController.removeSavedItem)

// Cart merge requires authentication
router.post('/merge', authenticate, cartController.mergeCart)

export default router
