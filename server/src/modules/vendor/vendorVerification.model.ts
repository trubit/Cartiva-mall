import mongoose, { Schema, type Document, type Types } from 'mongoose'

export type VerificationStepName = 'identity' | 'business' | 'banking' | 'address' | 'final'
export type VerificationStepStatus = 'pending' | 'submitted' | 'approved' | 'rejected'
export type VerificationOverallStatus = 'unverified' | 'in_progress' | 'verified' | 'rejected'

export interface IVerificationStep {
  step: VerificationStepName
  status: VerificationStepStatus
  submittedAt?: Date
  reviewedAt?: Date
  notes?: string
}

export interface IVendorVerificationDocument extends Document {
  _id: Types.ObjectId
  vendorId: Types.ObjectId
  steps: IVerificationStep[]
  overallStatus: VerificationOverallStatus
  reviewedBy?: Types.ObjectId
  reviewedAt?: Date
  notes?: string
  createdAt: Date
  updatedAt: Date
}

const stepSchema = new Schema<IVerificationStep>(
  {
    step: {
      type: String,
      enum: ['identity', 'business', 'banking', 'address', 'final'],
      required: true,
    },
    status: {
      type: String,
      enum: ['pending', 'submitted', 'approved', 'rejected'],
      default: 'pending',
    },
    submittedAt: { type: Date },
    reviewedAt: { type: Date },
    notes: { type: String, maxlength: 1000 },
  },
  { _id: false },
)

const STEPS: VerificationStepName[] = ['identity', 'business', 'banking', 'address', 'final']

const vendorVerificationSchema = new Schema<IVendorVerificationDocument>(
  {
    vendorId: { type: Schema.Types.ObjectId, ref: 'Vendor', required: true, unique: true },
    steps: {
      type: [stepSchema],
      default: () => STEPS.map((step) => ({ step, status: 'pending' })),
    },
    overallStatus: {
      type: String,
      enum: ['unverified', 'in_progress', 'verified', 'rejected'],
      default: 'unverified',
    },
    reviewedBy: { type: Schema.Types.ObjectId, ref: 'User' },
    reviewedAt: { type: Date },
    notes: { type: String, maxlength: 2000 },
  },
  { timestamps: true },
)

vendorVerificationSchema.index({ overallStatus: 1 })

export const VendorVerification = mongoose.model<IVendorVerificationDocument>(
  'VendorVerification',
  vendorVerificationSchema,
)
