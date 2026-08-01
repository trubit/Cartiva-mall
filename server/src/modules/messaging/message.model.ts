import mongoose, { type Document, type Types } from 'mongoose'

export type MessageType = 'text' | 'image'

export interface IMessageDocument extends Document {
  conversationId: Types.ObjectId
  senderId: Types.ObjectId
  content: string
  type: MessageType
  imageUrl?: string
  readBy: Types.ObjectId[]
  editedAt?: Date
  deletedAt?: Date
  createdAt: Date
  updatedAt: Date
}

const messageSchema = new mongoose.Schema<IMessageDocument>(
  {
    conversationId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Conversation',
      required: true,
      index: true,
    },
    senderId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true,
    },
    content: { type: String, required: true, trim: true, maxlength: 2000 },
    type: { type: String, enum: ['text', 'image'], default: 'text' },
    imageUrl: { type: String, trim: true },
    readBy: { type: [mongoose.Schema.Types.ObjectId], ref: 'User', default: [] },
    editedAt: { type: Date },
    deletedAt: { type: Date },
  },
  {
    timestamps: true,
    toJSON: {
      transform: (_doc, ret: Record<string, unknown>) => {
        delete ret.__v
        // Replace content with tombstone for soft-deleted messages
        if (ret.deletedAt) {
          ret.content = '[Message deleted]'
          ret.imageUrl = undefined
        }
        return ret
      },
    },
  },
)

messageSchema.index({ conversationId: 1, createdAt: 1 })
messageSchema.index({ conversationId: 1, createdAt: -1 })
messageSchema.index({ senderId: 1 })

export const Message = mongoose.model<IMessageDocument>('Message', messageSchema)
