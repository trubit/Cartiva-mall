import mongoose, { Schema, type Document, type Types } from 'mongoose'

export interface IPayoutSettingsDocument extends Document {
  key: string
  notificationEmails: string[]
  notifyOnWithdrawalRequest: boolean
  updatedBy?: Types.ObjectId
  createdAt: Date
  updatedAt: Date
}

const payoutSettingsSchema = new Schema<IPayoutSettingsDocument>(
  {
    key: { type: String, required: true, unique: true, default: 'DEFAULT' },
    notificationEmails: {
      type: [String],
      default: [],
      validate: {
        validator: (emails: string[]) =>
          emails.every((e) => /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(e.trim())),
        message: 'All notification emails must be valid email addresses',
      },
    },
    notifyOnWithdrawalRequest: { type: Boolean, default: true },
    updatedBy: { type: Schema.Types.ObjectId, ref: 'User' },
  },
  { timestamps: true },
)

export const PayoutSettings = mongoose.model<IPayoutSettingsDocument>(
  'PayoutSettings',
  payoutSettingsSchema,
)
