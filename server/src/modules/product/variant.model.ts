import mongoose, { type Document, type Types } from 'mongoose'

export interface IProductVariantDocument extends Document {
  variantId: string
  productId: Types.ObjectId
  sku: string
  title: string
  priceOverride?: number
  attributes: Record<string, string | number | boolean>
  images: string[]
  status: 'ACTIVE' | 'INACTIVE'
  createdAt: Date
  updatedAt: Date
}

const variantSchema = new mongoose.Schema<IProductVariantDocument>(
  {
    variantId: { type: String, required: true, unique: true, trim: true },
    productId: { type: mongoose.Schema.Types.ObjectId, ref: 'Product', required: true },
    sku: { type: String, required: true, unique: true, trim: true, uppercase: true },
    title: { type: String, required: true, trim: true },
    priceOverride: { type: Number, min: 0 },
    attributes: { type: Map, of: mongoose.Schema.Types.Mixed, default: {} },
    images: { type: [String], default: [] },
    status: { type: String, enum: ['ACTIVE', 'INACTIVE'], default: 'ACTIVE' },
  },
  {
    timestamps: true,
    toJSON: {
      virtuals: true,
      transform: (_doc, ret: Record<string, unknown>) => {
        delete ret.__v
        return ret
      },
    },
  },
)

variantSchema.index({ productId: 1, status: 1 })

export const ProductVariant = mongoose.model<IProductVariantDocument>(
  'ProductVariant',
  variantSchema,
)
