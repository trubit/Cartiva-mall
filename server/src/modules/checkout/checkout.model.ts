import mongoose, { type Document, type Types } from 'mongoose'
import type { ShippingMethod, CheckoutStatus } from '../../../../src/shared/types/checkout.types.js'

export interface ICheckoutAddressDoc {
  fullName: string
  phone: string
  country: string
  state: string
  city: string
  street: string
  postalCode: string
}

export interface ICheckoutItemDoc {
  productId: Types.ObjectId
  title: string
  image?: string
  sku: string
  quantity: number
  itemPrice: number
  lineTotal: number
}

export interface ICheckoutPricingDoc {
  subtotal: number
  discountAmount: number
  shippingFee: number
  taxAmount: number
  grandTotal: number
}

export interface ICheckoutDocument extends Document {
  userId: Types.ObjectId
  items: ICheckoutItemDoc[]
  shippingAddress: ICheckoutAddressDoc | null
  billingAddress: ICheckoutAddressDoc | null
  sameAsShipping: boolean
  shippingMethod: ShippingMethod
  couponCode?: string
  pricing: ICheckoutPricingDoc
  status: CheckoutStatus
  expiresAt: Date
  createdAt: Date
  updatedAt: Date
}

const addressSchema = new mongoose.Schema<ICheckoutAddressDoc>(
  {
    fullName: { type: String, required: true, trim: true },
    phone: { type: String, required: true, trim: true },
    country: { type: String, required: true, trim: true },
    state: { type: String, required: true, trim: true },
    city: { type: String, required: true, trim: true },
    street: { type: String, required: true, trim: true },
    postalCode: { type: String, required: true, trim: true },
  },
  { _id: false },
)

const itemSchema = new mongoose.Schema<ICheckoutItemDoc>(
  {
    productId: { type: mongoose.Schema.Types.ObjectId, ref: 'Product', required: true },
    title: { type: String, required: true },
    image: { type: String },
    sku: { type: String, required: true },
    quantity: { type: Number, required: true, min: 1 },
    itemPrice: { type: Number, required: true, min: 0 },
    lineTotal: { type: Number, required: true, min: 0 },
  },
  { _id: false },
)

const pricingSchema = new mongoose.Schema<ICheckoutPricingDoc>(
  {
    subtotal: { type: Number, default: 0, min: 0 },
    discountAmount: { type: Number, default: 0, min: 0 },
    shippingFee: { type: Number, default: 0, min: 0 },
    taxAmount: { type: Number, default: 0, min: 0 },
    grandTotal: { type: Number, default: 0, min: 0 },
  },
  { _id: false },
)

const checkoutSchema = new mongoose.Schema<ICheckoutDocument>(
  {
    userId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true, index: true },
    items: { type: [itemSchema], default: [] },
    shippingAddress: { type: addressSchema, default: null },
    billingAddress: { type: addressSchema, default: null },
    sameAsShipping: { type: Boolean, default: true },
    shippingMethod: { type: String, enum: ['standard', 'express', 'sameDay'], default: 'standard' },
    couponCode: { type: String, trim: true, uppercase: true },
    pricing: { type: pricingSchema, default: () => ({}) },
    status: {
      type: String,
      enum: ['pending', 'completed', 'abandoned', 'cancelled'],
      default: 'pending',
      index: true,
    },
    expiresAt: { type: Date, required: true, index: { expireAfterSeconds: 0 } },
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

checkoutSchema.index({ userId: 1, status: 1, expiresAt: 1 })

export const Checkout = mongoose.model<ICheckoutDocument>('Checkout', checkoutSchema)
