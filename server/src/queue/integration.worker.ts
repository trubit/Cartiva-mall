import { Worker, type Job } from 'bullmq'
import { redis } from '../database/redis.js'
import { logger } from '../utils/logger.js'

export interface IntegrationJobData {
  jobType: 'webhook_delivery' | 'webhook_retry' | 'quota_check'
  endpointId?: string
  deliveryId?: string
  partnerId?: string
}

export const integrationWorker = new Worker<IntegrationJobData>(
  'integration-processing',
  async (job: Job<IntegrationJobData>) => {
    logger.info(`[IntegrationWorker] Processing job [${job.id}] type [${job.data.jobType}]`)

    switch (job.data.jobType) {
      case 'webhook_delivery':
        logger.info(`[IntegrationWorker] Dispatching webhook to endpoint [${job.data.endpointId}]`)
        break
      case 'webhook_retry':
        logger.info(`[IntegrationWorker] Retrying delivery [${job.data.deliveryId}]`)
        break
      case 'quota_check':
        logger.info(`[IntegrationWorker] Checking quota for partner [${job.data.partnerId}]`)
        break
      default:
        logger.warn(`[IntegrationWorker] Unknown integration job type`)
    }

    return { processed: true, timestamp: new Date().toISOString() }
  },
  {
    connection: redis,
    concurrency: 5,
  },
)

integrationWorker.on('failed', (job, err) => {
  logger.error(`[IntegrationWorker] Job [${job?.id}] failed: ${err.message}`)
})
