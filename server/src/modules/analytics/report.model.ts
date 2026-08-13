import mongoose, { Schema, type Document, type Types } from 'mongoose'

export interface IReportDocument extends Document {
  title: string
  type: string
  parameters: Record<string, unknown>
  data: Record<string, unknown>
  format: string
  createdBy: Types.ObjectId
  createdAt: Date
}

const reportSchema = new Schema<IReportDocument>(
  {
    title: { type: String, required: true, maxlength: 200 },
    type: { type: String, required: true, maxlength: 100 },
    parameters: { type: Schema.Types.Mixed, default: {} },
    data: { type: Schema.Types.Mixed, default: {} },
    format: { type: String, enum: ['csv', 'json'], default: 'json' },
    createdBy: { type: Schema.Types.ObjectId, ref: 'User', required: true },
  },
  { timestamps: { createdAt: true, updatedAt: false } },
)

reportSchema.index({ type: 1 })
reportSchema.index({ createdBy: 1 })
reportSchema.index({ createdAt: -1 })

export const Report = mongoose.model<IReportDocument>('Report', reportSchema)
