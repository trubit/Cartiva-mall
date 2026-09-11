import { Worker, type Job } from 'bullmq'
import { redis } from '../database/redis.js'
import { detectOptimizationOpportunities } from '../modules/optimization/optimization.service.js'

export interface OptimizationJobData {
  action: 'scan_opportunities'
}

export function createOptimizationWorker(): Worker<OptimizationJobData> | null {
  try {
    const worker = new Worker<OptimizationJobData>(
      'optimization-processing-queue',
      async (job: Job<OptimizationJobData>) => {
        if (job.data.action === 'scan_opportunities') {
          await detectOptimizationOpportunities()
        }
      },
      {
        connection: redis,
        concurrency: 2,
      },
    )

    worker.on('failed', (job, err) => {
      console.warn(`[OptimizationWorker] Job ${job?.id ?? 'unknown'} failed: ${err.message}`)
    })

    return worker
  } catch (err) {
    console.warn('[OptimizationWorker] Redis/BullMQ offline or disabled:', err)
    return null
  }
}
