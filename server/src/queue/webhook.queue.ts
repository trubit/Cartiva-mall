import { Queue, Worker, Job } from 'bullmq'
import axios from 'axios'
import { redisConnection } from './connection.js'
import {
  WebhookDelivery,
  WebhookSubscription,
} from '../modules/api-management/apiManagement.model.js'
import { logger } from '../utils/logger.js'

export const WEBHOOK_QUEUE_NAME = 'webhook-deliveries'

export const webhookDeliveryQueue = new Queue(WEBHOOK_QUEUE_NAME, {
  connection: redisConnection,
  skipVersionCheck: true,
  defaultJobOptions: {
    removeOnComplete: true,
    removeOnFail: false,
  },
})

interface WebhookJobData {
  deliveryId: string
  url: string
  signature: string
  payload: Record<string, unknown>
  secret: string
  attempt: number
}

let webhookWorker: Worker | null = null

const isVersionError = (err: unknown): boolean =>
  err instanceof Error &&
  (err.message.includes('Redis version needs to be greater') ||
    err.message.includes('Unknown Redis command') ||
    err.message.includes('ERR Error running script'))

let webhookWorkerDisabled = false

export const startWebhookWorker = (): Worker => {
  if (webhookWorker) return webhookWorker

  webhookWorker = new Worker<WebhookJobData>(
    WEBHOOK_QUEUE_NAME,
    async (job: Job<WebhookJobData>) => {
      const { deliveryId, url, signature, payload } = job.data
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

        deliveryDoc.attempt = job.attemptsMade + 1
        deliveryDoc.httpStatus = httpStatus
        deliveryDoc.responseTimeMs = duration
        deliveryDoc.error = errorMessage

        if (job.attemptsMade + 1 >= deliveryDoc.maxAttempts) {
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
          const delay = Math.pow(2, job.attemptsMade) * 5000 + Math.random() * 1000
          deliveryDoc.nextAttemptAt = new Date(Date.now() + delay)
        }

        await deliveryDoc.save()
        throw err
      }
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
}

export const stopWebhookWorker = async (): Promise<void> => {
  if (webhookWorker) {
    await webhookWorker.close()
    webhookWorker = null
    logger.info('Webhook delivery worker stopped')
  }
}
