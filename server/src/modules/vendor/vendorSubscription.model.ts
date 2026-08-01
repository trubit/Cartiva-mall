import mongoose, { type Document, type Types } from 'mongoose'

export type SubscriptionPlan = 'free' | 'basic' | 'professional' | 'enterprise'
export type SubscriptionStatus = 'active' | 'expired' | 'cancelled' | 'suspended'

export interface IVendorSubscriptionDocument extends Document {
  sellerId: Types.ObjectId
  plan: SubscriptionPlan
  status: SubscriptionStatus
  startDate: Date
  endDate: Date
  monthlyFee: number
  productLimit: number
  commissionRate: number
  features: string[]
  createdAt: Date
  updatedAt: Date
}

const PLAN_DEFAULTS: Record<SubscriptionPlan, { monthlyFee: number; productLimit: number; commissionRate: number; features: string[] }> = {
  free: { monthlyFee: 0, productLimit: 10, commissionRate: 15, features: ['basic_listing', 'standard_support'] },
  basic: { monthlyFee: 29, productLimit: 100, commissionRate: 12, features: ['basic_listing', 'analytics', 'standard_support'] },
  professional: { monthlyFee: 79, productLimit: 1000, commissionRate: 10, features: ['advanced_listing', 'analytics', 'priority_support', 'promotions'] },
  enterprise: { monthlyFee: 199, productLimit: -1, commissionRate: 8, features: ['unlimited_listing', 'advanced_analytics', 'dedicated_support', 'promotions', 'api_access'] },
}

export const getPlanDefaults = (plan: SubscriptionPlan) => PLAN_DEFAULTS[plan]

const subscriptionSchema = new mongoose.Schema<IVendorSubscriptionDocument>(
  {
    sellerId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true, index: true },
    plan: { type: String, enum: ['free', 'basic', 'professional', 'enterprise'], required: true },
    status: {
      type: String,
      enum: ['active', 'expired', 'cancelled', 'suspended'],
      default: 'active',
      index: true,
    },
    startDate: { type: Date, required: true },
    endDate: { type: Date, required: true, index: true },
    monthlyFee: { type: Number, required: true, min: 0 },
    productLimit: { type: Number, required: true },
    commissionRate: { type: Number, required: true, min: 0, max: 100 },
    features: { type: [String], default: [] },
  },
  {
    timestamps: true,
    toJSON: { transform: (_doc, ret: Record<string, unknown>) => { delete ret.__v; return ret } },
  },
)

subscriptionSchema.index({ sellerId: 1, status: 1 })

export const VendorSubscription = mongoose.model<IVendorSubscriptionDocument>(
  'VendorSubscription',
  subscriptionSchema,
)
