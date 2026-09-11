import mongoose, { type Document, type Types } from 'mongoose'

export interface IAiFeedbackDocument extends Document {
  insightId: string
  userId: Types.ObjectId
  helpful: boolean
  notes?: string
  createdAt: Date
}

const aiFeedbackSchema = new mongoose.Schema<IAiFeedbackDocument>(
  {
    insightId: { type: String, required: true, index: true },
    userId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true, index: true },
    helpful: { type: Boolean, required: true },
    notes: { type: String, trim: true, maxlength: 500 },
  },
  { timestamps: true },
)

aiFeedbackSchema.index({ insightId: 1, userId: 1 }, { unique: true })

export const AiFeedback = mongoose.model<IAiFeedbackDocument>('AiFeedback', aiFeedbackSchema)
