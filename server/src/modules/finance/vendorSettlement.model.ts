import mongoose, { Schema, type Document, type Types } from 'mongoose'
import type { SettlementStatus } from '../../../../src/shared/types/finance.types.js'

export interface IVendorSettlementDocument extends Document {
  vendorId: Types.ObjectId
  vendorName: string
  periodStart: Date
  periodEnd: Date
  grossRevenue: number
  commissionAmount: number
  taxWithheld: number
  refundsDeducted: number
  netPayable: number
  status: SettlementStatus
  reference?: string
  invoiceId?: Types.ObjectId
  processedAt?: Date
  createdAt: Date
  updatedAt: Date
}

const vendorSettlementSchema = new Schema<IVendorSettlementDocument>(
  {
    vendorId: { type: Schema.Types.ObjectId, ref: 'Vendor', required: true },
    vendorName: { type: String, required: true, maxlength: 200 },
    periodStart: { type: Date, required: true },
    periodEnd: { type: Date, required: true },
    grossRevenue: { type: Number, required: true, min: 0 },
    commissionAmount: { type: Number, required: true, min: 0 },
    taxWithheld: { type: Number, default: 0, min: 0 },
    refundsDeducted: { type: Number, default: 0, min: 0 },
    netPayable: { type: Number, required: true, min: 0 },
    status: {
      type: String,
      enum: ['pending', 'processing', 'completed', 'failed', 'cancelled'],
      default: 'pending',
    },
    reference: { type: String, maxlength: 200 },
    invoiceId: { type: Schema.Types.ObjectId, ref: 'Invoice' },
    processedAt: { type: Date },
  },
  { timestamps: true },
)

vendorSettlementSchema.index({ vendorId: 1 })
vendorSettlementSchema.index({ status: 1 })
vendorSettlementSchema.index({ periodStart: 1, periodEnd: 1 })
vendorSettlementSchema.index({ createdAt: -1 })

export const VendorSettlement = mongoose.model<IVendorSettlementDocument>(
  'VendorSettlement',
  vendorSettlementSchema,
)
