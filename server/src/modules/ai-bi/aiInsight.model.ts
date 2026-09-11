import mongoose, { type Document, type Types } from 'mongoose'

export type InsightScope = 'marketplace' | 'seller' | 'inventory' | 'risk' | 'finance'
export type InsightStatus = 'NEW' | 'ACKNOWLEDGED' | 'ACTIONED' | 'DISMISSED'

export interface IAiInsightDocument extends Document {
  insightId: string
  scope: InsightScope
  targetId?: Types.ObjectId | string
  title: string
  summary: string
  metrics: Record<string, unknown>
  confidenceScore: number // 0 to 100
  recommendedActions: string[]
  status: InsightStatus
  acknowledgedBy?: Types.ObjectId
  acknowledgedAt?: Date
  createdAt: Date
  updatedAt: Date
}

const aiInsightSchema = new mongoose.Schema<IAiInsightDocument>(
  {
    insightId: { type: String, required: true, unique: true, index: true },
    scope: {
      type: String,
      enum: ['marketplace', 'seller', 'inventory', 'risk', 'finance'],
      required: true,
      index: true,
    },
    targetId: { type: String, index: true },
    title: { type: String, required: true },
    summary: { type: String, required: true },
    metrics: { type: mongoose.Schema.Types.Mixed, default: {} },
    confidenceScore: { type: Number, required: true, min: 0, max: 100 },
    recommendedActions: [{ type: String }],
    status: {
      type: String,
      enum: ['NEW', 'ACKNOWLEDGED', 'ACTIONED', 'DISMISSED'],
      default: 'NEW',
      index: true,
    },
    acknowledgedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
    acknowledgedAt: { type: Date },
  },
  { timestamps: true },
)

export const AiInsight = mongoose.model<IAiInsightDocument>('AiInsight', aiInsightSchema)
