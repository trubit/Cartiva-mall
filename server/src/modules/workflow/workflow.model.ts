import mongoose, { Schema, type Document, type Types } from 'mongoose'
import type {
  WorkflowStatus,
  TriggerType,
  WorkflowStep,
} from '../../../../src/shared/types/workflow.types.js'

export interface IWorkflowDocument extends Document {
  name: string
  description?: string
  status: WorkflowStatus
  triggerType: TriggerType
  triggerConditions: Record<string, unknown>
  steps: WorkflowStep[]
  version: number
  isActive: boolean
  executionCount: number
  lastExecutedAt?: Date
  createdBy: Types.ObjectId
  createdAt: Date
  updatedAt: Date
}

const workflowStepSchema = new Schema(
  {
    id: { type: String, required: true },
    name: { type: String, required: true },
    type: { type: String, enum: ['action', 'condition', 'delay'], required: true },
    actionType: { type: String },
    parameters: { type: Schema.Types.Mixed, default: {} },
    nextStepId: { type: String },
    conditionTrueStepId: { type: String },
    conditionFalseStepId: { type: String },
    delayMs: { type: Number },
  },
  { _id: false },
)

const workflowSchema = new Schema<IWorkflowDocument>(
  {
    name: { type: String, required: true, trim: true, maxlength: 200 },
    description: { type: String, maxlength: 1000 },
    status: {
      type: String,
      enum: ['draft', 'active', 'paused', 'archived'],
      default: 'draft',
    },
    triggerType: { type: String, required: true },
    triggerConditions: { type: Schema.Types.Mixed, default: {} },
    steps: { type: [workflowStepSchema], required: true },
    version: { type: Number, default: 1 },
    isActive: { type: Boolean, default: false },
    executionCount: { type: Number, default: 0 },
    lastExecutedAt: { type: Date },
    createdBy: { type: Schema.Types.ObjectId, ref: 'User', required: true },
  },
  { timestamps: true },
)

workflowSchema.index({ status: 1 })
workflowSchema.index({ triggerType: 1, isActive: 1 })
workflowSchema.index({ createdBy: 1 })

export const Workflow = mongoose.model<IWorkflowDocument>('Workflow', workflowSchema)
