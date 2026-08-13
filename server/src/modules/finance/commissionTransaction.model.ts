import mongoose, { Schema, type Document, type Types } from 'mongoose'

export interface ICommissionTransactionDocument extends Document {
  vendorId: Types.ObjectId
  orderId: Types.ObjectId
  orderTotal: number
  commissionRate: number
  commissionAmount: number
  taxOnCommission: number
  netCommission: number
  settlementId?: Types.ObjectId
  createdAt: Date
  updatedAt: Date
}

const commissionTransactionSchema = new Schema<ICommissionTransactionDocument>(
  {
    vendorId: { type: Schema.Types.ObjectId, ref: 'Vendor', required: true },
    orderId: { type: Schema.Types.ObjectId, ref: 'Order', required: true },
    orderTotal: { type: Number, required: true, min: 0 },
    commissionRate: { type: Number, required: true, min: 0, max: 100 },
    commissionAmount: { type: Number, required: true, min: 0 },
    taxOnCommission: { type: Number, default: 0, min: 0 },
    netCommission: { type: Number, required: true, min: 0 },
    settlementId: { type: Schema.Types.ObjectId, ref: 'VendorSettlement' },
  },
  { timestamps: true },
)

commissionTransactionSchema.index({ vendorId: 1 })
commissionTransactionSchema.index({ orderId: 1 })
commissionTransactionSchema.index({ settlementId: 1 })
commissionTransactionSchema.index({ createdAt: -1 })

export const CommissionTransaction = mongoose.model<ICommissionTransactionDocument>(
  'CommissionTransaction',
  commissionTransactionSchema,
)
