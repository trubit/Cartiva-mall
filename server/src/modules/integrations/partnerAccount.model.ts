import mongoose, { Schema, type Document } from 'mongoose'

export type PartnerStatus = 'PENDING' | 'ACTIVE' | 'SUSPENDED' | 'REVOKED'

export interface IPartnerAccountDocument extends Document {
  partnerId: string
  companyName: string
  contactEmail: string
  status: PartnerStatus
  assignedScopes: string[]
  monthlyQuota: number
  quotaUsed: number
  rateLimitPerMin: number
  apiKeyHash?: string
  apiSecretPrefix?: string
  expiresAt?: Date
  createdAt: Date
  updatedAt: Date
}

const PartnerAccountSchema = new Schema<IPartnerAccountDocument>(
  {
    partnerId: { type: String, required: true, unique: true, index: true },
    companyName: { type: String, required: true, index: true },
    contactEmail: { type: String, required: true },
    status: {
      type: String,
      enum: ['PENDING', 'ACTIVE', 'SUSPENDED', 'REVOKED'],
      default: 'PENDING',
      index: true,
    },
    assignedScopes: [{ type: String }],
    monthlyQuota: { type: Number, default: 100000 },
    quotaUsed: { type: Number, default: 0 },
    rateLimitPerMin: { type: Number, default: 300 },
    apiKeyHash: { type: String, index: true },
    apiSecretPrefix: { type: String },
    expiresAt: { type: Date },
  },
  { timestamps: true },
)

export const PartnerAccount =
  mongoose.models.PartnerAccount ||
  mongoose.model<IPartnerAccountDocument>('PartnerAccount', PartnerAccountSchema)
