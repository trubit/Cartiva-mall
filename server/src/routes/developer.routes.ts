import { Router } from 'express'
import { authenticate } from '../middlewares/auth.middleware.js'
import {
  createApplication,
  getApplications,
  getApplicationById,
  updateApplication,
  deleteApplication,
  createApiKeyHandler,
  getApiKeysHandler,
  rotateApiKeyHandler,
  revokeApiKeyHandler,
  createWebhookHandler,
  getWebhooksHandler,
  getWebhookByIdHandler,
  updateWebhookHandler,
  deleteWebhookHandler,
  testWebhookHandler,
  getWebhookDeliveriesHandler,
  retryWebhookDeliveryHandler,
} from '../modules/api-management/apiManagement.controller.js'

const router = Router()

router.use(authenticate)

// Developer Applications
router.post('/applications', createApplication)
router.get('/applications', getApplications)
router.get('/applications/:id', getApplicationById)
router.put('/applications/:id', updateApplication)
router.delete('/applications/:id', deleteApplication)

// API Keys
router.post('/api-keys', createApiKeyHandler)
router.get('/api-keys', getApiKeysHandler)
router.post('/api-keys/:id/rotate', rotateApiKeyHandler)
router.delete('/api-keys/:id', revokeApiKeyHandler)

// Webhooks
router.post('/webhooks', createWebhookHandler)
router.get('/webhooks', getWebhooksHandler)
router.get('/webhooks/:id', getWebhookByIdHandler)
router.put('/webhooks/:id', updateWebhookHandler)
router.delete('/webhooks/:id', deleteWebhookHandler)
router.post('/webhooks/:id/test', testWebhookHandler)
router.get('/webhooks/:id/deliveries', getWebhookDeliveriesHandler)
router.post('/webhooks/deliveries/:deliveryId/retry', retryWebhookDeliveryHandler)

export default router
