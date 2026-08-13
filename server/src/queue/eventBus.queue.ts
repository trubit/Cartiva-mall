import { Queue, Worker, Job } from 'bullmq'
import { redisConnection } from './connection.js'
import { IDomainEvent } from '../modules/event-bus/eventBus.interface.js'
import { DeadLetterEventModel } from '../modules/event-bus/eventBus.model.js'
import { logger } from '../utils/logger.js'

export const EVENT_BUS_QUEUE_NAME = 'domain-events-processing'

export const eventBusQueue = new Queue(EVENT_BUS_QUEUE_NAME, {
  connection: redisConnection,
  skipVersionCheck: true,
  defaultJobOptions: {
    removeOnComplete: true,
    removeOnFail: false,
  },
})

interface EventJobData {
  event: IDomainEvent
}

export const enqueueDomainEvent = async (event: IDomainEvent): Promise<void> => {
  try {
    await eventBusQueue.add(
      'process-domain-event',
      { event },
      {
        attempts: 3,
        backoff: { type: 'exponential', delay: 2000 },
        removeOnComplete: 1000,
        removeOnFail: 5000,
      },
    )
  } catch (err: any) {
    logger.warn(
      `EventBus queue push skipped (Redis/BullMQ offline or version mismatch): ${err.message}`,
    )
  }
}

let eventWorker: Worker | null = null

const isVersionError = (err: unknown): boolean =>
  err instanceof Error &&
  (err.message.includes('Redis version needs to be greater') ||
    err.message.includes('Unknown Redis command') ||
    err.message.includes('ERR Error running script'))

let eventWorkerDisabled = false

export const startEventBusWorker = (): Worker => {
  if (eventWorker) return eventWorker

  eventWorker = new Worker<EventJobData>(
    EVENT_BUS_QUEUE_NAME,
    async (job: Job<EventJobData>) => {
      const { event } = job.data
      const { eventBus } = await import('../modules/event-bus/eventBus.service.js')
      const consumers = eventBus.getRegisteredHandlers(event.eventType)

      if (consumers.length === 0) {
        logger.debug(`No consumers registered for event type [${event.eventType}]`)
        return
      }

      for (const { consumerName, handler } of consumers) {
        try {
          await eventBus.processEventWithConsumer(event, consumerName, handler)
        } catch (err: any) {
          logger.error(
            `Consumer [${consumerName}] failed for event [${event.eventId}]: ${err.message}`,
          )
          throw err
        }
      }
    },
    {
      connection: redisConnection,
      concurrency: 10,
      skipVersionCheck: true,
    },
  )

  eventWorker.on('error', (err) => {
    if (isVersionError(err)) {
      if (!eventWorkerDisabled) {
        logger.warn(
          '[EventBus Worker] Redis < 5.0 / Lua command mismatch — BullMQ worker stopped, using synchronous event bus fallback',
        )
        eventWorkerDisabled = true
        void stopEventBusWorker()
      }
      return
    }
    logger.warn(`EventBus worker error (Redis/BullMQ): ${err.message}`)
  })

  eventWorker.on('failed', async (job, err) => {
    if (!job) return
    const { event } = job.data

    if (job.attemptsMade >= (job.opts.attempts || 3)) {
      logger.error(`Domain Event [${event.eventId}] moved to Dead-Letter Queue: ${err.message}`)
      await DeadLetterEventModel.create({
        eventId: event.eventId,
        eventType: event.eventType,
        consumerName: 'event-bus-consumer',
        reason: err.message || 'Consumer processing failed after maximum retries',
        payload: event.payload,
        correlationId: event.correlationId,
        retryCount: job.attemptsMade,
        status: 'PENDING',
      }).catch(() => {})
    }
  })

  logger.info('Event Bus background worker started')
  return eventWorker
}

export const stopEventBusWorker = async (): Promise<void> => {
  if (eventWorker) {
    await eventWorker.close()
    eventWorker = null
    logger.info('Event Bus background worker stopped')
  }
}
