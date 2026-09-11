import mongoose, { Schema, type Document } from 'mongoose'

export interface IDecisionAuditDocument extends Document {
  decisionId: string
  actionName: string
  actor: string
  event: string
  changes: Record<string, unknown>
  ipAddress?: string
  policyVersion: string
  timestamp: Date
}

const DecisionAuditSchema = new Schema<IDecisionAuditDocument>(
  {
    decisionId: { type: String, required: true, index: true },
    actionName: { type: String, required: true, index: true },
    actor: { type: String, required: true, default: 'system' },
    event: { type: String, required: true, index: true },
    changes: { type: Schema.Types.Mixed, default: {} },
    ipAddress: { type: String },
    policyVersion: { type: String, default: 'v1.0.0' },
    timestamp: { type: Date, default: Date.now },
  },
  { timestamps: true },
)

export const DecisionAudit = mongoose.model<IDecisionAuditDocument>(
  'DecisionAudit',
  DecisionAuditSchema,
)
