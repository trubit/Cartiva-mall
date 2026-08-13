import mongoose, { Schema, type Document, type Types } from 'mongoose'
import type { ExecutionStatus, TriggerType } from '../../../../src/shared/types/workflow.types.js'

export interface IWorkflowExecutionDocument extends Document {
  workflowId: Types.ObjectId
  triggerType: TriggerType
  triggerData: Record<string, unknown>
  status: ExecutionStatus
  currentStepId?: string
  stepsCompleted: string[]
  stepsFailed: string[]
  logs: { stepId: string; message: string; at: Date; level: 'info' | 'warn' | 'error' }[]
  startedAt?: Date
  completedAt?: Date
  failedAt?: Date
  errorMessage?: string
  createdAt: Date
  updatedAt: Date
}

const logSchema = new Schema(
  {
    stepId: { type: String, required: true },
    message: { type: String, required: true },
    at: { type: Date, default: Date.now },
    level: { type: String, enum: ['info', 'warn', 'error'], default: 'info' },
  },
  { _id: false },
)

const workflowExecutionSchema = new Schema<IWorkflowExecutionDocument>(
  {
    workflowId: { type: Schema.Types.ObjectId, ref: 'Workflow', required: true },
    triggerType: { type: String, required: true },
    triggerData: { type: Schema.Types.Mixed, default: {} },
    status: {
      type: String,
      enum: ['pending', 'running', 'completed', 'failed', 'cancelled'],
      default: 'pending',
    },
    currentStepId: { type: String },
    stepsCompleted: { type: [String], default: [] },
    stepsFailed: { type: [String], default: [] },
    logs: { type: [logSchema], default: [] },
    startedAt: { type: Date },
    completedAt: { type: Date },
    failedAt: { type: Date },
    errorMessage: { type: String, maxlength: 2000 },
  },
  { timestamps: true },
)

workflowExecutionSchema.index({ workflowId: 1 })
workflowExecutionSchema.index({ status: 1 })
workflowExecutionSchema.index({ createdAt: -1 })

export const WorkflowExecution = mongoose.model<IWorkflowExecutionDocument>(
  'WorkflowExecution',
  workflowExecutionSchema,
)
