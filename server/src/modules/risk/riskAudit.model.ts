import mongoose, { type Document, type Types } from 'mongoose'

export interface IRiskAuditDocument extends Document {
  auditId: string
  action: 'EVALUATION' | 'RULE_CHANGE' | 'CASE_UPDATE' | 'MANUAL_OVERRIDE' | 'APPEAL_SUBMITTED'
  subjectType: string
  subjectId: string
  actorId?: Types.ObjectId
  riskScore?: number
  decision?: string
  reason?: string
  metadata?: Record<string, unknown>
  createdAt: Date
}

const riskAuditSchema = new mongoose.Schema<IRiskAuditDocument>(
  {
    auditId: { type: String, required: true, unique: true, index: true },
    action: {
      type: String,
      enum: ['EVALUATION', 'RULE_CHANGE', 'CASE_UPDATE', 'MANUAL_OVERRIDE', 'APPEAL_SUBMITTED'],
      required: true,
      index: true,
    },
    subjectType: { type: String, required: true },
    subjectId: { type: String, required: true },
    actorId: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
    riskScore: { type: Number },
    decision: { type: String },
    reason: { type: String },
    metadata: { type: mongoose.Schema.Types.Mixed },
  },
  { timestamps: true },
)

export const RiskAudit = mongoose.model<IRiskAuditDocument>('RiskAudit', riskAuditSchema)
