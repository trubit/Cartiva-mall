import mongoose, { Schema, type Document, type Types } from 'mongoose'

export type CommissionType = 'FLAT_PER_UNIT' | 'PERCENTAGE' | 'HYBRID'

export const MARKETPLACE_POLICY_SINGLETON_KEY = 'AUTHORITATIVE_MARKETPLACE_COMMISSION_POLICY'

export interface ICommissionAuditEntry {
  modifiedBy: Types.ObjectId | string
  modifierEmail?: string
  previousState?: Record<string, any>
  newState?: Record<string, any>
  reason?: string
  timestamp: Date
}

export interface IMarketplaceCommissionPolicyDocument extends Document {
  policyKey?: string
  baseSellerFee: number
  baseCurrency: string
  commissionType: CommissionType
  percentageRate: number
  currencyRates: Record<string, number>
  baseUsdRate: number
  isActive: boolean
  version: number
  lastModifiedBy?: Types.ObjectId | string
  auditTrail: ICommissionAuditEntry[]
  createdAt: Date
  updatedAt: Date
}

const commissionAuditSchema = new Schema<ICommissionAuditEntry>(
  {
    modifiedBy: { type: Schema.Types.ObjectId, ref: 'User', required: true },
    modifierEmail: { type: String },
    previousState: { type: Schema.Types.Mixed },
    newState: { type: Schema.Types.Mixed },
    reason: { type: String, trim: true, maxlength: 500 },
    timestamp: { type: Date, default: Date.now },
  },
  { _id: false },
)

const marketplaceCommissionPolicySchema = new Schema<IMarketplaceCommissionPolicyDocument>(
  {
    policyKey: {
      type: String,
      default: MARKETPLACE_POLICY_SINGLETON_KEY,
      index: true,
    },
    baseSellerFee: {
      type: Number,
      required: true,
      min: [0, 'Base seller fee cannot be negative'],
      default: 200,
    },
    baseCurrency: {
      type: String,
      required: true,
      uppercase: true,
      default: 'NGN',
    },
    commissionType: {
      type: String,
      enum: ['FLAT_PER_UNIT', 'PERCENTAGE', 'HYBRID'],
      default: 'FLAT_PER_UNIT',
    },
    percentageRate: {
      type: Number,
      min: [0, 'Percentage rate cannot be negative'],
      max: [100, 'Percentage rate cannot exceed 100%'],
      default: 0,
    },
    currencyRates: {
      type: Schema.Types.Mixed,
      default: () => ({
        NGN: 200.0,
        USD: 0.15,
        EUR: 0.14,
        GBP: 0.12,
        CAD: 0.2,
        AUD: 0.23,
        JPY: 23.0,
        CNY: 1.08,
        GHS: 2.3,
        ZAR: 2.75,
        KES: 19.5,
      }),
    },
    baseUsdRate: {
      type: Number,
      required: true,
      min: [0, 'Base USD rate cannot be negative'],
      default: 0.15,
    },
    isActive: {
      type: Boolean,
      default: true,
      index: true,
    },
    version: {
      type: Number,
      default: 1,
    },
    lastModifiedBy: {
      type: Schema.Types.ObjectId,
      ref: 'User',
    },
    auditTrail: {
      type: [commissionAuditSchema],
      default: [],
    },
  },
  {
    timestamps: true,
    collection: 'marketplace_commission_policies',
  },
)

export const MarketplaceCommissionPolicy = mongoose.model<IMarketplaceCommissionPolicyDocument>(
  'MarketplaceCommissionPolicy',
  marketplaceCommissionPolicySchema,
)
