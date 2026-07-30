import mongoose, { type Document, type Types } from 'mongoose'

export type NotificationDocType = 'order' | 'system' | 'promotion' | 'wishlist' | 'security'

export interface INotificationDocument extends Document {
  userId: Types.ObjectId
  type: NotificationDocType
  title: string
  message: string
  read: boolean
  link?: string
  data?: Record<string, unknown>
  createdAt: Date
  updatedAt: Date
}

const notificationSchema = new mongoose.Schema<INotificationDocument>(
  {
    userId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true, index: true },
    type: {
      type: String,
      enum: ['order', 'system', 'promotion', 'wishlist', 'security'],
      required: true,
    },
    title: { type: String, required: true, trim: true, maxlength: 200 },
    message: { type: String, required: true, trim: true, maxlength: 1000 },
    read: { type: Boolean, default: false, index: true },
    link: { type: String, trim: true },
    data: { type: mongoose.Schema.Types.Mixed },
  },
  {
    timestamps: true,
    toJSON: {
      transform: (_doc, ret: Record<string, unknown>) => {
        delete ret.__v
        return ret
      },
    },
  },
)

notificationSchema.index({ userId: 1, createdAt: -1 })
notificationSchema.index({ userId: 1, read: 1 })
// Auto-delete notifications after 90 days — prevents unlimited collection growth
notificationSchema.index({ createdAt: 1 }, { expireAfterSeconds: 90 * 24 * 60 * 60 })

export const Notification = mongoose.model<INotificationDocument>(
  'Notification',
  notificationSchema,
)

// ─── Utility: create a notification ──────────────────────────────────────────
export const createNotification = async (input: {
  userId: string | Types.ObjectId
  type: NotificationDocType
  title: string
  message: string
  link?: string
  data?: Record<string, unknown>
}): Promise<INotificationDocument> => {
  return Notification.create(input)
}
