import { Router } from 'express'
import { authenticate, authorize } from '../middlewares/auth.middleware.js'
import {
  getTargets,
  getProposals,
  triggerScan,
  handleApplyProposal,
  handleRollbackProposal,
} from '../modules/optimization/optimization.controller.js'

const router = Router()

// ─── Admin Self-Optimization Controls ─────────────────────────────────────────
router.get('/targets', authenticate, authorize('admin'), getTargets)
router.get('/proposals', authenticate, authorize('admin'), getProposals)
router.post('/scan', authenticate, authorize('admin'), triggerScan)
router.patch('/proposals/:id/apply', authenticate, authorize('admin'), handleApplyProposal)
router.post('/proposals/:id/rollback', authenticate, authorize('admin'), handleRollbackProposal)

export default router
