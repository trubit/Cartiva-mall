import mongoose, { type Document } from 'mongoose'

export interface ICouponDocument extends Document {
  code: string
  type: 'percentage' | 'fixed'
  value: number
  minOrderAmount: number
  maxDiscountAmount: number
  maxUses: number | null
  usedCount: number
  expiresAt: Date | null
  isActive: boolean
  createdAt: Date
  updatedAt: Date
}

const couponSchema = new mongoose.Schema<ICouponDocument>(
  {
    code: { type: String, required: true, unique: true, uppercase: true, trim: true, index: true },
    type: { type: String, enum: ['percentage', 'fixed'], required: true },
    value: { type: Number, required: true, min: 0 },
    minOrderAmount: { type: Number, default: 0, min: 0 },
    maxDiscountAmount: { type: Number, default: 0, min: 0 }, // 0 = no cap
    maxUses: { type: Number, default: null }, // null = unlimited
    usedCount: { type: Number, default: 0, min: 0 },
    expiresAt: { type: Date, default: null }, // null = no expiry
    isActive: { type: Boolean, default: true, index: true },
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

export const Coupon = mongoose.model<ICouponDocument>('Coupon', couponSchema)
