import { Worker, type Job } from 'bullmq'
import { redis } from '../database/redis.js'
import { evaluateRisk, type SubjectType } from '../modules/risk/risk.service.js'

export interface RiskJobData {
  subjectType: SubjectType
  subjectId: string
  signals?: Record<string, unknown>
}

export function createRiskProcessingWorker(): Worker<RiskJobData> | null {
  try {
    const worker = new Worker<RiskJobData>(
      'risk-processing-queue',
      async (job: Job<RiskJobData>) => {
        const { subjectType, subjectId, signals } = job.data
        await evaluateRisk(subjectType, subjectId, signals as never)
      },
      {
        connection: redis,
        concurrency: 5,
      },
    )

    worker.on('failed', (job, err) => {
      console.warn(`[RiskProcessingWorker] Job ${job?.id ?? 'unknown'} failed: ${err.message}`)
    })

    return worker
  } catch (err) {
    console.warn('[RiskProcessingWorker] Redis/BullMQ offline or disabled:', err)
    return null
  }
}
