import mongoose, { Schema, type Document } from 'mongoose'

export interface IDecisionOutcomeDocument extends Document {
  decisionId: string
  actionName: string
  expectedImpact: Record<string, unknown>
  actualImpact: Record<string, unknown>
  score: number // 0 - 100 score
  sideEffects: string[]
  learnings: string
  createdAt: Date
  updatedAt: Date
}

const DecisionOutcomeSchema = new Schema<IDecisionOutcomeDocument>(
  {
    decisionId: { type: String, required: true, unique: true, index: true },
    actionName: { type: String, required: true, index: true },
    expectedImpact: { type: Schema.Types.Mixed, default: {} },
    actualImpact: { type: Schema.Types.Mixed, default: {} },
    score: { type: Number, default: 80, min: 0, max: 100 },
    sideEffects: [{ type: String }],
    learnings: { type: String, default: '' },
  },
  { timestamps: true },
)

export const DecisionOutcome = mongoose.model<IDecisionOutcomeDocument>(
  'DecisionOutcome',
  DecisionOutcomeSchema,
)
