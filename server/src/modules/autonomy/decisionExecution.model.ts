import mongoose, { Schema, type Document } from 'mongoose'

export type ExecutionStatus = 'pending' | 'executing' | 'completed' | 'failed' | 'rolled_back'

export interface IDecisionExecutionDocument extends Document {
  executionId: string
  decisionId: string
  actionName: string
  autonomyLevel: number
  workflowExecutionId?: string
  idempotencyKey: string
  status: ExecutionStatus
  startedAt: Date
  completedAt?: Date
  result?: Record<string, unknown>
  error?: string
  rollbackStatus?: 'none' | 'pending' | 'completed' | 'failed'
  rollbackAt?: Date
  createdAt: Date
  updatedAt: Date
}

const DecisionExecutionSchema = new Schema<IDecisionExecutionDocument>(
  {
    executionId: { type: String, required: true, unique: true, index: true },
    decisionId: { type: String, required: true, index: true },
    actionName: { type: String, required: true, index: true },
    autonomyLevel: { type: Number, required: true },
    workflowExecutionId: { type: String, index: true },
    idempotencyKey: { type: String, required: true, unique: true, index: true },
    status: {
      type: String,
      enum: ['pending', 'executing', 'completed', 'failed', 'rolled_back'],
      default: 'pending',
      index: true,
    },
    startedAt: { type: Date, default: Date.now },
    completedAt: { type: Date },
    result: { type: Schema.Types.Mixed, default: {} },
    error: { type: String },
    rollbackStatus: {
      type: String,
      enum: ['none', 'pending', 'completed', 'failed'],
      default: 'none',
    },
    rollbackAt: { type: Date },
  },
  { timestamps: true },
)

export const DecisionExecution = mongoose.model<IDecisionExecutionDocument>(
  'DecisionExecution',
  DecisionExecutionSchema,
)
