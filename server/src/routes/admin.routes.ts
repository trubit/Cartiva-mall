import { Router } from 'express'
import { authenticate, authorize } from '../middlewares/auth.middleware.js'
import * as adminController from '../modules/admin/admin.controller.js'
import { approve, block } from '../modules/product/product.controller.js'
import {
  listCoupons,
  createCoupon,
  updateCoupon,
  deleteCoupon,
  toggleCoupon,
  listPromotions,
  createPromotion,
  updatePromotion,
  deletePromotion,
  togglePromotion,
} from '../modules/coupon/coupon.controller.js'
import { dashboardLimiter, adminLimiter } from '../middlewares/rateLimiter.middleware.js'
import { validate } from '../middlewares/validate.middleware.js'
import { z } from 'zod'

const adminChangeRoleSchema = z.object({
  role: z.enum(['user', 'seller', 'admin']),
})

const adminUpdateOrderStatusSchema = z.object({
  orderStatus: z.enum(['pending', 'confirmed', 'shipped', 'delivered', 'cancelled', 'refunded']),
  tracking: z
    .object({
      carrier: z.string().optional(),
      trackingNumber: z.string().optional(),
      trackingUrl: z.string().url().optional(),
      estimatedDelivery: z.string().optional(),
    })
    .optional(),
})

const router = Router()

router.use(authenticate, authorize('admin'))
router.use(adminLimiter)

// ─── Dashboard ────────────────────────────────────────────────────────────────
router.get('/stats', adminController.getStats)

// ─── Users ────────────────────────────────────────────────────────────────────
router.get('/users', adminController.listUsers)
router.patch('/users/:id/toggle-active', adminController.toggleUserActive)
router.patch('/users/:id/role', validate(adminChangeRoleSchema), adminController.changeUserRole)
router.delete('/users/:id', adminController.deleteUser)

// ─── Sellers ──────────────────────────────────────────────────────────────────
router.get('/sellers', adminController.listSellers)
router.patch('/sellers/:id/verify', adminController.verifySeller)

// ─── Products ─────────────────────────────────────────────────────────────────
router.get('/products', adminController.listAllProducts)
router.put('/products/:id/approve', approve)
router.put('/products/:id/block', block)

// ─── Orders ───────────────────────────────────────────────────────────────────
router.get('/orders', adminController.listAllOrders)
router.patch(
  '/orders/:id/status',
  validate(adminUpdateOrderStatusSchema),
  adminController.updateOrderStatus,
)

// ─── Payments ─────────────────────────────────────────────────────────────────
router.get('/payments', adminController.listPayments)

// ─── Analytics ────────────────────────────────────────────────────────────────
router.get('/analytics', dashboardLimiter, adminController.getAnalytics)

// ─── Fraud & Audit ────────────────────────────────────────────────────────────
router.get('/fraud-alerts', adminController.getFraudAlerts)
router.get('/audit-logs', adminController.getAuditLogs)

// ─── Reports ──────────────────────────────────────────────────────────────────
router.get('/reports', dashboardLimiter, adminController.getReports)

// ─── Coupons ──────────────────────────────────────────────────────────────────
router.get('/coupons', listCoupons)
router.post('/coupons', createCoupon)
router.put('/coupons/:id', updateCoupon)
router.delete('/coupons/:id', deleteCoupon)
router.patch('/coupons/:id/toggle', toggleCoupon)

// ─── Promotions ───────────────────────────────────────────────────────────────
router.get('/promotions', listPromotions)
router.post('/promotions', createPromotion)
router.put('/promotions/:id', updatePromotion)
router.delete('/promotions/:id', deletePromotion)
router.patch('/promotions/:id/toggle', togglePromotion)

export default router
