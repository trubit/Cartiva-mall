import mongoose, { Schema, type Document, type Types } from 'mongoose'
import type { ReportType } from '../../../../src/shared/types/finance.types.js'

export interface IFinancialReportDocument extends Document {
  type: ReportType
  title: string
  periodStart: Date
  periodEnd: Date
  data: Record<string, unknown>
  generatedBy: Types.ObjectId
  createdAt: Date
}

const financialReportSchema = new Schema<IFinancialReportDocument>(
  {
    type: {
      type: String,
      enum: ['profit_loss', 'balance_sheet', 'cash_flow', 'tax_summary', 'commission_summary'],
      required: true,
    },
    title: { type: String, required: true, maxlength: 200 },
    periodStart: { type: Date, required: true },
    periodEnd: { type: Date, required: true },
    data: { type: Schema.Types.Mixed, required: true },
    generatedBy: { type: Schema.Types.ObjectId, ref: 'User', required: true },
  },
  { timestamps: { createdAt: true, updatedAt: false } },
)

financialReportSchema.index({ type: 1 })
financialReportSchema.index({ periodStart: 1, periodEnd: 1 })
financialReportSchema.index({ createdAt: -1 })

export const FinancialReport = mongoose.model<IFinancialReportDocument>(
  'FinancialReport',
  financialReportSchema,
)
