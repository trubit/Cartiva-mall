import mongoose, { type Document, type Types } from 'mongoose'

export interface IWishlistItemDoc {
  productId: Types.ObjectId
  addedAt: Date
}

export interface IWishlistDocument extends Document {
  userId: Types.ObjectId
  items: IWishlistItemDoc[]
}

const wishlistItemSchema = new mongoose.Schema<IWishlistItemDoc>(
  {
    productId: { type: mongoose.Schema.Types.ObjectId, ref: 'Product', required: true },
    addedAt: { type: Date, default: Date.now },
  },
  { _id: true },
)

const wishlistSchema = new mongoose.Schema<IWishlistDocument>(
  {
    userId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true,
      unique: true,
      index: true,
    },
    items: { type: [wishlistItemSchema], default: [] },
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

wishlistSchema.index({ 'items.productId': 1 })

export const Wishlist = mongoose.model<IWishlistDocument>('Wishlist', wishlistSchema)
