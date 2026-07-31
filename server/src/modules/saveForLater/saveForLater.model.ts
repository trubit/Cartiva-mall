import mongoose, { type Document, type Types } from 'mongoose'

export interface ISaveForLaterItem {
  productId: Types.ObjectId
  savedAt: Date
}

export interface ISaveForLaterDocument extends Document {
  userId: Types.ObjectId
  items: ISaveForLaterItem[]
}

const itemSchema = new mongoose.Schema<ISaveForLaterItem>(
  {
    productId: { type: mongoose.Schema.Types.ObjectId, ref: 'Product', required: true },
    savedAt: { type: Date, default: Date.now },
  },
  { _id: true },
)

const saveForLaterSchema = new mongoose.Schema<ISaveForLaterDocument>(
  {
    userId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true,
      unique: true,
      index: true,
    },
    items: { type: [itemSchema], default: [] },
  },
  {
    timestamps: false,
    toJSON: {
      transform: (_doc, ret: Record<string, unknown>) => {
        delete ret.__v
        return ret
      },
    },
  },
)

saveForLaterSchema.index({ 'items.productId': 1 })

export const SaveForLater = mongoose.model<ISaveForLaterDocument>(
  'SaveForLater',
  saveForLaterSchema,
)
