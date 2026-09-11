import { Worker, type Job } from 'bullmq'
import { redis } from '../database/redis.js'
import { logger } from '../utils/logger.js'

export interface AutonomyJobData {
  jobType: 'signal_evaluation' | 'expiration_check' | 'rollback_monitoring'
  signalId?: string
  decisionId?: string
}

export const autonomyWorker = new Worker<AutonomyJobData>(
  'autonomy-processing',
  async (job: Job<AutonomyJobData>) => {
    logger.info(`[AutonomyWorker] Processing job [${job.id}] type [${job.data.jobType}]`)

    switch (job.data.jobType) {
      case 'signal_evaluation':
        logger.info(`[AutonomyWorker] Evaluating signal [${job.data.signalId}]`)
        break
      case 'expiration_check':
        logger.info(`[AutonomyWorker] Checking decision expirations`)
        break
      case 'rollback_monitoring':
        logger.info(`[AutonomyWorker] Monitoring decision rollback state [${job.data.decisionId}]`)
        break
      default:
        logger.warn(`[AutonomyWorker] Unknown job type`)
    }

    return { processed: true, timestamp: new Date().toISOString() }
  },
  {
    connection: redis,
    concurrency: 5,
  },
)

autonomyWorker.on('failed', (job, err) => {
  logger.error(`[AutonomyWorker] Job [${job?.id}] failed: ${err.message}`)
})
