import mongoose, { type Document, type Types } from 'mongoose'

export type MovementType =
  | 'in'
  | 'out'
  | 'transfer'
  | 'adjustment'
  | 'reservation'
  | 'release'
  | 'sold'
  | 'damaged'
  | 'returned'

export type AdjustmentReason =
  | 'STOCK_RECEIVED'
  | 'DAMAGED'
  | 'LOST'
  | 'COUNT_CORRECTION'
  | 'RETURNED'
  | 'TRANSFER'
  | 'OTHER'

export interface IInventoryMovementDocument extends Document {
  productId: Types.ObjectId
  warehouseId: Types.ObjectId
  toWarehouseId?: Types.ObjectId
  type: MovementType
  quantity: number
  previousAvailable?: number
  newAvailable?: number
  reason?: AdjustmentReason | string
  note?: string
  referenceId?: string
  createdBy: Types.ObjectId
  createdAt: Date
}

const movementSchema = new mongoose.Schema<IInventoryMovementDocument>(
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
    toWarehouseId: { type: mongoose.Schema.Types.ObjectId, ref: 'Warehouse' },
    type: {
      type: String,
      enum: [
        'in',
        'out',
        'transfer',
        'adjustment',
        'reservation',
        'release',
        'sold',
        'damaged',
        'returned',
      ],
      required: true,
    },
    quantity: { type: Number, required: true },
    previousAvailable: { type: Number },
    newAvailable: { type: Number },
    reason: { type: String, trim: true },
    note: { type: String, trim: true, maxlength: 500 },
    referenceId: { type: String, trim: true },
    createdBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  },
  { timestamps: { createdAt: true, updatedAt: false } },
)

movementSchema.index({ productId: 1, createdAt: -1 })
movementSchema.index({ warehouseId: 1, createdAt: -1 })
movementSchema.index({ referenceId: 1 })

export const InventoryMovement = mongoose.model<IInventoryMovementDocument>(
  'InventoryMovement',
  movementSchema,
)
