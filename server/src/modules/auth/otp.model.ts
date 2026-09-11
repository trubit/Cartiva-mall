import mongoose, { type Document, Schema } from 'mongoose'
import type { OtpPurpose } from '../../../../src/shared/types/auth.types.js'

export interface IOtpDocument extends Document {
  userId?: mongoose.Types.ObjectId
  email: string
  purpose: OtpPurpose
  otpHash: string
  expiresAt: Date
  attemptCount: number
  maxAttempts: number
  usedAt?: Date | null
  resendCooldownUntil: Date
  ipAddress?: string
  userAgent?: string
  createdAt: Date
  updatedAt: Date
}

const otpSchema = new Schema<IOtpDocument>(
  {
    userId: { type: Schema.Types.ObjectId, ref: 'User', index: true },
    email: { type: String, required: true, lowercase: true, trim: true, index: true },
    purpose: {
      type: String,
      required: true,
      enum: [
        'EMAIL_VERIFICATION',
        'PASSWORD_RESET',
        'CHANGE_EMAIL',
        'MFA',
        'SECURITY_CONFIRMATION',
      ],
      index: true,
    },
    otpHash: { type: String, required: true, select: false },
    expiresAt: { type: Date, required: true },
    attemptCount: { type: Number, default: 0 },
    maxAttempts: { type: Number, default: 5 },
    usedAt: { type: Date, default: null },
    resendCooldownUntil: { type: Date, required: true },
    ipAddress: { type: String, trim: true },
    userAgent: { type: String, trim: true },
  },
  {
    timestamps: true,
  },
)

// Compound index for active lookup: find unused OTP by email & purpose
otpSchema.index({ email: 1, purpose: 1, usedAt: 1, expiresAt: 1 })
// TTL index to automatically prune consumed/expired records after 2 hours
otpSchema.index({ expiresAt: 1 }, { expireAfterSeconds: 7200 })

export const Otp = mongoose.model<IOtpDocument>('Otp', otpSchema)
