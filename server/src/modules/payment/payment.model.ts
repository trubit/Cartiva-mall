import mongoose, { type Document, type Types } from 'mongoose'

export type PaymentDocStatus =
  | 'pending'
  | 'processing'
  | 'authorized'
  | 'captured'
  | 'completed'
  | 'failed'
  | 'cancelled'
  | 'refunded'
  | 'partially_refunded'

export interface IRefundLog {
  refundId: string
  amount: number
  reason?: string
  status: string
  createdAt: Date
}

export interface IPaymentDocument extends Document {
  userId: Types.ObjectId
  orderId: Types.ObjectId
  provider: 'paystack' | 'stripe'
  paymentIntentId: string
  clientSecret?: string
  transactionId?: string
  paymentMethod: string
  currency: string
  amount: number
  status: PaymentDocStatus
  metadata?: Record<string, unknown>
  refunds: IRefundLog[]
  createdAt: Date
  updatedAt: Date
}

const refundLogSchema = new mongoose.Schema<IRefundLog>(
  {
    refundId: { type: String, required: true },
    amount: { type: Number, required: true, min: 0 },
    reason: { type: String },
    status: { type: String, required: true, default: 'succeeded' },
    createdAt: { type: Date, default: Date.now },
  },
  { _id: false },
)

const paymentSchema = new mongoose.Schema<IPaymentDocument>(
  {
    userId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true, index: true },
    orderId: { type: mongoose.Schema.Types.ObjectId, ref: 'Order', required: true, index: true },
    provider: {
      type: String,
      enum: ['paystack', 'stripe'],
      required: true,
      default: 'paystack',
      index: true,
    },
    paymentIntentId: { type: String, required: true, unique: true, index: true },
    clientSecret: { type: String },
    transactionId: { type: String, index: true, sparse: true },
    paymentMethod: { type: String, required: true, default: 'card' },
    currency: { type: String, required: true, uppercase: true, default: 'USD' },
    amount: { type: Number, required: true, min: 0 },
    status: {
      type: String,
      enum: [
        'pending',
        'processing',
        'authorized',
        'captured',
        'completed',
        'failed',
        'cancelled',
        'refunded',
        'partially_refunded',
      ],
      default: 'pending',
      index: true,
    },
    metadata: { type: mongoose.Schema.Types.Mixed },
    refunds: { type: [refundLogSchema], default: [] },
  },
  {
    timestamps: true,
    toJSON: {
      transform: (_doc, ret: Record<string, unknown>) => {
        delete ret.__v
        return ret
      },
    },
  },
)

paymentSchema.index({ orderId: 1, status: 1 })
paymentSchema.index({ provider: 1, status: 1 })

export const Payment = mongoose.model<IPaymentDocument>('Payment', paymentSchema)
