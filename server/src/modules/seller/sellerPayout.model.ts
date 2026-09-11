import mongoose, { Schema, type Document, type Types } from 'mongoose'

// ─── Payout Account (Bank Beneficiary) ────────────────────────────────────────
export interface ISellerPayoutAccountDocument extends Document {
  sellerId: Types.ObjectId
  accountType: 'bank_account'
  bankName: string
  bankCode: string
  accountNumber: string
  accountName: string
  recipientCode?: string // Paystack recipient code (e.g. RCP_...)
  currency: string
  isDefault: boolean
  isVerified: boolean
  createdAt: Date
  updatedAt: Date
}

const sellerPayoutAccountSchema = new Schema<ISellerPayoutAccountDocument>(
  {
    sellerId: { type: Schema.Types.ObjectId, ref: 'User', required: true, index: true },
    accountType: { type: String, enum: ['bank_account'], default: 'bank_account', required: true },
    bankName: { type: String, required: true, trim: true, maxlength: 100 },
    bankCode: { type: String, required: true, trim: true, maxlength: 20 },
    accountNumber: { type: String, required: true, trim: true, maxlength: 30 },
    accountName: { type: String, required: true, trim: true, maxlength: 150 },
    recipientCode: { type: String, trim: true },
    currency: { type: String, required: true, default: 'NGN', uppercase: true },
    isDefault: { type: Boolean, default: false },
    isVerified: { type: Boolean, default: true },
  },
  { timestamps: true },
)

sellerPayoutAccountSchema.index({ sellerId: 1, accountNumber: 1, bankCode: 1 }, { unique: true })

export const SellerPayoutAccount = mongoose.model<ISellerPayoutAccountDocument>(
  'SellerPayoutAccount',
  sellerPayoutAccountSchema,
)

// ─── Withdrawal / Payout Record ───────────────────────────────────────────────
export type WithdrawalStatus =
  | 'pending'
  | 'processing'
  | 'completed'
  | 'failed'
  | 'cancelled'
  | 'reversed'

export interface IWithdrawalAuditEntry {
  status: WithdrawalStatus
  note?: string
  actorId?: Types.ObjectId | string
  timestamp: Date
}

export interface ISellerWithdrawalDocument extends Document {
  withdrawalNumber: string
  sellerId: Types.ObjectId
  amount: number
  fee: number
  netAmount: number
  currency: string
  status: WithdrawalStatus
  payoutMethod: 'paystack' | 'stripe' | 'manual'
  payoutAccount: {
    bankName: string
    bankCode: string
    accountNumber: string
    accountName: string
    recipientCode?: string
  }
  providerReference?: string
  providerTransferCode?: string
  idempotencyKey?: string
  failureReason?: string
  requestedAt: Date
  processedAt?: Date
  completedAt?: Date
  auditLog: IWithdrawalAuditEntry[]
  createdAt: Date
  updatedAt: Date
}

const sellerWithdrawalSchema = new Schema<ISellerWithdrawalDocument>(
  {
    withdrawalNumber: {
      type: String,
      required: true,
      unique: true,
      index: true,
      uppercase: true,
    },
    sellerId: { type: Schema.Types.ObjectId, ref: 'User', required: true, index: true },
    amount: { type: Number, required: true, min: 1 },
    fee: { type: Number, default: 0, min: 0 },
    netAmount: { type: Number, required: true, min: 1 },
    currency: { type: String, required: true, default: 'NGN', uppercase: true },
    status: {
      type: String,
      enum: ['pending', 'processing', 'completed', 'failed', 'cancelled', 'reversed'],
      default: 'pending',
      index: true,
    },
    payoutMethod: {
      type: String,
      enum: ['paystack', 'stripe', 'manual'],
      default: 'paystack',
      required: true,
    },
    payoutAccount: {
      bankName: { type: String, required: true },
      bankCode: { type: String, required: true },
      accountNumber: { type: String, required: true },
      accountName: { type: String, required: true },
      recipientCode: { type: String },
    },
    providerReference: { type: String, index: true },
    providerTransferCode: { type: String },
    idempotencyKey: { type: String, index: true },
    failureReason: { type: String },
    requestedAt: { type: Date, default: Date.now },
    processedAt: { type: Date },
    completedAt: { type: Date },
    auditLog: [
      {
        status: { type: String, required: true },
        note: { type: String },
        actorId: { type: Schema.Types.ObjectId, ref: 'User' },
        timestamp: { type: Date, default: Date.now },
      },
    ],
  },
  { timestamps: true },
)

sellerWithdrawalSchema.index({ sellerId: 1, createdAt: -1 })
sellerWithdrawalSchema.index({ status: 1, createdAt: -1 })

export const SellerWithdrawal = mongoose.model<ISellerWithdrawalDocument>(
  'SellerWithdrawal',
  sellerWithdrawalSchema,
)

// ─── Financial Ledger ────────────────────────────────────────────────────────
export type LedgerEntryType =
  | 'ORDER_SALE'
  | 'COMMISSION_DEDUCTION'
  | 'ORDER_REFUND'
  | 'EARNING_RELEASE'
  | 'WITHDRAWAL_RESERVE'
  | 'WITHDRAWAL_SETTLED'
  | 'WITHDRAWAL_REVERSED'
  | 'ADJUSTMENT'

export interface ISellerLedgerDocument extends Document {
  sellerId: Types.ObjectId
  type: LedgerEntryType
  amount: number // Positive or negative
  currency: string
  balanceAfter: number
  referenceType: 'order' | 'withdrawal' | 'refund' | 'admin_adjustment'
  referenceId: string
  description: string
  createdAt: Date
}

const sellerLedgerSchema = new Schema<ISellerLedgerDocument>(
  {
    sellerId: { type: Schema.Types.ObjectId, ref: 'User', required: true, index: true },
    type: {
      type: String,
      enum: [
        'ORDER_SALE',
        'COMMISSION_DEDUCTION',
        'ORDER_REFUND',
        'EARNING_RELEASE',
        'WITHDRAWAL_RESERVE',
        'WITHDRAWAL_SETTLED',
        'WITHDRAWAL_REVERSED',
        'ADJUSTMENT',
      ],
      required: true,
      index: true,
    },
    amount: { type: Number, required: true },
    currency: { type: String, required: true, default: 'NGN', uppercase: true },
    balanceAfter: { type: Number, required: true },
    referenceType: {
      type: String,
      enum: ['order', 'withdrawal', 'refund', 'admin_adjustment'],
      required: true,
    },
    referenceId: { type: String, required: true, index: true },
    description: { type: String, required: true, maxlength: 500 },
  },
  { timestamps: { createdAt: true, updatedAt: false } },
)

sellerLedgerSchema.index({ sellerId: 1, createdAt: -1 })

export const SellerLedger = mongoose.model<ISellerLedgerDocument>(
  'SellerLedger',
  sellerLedgerSchema,
)
