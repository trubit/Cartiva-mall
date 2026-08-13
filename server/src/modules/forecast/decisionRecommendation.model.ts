import mongoose, { Schema, type Document } from 'mongoose'

export interface IDecisionRecommendationDocument extends Document {
  category: string
  title: string
  description: string
  priority: 'low' | 'medium' | 'high' | 'critical'
  impact: string
  action: string
  data: Record<string, unknown>
  createdAt: Date
}

const decisionRecommendationSchema = new Schema<IDecisionRecommendationDocument>(
  {
    category: { type: String, required: true, maxlength: 100 },
    title: { type: String, required: true, maxlength: 200 },
    description: { type: String, required: true, maxlength: 2000 },
    priority: { type: String, enum: ['low', 'medium', 'high', 'critical'], required: true },
    impact: { type: String, required: true, maxlength: 500 },
    action: { type: String, required: true, maxlength: 500 },
    data: { type: Schema.Types.Mixed, default: {} },
  },
  { timestamps: { createdAt: true, updatedAt: false } },
)

decisionRecommendationSchema.index({ priority: 1 })
decisionRecommendationSchema.index({ category: 1 })
decisionRecommendationSchema.index({ createdAt: -1 })

export const DecisionRecommendation = mongoose.model<IDecisionRecommendationDocument>(
  'DecisionRecommendation',
  decisionRecommendationSchema,
)
