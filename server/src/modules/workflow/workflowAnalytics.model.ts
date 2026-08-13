import { Schema, model, Document, Types } from 'mongoose'

export interface IWorkflowAnalyticsDoc extends Document {
  workflowId: Types.ObjectId
  periodStart: Date
  periodEnd: Date
  totalExecutions: number
  successfulExecutions: number
  failedExecutions: number
  cancelledExecutions: number
  averageDurationMs: number
  minDurationMs: number
  maxDurationMs: number
  stepFailureCounts: Record<string, number>
}

const workflowAnalyticsSchema = new Schema<IWorkflowAnalyticsDoc>(
  {
    workflowId: { type: Schema.Types.ObjectId, ref: 'Workflow', required: true },
    periodStart: { type: Date, required: true },
    periodEnd: { type: Date, required: true },
    totalExecutions: { type: Number, default: 0 },
    successfulExecutions: { type: Number, default: 0 },
    failedExecutions: { type: Number, default: 0 },
    cancelledExecutions: { type: Number, default: 0 },
    averageDurationMs: { type: Number, default: 0 },
    minDurationMs: { type: Number, default: 0 },
    maxDurationMs: { type: Number, default: 0 },
    stepFailureCounts: { type: Schema.Types.Mixed, default: {} },
  },
  { timestamps: true },
)

workflowAnalyticsSchema.index({ workflowId: 1, periodStart: -1 })

export const WorkflowAnalytics = model<IWorkflowAnalyticsDoc>(
  'WorkflowAnalytics',
  workflowAnalyticsSchema,
)
