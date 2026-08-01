import mongoose, { Schema, type Document, type Types } from 'mongoose'

export interface IVendorProfileDocument extends Document {
  _id: Types.ObjectId
  vendorId: Types.ObjectId
  displayName: string
  bio?: string
  website?: string
  phone?: string
  address?: {
    street?: string
    city?: string
    state?: string
    country?: string
    postalCode?: string
  }
  socialLinks?: {
    twitter?: string
    instagram?: string
    facebook?: string
    linkedin?: string
  }
  taxId?: string
  bankDetails?: {
    bankName: string
    accountNumber: string
    routingNumber?: string
    accountHolderName: string
    country: string
  }
  createdAt: Date
  updatedAt: Date
}

const vendorProfileSchema = new Schema<IVendorProfileDocument>(
  {
    vendorId: { type: Schema.Types.ObjectId, ref: 'Vendor', required: true, unique: true },
    displayName: { type: String, required: true, trim: true, maxlength: 200 },
    bio: { type: String, maxlength: 2000 },
    website: { type: String, maxlength: 500 },
    phone: { type: String, maxlength: 30 },
    address: {
      street: { type: String, maxlength: 300 },
      city: { type: String, maxlength: 100 },
      state: { type: String, maxlength: 100 },
      country: { type: String, maxlength: 100 },
      postalCode: { type: String, maxlength: 20 },
    },
    socialLinks: {
      twitter: { type: String, maxlength: 300 },
      instagram: { type: String, maxlength: 300 },
      facebook: { type: String, maxlength: 300 },
      linkedin: { type: String, maxlength: 300 },
    },
    taxId: { type: String, maxlength: 100, select: false },
    bankDetails: {
      bankName: { type: String, maxlength: 200 },
      accountNumber: { type: String, maxlength: 50, select: false },
      routingNumber: { type: String, maxlength: 50, select: false },
      accountHolderName: { type: String, maxlength: 200 },
      country: { type: String, maxlength: 100 },
    },
  },
  { timestamps: true },
)

export const VendorProfile = mongoose.model<IVendorProfileDocument>(
  'VendorProfile',
  vendorProfileSchema,
)
