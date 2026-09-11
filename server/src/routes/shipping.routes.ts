import { Router } from 'express'
import { authenticate, authorize } from '../middlewares/auth.middleware.js'
import { adminLimiter } from '../middlewares/rateLimiter.middleware.js'
import * as shipCtrl from '../modules/shipping/shipping.controller.js'

const router = Router()

// ─── Public Shipping Configuration & Tracking ────────────────────────────────
router.get('/config', shipCtrl.getPublicShippingConfig)
router.get('/track/:trackingNumber', shipCtrl.trackByNumber)

// ─── Authenticated User Shipments ─────────────────────────────────────────────
router.get('/my', authenticate, shipCtrl.listMyShipments)
router.get('/:id', authenticate, shipCtrl.getShipment)

// ─── Admin Shipping Price Configuration ───────────────────────────────────────
router.get(
  '/admin/config',
  authenticate,
  authorize('admin'),
  adminLimiter,
  shipCtrl.getAdminShippingConfig,
)
router.put(
  '/admin/config',
  authenticate,
  authorize('admin'),
  adminLimiter,
  shipCtrl.updateAdminShippingConfig,
)

// ─── Seller / Admin: Create + Update Shipments ────────────────────────────────
router.post('/', authenticate, shipCtrl.createShipment)
router.put('/:id/status', authenticate, adminLimiter, shipCtrl.updateShipmentStatus)

// ─── Admin Only: List All Shipments ───────────────────────────────────────────
router.get('/', authenticate, adminLimiter, shipCtrl.listAllShipments)

export default router
