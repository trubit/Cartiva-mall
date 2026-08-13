import mongoose, { Schema, type Document } from 'mongoose'

export interface IAnalyticsSnapshotDocument extends Document {
  snapshotDate: Date
  type: string
  data: Record<string, unknown>
  createdAt: Date
}

const analyticsSnapshotSchema = new Schema<IAnalyticsSnapshotDocument>(
  {
    snapshotDate: { type: Date, required: true },
    type: { type: String, required: true, maxlength: 100 },
    data: { type: Schema.Types.Mixed, required: true },
  },
  { timestamps: { createdAt: true, updatedAt: false } },
)

analyticsSnapshotSchema.index({ type: 1, snapshotDate: -1 })
analyticsSnapshotSchema.index({ createdAt: -1 })

export const AnalyticsSnapshot = mongoose.model<IAnalyticsSnapshotDocument>(
  'AnalyticsSnapshot',
  analyticsSnapshotSchema,
)
