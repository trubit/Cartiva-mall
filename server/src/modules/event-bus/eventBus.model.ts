import mongoose, { Schema, Document } from 'mongoose'

// ─── 1. Immutable DomainEvent Store ─────────────────────────────────────────
export interface IDomainEventDoc extends Document {
  eventId: string
  eventType: string
  eventVersion: number
  aggregateId: string
  aggregateType: string
  timestamp: Date
  source: string
  correlationId: string
  causationId?: string
  actorId?: string
  metadata: Record<string, unknown>
  payload: Record<string, unknown>
  createdAt: Date
}

const domainEventSchema = new Schema<IDomainEventDoc>(
  {
    eventId: { type: String, required: true, unique: true, index: true },
    eventType: { type: String, required: true, index: true },
    eventVersion: { type: Number, required: true, default: 1 },
    aggregateId: { type: String, required: true, index: true },
    aggregateType: { type: String, required: true, index: true },
    timestamp: { type: Date, required: true, default: Date.now, index: true },
    source: { type: String, required: true },
    correlationId: { type: String, required: true, index: true },
    causationId: { type: String, index: true },
    actorId: { type: String },
    metadata: { type: Schema.Types.Mixed, default: {} },
    payload: { type: Schema.Types.Mixed, required: true },
  },
  { timestamps: { createdAt: true, updatedAt: false } },
)

export const DomainEventModel =
  mongoose.models.DomainEvent || mongoose.model<IDomainEventDoc>('DomainEvent', domainEventSchema)

// ─── 2. ProcessedEvent (Idempotency Store) ────────────────────────────────────
export interface IProcessedEventDoc extends Document {
  eventId: string
  consumerName: string
  processedAt: Date
  result?: string
}

const processedEventSchema = new Schema<IProcessedEventDoc>(
  {
    eventId: { type: String, required: true },
    consumerName: { type: String, required: true },
    processedAt: { type: Date, default: Date.now },
    result: { type: String, default: 'SUCCESS' },
  },
  { timestamps: false },
)

processedEventSchema.index({ eventId: 1, consumerName: 1 }, { unique: true })

export const ProcessedEventModel =
  mongoose.models.ProcessedEvent ||
  mongoose.model<IProcessedEventDoc>('ProcessedEvent', processedEventSchema)

// ─── 3. SagaInstance (Distributed Transaction Tracking) ─────────────────────
export interface ISagaInstanceDoc extends Document {
  sagaId: string
  sagaName: string
  correlationId: string
  currentStep: string
  status: 'STARTED' | 'IN_PROGRESS' | 'COMPLETED' | 'FAILED' | 'COMPENSATED'
  completedSteps: string[]
  failedStep?: string
  failureReason?: string
  compensationsExecuted: string[]
  context: Record<string, unknown>
  startedAt: Date
  completedAt?: Date
}

const sagaInstanceSchema = new Schema<ISagaInstanceDoc>(
  {
    sagaId: { type: String, required: true, unique: true, index: true },
    sagaName: { type: String, required: true, index: true },
    correlationId: { type: String, required: true, index: true },
    currentStep: { type: String, required: true },
    status: {
      type: String,
      enum: ['STARTED', 'IN_PROGRESS', 'COMPLETED', 'FAILED', 'COMPENSATED'],
      default: 'STARTED',
      index: true,
    },
    completedSteps: [{ type: String }],
    failedStep: { type: String },
    failureReason: { type: String },
    compensationsExecuted: [{ type: String }],
    context: { type: Schema.Types.Mixed, default: {} },
    startedAt: { type: Date, default: Date.now },
    completedAt: { type: Date },
  },
  { timestamps: true },
)

export const SagaInstanceModel =
  mongoose.models.SagaInstance ||
  mongoose.model<ISagaInstanceDoc>('SagaInstance', sagaInstanceSchema)

// ─── 4. DeadLetterEvent Store ────────────────────────────────────────────────
export interface IDeadLetterEventDoc extends Document {
  eventId: string
  eventType: string
  consumerName: string
  reason: string
  payload: Record<string, unknown>
  correlationId: string
  retryCount: number
  status: 'PENDING' | 'REPLAYED' | 'DISCARDED'
  createdAt: Date
}

const deadLetterEventSchema = new Schema<IDeadLetterEventDoc>(
  {
    eventId: { type: String, required: true, index: true },
    eventType: { type: String, required: true, index: true },
    consumerName: { type: String, required: true, index: true },
    reason: { type: String, required: true },
    payload: { type: Schema.Types.Mixed, required: true },
    correlationId: { type: String, required: true, index: true },
    retryCount: { type: Number, default: 0 },
    status: {
      type: String,
      enum: ['PENDING', 'REPLAYED', 'DISCARDED'],
      default: 'PENDING',
      index: true,
    },
  },
  { timestamps: true },
)

export const DeadLetterEventModel =
  mongoose.models.DeadLetterEvent ||
  mongoose.model<IDeadLetterEventDoc>('DeadLetterEvent', deadLetterEventSchema)
