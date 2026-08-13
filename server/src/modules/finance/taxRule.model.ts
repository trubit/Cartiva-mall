import mongoose, { Schema, type Document } from 'mongoose'
import type { TaxType } from '../../../../src/shared/types/finance.types.js'

export interface ITaxRuleDocument extends Document {
  name: string
  type: TaxType
  jurisdiction: string
  rate: number
  isActive: boolean
  appliesTo: string[]
  createdAt: Date
  updatedAt: Date
}

const taxRuleSchema = new Schema<ITaxRuleDocument>(
  {
    name: { type: String, required: true, trim: true, maxlength: 200 },
    type: { type: String, enum: ['vat', 'gst', 'sales_tax', 'withholding'], required: true },
    jurisdiction: { type: String, required: true, trim: true, maxlength: 100 },
    rate: { type: Number, required: true, min: 0, max: 100 },
    isActive: { type: Boolean, default: true },
    appliesTo: { type: [String], default: ['all'] },
  },
  { timestamps: true },
)

taxRuleSchema.index({ type: 1, jurisdiction: 1 })
taxRuleSchema.index({ isActive: 1 })

export const TaxRule = mongoose.model<ITaxRuleDocument>('TaxRule', taxRuleSchema)
