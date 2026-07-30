import mongoose, { type Document, type Types } from 'mongoose'

export interface IReviewDocument extends Document {
  productId: Types.ObjectId
  userId: Types.ObjectId
  rating: number
  title?: string
  body: string
  isVerified: boolean
  createdAt: Date
  updatedAt: Date
}

const reviewSchema = new mongoose.Schema<IReviewDocument>(
  {
    productId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Product',
      required: true,
      index: true,
    },
    userId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true, index: true },
    rating: { type: Number, required: true, min: 1, max: 5 },
    title: { type: String, trim: true, maxlength: 120 },
    body: { type: String, required: true, trim: true, minlength: 10, maxlength: 2000 },
    isVerified: { type: Boolean, default: false },
  },
  {
    timestamps: true,
    toJSON: {
      virtuals: true,
      transform: (_doc, ret: Record<string, unknown>) => {
        delete ret.__v
        return ret
      },
    },
  },
)

reviewSchema.index({ productId: 1, userId: 1 }, { unique: true })
reviewSchema.index({ productId: 1, createdAt: -1 })

export const Review = mongoose.model<IReviewDocument>('Review', reviewSchema)
