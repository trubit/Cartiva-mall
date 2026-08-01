import mongoose, { type Document, type Types } from 'mongoose'

export interface IConversationDocument extends Document {
  participants: Types.ObjectId[]
  productId?: Types.ObjectId
  orderId?: Types.ObjectId
  subject?: string
  lastMessage?: string
  lastMessageAt?: Date
  unreadCounts: Map<string, number>
  isArchived: Map<string, boolean>
  createdAt: Date
  updatedAt: Date
}

const conversationSchema = new mongoose.Schema<IConversationDocument>(
  {
    participants: {
      type: [mongoose.Schema.Types.ObjectId],
      ref: 'User',
      required: true,
      validate: {
        validator: (v: unknown[]) => v.length >= 2,
        message: 'Need at least 2 participants',
      },
    },
    productId: { type: mongoose.Schema.Types.ObjectId, ref: 'Product' },
    orderId: { type: mongoose.Schema.Types.ObjectId, ref: 'Order' },
    subject: { type: String, trim: true, maxlength: 200 },
    lastMessage: { type: String, trim: true, maxlength: 200 },
    lastMessageAt: { type: Date },
    unreadCounts: { type: Map, of: Number, default: {} },
    isArchived: { type: Map, of: Boolean, default: {} },
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

conversationSchema.index({ participants: 1 })
conversationSchema.index({ participants: 1, lastMessageAt: -1 })
conversationSchema.index({ orderId: 1 }, { sparse: true })
conversationSchema.index({ productId: 1 }, { sparse: true })

export const Conversation = mongoose.model<IConversationDocument>(
  'Conversation',
  conversationSchema,
)
