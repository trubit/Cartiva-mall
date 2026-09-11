import mongoose, { type Document, type Types } from 'mongoose'
import type { ProductCategory } from '../../../../src/shared/constants/index.js'

export type ProductLifecycleStatus =
  | 'DRAFT'
  | 'PENDING_REVIEW'
  | 'APPROVED'
  | 'PUBLISHED'
  | 'REJECTED'
  | 'SUSPENDED'
  | 'ARCHIVED'
  | 'pending'
  | 'active'
  | 'blocked'

export type ProductVisibility = 'PUBLIC' | 'PRIVATE' | 'UNLISTED' | 'ARCHIVED'

export interface IProductDocument extends Document {
  title: string
  description: string
  shortDescription?: string
  price: number
  discountPrice?: number
  images: string[]
  category: ProductCategory
  categoryId?: Types.ObjectId
  subCategory?: string
  subcategoryId?: Types.ObjectId
  brand?: string
  brandId?: Types.ObjectId
  stockQuantity: number
  soldCount: number
  sku: string
  ratingsAverage: number
  ratingsCount: number
  sellerId: Types.ObjectId
  tags: string[]
  isActive: boolean
  status: ProductLifecycleStatus
  visibility: ProductVisibility
  isFeatured: boolean
  views: number
  slug?: string
  metaTitle?: string
  metaDescription?: string
  searchKeywords?: string[]
  attributes?: Record<string, unknown>
  createdAt: Date
  updatedAt: Date
  publishedAt?: Date
  archivedAt?: Date
  discountPercent?: number
}

const productSchema = new mongoose.Schema<IProductDocument>(
  {
    title: { type: String, required: true, trim: true, maxlength: 200 },
    description: { type: String, required: true, trim: true, maxlength: 5000 },
    shortDescription: { type: String, trim: true, maxlength: 500 },
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
    categoryId: { type: mongoose.Schema.Types.ObjectId, ref: 'Category' },
    subCategory: { type: String, trim: true },
    subcategoryId: { type: mongoose.Schema.Types.ObjectId, ref: 'Category' },
    brand: { type: String, trim: true },
    brandId: { type: mongoose.Schema.Types.ObjectId, ref: 'Brand' },
    stockQuantity: { type: Number, required: true, min: 0, default: 0 },
    soldCount: { type: Number, default: 0, min: 0 },
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
    status: {
      type: String,
      enum: [
        'DRAFT',
        'PENDING_REVIEW',
        'APPROVED',
        'PUBLISHED',
        'REJECTED',
        'SUSPENDED',
        'ARCHIVED',
        'pending',
        'active',
        'blocked',
      ],
      default: 'PUBLISHED',
    },
    visibility: {
      type: String,
      enum: ['PUBLIC', 'PRIVATE', 'UNLISTED', 'ARCHIVED'],
      default: 'PUBLIC',
    },
    isFeatured: { type: Boolean, default: false },
    views: { type: Number, default: 0 },
    slug: { type: String, trim: true, lowercase: true },
    metaTitle: { type: String, trim: true },
    metaDescription: { type: String, trim: true },
    searchKeywords: { type: [String], default: [] },
    attributes: { type: Map, of: mongoose.Schema.Types.Mixed, default: {} },
    publishedAt: { type: Date },
    archivedAt: { type: Date },
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
productSchema.index({ views: -1 })
productSchema.index({ brand: 1 })
productSchema.index({ slug: 1 })
productSchema.index({ visibility: 1 })

export const Product = mongoose.model<IProductDocument>('Product', productSchema)
