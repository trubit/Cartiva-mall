import { Schema, model, Document, Types } from 'mongoose'

export interface IWorkflowTemplateDoc extends Document {
  name: string
  description?: string
  category: string
  triggerType: string
  steps: Record<string, unknown>[]
  tags: string[]
  isPublic: boolean
  usageCount: number
  createdBy: Types.ObjectId
}

const workflowTemplateSchema = new Schema<IWorkflowTemplateDoc>(
  {
    name: { type: String, required: true },
    description: { type: String },
    category: { type: String, required: true, default: 'general' },
    triggerType: { type: String, required: true },
    steps: [{ type: Schema.Types.Mixed }],
    tags: [{ type: String }],
    isPublic: { type: Boolean, default: true },
    usageCount: { type: Number, default: 0 },
    createdBy: { type: Schema.Types.ObjectId, ref: 'User', required: true },
  },
  { timestamps: true },
)

workflowTemplateSchema.index({ category: 1 })
workflowTemplateSchema.index({ triggerType: 1 })
workflowTemplateSchema.index({ isPublic: 1 })
workflowTemplateSchema.index({ tags: 1 })

export const WorkflowTemplate = model<IWorkflowTemplateDoc>(
  'WorkflowTemplate',
  workflowTemplateSchema,
)
