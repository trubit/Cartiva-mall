import { Router } from 'express'
import { authenticate } from '../middlewares/auth.middleware.js'
import { adminLimiter } from '../middlewares/rateLimiter.middleware.js'
import * as shipCtrl from '../modules/shipping/shipping.controller.js'

const router = Router()

// Public tracking (no auth required)
router.get('/track/:trackingNumber', shipCtrl.trackByNumber)

// Authenticated user
router.get('/my', authenticate, shipCtrl.listMyShipments)
router.get('/:id', authenticate, shipCtrl.getShipment)

// Seller / Admin: create + update
router.post('/', authenticate, shipCtrl.createShipment)
router.put('/:id/status', authenticate, adminLimiter, shipCtrl.updateShipmentStatus)

// Admin only: list all
router.get('/', authenticate, adminLimiter, shipCtrl.listAllShipments)

export default router
