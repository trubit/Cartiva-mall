import mongoose, { type Document, type Types } from 'mongoose'

export type PaymentDocStatus = 'pending' | 'processing' | 'completed' | 'failed' | 'refunded'

export interface IPaymentDocument extends Document {
  userId: Types.ObjectId
  orderId: Types.ObjectId
  paymentIntentId: string
  transactionId?: string
  paymentMethod: string
  currency: string
  amount: number
  status: PaymentDocStatus
  createdAt: Date
  updatedAt: Date
}

const paymentSchema = new mongoose.Schema<IPaymentDocument>(
  {
    userId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true, index: true },
    orderId: { type: mongoose.Schema.Types.ObjectId, ref: 'Order', required: true, index: true },
    paymentIntentId: { type: String, required: true, unique: true, index: true },
    transactionId: { type: String, index: true, sparse: true },
    paymentMethod: { type: String, required: true, default: 'card' },
    currency: { type: String, required: true, uppercase: true, default: 'USD' },
    amount: { type: Number, required: true, min: 0 },
    status: {
      type: String,
      enum: ['pending', 'processing', 'completed', 'failed', 'refunded'],
      default: 'pending',
      index: true,
    },
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

export const Payment = mongoose.model<IPaymentDocument>('Payment', paymentSchema)
