import { Router } from 'express'
import { authenticate } from '../middlewares/auth.middleware.js'
import {
  getIntegrationsHandler,
  createIntegrationHandler,
  testIntegrationHandler,
} from '../modules/api-management/apiManagement.controller.js'

const router = Router()

router.use(authenticate)

router.get('/', getIntegrationsHandler)
router.post('/', createIntegrationHandler)
router.post('/:id/test', testIntegrationHandler)

export default router
