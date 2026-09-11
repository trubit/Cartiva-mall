import mongoose, { type Document } from 'mongoose'

export type OptimizationCategory = 'cache' | 'queue' | 'batching' | 'recommendation' | 'scheduler'

export interface IOptimizationTargetDocument extends Document {
  targetKey: string
  name: string
  category: OptimizationCategory
  currentValue: number
  unit: string
  minSafeValue: number
  maxSafeValue: number
  autoApplyEnabled: boolean
  description?: string
  createdAt: Date
  updatedAt: Date
}

const optimizationTargetSchema = new mongoose.Schema<IOptimizationTargetDocument>(
  {
    targetKey: { type: String, required: true, unique: true, index: true },
    name: { type: String, required: true },
    category: {
      type: String,
      enum: ['cache', 'queue', 'batching', 'recommendation', 'scheduler'],
      required: true,
      index: true,
    },
    currentValue: { type: Number, required: true },
    unit: { type: String, required: true },
    minSafeValue: { type: Number, required: true },
    maxSafeValue: { type: Number, required: true },
    autoApplyEnabled: { type: Boolean, default: false },
    description: { type: String },
  },
  { timestamps: true },
)

export const OptimizationTarget = mongoose.model<IOptimizationTargetDocument>(
  'OptimizationTarget',
  optimizationTargetSchema,
)
