import mongoose, { Schema, type Document } from 'mongoose'

export type AutonomyLevel = 0 | 1 | 2 | 3 | 4 | 5
export type RiskLevel = 'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL'
export type DecisionStatus =
  | 'DETECTED'
  | 'ANALYZING'
  | 'PROPOSED'
  | 'PENDING_APPROVAL'
  | 'APPROVED'
  | 'REJECTED'
  | 'EXECUTING'
  | 'EXECUTED'
  | 'MONITORING'
  | 'SUCCEEDED'
  | 'FAILED'
  | 'ROLLED_BACK'
  | 'EXPIRED'
  | 'CANCELLED'

export interface IDecisionProposalDocument extends Document {
  decisionId: string
  objective: string
  signalId?: mongoose.Types.ObjectId
  proposedAction: string
  actionName: string
  autonomyLevel: AutonomyLevel
  riskLevel: RiskLevel
  confidence: number
  reason: string
  expectedImpact: Record<string, unknown>
  guardrails: string[]
  status: DecisionStatus
  policyVersion: string
  decisionChainId: string
  parentDecisionId?: string
  chainDepth: number
  rollbackPlan?: {
    actionName: string
    params: Record<string, unknown>
  }
  expiresAt: Date
  approvedBy?: mongoose.Types.ObjectId
  approvedAt?: Date
  rejectionReason?: string
  tenantId?: string
  sellerId?: mongoose.Types.ObjectId
  createdAt: Date
  updatedAt: Date
}

const DecisionProposalSchema = new Schema<IDecisionProposalDocument>(
  {
    decisionId: { type: String, required: true, unique: true, index: true },
    objective: { type: String, required: true, index: true },
    signalId: { type: Schema.Types.ObjectId, ref: 'BusinessSignal', index: true },
    proposedAction: { type: String, required: true },
    actionName: { type: String, required: true, index: true },
    autonomyLevel: { type: Number, required: true, min: 0, max: 5 },
    riskLevel: {
      type: String,
      enum: ['LOW', 'MEDIUM', 'HIGH', 'CRITICAL'],
      required: true,
      index: true,
    },
    confidence: { type: Number, required: true, min: 0, max: 1 },
    reason: { type: String, required: true },
    expectedImpact: { type: Schema.Types.Mixed, default: {} },
    guardrails: [{ type: String }],
    status: {
      type: String,
      enum: [
        'DETECTED',
        'ANALYZING',
        'PROPOSED',
        'PENDING_APPROVAL',
        'APPROVED',
        'REJECTED',
        'EXECUTING',
        'EXECUTED',
        'MONITORING',
        'SUCCEEDED',
        'FAILED',
        'ROLLED_BACK',
        'EXPIRED',
        'CANCELLED',
      ],
      default: 'PROPOSED',
      index: true,
    },
    policyVersion: { type: String, default: 'v1.0.0' },
    decisionChainId: { type: String, required: true, index: true },
    parentDecisionId: { type: String, index: true },
    chainDepth: { type: Number, default: 1 },
    rollbackPlan: {
      actionName: { type: String },
      params: { type: Schema.Types.Mixed },
    },
    expiresAt: { type: Date, required: true, index: true },
    approvedBy: { type: Schema.Types.ObjectId, ref: 'User' },
    approvedAt: { type: Date },
    rejectionReason: { type: String },
    tenantId: { type: String, index: true },
    sellerId: { type: Schema.Types.ObjectId, ref: 'User', index: true },
  },
  { timestamps: true },
)

DecisionProposalSchema.index({ status: 1, createdAt: -1 })
DecisionProposalSchema.index({ riskLevel: 1, status: 1 })

export const DecisionProposal = mongoose.model<IDecisionProposalDocument>(
  'DecisionProposal',
  DecisionProposalSchema,
)
