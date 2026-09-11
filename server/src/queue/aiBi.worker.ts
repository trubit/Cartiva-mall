import { Worker, type Job } from 'bullmq'
import { redis } from '../database/redis.js'
import { generateMarketplaceInsights } from '../modules/ai-bi/aiBi.service.js'

export interface AiBiJobData {
  action: 'generate_insights'
}

export function createAiBiWorker(): Worker<AiBiJobData> | null {
  try {
    const worker = new Worker<AiBiJobData>(
      'ai-bi-processing-queue',
      async (job: Job<AiBiJobData>) => {
        if (job.data.action === 'generate_insights') {
          await generateMarketplaceInsights()
        }
      },
      {
        connection: redis,
        concurrency: 2,
      },
    )

    worker.on('failed', (job, err) => {
      console.warn(`[AiBiWorker] Job ${job?.id ?? 'unknown'} failed: ${err.message}`)
    })

    return worker
  } catch (err) {
    console.warn('[AiBiWorker] Redis/BullMQ offline or disabled:', err)
    return null
  }
}
