import { Router } from 'express'
import { authenticate, authorize } from '../middlewares/auth.middleware.js'
import {
  assessRisk,
  getCases,
  getCaseDetail,
  handleUpdateCase,
  handleCustomerAppeal,
} from '../modules/risk/risk.controller.js'

const router = Router()

// ─── Internal / Service API ───────────────────────────────────────────────────
router.post('/assess', authenticate, assessRisk)

// ─── Customer Appeals ────────────────────────────────────────────────────────
router.post('/appeals', authenticate, handleCustomerAppeal)

// ─── Admin Risk Case Management ───────────────────────────────────────────────
router.get('/cases', authenticate, authorize('admin'), getCases)
router.get('/cases/:caseId', authenticate, authorize('admin'), getCaseDetail)
router.patch('/cases/:caseId', authenticate, authorize('admin'), handleUpdateCase)

export default router
