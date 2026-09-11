import { Router } from 'express'
import { authenticate } from '../middlewares/auth.middleware.js'
import {
  handleAnalyticsQuery,
  listInsights,
  handleUpdateInsightStatus,
  handleInsightFeedback,
} from '../modules/ai-bi/aiBi.controller.js'

const router = Router()

// ─── Natural-Language Analytics Query ─────────────────────────────────────────
router.post('/query', authenticate, handleAnalyticsQuery)

// ─── Insights Management ──────────────────────────────────────────────────────
router.get('/insights', authenticate, listInsights)
router.patch('/insights/:id/status', authenticate, handleUpdateInsightStatus)
router.post('/insights/:id/feedback', authenticate, handleInsightFeedback)

export default router
