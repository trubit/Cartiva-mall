import mongoose, { type Document, type Types } from 'mongoose'
import type { ProductCategory } from '../../../../src/shared/constants/index.js'

export interface IProductDocument extends Document {
  title: string
  description: string
  price: number
  discountPrice?: number
  images: string[]
  category: ProductCategory
  subCategory?: string
  brand?: string
  stockQuantity: number
  sku: string
  ratingsAverage: number
  ratingsCount: number
  sellerId: Types.ObjectId
  tags: string[]
  isActive: boolean
  status: 'pending' | 'active' | 'blocked'
  isFeatured: boolean
  views: number
  createdAt: Date
  updatedAt: Date
  discountPercent?: number
}

const productSchema = new mongoose.Schema<IProductDocument>(
  {
    title: { type: String, required: true, trim: true, maxlength: 200 },
    description: { type: String, required: true, trim: true, maxlength: 5000 },
    price: { type: Number, required: true, min: 0 },
    discountPrice: { type: Number, min: 0 },
    images: { type: [String], default: [] },
    category: {
      type: String,
      required: true,
      enum: [
        'Electronics',
        'Clothing & Fashion',
        'Home & Garden',
        'Sports & Outdoors',
        'Books & Media',
        'Health & Beauty',
        'Toys & Games',
        'Automotive',
        'Food & Grocery',
        'Jewelry & Accessories',
      ],
    },
    subCategory: { type: String, trim: true },
    brand: { type: String, trim: true },
    stockQuantity: { type: Number, required: true, min: 0, default: 0 },
    sku: { type: String, required: true, unique: true, trim: true, uppercase: true },
    ratingsAverage: {
      type: Number,
      default: 0,
      min: 0,
      max: 5,
      set: (v: number) => Math.round(v * 10) / 10,
    },
    ratingsCount: { type: Number, default: 0, min: 0 },
    sellerId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
    tags: { type: [String], default: [] },
    isActive: { type: Boolean, default: true },
    status: { type: String, enum: ['pending', 'active', 'blocked'], default: 'pending' },
    isFeatured: { type: Boolean, default: false },
    views: { type: Number, default: 0 },
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
    toObject: { virtuals: true },
  },
)

productSchema.virtual('discountPercent').get(function () {
  if (!this.discountPrice || this.discountPrice >= this.price) return 0
  return Math.round(((this.price - this.discountPrice) / this.price) * 100)
})

productSchema.index({ title: 'text', description: 'text', brand: 'text', tags: 'text' })
productSchema.index({ category: 1, status: 1 })
productSchema.index({ price: 1 })
productSchema.index({ discountPrice: 1 })
productSchema.index({ ratingsAverage: -1 })
productSchema.index({ createdAt: -1 })
productSchema.index({ isActive: 1, status: 1 })
productSchema.index({ isFeatured: 1, status: 1 })
productSchema.index({ sellerId: 1, status: 1 })
productSchema.index({ views: -1 }) // supports sort=popular without full collection scan
productSchema.index({ brand: 1 }) // supports brand equality filter after lowercasing

export const Product = mongoose.model<IProductDocument>('Product', productSchema)
