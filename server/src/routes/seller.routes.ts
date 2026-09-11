import { Router, RequestHandler } from 'express'
import { authenticate } from '../middlewares/auth.middleware.js'
import { validate } from '../middlewares/validate.middleware.js'
import { dashboardLimiter, paymentLimiter } from '../middlewares/rateLimiter.middleware.js'
import {
  onboardSellerSchema,
  updateSellerProfileSchema,
  sellerAnalyticsQuerySchema,
  requestWithdrawalSchema,
  addPayoutAccountSchema,
  resolveAccountSchema,
  withdrawalHistoryQuerySchema,
  submitKycSchema,
  createStoreSchema,
} from '../../../src/shared/validators/seller.validators.js'
import {
  createProductSchema,
  updateProductSchema,
} from '../../../src/shared/validators/product.validators.js'
import { uploadStoreLogo, uploadKycDocument } from '../middlewares/upload.middleware.js'
import * as sellerController from '../modules/seller/seller.controller.js'
import { SellerProfile } from '../modules/seller/seller.model.js'
import { AppError } from '../middlewares/error.middleware.js'
import { logger } from '../utils/logger.js'

const router = Router()

import { checkSellerRestriction } from '../middlewares/sellerRestriction.middleware.js'

// Middleware to authorize sellers, admins, or users with a valid seller profile
const authorizeSellerOrAdmin: RequestHandler = async (req, _res, next) => {
  if (!req.user) return next(new AppError('Authentication required', 401))
  if (req.user.role === 'seller' || req.user.role === 'admin') {
    return next()
  }

  try {
    const profile = await SellerProfile.findOne({ userId: req.user.userId })
    if (profile) {
      req.user.role = 'seller'
      return next()
    }
  } catch (err) {
    logger.warn('Failed checking seller profile in auth middleware', { err })
  }

  return next(new AppError('Access denied: Seller account required', 403))
}

// All seller routes require authentication
router.use(authenticate)

// ─── KYC & Store Onboarding (Accessible to all authenticated users) ───────────
router.get('/kyc', sellerController.getKycStatus)
router.post('/kyc/submit', validate(submitKycSchema), sellerController.submitKyc)
router.post('/kyc/upload-document', uploadKycDocument, sellerController.uploadKycDocument)
router.post('/store/create', validate(createStoreSchema), sellerController.createStore)
router.post('/store/upload-logo', uploadStoreLogo, sellerController.uploadStoreLogo)

// ─── Profile ──────────────────────────────────────────────────────────────────
router.post('/onboard', validate(onboardSellerSchema), sellerController.onboard)
router.get('/profile', sellerController.getProfile)
router.put('/profile', validate(updateSellerProfileSchema), sellerController.updateProfile)

// ─── Dashboard & analytics ────────────────────────────────────────────────────
router.get('/dashboard', authorizeSellerOrAdmin, dashboardLimiter, sellerController.getDashboard)
router.get(
  '/analytics',
  authorizeSellerOrAdmin,
  dashboardLimiter,
  validate(sellerAnalyticsQuerySchema, 'query'),
  sellerController.getAnalytics as unknown as RequestHandler,
)
router.get('/earnings', authorizeSellerOrAdmin, dashboardLimiter, sellerController.getEarnings)

// ─── Protected Seller Operations ─────────────────────────────────────────────
router.use(authorizeSellerOrAdmin)

// ─── Payouts & Withdrawals ───────────────────────────────────────────────────
router.post(
  '/payout/withdraw',
  checkSellerRestriction,
  paymentLimiter,
  validate(requestWithdrawalSchema),
  sellerController.requestWithdrawal,
)
router.get(
  '/payout/withdrawals',
  validate(withdrawalHistoryQuerySchema, 'query'),
  sellerController.getWithdrawals as unknown as RequestHandler,
)
router.get('/payout/accounts', sellerController.getPayoutAccounts)
router.post(
  '/payout/accounts',
  checkSellerRestriction,
  validate(addPayoutAccountSchema),
  sellerController.addPayoutAccount,
)
router.delete('/payout/accounts/:id', sellerController.deletePayoutAccount)
router.get('/payout/banks', sellerController.getBanks)
router.post(
  '/payout/resolve-account',
  validate(resolveAccountSchema),
  sellerController.resolveAccount,
)
router.get('/payout/ledger', sellerController.getLedger)

// ─── Product management ───────────────────────────────────────────────────────
router.get('/products', sellerController.getProducts)
router.post(
  '/product/create',
  checkSellerRestriction,
  validate(createProductSchema),
  sellerController.createProduct,
)
router.put(
  '/product/update/:id',
  checkSellerRestriction,
  validate(updateProductSchema),
  sellerController.updateProduct,
)
router.delete('/product/delete/:id', checkSellerRestriction, sellerController.deleteProduct)

// ─── Order management ─────────────────────────────────────────────────────────
router.get('/orders', sellerController.getOrders)

export default router
