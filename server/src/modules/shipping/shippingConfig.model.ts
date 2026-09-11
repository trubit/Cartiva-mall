import mongoose, { type Document, type Types } from 'mongoose'

export interface IShippingConfigAudit {
  adminId: Types.ObjectId
  adminEmail?: string
  previousRates: Record<string, number>
  newRates: Record<string, number>
  timestamp: Date
  note?: string
}

export interface IShippingConfigDocument extends Document {
  fixedRates: Map<string, number> | Record<string, number>
  defaultCurrency: string
  defaultFee: number
  isActive: boolean
  updatedBy?: Types.ObjectId
  auditLog: IShippingConfigAudit[]
  createdAt: Date
  updatedAt: Date
}

const shippingConfigAuditSchema = new mongoose.Schema<IShippingConfigAudit>(
  {
    adminId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
    adminEmail: { type: String, trim: true },
    previousRates: { type: mongoose.Schema.Types.Mixed, default: {} },
    newRates: { type: mongoose.Schema.Types.Mixed, required: true },
    timestamp: { type: Date, default: Date.now },
    note: { type: String, trim: true },
  },
  { _id: false },
)

const shippingConfigSchema = new mongoose.Schema<IShippingConfigDocument>(
  {
    fixedRates: {
      type: Map,
      of: Number,
      default: () =>
        new Map([
          ['NGN', 1000],
          ['USD', 5.99],
          ['EUR', 5.5],
          ['GBP', 4.99],
          ['CAD', 7.5],
          ['AUD', 8.5],
        ]),
    },
    defaultCurrency: { type: String, default: 'NGN', uppercase: true },
    defaultFee: { type: Number, default: 1000, min: 0 },
    isActive: { type: Boolean, default: true },
    updatedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
    auditLog: { type: [shippingConfigAuditSchema], default: [] },
  },
  { timestamps: true },
)

export const ShippingConfig = mongoose.model<IShippingConfigDocument>(
  'ShippingConfig',
  shippingConfigSchema,
)
