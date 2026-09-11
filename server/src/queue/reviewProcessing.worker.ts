import { Worker, type Job } from 'bullmq'
import { redis } from '../database/redis.js'
import { recalculateSellerReputation } from '../modules/review/review.service.js'

export interface ReviewJobData {
  sellerId?: string
  productId?: string
  action: 'recalculate_seller_reputation' | 'recalculate_product_rating'
}

export function createReviewProcessingWorker(): Worker<ReviewJobData> | null {
  try {
    const worker = new Worker<ReviewJobData>(
      'review-processing-queue',
      async (job: Job<ReviewJobData>) => {
        const { sellerId, action } = job.data
        if (action === 'recalculate_seller_reputation' && sellerId) {
          await recalculateSellerReputation(sellerId)
        }
      },
      {
        connection: redis,
        concurrency: 5,
      },
    )

    worker.on('failed', (job, err) => {
      console.warn(`[ReviewProcessingWorker] Job ${job?.id ?? 'unknown'} failed: ${err.message}`)
    })

    return worker
  } catch (err) {
    console.warn('[ReviewProcessingWorker] Redis/BullMQ offline or disabled:', err)
    return null
  }
}
