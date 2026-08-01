import mongoose, { Schema, type Document, type Types } from 'mongoose'

export type VendorStatus = 'pending' | 'active' | 'suspended' | 'rejected' | 'blacklisted'
export type VendorVerificationStatus = 'unverified' | 'in_progress' | 'verified' | 'rejected'
export type BusinessType = 'individual' | 'business' | 'corporation'

export interface IVendorDocument extends Document {
  _id: Types.ObjectId
  userId: Types.ObjectId
  businessName: string
  businessType: BusinessType
  status: VendorStatus
  verificationStatus: VendorVerificationStatus
  isApproved: boolean
  approvedAt?: Date
  approvedBy?: Types.ObjectId
  rejectionReason?: string
  blacklistReason?: string
  suspensionReason?: string
  onboardingStep: number
  onboardingCompleted: boolean
  createdAt: Date
  updatedAt: Date
}

const vendorSchema = new Schema<IVendorDocument>(
  {
    userId: { type: Schema.Types.ObjectId, ref: 'User', required: true, unique: true },
    businessName: { type: String, required: true, trim: true, maxlength: 200 },
    businessType: { type: String, enum: ['individual', 'business', 'corporation'], required: true },
    status: {
      type: String,
      enum: ['pending', 'active', 'suspended', 'rejected', 'blacklisted'],
      default: 'pending',
    },
    verificationStatus: {
      type: String,
      enum: ['unverified', 'in_progress', 'verified', 'rejected'],
      default: 'unverified',
    },
    isApproved: { type: Boolean, default: false },
    approvedAt: { type: Date },
    approvedBy: { type: Schema.Types.ObjectId, ref: 'User' },
    rejectionReason: { type: String, maxlength: 1000 },
    blacklistReason: { type: String, maxlength: 1000 },
    suspensionReason: { type: String, maxlength: 1000 },
    onboardingStep: { type: Number, default: 0, min: 0, max: 5 },
    onboardingCompleted: { type: Boolean, default: false },
  },
  { timestamps: true },
)

vendorSchema.index({ status: 1 })
vendorSchema.index({ verificationStatus: 1 })
vendorSchema.index({ createdAt: -1 })

export const Vendor = mongoose.model<IVendorDocument>('Vendor', vendorSchema)
