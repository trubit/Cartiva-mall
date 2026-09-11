import mongoose, { type Document, type Types } from 'mongoose'

export type DevicePlatform = 'web' | 'ios' | 'android'

export interface IDeviceTokenDocument extends Document {
  deviceId: string
  userId: Types.ObjectId
  platform: DevicePlatform
  pushToken: string
  active: boolean
  lastSeenAt: Date
  createdAt: Date
  updatedAt: Date
}

const deviceTokenSchema = new mongoose.Schema<IDeviceTokenDocument>(
  {
    deviceId: { type: String, required: true, unique: true, index: true },
    userId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true, index: true },
    platform: { type: String, enum: ['web', 'ios', 'android'], required: true },
    pushToken: { type: String, required: true },
    active: { type: Boolean, default: true, index: true },
    lastSeenAt: { type: Date, default: Date.now },
  },
  { timestamps: true },
)

deviceTokenSchema.index({ userId: 1, active: 1 })

export const DeviceToken = mongoose.model<IDeviceTokenDocument>('DeviceToken', deviceTokenSchema)
