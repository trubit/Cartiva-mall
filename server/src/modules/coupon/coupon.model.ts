import mongoose, { type Document, type Types } from 'mongoose'

export interface ICouponDocument extends Document {
  code: string
  type: 'percentage' | 'fixed'
  value: number
  minOrderAmount: number
  maxDiscountAmount: number
  maxUses: number | null
  usedCount: number
  startDate: Date | null
  expiresAt: Date | null
  applicableCategories: string[]
  applicableProducts: Types.ObjectId[]
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
    maxDiscountAmount: { type: Number, default: 0, min: 0 },
    maxUses: { type: Number, default: null },
    usedCount: { type: Number, default: 0, min: 0 },
    startDate: { type: Date, default: null },
    expiresAt: { type: Date, default: null },
    applicableCategories: { type: [String], default: [] },
    applicableProducts: { type: [mongoose.Schema.Types.ObjectId], ref: 'Product', default: [] },
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

// ─── Promotions (flash sales, deals, campaigns) ───────────────────────────────
export interface IPromotionDocument extends Document {
  title: string
  description?: string
  type: 'flash_sale' | 'deal' | 'campaign'
  discountType: 'percentage' | 'fixed'
  discountValue: number
  products: Types.ObjectId[]
  categories: string[]
  startDate: Date
  endDate: Date
  bannerImage?: string
  badgeLabel?: string
  isActive: boolean
  createdAt: Date
  updatedAt: Date
}

const promotionSchema = new mongoose.Schema<IPromotionDocument>(
  {
    title: { type: String, required: true, trim: true, maxlength: 200 },
    description: { type: String, trim: true, maxlength: 1000 },
    type: { type: String, enum: ['flash_sale', 'deal', 'campaign'], default: 'deal' },
    discountType: { type: String, enum: ['percentage', 'fixed'], required: true },
    discountValue: { type: Number, required: true, min: 0 },
    products: { type: [mongoose.Schema.Types.ObjectId], ref: 'Product', default: [] },
    categories: { type: [String], default: [] },
    startDate: { type: Date, required: true },
    endDate: { type: Date, required: true },
    bannerImage: { type: String },
    badgeLabel: { type: String, trim: true, maxlength: 50 },
    isActive: { type: Boolean, default: true, index: true },
  },
  { timestamps: true },
)

promotionSchema.index({ isActive: 1, startDate: 1, endDate: 1 })

export const Promotion = mongoose.model<IPromotionDocument>('Promotion', promotionSchema)
