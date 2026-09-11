import mongoose, { type Document, type Types } from 'mongoose'

export interface ISearchIndexDocument extends Document {
  productId: Types.ObjectId
  title: string
  description: string
  brand?: string
  category: string
  sellerId: Types.ObjectId
  price: number
  ratingsAverage: number
  ratingsCount: number
  stockQuantity: number
  isAvailable: boolean
  tags: string[]
  keywords: string[]
  popularityScore: number
  version: number
  updatedAt: Date
  createdAt: Date
}

const searchIndexSchema = new mongoose.Schema<ISearchIndexDocument>(
  {
    productId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Product',
      required: true,
      unique: true,
      index: true,
    },
    title: { type: String, required: true, trim: true },
    description: { type: String, required: true, trim: true },
    brand: { type: String, trim: true, index: true },
    category: { type: String, required: true, index: true },
    sellerId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true, index: true },
    price: { type: Number, required: true, min: 0, index: true },
    ratingsAverage: { type: Number, default: 0, min: 0, max: 5, index: true },
    ratingsCount: { type: Number, default: 0, min: 0 },
    stockQuantity: { type: Number, default: 0, min: 0 },
    isAvailable: { type: Boolean, default: true, index: true },
    tags: { type: [String], default: [], index: true },
    keywords: { type: [String], default: [] },
    popularityScore: { type: Number, default: 0, index: -1 },
    version: { type: Number, default: 1 },
  },
  { timestamps: true },
)

searchIndexSchema.index({ title: 'text', description: 'text', brand: 'text', tags: 'text' })
searchIndexSchema.index({ category: 1, price: 1, ratingsAverage: -1 })
searchIndexSchema.index({ isAvailable: 1, popularityScore: -1 })

export const ProductSearchIndex = mongoose.model<ISearchIndexDocument>(
  'ProductSearchIndex',
  searchIndexSchema,
)
