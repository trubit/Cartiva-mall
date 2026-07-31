import mongoose, { type Document, type Types } from 'mongoose'

export type BehaviorEventType =
  | 'view'
  | 'search'
  | 'cart_add'
  | 'cart_remove'
  | 'wishlist_add'
  | 'purchase'

export const EVENT_SCORES: Record<BehaviorEventType, number> = {
  purchase: 10,
  wishlist_add: 5,
  cart_add: 3,
  search: 2,
  view: 1,
  cart_remove: -1,
}

export interface IUserBehaviorDocument extends Document {
  userId: Types.ObjectId
  eventType: BehaviorEventType
  productId?: Types.ObjectId
  category?: string
  query?: string
  metadata?: Record<string, unknown>
  score: number
  createdAt: Date
}

const userBehaviorSchema = new mongoose.Schema<IUserBehaviorDocument>(
  {
    userId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true, index: true },
    eventType: {
      type: String,
      enum: ['view', 'search', 'cart_add', 'cart_remove', 'wishlist_add', 'purchase'],
      required: true,
    },
    productId: { type: mongoose.Schema.Types.ObjectId, ref: 'Product', index: true },
    category: { type: String, trim: true, maxlength: 100 },
    query: { type: String, trim: true, maxlength: 500 },
    metadata: { type: mongoose.Schema.Types.Mixed },
    score: { type: Number, required: true, default: 1 },
  },
  { timestamps: { createdAt: true, updatedAt: false } },
)

// Auto-expire events after 90 days
userBehaviorSchema.index({ createdAt: 1 }, { expireAfterSeconds: 90 * 24 * 3600 })
userBehaviorSchema.index({ userId: 1, eventType: 1, createdAt: -1 })
userBehaviorSchema.index({ userId: 1, productId: 1, eventType: 1 })
userBehaviorSchema.index({ category: 1, eventType: 1 })

export const UserBehavior = mongoose.model<IUserBehaviorDocument>(
  'UserBehavior',
  userBehaviorSchema,
)
