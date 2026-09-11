import mongoose, { Schema, type Document } from 'mongoose'

export type SignalSeverity = 'info' | 'low' | 'medium' | 'high' | 'critical'
export type SignalStatus = 'new' | 'analyzed' | 'archived'

export interface IBusinessSignalDocument extends Document {
  signalType: string
  sourceModule: string
  severity: SignalSeverity
  value: number
  threshold: number
  metadata: Record<string, unknown>
  status: SignalStatus
  tenantId?: string
  sellerId?: mongoose.Types.ObjectId
  createdAt: Date
  updatedAt: Date
}

const BusinessSignalSchema = new Schema<IBusinessSignalDocument>(
  {
    signalType: { type: String, required: true, index: true },
    sourceModule: { type: String, required: true, index: true },
    severity: {
      type: String,
      enum: ['info', 'low', 'medium', 'high', 'critical'],
      default: 'info',
    },
    value: { type: Number, required: true },
    threshold: { type: Number, required: true },
    metadata: { type: Schema.Types.Mixed, default: {} },
    status: {
      type: String,
      enum: ['new', 'analyzed', 'archived'],
      default: 'new',
      index: true,
    },
    tenantId: { type: String, index: true },
    sellerId: { type: Schema.Types.ObjectId, ref: 'User', index: true },
  },
  { timestamps: true },
)

BusinessSignalSchema.index({ signalType: 1, status: 1, createdAt: -1 })

export const BusinessSignal = mongoose.model<IBusinessSignalDocument>(
  'BusinessSignal',
  BusinessSignalSchema,
)
