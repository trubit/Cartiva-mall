import mongoose, { type Document, type Types } from 'mongoose'

export interface INotificationPreferenceItem {
  notificationType: string
  inApp: boolean
  email: boolean
  push: boolean
  sms: boolean
}

export interface INotificationPreferenceDocument extends Document {
  userId: Types.ObjectId
  preferences: INotificationPreferenceItem[]
  createdAt: Date
  updatedAt: Date
}

const preferenceItemSchema = new mongoose.Schema<INotificationPreferenceItem>(
  {
    notificationType: { type: String, required: true },
    inApp: { type: Boolean, default: true },
    email: { type: Boolean, default: true },
    push: { type: Boolean, default: true },
    sms: { type: Boolean, default: false },
  },
  { _id: false },
)

const notificationPreferenceSchema = new mongoose.Schema<INotificationPreferenceDocument>(
  {
    userId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true,
      unique: true,
      index: true,
    },
    preferences: { type: [preferenceItemSchema], default: [] },
  },
  { timestamps: true },
)

export const NotificationPreference = mongoose.model<INotificationPreferenceDocument>(
  'NotificationPreference',
  notificationPreferenceSchema,
)

export const DEFAULT_PREFERENCES: INotificationPreferenceItem[] = [
  { notificationType: 'order_updates', inApp: true, email: true, push: true, sms: true },
  { notificationType: 'payment_updates', inApp: true, email: true, push: true, sms: false },
  { notificationType: 'shipping_updates', inApp: true, email: true, push: true, sms: true },
  { notificationType: 'promotions', inApp: true, email: true, push: false, sms: false },
  { notificationType: 'security_alerts', inApp: true, email: true, push: true, sms: true },
]
