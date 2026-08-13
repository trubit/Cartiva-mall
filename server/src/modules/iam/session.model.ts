import { Schema, model, Document, Types } from 'mongoose'

export interface ISessionDoc extends Document {
  userId: Types.ObjectId
  token: string
  deviceId?: Types.ObjectId
  ip?: string
  userAgent?: string
  location?: string
  isActive: boolean
  lastSeenAt: Date
  expiresAt: Date
}

const sessionSchema = new Schema<ISessionDoc>(
  {
    userId: { type: Schema.Types.ObjectId, ref: 'User', required: true },
    token: { type: String, required: true, unique: true },
    deviceId: { type: Schema.Types.ObjectId, ref: 'Device' },
    ip: { type: String },
    userAgent: { type: String },
    location: { type: String },
    isActive: { type: Boolean, default: true },
    lastSeenAt: { type: Date, default: Date.now },
    expiresAt: { type: Date, required: true },
  },
  { timestamps: { createdAt: true, updatedAt: false } },
)

sessionSchema.index({ userId: 1 })
sessionSchema.index({ isActive: 1 })
sessionSchema.index({ expiresAt: 1 }, { expireAfterSeconds: 0 })
sessionSchema.index({ createdAt: -1 })

export const Session = model<ISessionDoc>('Session', sessionSchema)
