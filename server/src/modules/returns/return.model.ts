import mongoose, { type Document, type Types } from 'mongoose'
import { RETURN_REASONS, type ReturnReason } from '../../../../src/shared/constants/index.js'

export type ReturnStatus =
  | 'submitted'
  | 'under_review'
  | 'approved'
  | 'rejected'
  | 'awaiting_shipment'
  | 'in_transit'
  | 'received'
  | 'refunded'
  | 'completed'

export type ReturnType = 'return' | 'exchange' | 'refund_only'

export interface IReturnItem {
  productId: Types.ObjectId
  sku: string
  title: string
  quantity: number
  reason: ReturnReason
}

export interface IReturnEvidenceItem {
  url: string
  type: 'image' | 'document'
  description?: string
}

export interface IReturnDocument extends Document {
  orderId: Types.ObjectId
  userId: Types.ObjectId
  sellerId?: Types.ObjectId
  type: ReturnType
  items: IReturnItem[]
  reason: ReturnReason
  description?: string
  status: ReturnStatus
  refundAmount?: number
  evidence: IReturnEvidenceItem[]
  adminNotes?: string
  sellerResponse?: string
  returnTrackingNumber?: string
  resolvedAt?: Date
  createdAt: Date
  updatedAt: Date
}

const returnItemSchema = new mongoose.Schema<IReturnItem>(
  {
    productId: { type: mongoose.Schema.Types.ObjectId, ref: 'Product', required: true },
    sku: { type: String, required: true, trim: true },
    title: { type: String, required: true, trim: true },
    quantity: { type: Number, required: true, min: 1 },
    reason: { type: String, enum: RETURN_REASONS, required: true },
  },
  { _id: false },
)

const evidenceSchema = new mongoose.Schema<IReturnEvidenceItem>(
  {
    url: { type: String, required: true, trim: true },
    type: { type: String, enum: ['image', 'document'], required: true },
    description: { type: String, trim: true },
  },
  { _id: false },
)

const returnSchema = new mongoose.Schema<IReturnDocument>(
  {
    orderId: { type: mongoose.Schema.Types.ObjectId, ref: 'Order', required: true, index: true },
    userId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true, index: true },
    sellerId: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
    type: { type: String, enum: ['return', 'exchange', 'refund_only'], required: true },
    items: { type: [returnItemSchema], required: true },
    reason: { type: String, enum: RETURN_REASONS, required: true },
    description: { type: String, trim: true, maxlength: 1000 },
    status: {
      type: String,
      enum: [
        'submitted', 'under_review', 'approved', 'rejected',
        'awaiting_shipment', 'in_transit', 'received', 'refunded', 'completed',
      ],
      default: 'submitted',
      index: true,
    },
    refundAmount: { type: Number, min: 0 },
    evidence: { type: [evidenceSchema], default: [] },
    adminNotes: { type: String, trim: true, maxlength: 2000 },
    sellerResponse: { type: String, trim: true, maxlength: 2000 },
    returnTrackingNumber: { type: String, trim: true },
    resolvedAt: { type: Date },
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

returnSchema.index({ userId: 1, createdAt: -1 })
returnSchema.index({ status: 1, createdAt: -1 })

export const Return = mongoose.model<IReturnDocument>('Return', returnSchema)
