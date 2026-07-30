import mongoose, { type Document, type Types } from 'mongoose'

export interface ICartItemSubdoc {
  productId: Types.ObjectId
  quantity: number
  selectedVariant?: string
  selectedSize?: string
  selectedColor?: string
  itemPrice: number
}

export interface ICartDocument extends Document {
  userId: Types.ObjectId
  items: ICartItemSubdoc[]
  couponCode?: string
  discountAmount: number
  cartTotal: number
  shippingCost: number
  taxAmount: number
  grandTotal: number
  createdAt: Date
  updatedAt: Date
}

const cartItemSchema = new mongoose.Schema<ICartItemSubdoc>(
  {
    productId: { type: mongoose.Schema.Types.ObjectId, ref: 'Product', required: true },
    quantity: { type: Number, required: true, min: 1, default: 1 },
    selectedVariant: { type: String, trim: true },
    selectedSize: { type: String, trim: true },
    selectedColor: { type: String, trim: true },
    itemPrice: { type: Number, required: true, min: 0 },
  },
  { _id: false },
)

const cartSchema = new mongoose.Schema<ICartDocument>(
  {
    userId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true,
      unique: true,
    },
    items: { type: [cartItemSchema], default: [] },
    couponCode: { type: String, trim: true, uppercase: true },
    discountAmount: { type: Number, default: 0, min: 0 },
    cartTotal: { type: Number, default: 0, min: 0 },
    shippingCost: { type: Number, default: 0, min: 0 },
    taxAmount: { type: Number, default: 0, min: 0 },
    grandTotal: { type: Number, default: 0, min: 0 },
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

// TTL index: auto-delete carts abandoned for 30 days
cartSchema.index({ updatedAt: 1 }, { expireAfterSeconds: 30 * 24 * 60 * 60 })

export const Cart = mongoose.model<ICartDocument>('Cart', cartSchema)
