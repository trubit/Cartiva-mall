import mongoose, { Schema, type Document } from 'mongoose'

export type WebhookDeliveryStatus = 'success' | 'failed' | 'dead_letter'

export interface IEcosystemWebhookDeliveryDocument extends Document {
  deliveryId: string
  endpointId: string
  eventId: string
  eventType: string
  attempt: number
  status: WebhookDeliveryStatus
  responseCode?: number
  latencyMs: number
  payload: Record<string, unknown>
  error?: string
  completedAt?: Date
  createdAt: Date
  updatedAt: Date
}

const EcosystemWebhookDeliverySchema = new Schema<IEcosystemWebhookDeliveryDocument>(
  {
    deliveryId: { type: String, required: true, unique: true, index: true },
    endpointId: { type: String, required: true, index: true },
    eventId: { type: String, required: true, index: true },
    eventType: { type: String, required: true, index: true },
    attempt: { type: Number, default: 1 },
    status: {
      type: String,
      enum: ['success', 'failed', 'dead_letter'],
      default: 'failed',
      index: true,
    },
    responseCode: { type: Number },
    latencyMs: { type: Number, default: 0 },
    payload: { type: Schema.Types.Mixed, default: {} },
    error: { type: String },
    completedAt: { type: Date },
  },
  { timestamps: true },
)

export const EcosystemWebhookDelivery =
  mongoose.models.EcosystemWebhookDelivery ||
  mongoose.model<IEcosystemWebhookDeliveryDocument>(
    'EcosystemWebhookDelivery',
    EcosystemWebhookDeliverySchema,
  )
