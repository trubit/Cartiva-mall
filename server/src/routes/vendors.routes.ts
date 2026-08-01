import { Router } from 'express'
import { vendorsController as ctrl } from '../modules/vendor/vendors.controller.js'
import { authenticate, authorize } from '../middlewares/auth.middleware.js'
import { adminLimiter, uploadLimiter, dashboardLimiter } from '../middlewares/rateLimiter.middleware.js'

const router = Router()

// ─── Public ──────────────────────────────────────────────────────────────────
router.get('/storefront/:slug', ctrl.getStorefrontBySlug)

// ─── Admin-only (static paths before /:id param routes) ──────────────────────
router.get('/admin/pending', authenticate, authorize('admin'), adminLimiter, ctrl.getPendingApprovals)
router.get('/admin/all', authenticate, authorize('admin'), adminLimiter, ctrl.listAllVendors)
router.put('/documents/:documentId/review', authenticate, authorize('admin'), adminLimiter, ctrl.reviewDocument)
router.put('/payouts/:payoutId/process', authenticate, authorize('admin'), adminLimiter, ctrl.processPayout)

// ─── Authenticated vendor operations ─────────────────────────────────────────
router.post('/register', authenticate, ctrl.register)
router.get('/me', authenticate, ctrl.getMyVendor)
router.put('/:id/profile', authenticate, ctrl.updateProfile)
router.post('/:id/verify', authenticate, ctrl.submitVerification)
router.post('/:id/storefront', authenticate, ctrl.upsertStorefront)
router.post('/:id/documents', authenticate, uploadLimiter, ctrl.uploadDocument)
router.get('/:id/documents', authenticate, ctrl.listDocuments)
router.get('/:id/analytics', authenticate, dashboardLimiter, ctrl.getAnalytics)
router.get('/:id/score', authenticate, ctrl.getScore)
router.post('/:id/payouts', authenticate, ctrl.requestPayout)
router.get('/:id/payouts', authenticate, ctrl.listPayouts)
router.get('/:id/audit', authenticate, ctrl.getAuditLog)
router.put('/:id/approve', authenticate, authorize('admin'), adminLimiter, ctrl.approveVendor)
router.put('/:id/reject', authenticate, authorize('admin'), adminLimiter, ctrl.rejectVendor)
router.put('/:id/suspend', authenticate, authorize('admin'), adminLimiter, ctrl.suspendVendor)
router.put('/:id/reactivate', authenticate, authorize('admin'), adminLimiter, ctrl.reactivateVendor)
router.put('/:id/blacklist', authenticate, authorize('admin'), adminLimiter, ctrl.blacklistVendor)

// ─── Generic vendor read ──────────────────────────────────────────────────────
router.get('/:id', authenticate, ctrl.getVendorById)

export default router
