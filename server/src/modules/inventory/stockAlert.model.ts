import mongoose, { type Document, type Types } from 'mongoose'

export type AlertType = 'low_stock' | 'out_of_stock' | 'overstock'

export interface IStockAlertDocument extends Document {
  productId: Types.ObjectId
  warehouseId: Types.ObjectId
  alertType: AlertType
  threshold: number
  currentQuantity: number
  isResolved: boolean
  resolvedAt?: Date
  createdAt: Date
}

const alertSchema = new mongoose.Schema<IStockAlertDocument>(
  {
    productId: { type: mongoose.Schema.Types.ObjectId, ref: 'Product', required: true, index: true },
    warehouseId: { type: mongoose.Schema.Types.ObjectId, ref: 'Warehouse', required: true },
    alertType: { type: String, enum: ['low_stock', 'out_of_stock', 'overstock'], required: true },
    threshold: { type: Number, required: true },
    currentQuantity: { type: Number, required: true },
    isResolved: { type: Boolean, default: false, index: true },
    resolvedAt: { type: Date },
  },
  { timestamps: { createdAt: true, updatedAt: false } },
)

alertSchema.index({ isResolved: 1, createdAt: -1 })
alertSchema.index({ productId: 1, warehouseId: 1, alertType: 1, isResolved: 1 })

export const StockAlert = mongoose.model<IStockAlertDocument>('StockAlert', alertSchema)
