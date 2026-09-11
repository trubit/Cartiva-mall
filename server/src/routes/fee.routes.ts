import { Router } from 'express'
import { authenticate, authorize } from '../middlewares/auth.middleware.js'
import * as feeCtrl from '../modules/fee/sellerFee.controller.js'
import { ROLES } from '../../../src/shared/constants/index.js'

const router = Router()

// Seller fee ledger routes
router.get('/my-fees', authenticate, feeCtrl.getMyFees)
router.post('/:id/submit-payment', authenticate, feeCtrl.submitPayment)

// Admin commission analytics & fee management
router.get('/admin/commissions', authenticate, authorize(ROLES.ADMIN), feeCtrl.getAdminCommissions)
router.get(
  '/admin/commission-policy',
  authenticate,
  authorize(ROLES.ADMIN),
  feeCtrl.getCommissionPolicy,
)
router.put(
  '/admin/commission-policy',
  authenticate,
  authorize(ROLES.ADMIN),
  feeCtrl.updateCommissionPolicy,
)
router.post('/admin/:id/verify', authenticate, authorize(ROLES.ADMIN), feeCtrl.adminVerifyPayment)
router.post(
  '/admin/run-enforcement',
  authenticate,
  authorize(ROLES.ADMIN),
  feeCtrl.runEnforcementWorker,
)

export default router
