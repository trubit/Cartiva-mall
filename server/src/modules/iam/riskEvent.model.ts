import { Schema, model, Document, Types } from 'mongoose'

export type RiskLevel = 'low' | 'medium' | 'high' | 'critical'

export interface IRiskEventDoc extends Document {
  userId?: Types.ObjectId
  eventType: string
  riskScore: number
  riskLevel: RiskLevel
  ip?: string
  userAgent?: string
  details: Record<string, unknown>
  resolved: boolean
  resolvedAt?: Date
}

const riskEventSchema = new Schema<IRiskEventDoc>(
  {
    userId: { type: Schema.Types.ObjectId, ref: 'User' },
    eventType: { type: String, required: true },
    riskScore: { type: Number, required: true, min: 0, max: 100 },
    riskLevel: { type: String, enum: ['low', 'medium', 'high', 'critical'], required: true },
    ip: { type: String },
    userAgent: { type: String },
    details: { type: Schema.Types.Mixed, default: {} },
    resolved: { type: Boolean, default: false },
    resolvedAt: { type: Date },
  },
  { timestamps: { createdAt: true, updatedAt: false } },
)

riskEventSchema.index({ userId: 1 })
riskEventSchema.index({ riskLevel: 1 })
riskEventSchema.index({ riskScore: -1 })
riskEventSchema.index({ resolved: 1 })
riskEventSchema.index({ createdAt: -1 })

export const RiskEvent = model<IRiskEventDoc>('RiskEvent', riskEventSchema)
