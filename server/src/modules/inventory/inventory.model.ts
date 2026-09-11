import mongoose, { type Document, type Types } from 'mongoose'

export interface IInventoryDocument extends Document {
  productId: Types.ObjectId
  warehouseId: Types.ObjectId
  quantity: number // Physical on-hand quantity
  availableQuantity: number
  reservedQuantity: number
  soldQuantity: number
  damagedQuantity: number
  lowStockThreshold: number
  version: number
  createdAt: Date
  updatedAt: Date
}

const inventorySchema = new mongoose.Schema<IInventoryDocument>(
  {
    productId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Product',
      required: true,
      index: true,
    },
    warehouseId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Warehouse',
      required: true,
      index: true,
    },
    quantity: { type: Number, required: true, default: 0, min: 0 },
    availableQuantity: { type: Number, required: true, default: 0, min: 0 },
    reservedQuantity: { type: Number, default: 0, min: 0 },
    soldQuantity: { type: Number, default: 0, min: 0 },
    damagedQuantity: { type: Number, default: 0, min: 0 },
    lowStockThreshold: { type: Number, default: 10, min: 0 },
    version: { type: Number, default: 1 },
  },
  { timestamps: true },
)

inventorySchema.index({ productId: 1, warehouseId: 1 }, { unique: true })

export const Inventory = mongoose.model<IInventoryDocument>('Inventory', inventorySchema)
