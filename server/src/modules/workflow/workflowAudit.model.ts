import { Schema, model, Document, Types } from 'mongoose'

export interface IWorkflowAuditDoc extends Document {
  workflowId: Types.ObjectId
  executionId?: Types.ObjectId
  action: string
  userId?: Types.ObjectId
  before?: Record<string, unknown>
  after?: Record<string, unknown>
  meta?: Record<string, unknown>
}

const workflowAuditSchema = new Schema<IWorkflowAuditDoc>(
  {
    workflowId: { type: Schema.Types.ObjectId, ref: 'Workflow', required: true },
    executionId: { type: Schema.Types.ObjectId, ref: 'WorkflowExecution' },
    action: { type: String, required: true },
    userId: { type: Schema.Types.ObjectId, ref: 'User' },
    before: { type: Schema.Types.Mixed },
    after: { type: Schema.Types.Mixed },
    meta: { type: Schema.Types.Mixed },
  },
  { timestamps: { createdAt: true, updatedAt: false } },
)

workflowAuditSchema.index({ workflowId: 1 })
workflowAuditSchema.index({ executionId: 1 })
workflowAuditSchema.index({ action: 1 })
workflowAuditSchema.index({ createdAt: -1 })

export const WorkflowAudit = model<IWorkflowAuditDoc>('WorkflowAudit', workflowAuditSchema)
