import { Router, RequestHandler } from 'express'
import { authenticate, authorize } from '../middlewares/auth.middleware.js'
import { validate } from '../middlewares/validate.middleware.js'
import { dashboardLimiter } from '../middlewares/rateLimiter.middleware.js'
import {
  onboardSellerSchema,
  updateSellerProfileSchema,
  sellerAnalyticsQuerySchema,
} from '../../../src/shared/validators/seller.validators.js'
import {
  createProductSchema,
  updateProductSchema,
} from '../../../src/shared/validators/product.validators.js'
import * as sellerController from '../modules/seller/seller.controller.js'

const router = Router()

// All seller routes require authentication + seller or admin role
router.use(authenticate, authorize('seller', 'admin'))

// ─── Profile ──────────────────────────────────────────────────────────────────
router.post('/onboard', validate(onboardSellerSchema), sellerController.onboard)
router.get('/profile', sellerController.getProfile)
router.put('/profile', validate(updateSellerProfileSchema), sellerController.updateProfile)

// ─── Dashboard & analytics ────────────────────────────────────────────────────
router.get('/dashboard', dashboardLimiter, sellerController.getDashboard)
router.get(
  '/analytics',
  dashboardLimiter,
  validate(sellerAnalyticsQuerySchema, 'query'),
  sellerController.getAnalytics as unknown as RequestHandler,
)
router.get('/earnings', dashboardLimiter, sellerController.getEarnings)

// ─── Product management ───────────────────────────────────────────────────────
router.get('/products', sellerController.getProducts)
router.post('/product/create', validate(createProductSchema), sellerController.createProduct)
router.put('/product/update/:id', validate(updateProductSchema), sellerController.updateProduct)
router.delete('/product/delete/:id', sellerController.deleteProduct)

// ─── Order management ─────────────────────────────────────────────────────────
router.get('/orders', sellerController.getOrders)

export default router
