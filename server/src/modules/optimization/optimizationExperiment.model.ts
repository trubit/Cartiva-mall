import mongoose, { type Document } from 'mongoose'

export interface IOptimizationExperimentDocument extends Document {
  experimentId: string
  proposalId: string
  targetKey: string
  controlValue: number
  candidateValue: number
  controlLatencyMs: number
  candidateLatencyMs: number
  controlErrorRate: number
  candidateErrorRate: number
  winner: 'CONTROL' | 'CANDIDATE' | 'NEUTRAL'
  metricsCollected: number
  createdAt: Date
  updatedAt: Date
}

const optimizationExperimentSchema = new mongoose.Schema<IOptimizationExperimentDocument>(
  {
    experimentId: { type: String, required: true, unique: true, index: true },
    proposalId: { type: String, required: true, index: true },
    targetKey: { type: String, required: true, index: true },
    controlValue: { type: Number, required: true },
    candidateValue: { type: Number, required: true },
    controlLatencyMs: { type: Number, default: 0 },
    candidateLatencyMs: { type: Number, default: 0 },
    controlErrorRate: { type: Number, default: 0 },
    candidateErrorRate: { type: Number, default: 0 },
    winner: {
      type: String,
      enum: ['CONTROL', 'CANDIDATE', 'NEUTRAL'],
      default: 'NEUTRAL',
    },
    metricsCollected: { type: Number, default: 0 },
  },
  { timestamps: true },
)

export const OptimizationExperiment = mongoose.model<IOptimizationExperimentDocument>(
  'OptimizationExperiment',
  optimizationExperimentSchema,
)
