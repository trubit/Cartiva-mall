import crypto from 'crypto'
import mongoose from 'mongoose'
import { WebhookSubscription, WebhookDelivery, WebhookEvent } from './apiManagement.model.js'
import { webhookDeliveryQueue } from '../../queue/webhook.queue.js'
import { logger } from '../../utils/logger.js'

export const SUPPORTED_WEBHOOK_EVENTS = [
  'order.created',
  'order.paid',
  'order.shipped',
  'order.delivered',
  'order.cancelled',
  'payment.completed',
  'payment.failed',
  'refund.completed',
  'product.created',
  'product.updated',
  'product.deleted',
  'inventory.low',
  'inventory.updated',
  'inventory.out_of_stock',
  'vendor.created',
  'vendor.approved',
  'vendor.suspended',
  'return.created',
  'return.approved',
  'return.completed',
  'shipment.created',
  'shipment.updated',
  'shipment.delivered',
] as const

export type WebhookEventType = (typeof SUPPORTED_WEBHOOK_EVENTS)[number]

/**
 * Generate HMAC SHA-256 Signature for Webhook Payload
 */
export const calculateWebhookSignature = (
  payload: string,
  secret: string,
  timestamp: number,
): string => {
  const signaturePayload = `${timestamp}.${payload}`
  return crypto.createHmac('sha256', secret).update(signaturePayload).digest('hex')
}

/**
 * Create Webhook Subscription
 */
export const createWebhookSubscription = async (params: {
  userId: string
  applicationId?: string
  url: string
  events: string[]
  description?: string
}) => {
  const secret = `whsec_${crypto.randomBytes(24).toString('hex')}`
  const subscription = await WebhookSubscription.create({
    userId: new mongoose.Types.ObjectId(params.userId),
    applicationId: params.applicationId
      ? new mongoose.Types.ObjectId(params.applicationId)
      : undefined,
    url: params.url,
    secret,
    events: params.events,
    status: 'active',
    description: params.description,
  })

  return subscription
}

/**
 * Dispatch Event to all active subscriptions
 */
export const dispatchWebhookEvent = async (
  eventType: WebhookEventType,
  payload: Record<string, unknown>,
) => {
  const eventId = `evt_${crypto.randomBytes(16).toString('hex')}`
  const timestamp = Date.now()

  // Save event record
  await WebhookEvent.create({
    eventId,
    eventType,
    payload,
    timestamp: new Date(timestamp),
    source: 'cartiva-system',
  })

  // Find matching active subscriptions
  const subscriptions = await WebhookSubscription.find({
    events: { $in: [eventType, '*'] },
    status: 'active',
  })

  if (subscriptions.length === 0) return { dispatchedCount: 0 }

  for (const sub of subscriptions) {
    const deliveryId = `del_${crypto.randomBytes(16).toString('hex')}`
    const rawPayloadString = JSON.stringify({
      id: eventId,
      event: eventType,
      created: timestamp,
      data: payload,
    })

    const signature = calculateWebhookSignature(rawPayloadString, sub.secret, timestamp)

    // Create Delivery Record
    const delivery = await WebhookDelivery.create({
      eventId,
      eventType,
      subscriptionId: sub._id,
      deliveryId,
      url: sub.url,
      attempt: 1,
      maxAttempts: 5,
      status: 'pending',
      signature: `t=${timestamp},v1=${signature}`,
      payload: JSON.parse(rawPayloadString),
    })

    // Queue BullMQ job
    await webhookDeliveryQueue.add(
      'deliver-webhook',
      {
        deliveryId: delivery._id.toString(),
        url: sub.url,
        signature: delivery.signature,
        payload: delivery.payload,
        secret: sub.secret,
        attempt: 1,
      },
      {
        attempts: 5,
        backoff: {
          type: 'exponential',
          delay: 5000, // 5s initial backoff
        },
        removeOnComplete: 1000,
        removeOnFail: 5000,
      },
    )
  }

  logger.info(`Dispatched webhook ${eventType} [${eventId}] to ${subscriptions.length} subscribers`)
  return { dispatchedCount: subscriptions.length, eventId }
}
