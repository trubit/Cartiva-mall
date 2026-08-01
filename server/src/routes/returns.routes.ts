import { Router } from 'express'
import { authenticate } from '../middlewares/auth.middleware.js'
import { adminLimiter } from '../middlewares/rateLimiter.middleware.js'
import * as retCtrl from '../modules/returns/returns.controller.js'

const router = Router()

// Returns
router.post('/', authenticate, retCtrl.submitReturn)
router.get('/', authenticate, retCtrl.listReturns)

// Disputes — must be registered before /:id to prevent param capture
router.post('/disputes', authenticate, retCtrl.openDispute)
router.get('/disputes', authenticate, retCtrl.listDisputes)
router.post('/disputes/:id/messages', authenticate, retCtrl.addDisputeMessage)
router.put('/disputes/:id/resolve', authenticate, adminLimiter, retCtrl.resolveDispute)

router.get('/:id', authenticate, retCtrl.getReturn)
router.put('/:id/status', authenticate, adminLimiter, retCtrl.updateReturnStatus)

export default router
