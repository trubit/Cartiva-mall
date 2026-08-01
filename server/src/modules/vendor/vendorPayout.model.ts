import mongoose, { Schema, type Document, type Types } from 'mongoose'

export type PayoutStatus = 'pending' | 'processing' | 'completed' | 'failed' | 'cancelled'
export type PayoutMethod = 'bank_transfer' | 'paypal' | 'stripe' | 'check'

export interface IVendorPayoutDocument extends Document {
  _id: Types.ObjectId
  vendorId: Types.ObjectId
  amount: number
  currency: string
  status: PayoutStatus
  method: PayoutMethod
  periodStart: Date
  periodEnd: Date
  commissionsIncluded: Types.ObjectId[]
  transactionId?: string
  failureReason?: string
  processedAt?: Date
  processedBy?: Types.ObjectId
  notes?: string
  createdAt: Date
  updatedAt: Date
}

const vendorPayoutSchema = new Schema<IVendorPayoutDocument>(
  {
    vendorId: { type: Schema.Types.ObjectId, ref: 'Vendor', required: true },
    amount: { type: Number, required: true, min: 0 },
    currency: { type: String, default: 'USD', maxlength: 10 },
    status: {
      type: String,
      enum: ['pending', 'processing', 'completed', 'failed', 'cancelled'],
      default: 'pending',
    },
    method: {
      type: String,
      enum: ['bank_transfer', 'paypal', 'stripe', 'check'],
      default: 'bank_transfer',
    },
    periodStart: { type: Date, required: true },
    periodEnd: { type: Date, required: true },
    commissionsIncluded: [{ type: Schema.Types.ObjectId, ref: 'Commission' }],
    transactionId: { type: String, maxlength: 200 },
    failureReason: { type: String, maxlength: 1000 },
    processedAt: { type: Date },
    processedBy: { type: Schema.Types.ObjectId, ref: 'User' },
    notes: { type: String, maxlength: 2000 },
  },
  { timestamps: true },
)

vendorPayoutSchema.index({ vendorId: 1, createdAt: -1 })
vendorPayoutSchema.index({ status: 1 })

export const VendorPayout = mongoose.model<IVendorPayoutDocument>('VendorPayout', vendorPayoutSchema)
