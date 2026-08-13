import { Router } from 'express'
import { authenticate, authorize } from '../middlewares/auth.middleware.js'
import { adminLimiter, dashboardLimiter } from '../middlewares/rateLimiter.middleware.js'
import * as ctrl from '../modules/workflow/workflow.controller.js'

const router = Router()

router.use(authenticate)
router.use(authorize('admin'))
router.use(adminLimiter)

// ── Named paths before :id to prevent route conflicts ───────────────────────
router.get('/executions/list', ctrl.listExecutions)
router.get('/analytics/global', ctrl.getGlobalAnalytics)
router.get('/templates', ctrl.listTemplates)
router.post('/templates', ctrl.createTemplate)
router.post('/templates/:id/instantiate', ctrl.instantiateTemplate)
router.get('/approvals', ctrl.listApprovals)
router.post('/approvals', ctrl.createApproval)
router.post('/approvals/:id/process', ctrl.processApproval)
router.post('/approvals/:id/escalate', ctrl.escalateApproval)
router.post('/executions/:id/cancel', ctrl.cancelExecution)

// ── Workflows CRUD ──────────────────────────────────────────────────────────
router.post('/', ctrl.createWorkflow)
router.get('/', ctrl.listWorkflows)
router.get('/:id', ctrl.getWorkflow)
router.put('/:id', ctrl.updateWorkflow)
router.delete('/:id', ctrl.deleteWorkflow)
router.post('/:id/publish', ctrl.publishWorkflow)
router.post('/:id/execute', ctrl.executeWorkflow)
router.post('/:id/pause', ctrl.pauseWorkflow)
router.post('/:id/resume', ctrl.resumeWorkflow)
router.get('/:id/history', dashboardLimiter, ctrl.getWorkflowHistory)
router.get('/:id/analytics', ctrl.getAnalytics)
router.get('/:id/audit', ctrl.getAuditLog)

export default router
