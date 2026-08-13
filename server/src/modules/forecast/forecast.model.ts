import mongoose, { Schema, type Document } from 'mongoose'
import type { ForecastType } from '../../../../src/shared/types/forecast.types.js'

export interface IForecastDocument extends Document {
  type: ForecastType
  title: string
  horizon: number
  granularity: 'day' | 'week' | 'month'
  dataPoints: {
    date: Date
    predicted: number
    actual?: number
    confidenceLow: number
    confidenceHigh: number
  }[]
  confidenceScore: number
  modelVersion: string
  generatedAt: Date
  parameters: Record<string, unknown>
  createdAt: Date
}

const dataPointSchema = new Schema(
  {
    date: { type: Date, required: true },
    predicted: { type: Number, required: true },
    actual: { type: Number },
    confidenceLow: { type: Number, required: true },
    confidenceHigh: { type: Number, required: true },
  },
  { _id: false },
)

const forecastSchema = new Schema<IForecastDocument>(
  {
    type: {
      type: String,
      enum: [
        'sales_daily',
        'sales_weekly',
        'sales_monthly',
        'inventory_depletion',
        'customer_churn',
        'revenue_projection',
        'shipping_demand',
        'refund_projection',
        'vendor_performance',
      ],
      required: true,
    },
    title: { type: String, required: true, maxlength: 200 },
    horizon: { type: Number, required: true, min: 1, max: 365 },
    granularity: { type: String, enum: ['day', 'week', 'month'], required: true },
    dataPoints: { type: [dataPointSchema], required: true },
    confidenceScore: { type: Number, required: true, min: 0, max: 100 },
    modelVersion: { type: String, default: '1.0.0' },
    generatedAt: { type: Date, default: Date.now },
    parameters: { type: Schema.Types.Mixed, default: {} },
  },
  { timestamps: { createdAt: true, updatedAt: false } },
)

forecastSchema.index({ type: 1, generatedAt: -1 })
forecastSchema.index({ createdAt: -1 })

export const Forecast = mongoose.model<IForecastDocument>('Forecast', forecastSchema)
