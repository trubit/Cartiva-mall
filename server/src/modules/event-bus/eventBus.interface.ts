export interface IDomainEvent<T = Record<string, unknown>> {
  eventId: string
  eventType: string
  eventVersion: number
  aggregateId: string
  aggregateType: string
  timestamp: string
  source: string
  correlationId: string
  causationId?: string
  actorId?: string
  metadata?: Record<string, unknown>
  payload: T
}

export interface IEventBus {
  publish<T>(event: IDomainEvent<T>): Promise<void>
  subscribe(
    eventType: string,
    consumerName: string,
    handler: (event: IDomainEvent) => Promise<void>,
  ): void
  replay(eventId: string): Promise<boolean>
}
