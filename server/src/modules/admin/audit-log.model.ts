import mongoose, { type Document } from 'mongoose'

export interface IAuditLogDocument extends Document {
  adminId: mongoose.Types.ObjectId
  action: string
  targetType: 'user' | 'product' | 'order' | 'seller' | 'payment'
  targetId: string
  before: Record<string, unknown>
  after: Record<string, unknown>
  ip?: string
  createdAt: Date
}

const auditLogSchema = new mongoose.Schema<IAuditLogDocument>(
  {
    adminId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true, index: true },
    action: { type: String, required: true, index: true },
    targetType: {
      type: String,
      enum: ['user', 'product', 'order', 'seller', 'payment'],
      required: true,
    },
    targetId: { type: String, required: true, index: true },
    before: { type: mongoose.Schema.Types.Mixed, default: {} },
    after: { type: mongoose.Schema.Types.Mixed, default: {} },
    ip: { type: String },
  },
  { timestamps: { createdAt: true, updatedAt: false } },
)

auditLogSchema.index({ adminId: 1, createdAt: -1 })
auditLogSchema.index({ targetType: 1, targetId: 1 })

export const AuditLog = mongoose.model<IAuditLogDocument>('AuditLog', auditLogSchema)
