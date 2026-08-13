import { Queue, Worker, type Job } from 'bullmq'
import { redisConnection } from './connection.js'
import { runCivilizationCycle, seedDefaultMarketRules } from '../modules/godmode/godmode.service.js'
import { logger } from '../utils/logger.js'

export const GODMODE_QUEUE_NAME = 'godmode-civilization'

export interface GodModeJobData {
  triggeredBy: string
  timestamp: string
}

let godmodeQueue: Queue<GodModeJobData> | null = null
let godmodeWorker: Worker<GodModeJobData> | null = null
let bullmqAvailable = true
let fallbackTimer: NodeJS.Timeout | null = null

const isVersionError = (err: unknown): boolean =>
  err instanceof Error &&
  (err.message.includes('Redis version needs to be greater') ||
    err.message.includes('Unknown Redis command') ||
    err.message.includes('ERR Error running script'))

const processGodModeJob = async (_job: Job<GodModeJobData>): Promise<void> => {
  await runCivilizationCycle()
}

export const startGodModeWorker = async (): Promise<void> => {
  if (godmodeWorker || fallbackTimer) return

  // Seed default market rules on startup
  try {
    await seedDefaultMarketRules()
  } catch (err) {
    logger.warn('[GodMode] Seeding rules failed', { err })
  }

  try {
    godmodeQueue = new Queue<GodModeJobData>(GODMODE_QUEUE_NAME, {
      connection: redisConnection,
      skipVersionCheck: true,
      defaultJobOptions: {
        attempts: 1,
        removeOnComplete: { count: 50 },
        removeOnFail: { count: 20 },
      },
    })

    godmodeQueue.on('error', (err) => {
      if (isVersionError(err) && bullmqAvailable) {
        logger.warn('[GodMode Queue] Redis < 5.0 — BullMQ disabled, using interval fallback')
        bullmqAvailable = false
        void stopGodModeWorker()
        startFallbackTimer()
      }
    })

    godmodeWorker = new Worker<GodModeJobData>(GODMODE_QUEUE_NAME, processGodModeJob, {
      connection: redisConnection,
      concurrency: 1,
      skipVersionCheck: true,
    })

    godmodeWorker.on('completed', () => {
      logger.info('[GodMode Worker] Civilization cycle completed via BullMQ')
    })

    godmodeWorker.on('error', (err) => {
      if (isVersionError(err)) {
        if (bullmqAvailable) {
          logger.warn('[GodMode Worker] Redis < 5.0 — BullMQ disabled, using interval fallback')
          bullmqAvailable = false
          void stopGodModeWorker()
          startFallbackTimer()
        }
        return
      }
      logger.error('[GodMode Worker] Unexpected error', { error: (err as Error).message })
    })

    // Schedule repeatable job every 30 seconds
    await godmodeQueue.add(
      'civilization-loop',
      { triggeredBy: 'BULLMQ_SCHEDULE', timestamp: new Date().toISOString() },
      { repeat: { every: 30000 } } as any,
    )

    logger.info('GodMode BullMQ civilization worker started (30s interval)')
  } catch (err) {
    if (isVersionError(err)) {
      logger.warn('[GodMode Worker] Redis < 5.0 — BullMQ disabled, using interval fallback')
      bullmqAvailable = false
      startFallbackTimer()
    } else {
      logger.error('[GodMode Worker] Failed to start', { error: (err as Error).message })
      startFallbackTimer()
    }
  }
}

const startFallbackTimer = () => {
  if (fallbackTimer) return
  logger.info('[GodMode] Starting in-process interval fallback (30s)')
  fallbackTimer = setInterval(() => {
    runCivilizationCycle().catch((err) => {
      logger.warn('[GodMode Fallback] Cycle execution failed', { err })
    })
  }, 30000)
}

export const stopGodModeWorker = async (): Promise<void> => {
  if (fallbackTimer) {
    clearInterval(fallbackTimer)
    fallbackTimer = null
  }
  if (godmodeWorker) {
    await godmodeWorker.close().catch(() => {})
    godmodeWorker = null
  }
  if (godmodeQueue) {
    await godmodeQueue.close().catch(() => {})
    godmodeQueue = null
  }
}
