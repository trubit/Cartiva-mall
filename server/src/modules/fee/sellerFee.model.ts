import mongoose, { Schema, type Document, type Types } from 'mongoose'

export type SellerFeeStatus =
  | 'PENDING'
  | 'DUE'
  | 'PAID'
  | 'OVERDUE'
  | 'BLOCKED'
  | 'WAIVED'
  | 'CANCELLED'

export interface ISellerFeeAuditLog {
  event: string
  actorId?: Types.ObjectId | string
  actorRole?: string
  note?: string
  timestamp: Date
}

export interface ISellerFeeDocument extends Document {
  feeNumber: string
  sellerId: Types.ObjectId
  productId: Types.ObjectId
  orderId: Types.ObjectId
  orderNumber: string
  quantity: number

  // Base Economic Fee Metadata (Immutable)
  baseFeeAmount: number
  baseFeeCurrency: string
  feePerUnit: number
  totalFee: number
  currency: string

  // Historical Exchange Rate Snapshot (Immutable)
  exchangeRate: number
  exchangeRateTimestamp: Date
  exchangeRateSource: string

  paymentMethodType: 'paystack' | 'physical_bank_transfer'
  status: SellerFeeStatus

  dueAt: Date
  warningSentAt?: Date
  restrictedAt?: Date
  paidAt?: Date

  paymentReference?: string
  paymentProofUrl?: string

  adminVerification?: {
    verifiedBy?: Types.ObjectId
    verifiedAt?: Date
    notes?: string
  }

  auditLog: ISellerFeeAuditLog[]
  createdAt: Date
  updatedAt: Date
}

const sellerFeeAuditSchema = new Schema<ISellerFeeAuditLog>(
  {
    event: { type: String, required: true },
    actorId: { type: Schema.Types.ObjectId, ref: 'User' },
    actorRole: { type: String, default: 'system' },
    note: { type: String, maxlength: 1000 },
    timestamp: { type: Date, default: Date.now },
  },
  { _id: false },
)

const sellerFeeSchema = new Schema<ISellerFeeDocument>(
  {
    feeNumber: {
      type: String,
      required: true,
      unique: true,
      index: true,
      uppercase: true,
    },
    sellerId: { type: Schema.Types.ObjectId, ref: 'User', required: true, index: true },
    productId: { type: Schema.Types.ObjectId, ref: 'Product', required: true, index: true },
    orderId: { type: Schema.Types.ObjectId, ref: 'Order', required: true, index: true },
    orderNumber: { type: String, required: true, index: true },
    quantity: { type: Number, required: true, min: 1 },

    baseFeeAmount: { type: Number, required: true, default: 50 },
    baseFeeCurrency: { type: String, required: true, default: 'NGN', uppercase: true },
    feePerUnit: { type: Number, required: true, min: 0 },
    totalFee: { type: Number, required: true, min: 0 },
    currency: { type: String, required: true, uppercase: true },

    exchangeRate: { type: Number, required: true, default: 1.0 },
    exchangeRateTimestamp: { type: Date, required: true, default: Date.now },
    exchangeRateSource: { type: String, required: true, default: 'Cartiva Currency Engine' },

    paymentMethodType: {
      type: String,
      enum: ['paystack', 'physical_bank_transfer'],
      required: true,
    },
    status: {
      type: String,
      enum: ['PENDING', 'DUE', 'PAID', 'OVERDUE', 'BLOCKED', 'WAIVED', 'CANCELLED'],
      default: 'PENDING',
      index: true,
    },

    dueAt: { type: Date, required: true, index: true },
    warningSentAt: { type: Date },
    restrictedAt: { type: Date },
    paidAt: { type: Date },

    paymentReference: { type: String, trim: true, index: true },
    paymentProofUrl: { type: String, trim: true },

    adminVerification: {
      verifiedBy: { type: Schema.Types.ObjectId, ref: 'User' },
      verifiedAt: { type: Date },
      notes: { type: String, maxlength: 1000 },
    },

    auditLog: { type: [sellerFeeAuditSchema], default: [] },
  },
  { timestamps: true },
)

sellerFeeSchema.index({ sellerId: 1, status: 1, dueAt: 1 })
sellerFeeSchema.index({ orderId: 1, productId: 1 }, { unique: true })

export const SellerFee = mongoose.model<ISellerFeeDocument>('SellerFee', sellerFeeSchema)
