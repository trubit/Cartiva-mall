import mongoose, { Schema, type Document, type Types } from 'mongoose'

export type DocumentType =
  | 'id_card'
  | 'passport'
  | 'drivers_license'
  | 'business_registration'
  | 'tax_certificate'
  | 'bank_statement'
  | 'proof_of_address'
  | 'other'

export type DocumentStatus = 'pending' | 'approved' | 'rejected' | 'expired'

export interface IVendorDocumentDocument extends Document {
  _id: Types.ObjectId
  vendorId: Types.ObjectId
  type: DocumentType
  fileUrl: string
  fileName: string
  fileSize?: number
  mimeType?: string
  status: DocumentStatus
  reviewedAt?: Date
  reviewedBy?: Types.ObjectId
  rejectionReason?: string
  expiresAt?: Date
  createdAt: Date
  updatedAt: Date
}

const vendorDocumentSchema = new Schema<IVendorDocumentDocument>(
  {
    vendorId: { type: Schema.Types.ObjectId, ref: 'Vendor', required: true },
    type: {
      type: String,
      enum: [
        'id_card',
        'passport',
        'drivers_license',
        'business_registration',
        'tax_certificate',
        'bank_statement',
        'proof_of_address',
        'other',
      ],
      required: true,
    },
    fileUrl: { type: String, required: true, maxlength: 1000 },
    fileName: { type: String, required: true, maxlength: 300 },
    fileSize: { type: Number },
    mimeType: { type: String, maxlength: 100 },
    status: {
      type: String,
      enum: ['pending', 'approved', 'rejected', 'expired'],
      default: 'pending',
    },
    reviewedAt: { type: Date },
    reviewedBy: { type: Schema.Types.ObjectId, ref: 'User' },
    rejectionReason: { type: String, maxlength: 1000 },
    expiresAt: { type: Date },
  },
  { timestamps: true },
)

vendorDocumentSchema.index({ vendorId: 1 })
vendorDocumentSchema.index({ vendorId: 1, type: 1 })
vendorDocumentSchema.index({ status: 1 })

export const VendorDocument = mongoose.model<IVendorDocumentDocument>(
  'VendorDocument',
  vendorDocumentSchema,
)
