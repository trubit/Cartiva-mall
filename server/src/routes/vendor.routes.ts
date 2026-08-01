import { Router } from 'express'
import { authenticate } from '../middlewares/auth.middleware.js'
import { adminLimiter, dashboardLimiter } from '../middlewares/rateLimiter.middleware.js'
import * as vendorCtrl from '../modules/vendor/vendor.controller.js'

const router = Router()

// Seller self-service
router.get('/subscription', authenticate, vendorCtrl.getMySubscription)
router.post('/subscription', authenticate, vendorCtrl.subscribe)
router.delete('/subscription', authenticate, vendorCtrl.cancelSubscription)
router.get('/commissions', authenticate, dashboardLimiter, vendorCtrl.getMyCommissions)
router.get('/stats', authenticate, dashboardLimiter, vendorCtrl.getMyStats)

// Admin
router.get('/admin/list', authenticate, adminLimiter, vendorCtrl.listVendors)
router.put('/admin/:sellerId/suspend', authenticate, adminLimiter, vendorCtrl.suspendVendor)
router.put('/admin/:sellerId/reinstate', authenticate, adminLimiter, vendorCtrl.reinstateVendor)
router.get(
  '/admin/:sellerId/commissions',
  authenticate,
  adminLimiter,
  vendorCtrl.getVendorCommissions,
)

export default router
