import mongoose, { Schema, type Document, type Types } from 'mongoose'
import type { JournalEntryStatus } from '../../../../src/shared/types/finance.types.js'

export interface IJournalLineDocument {
  accountId: Types.ObjectId
  accountCode: string
  accountName: string
  debit: number
  credit: number
  description?: string
}

export interface IJournalEntryDocument extends Document {
  entryNumber: string
  description: string
  reference?: string
  referenceType?: string
  referenceId?: Types.ObjectId
  lines: IJournalLineDocument[]
  totalDebit: number
  totalCredit: number
  status: JournalEntryStatus
  postedAt?: Date
  postedBy?: Types.ObjectId
  reversedAt?: Date
  reversedBy?: Types.ObjectId
  reversalOf?: Types.ObjectId
  periodId?: Types.ObjectId
  createdBy: Types.ObjectId
  createdAt: Date
  updatedAt: Date
}

const journalLineSchema = new Schema<IJournalLineDocument>(
  {
    accountId: { type: Schema.Types.ObjectId, ref: 'Account', required: true },
    accountCode: { type: String, required: true },
    accountName: { type: String, required: true },
    debit: { type: Number, default: 0, min: 0 },
    credit: { type: Number, default: 0, min: 0 },
    description: { type: String, maxlength: 500 },
  },
  { _id: false },
)

const journalEntrySchema = new Schema<IJournalEntryDocument>(
  {
    entryNumber: { type: String, required: true, unique: true },
    description: { type: String, required: true, maxlength: 1000 },
    reference: { type: String, maxlength: 200 },
    referenceType: { type: String, maxlength: 50 },
    referenceId: { type: Schema.Types.ObjectId },
    lines: {
      type: [journalLineSchema],
      required: true,
      validate: [(v: unknown[]) => v.length >= 2, 'Minimum 2 lines'],
    },
    totalDebit: { type: Number, required: true, min: 0 },
    totalCredit: { type: Number, required: true, min: 0 },
    status: { type: String, enum: ['draft', 'posted', 'reversed'], default: 'draft' },
    postedAt: { type: Date },
    postedBy: { type: Schema.Types.ObjectId, ref: 'User' },
    reversedAt: { type: Date },
    reversedBy: { type: Schema.Types.ObjectId, ref: 'User' },
    reversalOf: { type: Schema.Types.ObjectId, ref: 'JournalEntry' },
    periodId: { type: Schema.Types.ObjectId, ref: 'AccountingPeriod' },
    createdBy: { type: Schema.Types.ObjectId, ref: 'User', required: true },
  },
  { timestamps: true },
)

journalEntrySchema.index({ status: 1 })
journalEntrySchema.index({ referenceId: 1, referenceType: 1 })
journalEntrySchema.index({ createdAt: -1 })

export const JournalEntry = mongoose.model<IJournalEntryDocument>(
  'JournalEntry',
  journalEntrySchema,
)
