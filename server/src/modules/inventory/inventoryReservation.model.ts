import mongoose, { type Document, type Types } from 'mongoose'

export type ReservationStatus = 'ACTIVE' | 'CONFIRMED' | 'RELEASED' | 'EXPIRED' | 'CANCELLED'

export interface IInventoryReservationDocument extends Document {
  reservationId: string
  productId: Types.ObjectId
  warehouseId: Types.ObjectId
  quantity: number
  status: ReservationStatus
  expiresAt: Date
  referenceId?: string
  referenceType?: 'checkout' | 'order' | 'manual'
  userId?: Types.ObjectId
  createdAt: Date
  updatedAt: Date
}

const inventoryReservationSchema = new mongoose.Schema<IInventoryReservationDocument>(
  {
    reservationId: { type: String, required: true, unique: true, index: true },
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
    quantity: { type: Number, required: true, min: 1 },
    status: {
      type: String,
      enum: ['ACTIVE', 'CONFIRMED', 'RELEASED', 'EXPIRED', 'CANCELLED'],
      default: 'ACTIVE',
      index: true,
    },
    expiresAt: { type: Date, required: true, index: true },
    referenceId: { type: String, trim: true, index: true },
    referenceType: { type: String, enum: ['checkout', 'order', 'manual'], default: 'checkout' },
    userId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', index: true },
  },
  { timestamps: true },
)

inventoryReservationSchema.index({ status: 1, expiresAt: 1 })
inventoryReservationSchema.index({ productId: 1, warehouseId: 1, status: 1 })

export const InventoryReservation = mongoose.model<IInventoryReservationDocument>(
  'InventoryReservation',
  inventoryReservationSchema,
)
