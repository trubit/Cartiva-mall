import crypto from 'node:crypto'
import { describe, it, expect } from 'vitest'
import {
  registerIntegration,
  onboardPartner,
  rotatePartnerKey,
  registerWebhook,
  verifyWebhookSignature,
  dispatchWebhook,
  retryDeadLetterDelivery,
} from '../modules/integrations/ecosystemIntegration.service.js'

describe('Phase 49: Hyper Ecosystem & Cross-Platform Integration Suite', () => {
  describe('Integration & Partner Onboarding', () => {
    it('should register an ecosystem integration with valid scopes', async () => {
      const integ = await registerIntegration({
        name: 'Partner Logistics Integration',
        description: 'Shipping status integration',
        type: 'PARTNER',
        allowedScopes: ['orders:read', 'inventory:read'],
      })
      expect(integ.integrationId).toBeDefined()
      expect(integ.status).toBe('ACTIVE')
      expect(integ.allowedScopes).toContain('orders:read')
    })

    it('should reject integration registration with invalid scopes', async () => {
      await expect(
        registerIntegration({
          name: 'Invalid Scope Integration',
          description: 'Scope test',
          type: 'EXTERNAL_API',
          allowedScopes: ['invalid:scope:name'],
        }),
      ).rejects.toThrow(/Invalid scope/)
    })

    it('should onboard a new partner and generate an API key hash', async () => {
      const { partner, apiKey } = await onboardPartner({
        companyName: 'Global Logistics Corp',
        contactEmail: 'api@globallogistics.io',
      })
      expect(partner.partnerId).toBeDefined()
      expect(apiKey).toMatch(/^truson_pk_/)
      expect(partner.apiKeyHash).toBeDefined()
      expect(partner.apiSecretPrefix).toBe(apiKey.substring(0, 12))
    })

    it('should rotate partner API credentials and generate a fresh key', async () => {
      const { partner, apiKey: originalKey } = await onboardPartner({
        companyName: 'Rotate Test Inc',
        contactEmail: 'rotate@test.io',
      })
      const oldHash = partner.apiKeyHash

      const rotated = await rotatePartnerKey(partner.partnerId)
      expect(rotated.apiKey).not.toBe(originalKey)
      expect(rotated.apiKey).toMatch(/^truson_pk_/)
      expect(oldHash).not.toBe(rotated.apiKey)
    })
  })

  describe('Cryptographic Webhook Signatures & Replay Protection', () => {
    it('should generate HMAC-SHA256 signature and verify successfully', () => {
      const secret = 'whsec_test_secret_key_12345'
      const rawBody = JSON.stringify({ event: 'order.created', id: 'ord_123' })
      const timestamp = Date.now().toString()

      // Calculate HMAC signature
      const hmac = crypto.createHmac('sha256', secret).update(rawBody).digest('hex')
      const signature = `v1=${hmac}`

      const isValid = verifyWebhookSignature(rawBody, signature, secret, timestamp)
      expect(isValid).toBe(true)
    })

    it('should reject replayed webhook requests with old timestamp (> 5 mins)', () => {
      const secret = 'whsec_test_secret_key_12345'
      const rawBody = JSON.stringify({ event: 'order.created', id: 'ord_123' })
      const oldTimestamp = (Date.now() - 400000).toString() // ~6.6 mins old

      const hmac = crypto.createHmac('sha256', secret).update(rawBody).digest('hex')
      const signature = `v1=${hmac}`

      const isValid = verifyWebhookSignature(rawBody, signature, secret, oldTimestamp)
      expect(isValid).toBe(false)
    })
  })

  describe('Webhook Delivery & Dead Letter Queue Management', () => {
    it('should dispatch webhook event and record delivery log', async () => {
      const integ = await registerIntegration({
        name: 'Webhook Test System',
        description: 'Testing webhook dispatch',
        type: 'WEBHOOK',
      })
      const endpoint = await registerWebhook({
        integrationId: integ.integrationId,
        targetUrl: 'https://webhook.example.com/receiver',
        subscribedEvents: ['order.created'],
      })
      const delivery = await dispatchWebhook({
        endpointId: endpoint.endpointId,
        eventType: 'order.created',
        payload: { orderId: 'ord_999', total: 150 },
      })
      expect(delivery.deliveryId).toBeDefined()
      expect(delivery.status).toBe('success')
    })

    it('should allow retrying dead-letter delivery logs', async () => {
      const integ = await registerIntegration({
        name: 'Retry Test System',
        description: 'Testing retry',
        type: 'WEBHOOK',
      })
      const endpoint = await registerWebhook({
        integrationId: integ.integrationId,
        targetUrl: 'https://webhook.example.com/retry',
        subscribedEvents: ['inventory.low'],
      })
      const delivery = await dispatchWebhook({
        endpointId: endpoint.endpointId,
        eventType: 'inventory.low',
        payload: { productId: 'prod_123', quantity: 2 },
      })
      const retried = await retryDeadLetterDelivery(delivery.deliveryId)
      expect(retried.status).toBe('success')
    })
  })
})
