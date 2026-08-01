import mongoose, { type Document, type Types } from 'mongoose'

export type ShipmentStatus =
  | 'pending'
  | 'picked_up'
  | 'in_transit'
  | 'out_for_delivery'
  | 'delivered'
  | 'failed'
  | 'cancelled'

export interface IShipmentEvent {
  status: ShipmentStatus
  location?: string
  description: string
  timestamp: Date
}

export interface IShipmentDocument extends Document {
  orderId: Types.ObjectId
  userId: Types.ObjectId
  sellerId?: Types.ObjectId
  status: ShipmentStatus
  carrier: string
  trackingNumber: string
  trackingUrl?: string
  estimatedDelivery?: Date
  deliveredAt?: Date
  shippingCost: number
  weight?: number
  labelUrl?: string
  shippingAddress: {
    fullName: string
    phone: string
    street: string
    city: string
    state: string
    country: string
    postalCode: string
  }
  events: IShipmentEvent[]
  createdAt: Date
  updatedAt: Date
}

const shipmentEventSchema = new mongoose.Schema<IShipmentEvent>(
  {
    status: {
      type: String,
      enum: ['pending', 'picked_up', 'in_transit', 'out_for_delivery', 'delivered', 'failed', 'cancelled'],
      required: true,
    },
    location: { type: String, trim: true },
    description: { type: String, required: true, trim: true },
    timestamp: { type: Date, default: Date.now },
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

const shipmentSchema = new mongoose.Schema<IShipmentDocument>(
  {
    orderId: { type: mongoose.Schema.Types.ObjectId, ref: 'Order', required: true, index: true },
    userId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true, index: true },
    sellerId: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
    status: {
      type: String,
      enum: ['pending', 'picked_up', 'in_transit', 'out_for_delivery', 'delivered', 'failed', 'cancelled'],
      default: 'pending',
      index: true,
    },
    carrier: { type: String, required: true, trim: true },
    trackingNumber: { type: String, required: true, trim: true, unique: true },
    trackingUrl: { type: String, trim: true },
    estimatedDelivery: { type: Date },
    deliveredAt: { type: Date },
    shippingCost: { type: Number, required: true, min: 0, default: 0 },
    weight: { type: Number, min: 0 },
    labelUrl: { type: String, trim: true },
    shippingAddress: { type: addressSchema, required: true },
    events: { type: [shipmentEventSchema], default: [] },
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

shipmentSchema.index({ userId: 1, createdAt: -1 })
shipmentSchema.index({ sellerId: 1, createdAt: -1 })

export const Shipment = mongoose.model<IShipmentDocument>('Shipment', shipmentSchema)
