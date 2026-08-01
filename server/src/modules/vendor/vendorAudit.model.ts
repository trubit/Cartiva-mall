import mongoose, { Schema, type Document, type Types } from 'mongoose'

export type AuditAction =
  | 'registered'
  | 'approved'
  | 'rejected'
  | 'suspended'
  | 'reactivated'
  | 'blacklisted'
  | 'document_uploaded'
  | 'document_approved'
  | 'document_rejected'
  | 'storefront_created'
  | 'storefront_updated'
  | 'subscription_changed'
  | 'payout_requested'
  | 'payout_completed'
  | 'profile_updated'
  | 'verification_submitted'
  | 'onboarding_step_completed'

export interface IVendorAuditDocument extends Document {
  _id: Types.ObjectId
  vendorId: Types.ObjectId
  action: AuditAction
  performedBy: Types.ObjectId
  metadata?: Record<string, unknown>
  ipAddress?: string
  createdAt: Date
}

const vendorAuditSchema = new Schema<IVendorAuditDocument>(
  {
    vendorId: { type: Schema.Types.ObjectId, ref: 'Vendor', required: true },
    action: {
      type: String,
      enum: [
        'registered',
        'approved',
        'rejected',
        'suspended',
        'reactivated',
        'blacklisted',
        'document_uploaded',
        'document_approved',
        'document_rejected',
        'storefront_created',
        'storefront_updated',
        'subscription_changed',
        'payout_requested',
        'payout_completed',
        'profile_updated',
        'verification_submitted',
        'onboarding_step_completed',
      ],
      required: true,
    },
    performedBy: { type: Schema.Types.ObjectId, ref: 'User', required: true },
    metadata: { type: Schema.Types.Mixed },
    ipAddress: { type: String, maxlength: 100 },
  },
  { timestamps: { createdAt: true, updatedAt: false } },
)

vendorAuditSchema.index({ vendorId: 1, createdAt: -1 })
vendorAuditSchema.index({ createdAt: -1 })

export const VendorAudit = mongoose.model<IVendorAuditDocument>('VendorAudit', vendorAuditSchema)
