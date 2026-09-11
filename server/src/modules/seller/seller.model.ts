import mongoose, { type Document } from 'mongoose'

export type KycStatus =
  | 'NOT_STARTED'
  | 'PENDING'
  | 'UNDER_REVIEW'
  | 'VERIFIED'
  | 'REJECTED'
  | 'REQUIRES_ACTION'

export interface ISellerKycBankDetails {
  bankCode: string
  bankName: string
  accountNumber: string
  accountName: string
  isResolved: boolean
}

export interface ISellerKycData {
  businessType?: 'individual' | 'registered_business' | 'company'
  legalName?: string
  idType?: 'bvn' | 'nin' | 'passport' | 'drivers_license' | 'voters_card'
  idNumber?: string
  idDocumentUrl?: string
  proofOfAddressUrl?: string
  bankDetails?: ISellerKycBankDetails
  submittedAt?: Date
  reviewedAt?: Date
  reviewedBy?: mongoose.Types.ObjectId
  rejectionReason?: string
  actionRequiredReason?: string
}

export interface ISellerProfileDocument extends Document {
  userId: mongoose.Types.ObjectId
  storeName: string
  storeSlug?: string
  storeCategory?: string
  storeCreated: boolean
  storeLogo: string
  storeLogoPublicId?: string
  storeDescription: string
  storeAddress: {
    country?: string
    state?: string
    city?: string
    street?: string
    postalCode?: string
    latitude?: number
    longitude?: number
  }
  whatsappNumber?: string
  publicLocation?: string
  accountStatus: 'ACTIVE' | 'RESTRICTED' | 'BLOCKED' | 'SUSPENDED'
  restrictionReason?: string
  restrictedAt?: Date
  isVerified: boolean
  kycStatus: KycStatus
  kycData?: ISellerKycData
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
    latitude: { type: Number },
    longitude: { type: Number },
  },
  { _id: false },
)

const kycBankDetailsSchema = new mongoose.Schema(
  {
    bankCode: { type: String, trim: true },
    bankName: { type: String, trim: true },
    accountNumber: { type: String, trim: true },
    accountName: { type: String, trim: true },
    isResolved: { type: Boolean, default: false },
  },
  { _id: false },
)

const kycDataSchema = new mongoose.Schema(
  {
    businessType: {
      type: String,
      enum: ['individual', 'registered_business', 'company'],
      default: 'individual',
    },
    legalName: { type: String, trim: true },
    idType: {
      type: String,
      enum: ['bvn', 'nin', 'passport', 'drivers_license', 'voters_card'],
    },
    idNumber: { type: String, trim: true },
    idDocumentUrl: { type: String, trim: true },
    proofOfAddressUrl: { type: String, trim: true },
    bankDetails: { type: kycBankDetailsSchema },
    submittedAt: { type: Date },
    reviewedAt: { type: Date },
    reviewedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
    rejectionReason: { type: String, trim: true },
    actionRequiredReason: { type: String, trim: true },
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
    storeSlug: { type: String, trim: true, lowercase: true, index: true },
    storeCategory: { type: String, trim: true, default: 'General' },
    storeCreated: { type: Boolean, default: false, index: true },
    storeLogo: { type: String, default: '' },
    storeLogoPublicId: { type: String, select: false },
    storeDescription: { type: String, trim: true, maxlength: 1000, default: '' },
    storeAddress: { type: storeAddressSchema, default: () => ({}) },
    whatsappNumber: { type: String, trim: true },
    publicLocation: { type: String, trim: true },
    accountStatus: {
      type: String,
      enum: ['ACTIVE', 'RESTRICTED', 'BLOCKED', 'SUSPENDED'],
      default: 'ACTIVE',
      index: true,
    },
    restrictionReason: { type: String, trim: true },
    restrictedAt: { type: Date },
    isVerified: { type: Boolean, default: false },
    kycStatus: {
      type: String,
      enum: ['NOT_STARTED', 'PENDING', 'UNDER_REVIEW', 'VERIFIED', 'REJECTED', 'REQUIRES_ACTION'],
      default: 'NOT_STARTED',
      index: true,
    },
    kycData: { type: kycDataSchema, default: () => ({}) },
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
