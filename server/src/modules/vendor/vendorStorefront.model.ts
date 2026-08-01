import mongoose, { Schema, type Document, type Types } from 'mongoose'

export interface IVendorStorefrontDocument extends Document {
  _id: Types.ObjectId
  vendorId: Types.ObjectId
  name: string
  slug: string
  description?: string
  logo?: string
  banner?: string
  policies?: {
    returns?: string
    shipping?: string
    payment?: string
  }
  theme?: {
    primaryColor?: string
    secondaryColor?: string
  }
  isPublic: boolean
  totalProducts: number
  totalSales: number
  createdAt: Date
  updatedAt: Date
}

const vendorStorefrontSchema = new Schema<IVendorStorefrontDocument>(
  {
    vendorId: { type: Schema.Types.ObjectId, ref: 'Vendor', required: true, unique: true },
    name: { type: String, required: true, trim: true, maxlength: 200 },
    slug: { type: String, required: true, unique: true, lowercase: true, trim: true, maxlength: 100 },
    description: { type: String, maxlength: 3000 },
    logo: { type: String, maxlength: 500 },
    banner: { type: String, maxlength: 500 },
    policies: {
      returns: { type: String, maxlength: 2000 },
      shipping: { type: String, maxlength: 2000 },
      payment: { type: String, maxlength: 2000 },
    },
    theme: {
      primaryColor: { type: String, maxlength: 20 },
      secondaryColor: { type: String, maxlength: 20 },
    },
    isPublic: { type: Boolean, default: false },
    totalProducts: { type: Number, default: 0 },
    totalSales: { type: Number, default: 0 },
  },
  { timestamps: true },
)


export const VendorStorefront = mongoose.model<IVendorStorefrontDocument>(
  'VendorStorefront',
  vendorStorefrontSchema,
)
