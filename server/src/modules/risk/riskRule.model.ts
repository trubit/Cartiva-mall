import mongoose, { type Document } from 'mongoose'

export type RuleCategory = 'velocity' | 'payment' | 'account' | 'review' | 'seller' | 'promotion'

export interface IRiskRuleDocument extends Document {
  ruleId: string
  ruleName: string
  category: RuleCategory
  description: string
  scoreWeight: number
  threshold: number
  enabled: boolean
  version: number
  createdAt: Date
  updatedAt: Date
}

const riskRuleSchema = new mongoose.Schema<IRiskRuleDocument>(
  {
    ruleId: { type: String, required: true, unique: true, index: true },
    ruleName: { type: String, required: true },
    category: {
      type: String,
      enum: ['velocity', 'payment', 'account', 'review', 'seller', 'promotion'],
      required: true,
      index: true,
    },
    description: { type: String, required: true },
    scoreWeight: { type: Number, required: true, min: 0, max: 100 },
    threshold: { type: Number, required: true },
    enabled: { type: Boolean, default: true, index: true },
    version: { type: Number, default: 1 },
  },
  { timestamps: true },
)

export const RiskRule = mongoose.model<IRiskRuleDocument>('RiskRule', riskRuleSchema)
