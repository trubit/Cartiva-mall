import { Router } from 'express'
import { authenticate } from '../middlewares/auth.middleware.js'
import {
  getApiAnalyticsHandler,
  getOpenApiSpecHandler,
} from '../modules/api-management/apiManagement.controller.js'

const router = Router()

router.get('/openapi.json', getOpenApiSpecHandler)

router.use(authenticate)
router.get('/analytics', getApiAnalyticsHandler)

export default router
