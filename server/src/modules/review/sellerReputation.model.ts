import mongoose, { type Document, type Types } from 'mongoose'

export interface ISellerReputationDocument extends Document {
  sellerId: Types.ObjectId
  avgRating: number
  totalReviews: number
  verifiedPurchasesCount: number
  trustScore: number // 0 to 100
  ratingDistribution: {
    1: number
    2: number
    3: number
    4: number
    5: number
  }
  disputeCount: number
  lastCalculatedAt: Date
}

const sellerReputationSchema = new mongoose.Schema<ISellerReputationDocument>(
  {
    sellerId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Seller',
      required: true,
      unique: true,
      index: true,
    },
    avgRating: { type: Number, default: 0, min: 0, max: 5 },
    totalReviews: { type: Number, default: 0, min: 0 },
    verifiedPurchasesCount: { type: Number, default: 0, min: 0 },
    trustScore: { type: Number, default: 100, min: 0, max: 100 },
    ratingDistribution: {
      1: { type: Number, default: 0 },
      2: { type: Number, default: 0 },
      3: { type: Number, default: 0 },
      4: { type: Number, default: 0 },
      5: { type: Number, default: 0 },
    },
    disputeCount: { type: Number, default: 0, min: 0 },
    lastCalculatedAt: { type: Date, default: Date.now },
  },
  { timestamps: true },
)

export const SellerReputation = mongoose.model<ISellerReputationDocument>(
  'SellerReputation',
  sellerReputationSchema,
)
