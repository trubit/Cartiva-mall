import mongoose, { Schema, type Document } from 'mongoose'

export interface IAutonomyPolicyDocument extends Document {
  policyVersion: string
  globalKillSwitch: boolean
  domainKillSwitches: {
    pricingAutonomy: boolean
    marketingAutonomy: boolean
    inventoryAutonomy: boolean
    recommendationAutonomy: boolean
    notificationAutonomy: boolean
  }
  budgets: {
    maxActionsPerHour: number
    maxSpendPerDay: number
    maxChainDepth: number
  }
  allowedActions: string[]
  objectiveWeights: {
    revenueWeight: number
    conversionWeight: number
    retentionWeight: number
    inventoryWeight: number
    costWeight: number
  }
  updatedBy?: mongoose.Types.ObjectId
  createdAt: Date
  updatedAt: Date
}

const AutonomyPolicySchema = new Schema<IAutonomyPolicyDocument>(
  {
    policyVersion: { type: String, required: true, default: 'v1.0.0' },
    globalKillSwitch: { type: Boolean, default: false },
    domainKillSwitches: {
      pricingAutonomy: { type: Boolean, default: true },
      marketingAutonomy: { type: Boolean, default: true },
      inventoryAutonomy: { type: Boolean, default: true },
      recommendationAutonomy: { type: Boolean, default: true },
      notificationAutonomy: { type: Boolean, default: true },
    },
    budgets: {
      maxActionsPerHour: { type: Number, default: 50 },
      maxSpendPerDay: { type: Number, default: 1000 },
      maxChainDepth: { type: Number, default: 3 },
    },
    allowedActions: [
      {
        type: String,
      },
    ],
    objectiveWeights: {
      revenueWeight: { type: Number, default: 0.3 },
      conversionWeight: { type: Number, default: 0.25 },
      retentionWeight: { type: Number, default: 0.2 },
      inventoryWeight: { type: Number, default: 0.15 },
      costWeight: { type: Number, default: 0.1 },
    },
    updatedBy: { type: Schema.Types.ObjectId, ref: 'User' },
  },
  { timestamps: true },
)

export const AutonomyPolicy = mongoose.model<IAutonomyPolicyDocument>(
  'AutonomyPolicy',
  AutonomyPolicySchema,
)
