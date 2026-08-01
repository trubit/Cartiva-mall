import mongoose, { type Document, type Types } from 'mongoose'

export type DisputeType =
  | 'item_not_received'
  | 'item_not_as_described'
  | 'damaged'
  | 'refund_delayed'
  | 'other'

export type DisputeStatus = 'open' | 'under_review' | 'resolved' | 'escalated' | 'closed'
export type DisputeResolution = 'buyer_favor' | 'seller_favor' | 'partial'

export interface IDisputeMessage {
  senderId: Types.ObjectId
  role: 'buyer' | 'seller' | 'admin'
  content: string
  createdAt: Date
}

export interface IDisputeDocument extends Document {
  orderId: Types.ObjectId
  returnId?: Types.ObjectId
  complainantId: Types.ObjectId
  respondentId: Types.ObjectId
  type: DisputeType
  description: string
  status: DisputeStatus
  resolution?: DisputeResolution
  resolutionNotes?: string
  evidence: { url: string; type: 'image' | 'document'; uploadedBy: Types.ObjectId }[]
  messages: IDisputeMessage[]
  resolvedAt?: Date
  createdAt: Date
  updatedAt: Date
}

const disputeMessageSchema = new mongoose.Schema<IDisputeMessage>(
  {
    senderId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
    role: { type: String, enum: ['buyer', 'seller', 'admin'], required: true },
    content: { type: String, required: true, trim: true, maxlength: 2000 },
    createdAt: { type: Date, default: Date.now },
  },
  { _id: false },
)

const disputeSchema = new mongoose.Schema<IDisputeDocument>(
  {
    orderId: { type: mongoose.Schema.Types.ObjectId, ref: 'Order', required: true, index: true },
    returnId: { type: mongoose.Schema.Types.ObjectId, ref: 'Return' },
    complainantId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true,
      index: true,
    },
    respondentId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
    type: {
      type: String,
      enum: ['item_not_received', 'item_not_as_described', 'damaged', 'refund_delayed', 'other'],
      required: true,
    },
    description: { type: String, required: true, trim: true, maxlength: 2000 },
    status: {
      type: String,
      enum: ['open', 'under_review', 'resolved', 'escalated', 'closed'],
      default: 'open',
      index: true,
    },
    resolution: { type: String, enum: ['buyer_favor', 'seller_favor', 'partial'] },
    resolutionNotes: { type: String, trim: true, maxlength: 2000 },
    evidence: [
      {
        url: { type: String, required: true },
        type: { type: String, enum: ['image', 'document'], required: true },
        uploadedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
        _id: false,
      },
    ],
    messages: { type: [disputeMessageSchema], default: [] },
    resolvedAt: { type: Date },
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

disputeSchema.index({ complainantId: 1, createdAt: -1 })
disputeSchema.index({ status: 1, createdAt: -1 })

export const Dispute = mongoose.model<IDisputeDocument>('Dispute', disputeSchema)
