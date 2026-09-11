import { Worker, type Job } from 'bullmq'
import { redis } from '../database/redis.js'
import { trackBehavior } from '../modules/recommendation/recommendation.service.js'

export interface RecommendationJobData {
  userId?: string
  anonymousSessionId?: string
  eventType: 'view' | 'search' | 'cart_add' | 'cart_remove' | 'wishlist_add' | 'purchase'
  productId?: string
  category?: string
  query?: string
  metadata?: Record<string, unknown>
}

export function createRecommendationWorker(): Worker<RecommendationJobData> | null {
  try {
    const worker = new Worker<RecommendationJobData>(
      'recommendation-dispatch-queue',
      async (job: Job<RecommendationJobData>) => {
        const { userId, anonymousSessionId, eventType, productId, category, query, metadata } =
          job.data
        await trackBehavior(userId, eventType, {
          productId,
          category,
          query,
          anonymousSessionId,
          metadata,
        })
      },
      {
        connection: redis,
        concurrency: 5,
      },
    )

    worker.on('failed', (job, err) => {
      // Log failure silently for background event collection
      console.warn(`[RecommendationWorker] Job ${job?.id ?? 'unknown'} failed: ${err.message}`)
    })

    return worker
  } catch (err) {
    console.warn('[RecommendationWorker] Redis/BullMQ offline or disabled:', err)
    return null
  }
}
