import mongoose, { type Document, type Types } from 'mongoose'

export type CommissionStatus = 'pending' | 'calculated' | 'paid'

export interface ICommissionDocument extends Document {
  orderId: Types.ObjectId
  sellerId: Types.ObjectId
  saleAmount: number
  commissionRate: number
  commissionAmount: number
  platformAmount: number
  sellerEarning: number
  status: CommissionStatus
  payoutId?: Types.ObjectId
  periodStart: Date
  periodEnd: Date
  createdAt: Date
  updatedAt: Date
}

const commissionSchema = new mongoose.Schema<ICommissionDocument>(
  {
    orderId: { type: mongoose.Schema.Types.ObjectId, ref: 'Order', required: true, index: true },
    sellerId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true, index: true },
    saleAmount: { type: Number, required: true, min: 0 },
    commissionRate: { type: Number, required: true, min: 0, max: 100 },
    commissionAmount: { type: Number, required: true, min: 0 },
    platformAmount: { type: Number, required: true, min: 0 },
    sellerEarning: { type: Number, required: true, min: 0 },
    status: { type: String, enum: ['pending', 'calculated', 'paid'], default: 'pending', index: true },
    payoutId: { type: mongoose.Schema.Types.ObjectId, ref: 'VendorPayout' },
    periodStart: { type: Date, required: true },
    periodEnd: { type: Date, required: true },
  },
  {
    timestamps: true,
    toJSON: { transform: (_doc, ret: Record<string, unknown>) => { delete ret.__v; return ret } },
  },
)

commissionSchema.index({ sellerId: 1, status: 1 })
commissionSchema.index({ sellerId: 1, createdAt: -1 })

export const Commission = mongoose.model<ICommissionDocument>('Commission', commissionSchema)
