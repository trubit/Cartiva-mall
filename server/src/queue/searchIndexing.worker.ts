import { Queue, Worker } from 'bullmq'
import { redisConnection } from './connection.js'
import { searchService } from '../modules/search/search.service.js'
import { logger } from '../utils/logger.js'

export const searchIndexingQueue = new Queue('product-indexing-queue', {
  connection: redisConnection,
  defaultJobOptions: {
    attempts: 3,
    backoff: { type: 'exponential', delay: 1000 },
    removeOnComplete: 100,
    removeOnFail: 500,
  },
})

export const searchIndexingWorker = new Worker(
  'product-indexing-queue',
  async (job) => {
    const { productId, version } = job.data

    try {
      await searchService.upsertProductIndex(productId, version)
      logger.info(`SearchIndexingWorker: Indexed product ${productId}`)
    } catch (err) {
      logger.error('SearchIndexingWorker error', { jobId: job.id, productId, error: err })
      throw err
    }
  },
  { connection: redisConnection },
)
