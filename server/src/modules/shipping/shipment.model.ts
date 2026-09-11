import mongoose, { type Document, type Types } from 'mongoose'

export type ShipmentStatus =
  | 'CREATED'
  | 'LABEL_CREATED'
  | 'READY_FOR_PICKUP'
  | 'PICKED_UP'
  | 'IN_TRANSIT'
  | 'OUT_FOR_DELIVERY'
  | 'DELIVERED'
  | 'DELIVERY_FAILED'
  | 'RETURNING'
  | 'RETURNED'
  | 'CANCELLED'

export interface IShipmentEvent {
  status: ShipmentStatus
  location?: string
  description: string
  timestamp: Date
}

export interface IShipmentDocument extends Document {
  shipmentId: string
  fulfillmentId?: Types.ObjectId
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
      enum: [
        'CREATED',
        'LABEL_CREATED',
        'READY_FOR_PICKUP',
        'PICKED_UP',
        'IN_TRANSIT',
        'OUT_FOR_DELIVERY',
        'DELIVERED',
        'DELIVERY_FAILED',
        'RETURNING',
        'RETURNED',
        'CANCELLED',
      ],
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
    shipmentId: { type: String, required: true, unique: true, index: true },
    fulfillmentId: { type: mongoose.Schema.Types.ObjectId, ref: 'Fulfillment', index: true },
    orderId: { type: mongoose.Schema.Types.ObjectId, ref: 'Order', required: true, index: true },
    userId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true, index: true },
    sellerId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', index: true },
    status: {
      type: String,
      enum: [
        'CREATED',
        'LABEL_CREATED',
        'READY_FOR_PICKUP',
        'PICKED_UP',
        'IN_TRANSIT',
        'OUT_FOR_DELIVERY',
        'DELIVERED',
        'DELIVERY_FAILED',
        'RETURNING',
        'RETURNED',
        'CANCELLED',
      ],
      default: 'CREATED',
      index: true,
    },
    carrier: { type: String, required: true, trim: true },
    trackingNumber: { type: String, required: true, trim: true, unique: true, index: true },
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
