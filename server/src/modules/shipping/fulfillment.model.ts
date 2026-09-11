import mongoose, { type Document, type Types } from 'mongoose'

export type FulfillmentStatus =
  | 'PENDING'
  | 'READY'
  | 'PROCESSING'
  | 'PACKED'
  | 'SHIPPED'
  | 'DELIVERED'
  | 'CANCELLED'
  | 'FAILED'
  | 'RETURNED'

export interface IFulfillmentItem {
  productId: Types.ObjectId
  title: string
  sku?: string
  quantity: number
}

export interface IFulfillmentDocument extends Document {
  fulfillmentId: string
  orderId: Types.ObjectId
  userId: Types.ObjectId
  sellerId?: Types.ObjectId
  warehouseId?: Types.ObjectId
  status: FulfillmentStatus
  items: IFulfillmentItem[]
  shippingAddress: {
    fullName: string
    phone: string
    street: string
    city: string
    state: string
    country: string
    postalCode: string
  }
  notes?: string
  createdAt: Date
  updatedAt: Date
}

const fulfillmentItemSchema = new mongoose.Schema<IFulfillmentItem>(
  {
    productId: { type: mongoose.Schema.Types.ObjectId, ref: 'Product', required: true },
    title: { type: String, required: true },
    sku: { type: String },
    quantity: { type: Number, required: true, min: 1 },
  },
  { _id: false },
)

const addressSchema = new mongoose.Schema(
  {
    fullName: { type: String, required: true, trim: true },
    phone: { type: String, required: true, trim: true },
    street: { type: String, required: true, trim: true },
    city: { type: String, required: true, trim: true },
    state: { type: String, required: true, trim: true },
    country: { type: String, required: true, trim: true },
    postalCode: { type: String, required: true, trim: true },
  },
  { _id: false },
)

const fulfillmentSchema = new mongoose.Schema<IFulfillmentDocument>(
  {
    fulfillmentId: { type: String, required: true, unique: true, index: true },
    orderId: { type: mongoose.Schema.Types.ObjectId, ref: 'Order', required: true, index: true },
    userId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true, index: true },
    sellerId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', index: true },
    warehouseId: { type: mongoose.Schema.Types.ObjectId, ref: 'Warehouse', index: true },
    status: {
      type: String,
      enum: [
        'PENDING',
        'READY',
        'PROCESSING',
        'PACKED',
        'SHIPPED',
        'DELIVERED',
        'CANCELLED',
        'FAILED',
        'RETURNED',
      ],
      default: 'PENDING',
      index: true,
    },
    items: { type: [fulfillmentItemSchema], required: true },
    shippingAddress: { type: addressSchema, required: true },
    notes: { type: String, trim: true },
  },
  { timestamps: true },
)

fulfillmentSchema.index({ orderId: 1, sellerId: 1 })

export const Fulfillment = mongoose.model<IFulfillmentDocument>('Fulfillment', fulfillmentSchema)
