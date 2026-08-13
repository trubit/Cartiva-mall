import mongoose, { Schema, type Document, type Types } from 'mongoose'
import type { PeriodStatus } from '../../../../src/shared/types/finance.types.js'

export interface IAccountingPeriodDocument extends Document {
  name: string
  startDate: Date
  endDate: Date
  status: PeriodStatus
  closedAt?: Date
  closedBy?: Types.ObjectId
  createdAt: Date
  updatedAt: Date
}

const accountingPeriodSchema = new Schema<IAccountingPeriodDocument>(
  {
    name: { type: String, required: true, trim: true, maxlength: 100 },
    startDate: { type: Date, required: true },
    endDate: { type: Date, required: true },
    status: { type: String, enum: ['open', 'closed', 'locked'], default: 'open' },
    closedAt: { type: Date },
    closedBy: { type: Schema.Types.ObjectId, ref: 'User' },
  },
  { timestamps: true },
)

accountingPeriodSchema.index({ startDate: 1, endDate: 1 })
accountingPeriodSchema.index({ status: 1 })

export const AccountingPeriod = mongoose.model<IAccountingPeriodDocument>(
  'AccountingPeriod',
  accountingPeriodSchema,
)
