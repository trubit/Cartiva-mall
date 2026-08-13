import { Schema, model, Document, Types } from 'mongoose'

export type ApprovalStatus = 'pending' | 'approved' | 'rejected' | 'escalated' | 'expired'

export interface IWorkflowApprovalDoc extends Document {
  workflowId: Types.ObjectId
  executionId: Types.ObjectId
  stepId: string
  title: string
  description?: string
  requestedBy: Types.ObjectId
  assignedTo?: Types.ObjectId[]
  status: ApprovalStatus
  decision?: string
  decisionBy?: Types.ObjectId
  decisionAt?: Date
  dueAt?: Date
  escalatedTo?: Types.ObjectId
  escalatedAt?: Date
  metadata: Record<string, unknown>
}

const workflowApprovalSchema = new Schema<IWorkflowApprovalDoc>(
  {
    workflowId: { type: Schema.Types.ObjectId, ref: 'Workflow', required: true },
    executionId: { type: Schema.Types.ObjectId, ref: 'WorkflowExecution', required: true },
    stepId: { type: String, required: true },
    title: { type: String, required: true },
    description: { type: String },
    requestedBy: { type: Schema.Types.ObjectId, ref: 'User', required: true },
    assignedTo: [{ type: Schema.Types.ObjectId, ref: 'User' }],
    status: {
      type: String,
      enum: ['pending', 'approved', 'rejected', 'escalated', 'expired'],
      default: 'pending',
    },
    decision: { type: String },
    decisionBy: { type: Schema.Types.ObjectId, ref: 'User' },
    decisionAt: { type: Date },
    dueAt: { type: Date },
    escalatedTo: { type: Schema.Types.ObjectId, ref: 'User' },
    escalatedAt: { type: Date },
    metadata: { type: Schema.Types.Mixed, default: {} },
  },
  { timestamps: true },
)

workflowApprovalSchema.index({ workflowId: 1 })
workflowApprovalSchema.index({ executionId: 1 })
workflowApprovalSchema.index({ status: 1 })
workflowApprovalSchema.index({ assignedTo: 1 })
workflowApprovalSchema.index({ dueAt: 1 })
workflowApprovalSchema.index({ createdAt: -1 })

export const WorkflowApproval = model<IWorkflowApprovalDoc>(
  'WorkflowApproval',
  workflowApprovalSchema,
)
