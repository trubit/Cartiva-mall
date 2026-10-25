import { Queue, Worker, type Job } from 'bullmq'
import axios from 'axios'
import { redisConnection } from './connection.js'
import {
  WebhookDelivery,
  WebhookSubscription,
} from '../modules/api-management/apiManagement.model.js'
import { logger } from '../utils/logger.js'

export const WEBHOOK_QUEUE_NAME = 'webhook-deliveries'

export interface WebhookJobData {
  deliveryId: string
  url: string
  signature: string
  payload: Record<string, unknown>
  secret: string
  attempt: number
}

// Lazy-initialized — only created when BullMQ availability is verified to prevent import deadlocks
let webhookQueueInstance: Queue<WebhookJobData> | null = null
let webhookWorker: Worker<WebhookJobData> | null = null
let bullmqAvailable = true
let webhookWorkerDisabled = false

const isVersionError = (err: unknown): boolean =>
  err instanceof Error &&
  (err.message.includes('Redis version needs to be greater') ||
    err.message.includes('Unknown Redis command') ||
    err.message.includes('ERR Error running script'))

export const executeDirectWebhookDelivery = async (data: WebhookJobData): Promise<void> => {
  const { deliveryId, url, signature, payload } = data
  const startTime = Date.now()

  const deliveryDoc = await WebhookDelivery.findById(deliveryId)
  if (!deliveryDoc) {
    logger.warn(`Webhook worker: Delivery record ${deliveryId} not found`)
    return
  }

  try {
    const response = await axios.post(url, payload, {
      headers: {
        'Content-Type': 'application/json',
        'User-Agent': 'Cartiva-Webhook/1.0',
        'X-Cartiva-Signature': signature,
        'X-Cartiva-Event-ID': payload.id as string,
        'X-Cartiva-Delivery-ID': deliveryDoc.deliveryId,
      },
      timeout: 10000,
      validateStatus: (status) => status >= 200 && status < 300,
    })

    const duration = Date.now() - startTime

    deliveryDoc.status = 'success'
    deliveryDoc.httpStatus = response.status
    deliveryDoc.responseTimeMs = duration
    deliveryDoc.error = undefined
    await deliveryDoc.save()

    await WebhookSubscription.updateOne(
      { _id: deliveryDoc.subscriptionId },
      { $set: { failureCount: 0 } },
    )

    logger.info(
      `Webhook delivered successfully [${deliveryDoc.deliveryId}] -> ${url} (${duration}ms)`,
    )
  } catch (err: any) {
    const duration = Date.now() - startTime
    const httpStatus = err.response?.status
    const errorMessage = err.message || 'Webhook request failed'

    deliveryDoc.attempt = data.attempt
    deliveryDoc.httpStatus = httpStatus
    deliveryDoc.responseTimeMs = duration
    deliveryDoc.error = errorMessage

    if (data.attempt >= deliveryDoc.maxAttempts) {
      deliveryDoc.status = 'dead_letter'
      await WebhookSubscription.updateOne(
        { _id: deliveryDoc.subscriptionId },
        { $inc: { failureCount: 1 } },
      )
      logger.error(
        `Webhook delivery moved to Dead-Letter Queue [${deliveryDoc.deliveryId}] after ${deliveryDoc.maxAttempts} attempts`,
      )
    } else {
      deliveryDoc.status = 'failed'
      const delay = Math.pow(2, data.attempt) * 5000 + Math.random() * 1000
      deliveryDoc.nextAttemptAt = new Date(Date.now() + delay)
    }

    await deliveryDoc.save()
  }
}

export const getWebhookDeliveryQueue = (): Queue<WebhookJobData> | null => {
  if (!bullmqAvailable) return null

  if (!webhookQueueInstance) {
    try {
      webhookQueueInstance = new Queue<WebhookJobData>(WEBHOOK_QUEUE_NAME, {
        connection: redisConnection,
        skipVersionCheck: true,
        defaultJobOptions: {
          removeOnComplete: true,
          removeOnFail: false,
        },
      })

      webhookQueueInstance.on('error', (err) => {
        if (isVersionError(err) && bullmqAvailable) {
          logger.warn(
            '[Webhook Queue] Redis version mismatch — BullMQ disabled, using direct HTTP delivery',
          )
          bullmqAvailable = false
          void stopWebhookWorker()
        }
      })
    } catch (err: any) {
      bullmqAvailable = false
      logger.warn(`[Webhook Queue] Failed to initialize Queue: ${err.message}`)
      return null
    }
  }

  return webhookQueueInstance
}

// Backward-compatible proxy for modules importing webhookDeliveryQueue directly
export const webhookDeliveryQueue = {
  add: async (name: string, data: WebhookJobData, opts?: any) => {
    const q = getWebhookDeliveryQueue()
    if (!q) {
      logger.info(
        `[Webhook Queue] Queue offline — executing direct HTTP delivery for deliveryId [${data.deliveryId}]`,
      )
      await executeDirectWebhookDelivery(data)
      return { id: `direct_${data.deliveryId}` } as any
    }
    return q.add(name, data, opts)
  },
}

export const startWebhookWorker = (): Worker<WebhookJobData> | null => {
  if (webhookWorker || !bullmqAvailable) return webhookWorker

  try {
    webhookWorker = new Worker<WebhookJobData>(
      WEBHOOK_QUEUE_NAME,
      async (job: Job<WebhookJobData>) => {
        await executeDirectWebhookDelivery(job.data)
      },
      {
        connection: redisConnection,
        concurrency: 5,
        skipVersionCheck: true,
      },
    )

    webhookWorker.on('error', (err) => {
      if (isVersionError(err)) {
        if (!webhookWorkerDisabled) {
          logger.warn(
            '[Webhook Worker] Redis < 5.0 / Lua command mismatch — BullMQ worker stopped, falling back to direct delivery',
          )
          webhookWorkerDisabled = true
          void stopWebhookWorker()
        }
        return
      }
      logger.warn(`Webhook worker error (Redis/BullMQ): ${err.message}`)
    })

    webhookWorker.on('failed', (job, err) => {
      logger.warn(`Webhook delivery job failed [Job ID: ${job?.id}]: ${err.message}`)
    })

    logger.info('Webhook delivery worker started')
    return webhookWorker
  } catch (err: any) {
    if (isVersionError(err)) {
      logger.warn(
        '[Webhook Worker] Redis < 5.0 — BullMQ worker disabled, using direct HTTP delivery fallback',
      )
      bullmqAvailable = false
    } else {
      logger.warn(`[Webhook Worker] Failed to start: ${err.message}`)
    }
    return null
  }
}

export const stopWebhookWorker = async (): Promise<void> => {
  if (webhookWorker) {
    await webhookWorker.close().catch(() => {})
    webhookWorker = null
    logger.info('Webhook delivery worker stopped')
  }
  if (webhookQueueInstance) {
    await webhookQueueInstance.close().catch(() => {})
    webhookQueueInstance = null
  }
}
