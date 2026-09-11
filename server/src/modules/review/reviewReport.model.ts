import mongoose, { type Document, type Types } from 'mongoose'

export type ReportReason = 'spam' | 'harassment' | 'offensive' | 'fake' | 'other'
export type ReportStatus = 'PENDING' | 'RESOLVED' | 'DISMISSED'

export interface IReviewReportDocument extends Document {
  reviewId: Types.ObjectId
  reporterId: Types.ObjectId
  reason: ReportReason
  details?: string
  status: ReportStatus
  moderatorNotes?: string
  createdAt: Date
  updatedAt: Date
}

const reviewReportSchema = new mongoose.Schema<IReviewReportDocument>(
  {
    reviewId: { type: mongoose.Schema.Types.ObjectId, ref: 'Review', required: true, index: true },
    reporterId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true, index: true },
    reason: {
      type: String,
      enum: ['spam', 'harassment', 'offensive', 'fake', 'other'],
      required: true,
    },
    details: { type: String, trim: true, maxlength: 500 },
    status: {
      type: String,
      enum: ['PENDING', 'RESOLVED', 'DISMISSED'],
      default: 'PENDING',
      index: true,
    },
    moderatorNotes: { type: String, trim: true, maxlength: 1000 },
  },
  { timestamps: true },
)

reviewReportSchema.index({ reviewId: 1, reporterId: 1 }, { unique: true })

export const ReviewReport = mongoose.model<IReviewReportDocument>(
  'ReviewReport',
  reviewReportSchema,
)
