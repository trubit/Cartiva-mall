import mongoose, { type Document, type Types } from 'mongoose'

export type NotificationDocType =
  | 'order'
  | 'system'
  | 'promotion'
  | 'wishlist'
  | 'security'
  | 'shipping'
  | 'inventory'
  | 'payment'
  | 'message'

export type NotificationChannel = 'IN_APP' | 'EMAIL' | 'PUSH' | 'SMS'
export type NotificationPriority = 'LOW' | 'NORMAL' | 'HIGH' | 'CRITICAL'
export type NotificationDeliveryStatus =
  | 'PENDING'
  | 'PROCESSING'
  | 'SENT'
  | 'DELIVERED'
  | 'FAILED'
  | 'CANCELLED'
  | 'EXPIRED'

export interface INotificationDocument extends Document {
  notificationId: string
  userId: Types.ObjectId
  type: NotificationDocType
  channel: NotificationChannel
  priority: NotificationPriority
  status: NotificationDeliveryStatus
  title: string
  message: string
  read: boolean
  link?: string
  data?: Record<string, unknown>
  sentAt?: Date
  deliveredAt?: Date
  failedAt?: Date
  failureReason?: string
  expiresAt?: Date
  createdAt: Date
  updatedAt: Date
}

const notificationSchema = new mongoose.Schema<INotificationDocument>(
  {
    notificationId: { type: String, required: true, unique: true, index: true },
    userId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true, index: true },
    type: {
      type: String,
      enum: [
        'order',
        'system',
        'promotion',
        'wishlist',
        'security',
        'shipping',
        'inventory',
        'payment',
        'message',
      ],
      required: true,
    },
    channel: {
      type: String,
      enum: ['IN_APP', 'EMAIL', 'PUSH', 'SMS'],
      default: 'IN_APP',
      index: true,
    },
    priority: {
      type: String,
      enum: ['LOW', 'NORMAL', 'HIGH', 'CRITICAL'],
      default: 'NORMAL',
    },
    status: {
      type: String,
      enum: ['PENDING', 'PROCESSING', 'SENT', 'DELIVERED', 'FAILED', 'CANCELLED', 'EXPIRED'],
      default: 'DELIVERED',
      index: true,
    },
    title: { type: String, required: true, trim: true, maxlength: 200 },
    message: { type: String, required: true, trim: true, maxlength: 1000 },
    read: { type: Boolean, default: false, index: true },
    link: { type: String, trim: true },
    data: { type: mongoose.Schema.Types.Mixed },
    sentAt: { type: Date },
    deliveredAt: { type: Date },
    failedAt: { type: Date },
    failureReason: { type: String },
    expiresAt: { type: Date },
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
notificationSchema.index({ createdAt: 1 }, { expireAfterSeconds: 90 * 24 * 60 * 60 })

export const Notification = mongoose.model<INotificationDocument>(
  'Notification',
  notificationSchema,
)

export const createNotification = async (
  input: Partial<Omit<INotificationDocument, 'userId'>> & { userId: string | Types.ObjectId },
): Promise<INotificationDocument> => {
  return Notification.create(input)
}
