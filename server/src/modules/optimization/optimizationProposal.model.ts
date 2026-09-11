import mongoose, { type Document, type Types } from 'mongoose'

export type ProposalStatus =
  | 'PROPOSED'
  | 'EVALUATING'
  | 'APPROVED'
  | 'REJECTED'
  | 'APPLIED'
  | 'ROLLED_BACK'

export interface IOptimizationProposalDocument extends Document {
  proposalId: string
  targetKey: string
  currentValue: number
  proposedValue: number
  expectedGain: string
  riskScore: number // 0-100
  status: ProposalStatus
  rationale: string
  approvedBy?: Types.ObjectId
  appliedAt?: Date
  rolledBackAt?: Date
  rollbackReason?: string
  createdAt: Date
  updatedAt: Date
}

const optimizationProposalSchema = new mongoose.Schema<IOptimizationProposalDocument>(
  {
    proposalId: { type: String, required: true, unique: true, index: true },
    targetKey: { type: String, required: true, index: true },
    currentValue: { type: Number, required: true },
    proposedValue: { type: Number, required: true },
    expectedGain: { type: String, required: true },
    riskScore: { type: Number, required: true, min: 0, max: 100 },
    status: {
      type: String,
      enum: ['PROPOSED', 'EVALUATING', 'APPROVED', 'REJECTED', 'APPLIED', 'ROLLED_BACK'],
      default: 'PROPOSED',
      index: true,
    },
    rationale: { type: String, required: true },
    approvedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
    appliedAt: { type: Date },
    rolledBackAt: { type: Date },
    rollbackReason: { type: String },
  },
  { timestamps: true },
)

export const OptimizationProposal = mongoose.model<IOptimizationProposalDocument>(
  'OptimizationProposal',
  optimizationProposalSchema,
)
