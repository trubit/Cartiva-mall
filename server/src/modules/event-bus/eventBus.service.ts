import { v4 as uuidv4 } from 'uuid'
import { IDomainEvent, IEventBus } from './eventBus.interface.js'
import { DomainEventModel, ProcessedEventModel } from './eventBus.model.js'
import { enqueueDomainEvent } from '../../queue/eventBus.queue.js'
import { logger } from '../../utils/logger.js'
import { getSocketIO } from '../../sockets/index.js'

export class RedisEventBus implements IEventBus {
  private handlers = new Map<
    string,
    Array<{ consumerName: string; handler: (event: IDomainEvent) => Promise<void> }>
  >()

  /**
   * Centralized Domain Event Publisher
   */
  async publish<T = Record<string, unknown>>(eventInput: Partial<IDomainEvent<T>>): Promise<void> {
    const event: IDomainEvent<Record<string, unknown>> = {
      eventId: eventInput.eventId || `evt_${uuidv4().replace(/-/g, '')}`,
      eventType: eventInput.eventType || 'unknown.event',
      eventVersion: eventInput.eventVersion || 1,
      aggregateId: eventInput.aggregateId || 'system',
      aggregateType: eventInput.aggregateType || 'System',
      timestamp: eventInput.timestamp || new Date().toISOString(),
      source: eventInput.source || 'cartiva-backend',
      correlationId: eventInput.correlationId || uuidv4(),
      causationId: eventInput.causationId,
      actorId: eventInput.actorId,
      metadata: eventInput.metadata || {},
      payload: (eventInput.payload || {}) as Record<string, unknown>,
    }

    // 1. Immutable Event Store write
    await DomainEventModel.create({
      eventId: event.eventId,
      eventType: event.eventType,
      eventVersion: event.eventVersion,
      aggregateId: event.aggregateId,
      aggregateType: event.aggregateType,
      timestamp: new Date(event.timestamp),
      source: event.source,
      correlationId: event.correlationId,
      causationId: event.causationId,
      actorId: event.actorId,
      metadata: event.metadata,
      payload: event.payload,
    }).catch((err) => logger.warn(`DomainEvent save duplicate or error: ${err.message}`))

    // 2. Queue BullMQ job for async processing by registered event consumers
    await enqueueDomainEvent(event)

    // 3. Emit real-time Socket.IO stream to `/events` namespace for Admin Live Monitor
    try {
      const io = getSocketIO()
      io.of('/events').emit('domain_event_emitted', event)
    } catch {
      // Socket.IO may not be initialized in test mode
    }

    logger.info(`EventBus published event [${event.eventType}] ID: ${event.eventId}`)
  }

  /**
   * Register a consumer handler for a domain event
   */
  subscribe(
    eventType: string,
    consumerName: string,
    handler: (event: IDomainEvent) => Promise<void>,
  ): void {
    if (!this.handlers.has(eventType)) {
      this.handlers.set(eventType, [])
    }
    this.handlers.get(eventType)!.push({ consumerName, handler })
  }

  /**
   * Process event with idempotency check
   */
  async processEventWithConsumer(
    event: IDomainEvent,
    consumerName: string,
    handler: (e: IDomainEvent) => Promise<void>,
  ): Promise<boolean> {
    // Idempotency check: composite key (eventId, consumerName)
    const existing = await ProcessedEventModel.findOne({ eventId: event.eventId, consumerName })
    if (existing) {
      logger.info(
        `Idempotency check: Event [${event.eventId}] already processed by consumer [${consumerName}]. Skipping.`,
      )
      return false
    }

    try {
      await handler(event)

      // Mark as processed
      await ProcessedEventModel.create({
        eventId: event.eventId,
        consumerName,
        processedAt: new Date(),
        result: 'SUCCESS',
      })
      return true
    } catch (err: any) {
      logger.error(
        `Error processing event [${event.eventId}] in consumer [${consumerName}]: ${err.message}`,
      )
      throw err
    }
  }

  /**
   * Replay Event
   */
  async replay(eventId: string): Promise<boolean> {
    const doc = await DomainEventModel.findOne({ eventId })
    if (!doc) throw new Error(`Domain event with ID ${eventId} not found`)

    const replayedEvent: IDomainEvent = {
      eventId: `evt_replay_${uuidv4().replace(/-/g, '')}`,
      eventType: doc.eventType,
      eventVersion: doc.eventVersion,
      aggregateId: doc.aggregateId,
      aggregateType: doc.aggregateType,
      timestamp: new Date().toISOString(),
      source: 'event-replay-system',
      correlationId: doc.correlationId,
      causationId: doc.eventId,
      payload: doc.payload,
      metadata: { originalEventId: doc.eventId, isReplay: true },
    }

    await this.publish(replayedEvent)
    return true
  }

  getRegisteredHandlers(eventType: string) {
    return this.handlers.get(eventType) || []
  }
}

export const eventBus = new RedisEventBus()
