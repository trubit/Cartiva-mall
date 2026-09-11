import { Router } from 'express'
import { authenticate, authorize } from '../middlewares/auth.middleware.js'
import {
  getIntegrations,
  createIntegration,
  getPartners,
  createPartner,
  rotateCredentials,
  getWebhooks,
  createWebhook,
  testWebhook,
  verifySignature,
  getDeliveries,
  retryDelivery,
} from '../modules/integrations/ecosystemIntegration.controller.js'

const router = Router()

router.use(authenticate)

router.get('/', authorize('admin'), getIntegrations)
router.post('/', authorize('admin'), createIntegration)

router.get('/partners', authorize('admin'), getPartners)
router.post('/partners', authorize('admin'), createPartner)
router.post('/partners/:id/rotate', authorize('admin'), rotateCredentials)

router.get('/webhooks', authorize('admin'), getWebhooks)
router.post('/webhooks', authorize('admin'), createWebhook)
router.post('/webhooks/test', authorize('admin'), testWebhook)
router.post('/webhooks/verify', authorize('admin'), verifySignature)
router.get('/webhooks/deliveries', authorize('admin'), getDeliveries)
router.post('/webhooks/deliveries/:id/retry', authorize('admin'), retryDelivery)

export default router
