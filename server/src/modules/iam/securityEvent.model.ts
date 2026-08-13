import { Schema, model, Document, Types } from 'mongoose'

export interface ISecurityEventDoc extends Document {
  eventType: string
  userId?: Types.ObjectId
  ip?: string
  userAgent?: string
  details: Record<string, unknown>
  severity: 'info' | 'warning' | 'critical'
}

const securityEventSchema = new Schema<ISecurityEventDoc>(
  {
    eventType: { type: String, required: true },
    userId: { type: Schema.Types.ObjectId, ref: 'User' },
    ip: { type: String },
    userAgent: { type: String },
    details: { type: Schema.Types.Mixed, default: {} },
    severity: { type: String, enum: ['info', 'warning', 'critical'], default: 'info' },
  },
  { timestamps: { createdAt: true, updatedAt: false } },
)

securityEventSchema.index({ eventType: 1 })
securityEventSchema.index({ userId: 1 })
securityEventSchema.index({ severity: 1 })
securityEventSchema.index({ createdAt: -1 })

export const SecurityEvent = model<ISecurityEventDoc>('SecurityEvent', securityEventSchema)
