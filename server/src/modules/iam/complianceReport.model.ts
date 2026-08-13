import { Schema, model, Document, Types } from 'mongoose'

export type ComplianceReportType =
  | 'access_review'
  | 'permission_audit'
  | 'session_audit'
  | 'security_events'
  | 'mfa_compliance'
  | 'data_retention'

export interface IComplianceReportDoc extends Document {
  type: ComplianceReportType
  title: string
  periodStart: Date
  periodEnd: Date
  generatedBy: Types.ObjectId
  status: 'pending' | 'generating' | 'completed' | 'failed'
  data: Record<string, unknown>
  summary: string
  jobId?: string
}

const complianceReportSchema = new Schema<IComplianceReportDoc>(
  {
    type: {
      type: String,
      enum: [
        'access_review',
        'permission_audit',
        'session_audit',
        'security_events',
        'mfa_compliance',
        'data_retention',
      ],
      required: true,
    },
    title: { type: String, required: true },
    periodStart: { type: Date, required: true },
    periodEnd: { type: Date, required: true },
    generatedBy: { type: Schema.Types.ObjectId, ref: 'User', required: true },
    status: {
      type: String,
      enum: ['pending', 'generating', 'completed', 'failed'],
      default: 'pending',
    },
    data: { type: Schema.Types.Mixed, default: {} },
    summary: { type: String, default: '' },
    jobId: { type: String },
  },
  { timestamps: true },
)

complianceReportSchema.index({ type: 1 })
complianceReportSchema.index({ status: 1 })
complianceReportSchema.index({ generatedBy: 1 })
complianceReportSchema.index({ createdAt: -1 })

export const ComplianceReport = model<IComplianceReportDoc>(
  'ComplianceReport',
  complianceReportSchema,
)
