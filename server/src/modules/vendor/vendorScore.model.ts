import mongoose, { Schema, type Document, type Types } from 'mongoose'

export interface IVendorScoreDocument extends Document {
  _id: Types.ObjectId
  vendorId: Types.ObjectId
  overallScore: number
  fulfillmentRate: number
  returnRate: number
  avgResponseHours: number
  productQualityScore: number
  customerSatisfactionScore: number
  totalOrders: number
  period: Date
  createdAt: Date
  updatedAt: Date
}

const vendorScoreSchema = new Schema<IVendorScoreDocument>(
  {
    vendorId: { type: Schema.Types.ObjectId, ref: 'Vendor', required: true },
    overallScore: { type: Number, default: 0, min: 0, max: 100 },
    fulfillmentRate: { type: Number, default: 0, min: 0, max: 100 },
    returnRate: { type: Number, default: 0, min: 0, max: 100 },
    avgResponseHours: { type: Number, default: 0, min: 0 },
    productQualityScore: { type: Number, default: 0, min: 0, max: 5 },
    customerSatisfactionScore: { type: Number, default: 0, min: 0, max: 5 },
    totalOrders: { type: Number, default: 0, min: 0 },
    period: { type: Date, required: true },
  },
  { timestamps: true },
)

vendorScoreSchema.index({ vendorId: 1, period: -1 })

export const VendorScore = mongoose.model<IVendorScoreDocument>('VendorScore', vendorScoreSchema)
