import { Queue, Worker, type Job } from 'bullmq'
import { redisConnection } from './connection.js'
import { IDomainEvent } from '../modules/event-bus/eventBus.interface.js'
import { DeadLetterEventModel } from '../modules/event-bus/eventBus.model.js'
import { logger } from '../utils/logger.js'

export const EVENT_BUS_QUEUE_NAME = 'domain-events-processing'

interface EventJobData {
  event: IDomainEvent
}

// Lazy-initialized — only created when BullMQ availability is verified to prevent import deadlocks
let eventBusQueueInstance: Queue<EventJobData> | null = null
let eventWorker: Worker<EventJobData> | null = null
let bullmqAvailable = true
let eventWorkerDisabled = false

const isVersionError = (err: unknown): boolean =>
  err instanceof Error &&
  (err.message.includes('Redis version needs to be greater') ||
    err.message.includes('Unknown Redis command') ||
    err.message.includes('ERR Error running script'))

export const getEventBusQueue = (): Queue<EventJobData> | null => {
  if (!bullmqAvailable) return null

  if (!eventBusQueueInstance) {
    try {
      eventBusQueueInstance = new Queue<EventJobData>(EVENT_BUS_QUEUE_NAME, {
        connection: redisConnection,
        skipVersionCheck: true,
        defaultJobOptions: {
          removeOnComplete: true,
          removeOnFail: false,
        },
      })

      eventBusQueueInstance.on('error', (err) => {
        if (isVersionError(err) && bullmqAvailable) {
          logger.warn(
            '[EventBus Queue] Redis version mismatch — BullMQ disabled, using in-memory event dispatch',
          )
          bullmqAvailable = false
          void stopEventBusWorker()
        }
      })
    } catch (err: any) {
      bullmqAvailable = false
      logger.warn(`[EventBus Queue] Failed to initialize Queue: ${err.message}`)
      return null
    }
  }

  return eventBusQueueInstance
}

// Backward-compatibility proxy for any external callers referencing eventBusQueue directly
export const eventBusQueue = {
  add: async (name: string, data: EventJobData, opts?: any) => {
    const q = getEventBusQueue()
    if (!q) {
      throw new Error('EventBus Queue unavailable (Redis offline or BullMQ disabled)')
    }
    return q.add(name, data, opts)
  },
}

const dispatchInMemory = async (event: IDomainEvent): Promise<void> => {
  try {
    const { eventBus } = await import('../modules/event-bus/eventBus.service.js')
    const consumers = eventBus.getRegisteredHandlers(event.eventType)

    if (consumers.length === 0) {
      logger.debug(
        `[In-Memory EventBus] No consumers registered for event type [${event.eventType}]`,
      )
      return
    }

    for (const { consumerName, handler } of consumers) {
      eventBus.processEventWithConsumer(event, consumerName, handler).catch((err: any) => {
        logger.error(
          `[In-Memory EventBus] Consumer [${consumerName}] failed for event [${event.eventId}]: ${err.message}`,
        )
      })
    }
  } catch (err: any) {
    logger.error(`[In-Memory EventBus] Failed dispatching event [${event.eventId}]: ${err.message}`)
  }
}

export const enqueueDomainEvent = async (event: IDomainEvent): Promise<void> => {
  const queue = getEventBusQueue()

  if (!queue) {
    // Immediate in-memory execution when Redis/BullMQ is offline
    await dispatchInMemory(event)
    return
  }

  try {
    const pushPromise = queue.add(
      'process-domain-event',
      { event },
      {
        attempts: 3,
        backoff: { type: 'exponential', delay: 2000 },
        removeOnComplete: 1000,
        removeOnFail: 5000,
      },
    )
    const timeoutPromise = new Promise((_, reject) =>
      setTimeout(() => reject(new Error('Redis enqueue timeout')), 1000),
    )
    await Promise.race([pushPromise, timeoutPromise])
  } catch (err: any) {
    logger.warn(
      `EventBus queue push skipped (Redis/BullMQ offline or version mismatch): ${err.message}`,
    )
    // Fall back to in-memory dispatch so domain events are never lost
    await dispatchInMemory(event)
  }
}

export const startEventBusWorker = (): Worker<EventJobData> | null => {
  if (eventWorker || !bullmqAvailable) return eventWorker

  try {
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
  } catch (err: any) {
    if (isVersionError(err)) {
      logger.warn(
        '[EventBus Worker] Redis < 5.0 — BullMQ worker disabled, using synchronous event bus fallback',
      )
      bullmqAvailable = false
    } else {
      logger.warn(`[EventBus Worker] Failed to start: ${err.message}`)
    }
    return null
  }
}

export const stopEventBusWorker = async (): Promise<void> => {
  if (eventWorker) {
    await eventWorker.close().catch(() => {})
    eventWorker = null
    logger.info('Event Bus background worker stopped')
  }
  if (eventBusQueueInstance) {
    await eventBusQueueInstance.close().catch(() => {})
    eventBusQueueInstance = null
  }
}
