import mongoose, { type Document, type Types } from 'mongoose'

export type CartStatus = 'ACTIVE' | 'CHECKOUT_PENDING' | 'CONVERTED' | 'ABANDONED' | 'EXPIRED'

export interface ICartItemSubdoc {
  productId: Types.ObjectId
  variantId?: string
  sku?: string
  quantity: number
  selectedVariant?: string
  selectedSize?: string
  selectedColor?: string
  itemPrice: number
}

export interface ICartDocument extends Document {
  userId?: Types.ObjectId
  sessionId?: string
  status: CartStatus
  items: ICartItemSubdoc[]
  couponCode?: string
  discountAmount: number
  cartTotal: number
  shippingCost: number
  taxAmount: number
  grandTotal: number
  currency: string
  expiresAt?: Date
  createdAt: Date
  updatedAt: Date
}

const cartItemSchema = new mongoose.Schema<ICartItemSubdoc>(
  {
    productId: { type: mongoose.Schema.Types.ObjectId, ref: 'Product', required: true },
    variantId: { type: String, trim: true },
    sku: { type: String, trim: true, uppercase: true },
    quantity: { type: Number, required: true, min: 1, default: 1 },
    selectedVariant: { type: String, trim: true },
    selectedSize: { type: String, trim: true },
    selectedColor: { type: String, trim: true },
    itemPrice: { type: Number, required: true, min: 0 },
  },
  { _id: true },
)

const cartSchema = new mongoose.Schema<ICartDocument>(
  {
    userId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      index: true,
      sparse: true,
    },
    sessionId: {
      type: String,
      trim: true,
      index: true,
      sparse: true,
    },
    status: {
      type: String,
      enum: ['ACTIVE', 'CHECKOUT_PENDING', 'CONVERTED', 'ABANDONED', 'EXPIRED'],
      default: 'ACTIVE',
    },
    items: { type: [cartItemSchema], default: [] },
    couponCode: { type: String, trim: true, uppercase: true },
    discountAmount: { type: Number, default: 0, min: 0 },
    cartTotal: { type: Number, default: 0, min: 0 },
    shippingCost: { type: Number, default: 0, min: 0 },
    taxAmount: { type: Number, default: 0, min: 0 },
    grandTotal: { type: Number, default: 0, min: 0 },
    currency: { type: String, default: 'USD' },
    expiresAt: { type: Date },
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

cartSchema.index({ userId: 1, status: 1 })
cartSchema.index({ sessionId: 1, status: 1 })
cartSchema.index({ updatedAt: 1 }, { expireAfterSeconds: 30 * 24 * 60 * 60 })

export const Cart = mongoose.model<ICartDocument>('Cart', cartSchema)
