import mongoose, { type Document, type Types } from 'mongoose'

export type ReviewStatus = 'PENDING' | 'PUBLISHED' | 'REJECTED' | 'HIDDEN' | 'FLAGGED' | 'DELETED'

export interface IReviewDocument extends Document {
  productId: Types.ObjectId
  sellerId?: Types.ObjectId
  userId: Types.ObjectId
  orderId?: Types.ObjectId
  rating: number
  title?: string
  body: string
  isVerified: boolean
  status: ReviewStatus
  helpfulVotes: Types.ObjectId[]
  reportedBy: Types.ObjectId[]
  sellerReply?: string
  sellerReplyAt?: Date
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
    sellerId: { type: mongoose.Schema.Types.ObjectId, ref: 'Seller', index: true },
    userId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true, index: true },
    orderId: { type: mongoose.Schema.Types.ObjectId, ref: 'Order', index: true },
    rating: { type: Number, required: true, min: 1, max: 5 },
    title: { type: String, trim: true, maxlength: 120 },
    body: { type: String, required: true, trim: true, minlength: 10, maxlength: 2000 },
    isVerified: { type: Boolean, default: false },
    status: {
      type: String,
      enum: ['PENDING', 'PUBLISHED', 'REJECTED', 'HIDDEN', 'FLAGGED', 'DELETED'],
      default: 'PUBLISHED',
      index: true,
    },
    helpfulVotes: { type: [mongoose.Schema.Types.ObjectId], ref: 'User', default: [] },
    reportedBy: { type: [mongoose.Schema.Types.ObjectId], ref: 'User', default: [] },
    sellerReply: { type: String, trim: true, maxlength: 2000 },
    sellerReplyAt: { type: Date },
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
reviewSchema.index({ productId: 1, helpfulVotes: -1 })

export const Review = mongoose.model<IReviewDocument>('Review', reviewSchema)

// ─── Q&A: Questions ───────────────────────────────────────────────────────────
export interface IQuestionDocument extends Document {
  productId: Types.ObjectId
  userId: Types.ObjectId
  question: string
  answers: IAnswerSubDoc[]
  createdAt: Date
}

export interface IAnswerSubDoc {
  _id: Types.ObjectId
  userId: Types.ObjectId
  answer: string
  likes: Types.ObjectId[]
  createdAt: Date
}

const answerSchema = new mongoose.Schema<IAnswerSubDoc>(
  {
    userId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
    answer: { type: String, required: true, trim: true, minlength: 2, maxlength: 2000 },
    likes: { type: [mongoose.Schema.Types.ObjectId], ref: 'User', default: [] },
    createdAt: { type: Date, default: Date.now },
  },
  { _id: true },
)

const questionSchema = new mongoose.Schema<IQuestionDocument>(
  {
    productId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Product',
      required: true,
      index: true,
    },
    userId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true, index: true },
    question: { type: String, required: true, trim: true, minlength: 10, maxlength: 500 },
    answers: { type: [answerSchema], default: [] },
  },
  { timestamps: true },
)

questionSchema.index({ productId: 1, createdAt: -1 })

export const Question = mongoose.model<IQuestionDocument>('Question', questionSchema)
