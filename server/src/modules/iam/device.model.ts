import { Schema, model, Document, Types } from 'mongoose'

export interface IDeviceDoc extends Document {
  userId: Types.ObjectId
  fingerprint: string
  name: string
  type: 'desktop' | 'mobile' | 'tablet' | 'unknown'
  os?: string
  browser?: string
  ip?: string
  isTrusted: boolean
  lastSeenAt: Date
}

const deviceSchema = new Schema<IDeviceDoc>(
  {
    userId: { type: Schema.Types.ObjectId, ref: 'User', required: true },
    fingerprint: { type: String, required: true },
    name: { type: String, required: true },
    type: { type: String, enum: ['desktop', 'mobile', 'tablet', 'unknown'], default: 'unknown' },
    os: { type: String },
    browser: { type: String },
    ip: { type: String },
    isTrusted: { type: Boolean, default: false },
    lastSeenAt: { type: Date, default: Date.now },
  },
  { timestamps: true },
)

deviceSchema.index({ userId: 1 })
deviceSchema.index({ fingerprint: 1 })
deviceSchema.index({ userId: 1, fingerprint: 1 }, { unique: true })
deviceSchema.index({ isTrusted: 1 })

export const Device = model<IDeviceDoc>('Device', deviceSchema)
