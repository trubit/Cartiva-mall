import mongoose, { Schema, type Document } from 'mongoose'

export interface IWebhookEndpointDocument extends Document {
  endpointId: string
  integrationId: string
  targetUrl: string
  secret: string // HMAC SHA256 signing secret
  subscribedEvents: string[]
  status: 'active' | 'disabled' | 'failed'
  retryLimit: number
  headers: Record<string, string>
  createdAt: Date
  updatedAt: Date
}

const WebhookEndpointSchema = new Schema<IWebhookEndpointDocument>(
  {
    endpointId: { type: String, required: true, unique: true, index: true },
    integrationId: { type: String, required: true, index: true },
    targetUrl: { type: String, required: true },
    secret: { type: String, required: true },
    subscribedEvents: [{ type: String, required: true }],
    status: {
      type: String,
      enum: ['active', 'disabled', 'failed'],
      default: 'active',
      index: true,
    },
    retryLimit: { type: Number, default: 3 },
    headers: { type: Schema.Types.Mixed, default: {} },
  },
  { timestamps: true },
)

export const WebhookEndpoint =
  mongoose.models.WebhookEndpoint ||
  mongoose.model<IWebhookEndpointDocument>('WebhookEndpoint', WebhookEndpointSchema)
