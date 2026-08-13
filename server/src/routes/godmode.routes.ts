import { Router } from 'express'
import { authenticate, authorize } from '../middlewares/auth.middleware.js'
import {
  observe,
  simulate,
  decide,
  execute,
  evolve,
  getStatus,
  getEconomyState,
  getSystemHealth,
  getRuleVersions,
} from '../modules/godmode/godmode.controller.js'

const router = Router()

// All God-Mode operations require admin authorization
router.use(authenticate, authorize('admin'))

// POST actions
router.post('/observe', observe)
router.post('/simulate', simulate)
router.post('/decide', decide)
router.post('/execute', execute)
router.post('/evolve', evolve)

// GET status & state
router.get('/status', getStatus)
router.get('/economy-state', getEconomyState)
router.get('/system-health', getSystemHealth)
router.get('/rule-versions', getRuleVersions)

export default router
