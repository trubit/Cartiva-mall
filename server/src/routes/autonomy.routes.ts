import { Router } from 'express'
import { authenticate, authorize } from '../middlewares/auth.middleware.js'
import {
  getPolicy,
  updatePolicyKillSwitch,
  getSignals,
  createSignal,
  getProposals,
  postProposal,
  simulateProposal,
  approveDecision,
  rejectDecision,
  executeDecision,
  rollbackDecision,
  getOutcomes,
} from '../modules/autonomy/autonomy.controller.js'

const router = Router()

router.use(authenticate)

router.get('/policy', authorize('admin'), getPolicy)
router.post('/kill-switch', authorize('admin'), updatePolicyKillSwitch)

router.get('/signals', authorize('seller', 'admin'), getSignals)
router.post('/signals', authorize('seller', 'admin'), createSignal)

router.get('/proposals', authorize('seller', 'admin'), getProposals)
router.post('/proposals', authorize('seller', 'admin'), postProposal)
router.post('/proposals/:id/simulate', authorize('seller', 'admin'), simulateProposal)

router.post('/proposals/:id/approve', authorize('admin'), approveDecision)
router.post('/proposals/:id/reject', authorize('admin'), rejectDecision)
router.post('/proposals/:id/execute', authorize('admin'), executeDecision)
router.post('/proposals/:id/rollback', authorize('admin'), rollbackDecision)

router.get('/outcomes', authorize('admin'), getOutcomes)

export default router
