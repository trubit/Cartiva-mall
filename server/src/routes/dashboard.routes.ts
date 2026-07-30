import { Router } from 'express'
import * as dashboardController from '../modules/dashboard/dashboard.controller.js'
import { authenticate } from '../middlewares/auth.middleware.js'
import { validate } from '../middlewares/validate.middleware.js'
import {
  addWishlistSchema,
  trackRecentSchema,
  changePasswordSchema,
  dashboardSettingsSchema,
} from '../../../src/shared/validators/dashboard.validators.js'

const router = Router()

router.use(authenticate)

// ── Overview ──────────────────────────────────────────────────────────────────
router.get('/summary', dashboardController.getSummary)

// ── Wishlist ──────────────────────────────────────────────────────────────────
router.get('/wishlist', dashboardController.getWishlist)
router.post('/wishlist', validate(addWishlistSchema), dashboardController.addToWishlist)
router.get('/wishlist/:productId/check', dashboardController.checkWishlist)
router.delete('/wishlist/:productId', dashboardController.removeFromWishlist)

// ── Notifications ─────────────────────────────────────────────────────────────
router.get('/notifications', dashboardController.getNotifications)
router.get('/notifications/unread-count', dashboardController.getUnreadCount)
router.put('/notifications/read-all', dashboardController.markAllRead)
router.put('/notifications/:id/read', dashboardController.markRead)

// ── Payment History ───────────────────────────────────────────────────────────
router.get('/payments', dashboardController.getPaymentHistory)

// ── Recently Viewed ───────────────────────────────────────────────────────────
router.get('/recently-viewed', dashboardController.getRecentlyViewed)
router.post(
  '/recently-viewed',
  validate(trackRecentSchema),
  dashboardController.trackRecentlyViewed,
)

// ── Account / Security ────────────────────────────────────────────────────────
router.patch('/settings', validate(dashboardSettingsSchema), dashboardController.updateSettings)
router.patch('/change-password', validate(changePasswordSchema), dashboardController.changePassword)

export default router
