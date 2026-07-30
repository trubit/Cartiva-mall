import mongoose, { type Document } from 'mongoose'

export interface ISellerProfileDocument extends Document {
  userId: mongoose.Types.ObjectId
  storeName: string
  storeLogo: string
  storeLogoPublicId?: string
  storeDescription: string
  storeAddress: {
    country?: string
    state?: string
    city?: string
    street?: string
    postalCode?: string
  }
  isVerified: boolean
  totalSales: number
  totalEarnings: number
  rating: number
  createdAt: Date
  updatedAt: Date
}

const storeAddressSchema = new mongoose.Schema(
  {
    country: { type: String, trim: true, default: '' },
    state: { type: String, trim: true, default: '' },
    city: { type: String, trim: true, default: '' },
    street: { type: String, trim: true, default: '' },
    postalCode: { type: String, trim: true, default: '' },
  },
  { _id: false },
)

const sellerProfileSchema = new mongoose.Schema<ISellerProfileDocument>(
  {
    userId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true,
      unique: true,
      index: true,
    },
    storeName: { type: String, required: true, trim: true, maxlength: 100 },
    storeLogo: { type: String, default: '' },
    storeLogoPublicId: { type: String, select: false },
    storeDescription: { type: String, trim: true, maxlength: 1000, default: '' },
    storeAddress: { type: storeAddressSchema, default: () => ({}) },
    isVerified: { type: Boolean, default: false },
    totalSales: { type: Number, default: 0 },
    totalEarnings: { type: Number, default: 0 },
    rating: { type: Number, default: 0, min: 0, max: 5 },
  },
  { timestamps: true },
)

// Text index for admin listSellers storeName search
sellerProfileSchema.index({ storeName: 'text', storeDescription: 'text' })

export const SellerProfile = mongoose.model<ISellerProfileDocument>(
  'SellerProfile',
  sellerProfileSchema,
)
