import mongoose, { Schema, type Document } from 'mongoose'
import type { AccountType, AccountCategory } from '../../../../src/shared/types/finance.types.js'

export interface IAccountDocument extends Document {
  code: string
  name: string
  type: AccountType
  category: AccountCategory
  description?: string
  balance: number
  isActive: boolean
  createdAt: Date
  updatedAt: Date
}

const accountSchema = new Schema<IAccountDocument>(
  {
    code: { type: String, required: true, unique: true, trim: true, maxlength: 20 },
    name: { type: String, required: true, trim: true, maxlength: 200 },
    type: {
      type: String,
      enum: ['asset', 'liability', 'equity', 'revenue', 'expense'],
      required: true,
    },
    category: {
      type: String,
      enum: [
        'cash',
        'receivable',
        'payable',
        'revenue',
        'cost_of_goods',
        'operating_expense',
        'tax_payable',
        'commission',
        'settlement',
        'refund',
        'equity',
      ],
      required: true,
    },
    description: { type: String, maxlength: 500 },
    balance: { type: Number, default: 0 },
    isActive: { type: Boolean, default: true },
  },
  { timestamps: true },
)

accountSchema.index({ type: 1 })
accountSchema.index({ isActive: 1 })

export const Account = mongoose.model<IAccountDocument>('Account', accountSchema)
