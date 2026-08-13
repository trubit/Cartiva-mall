import mongoose, { Schema, type Document, type Types } from 'mongoose'

export interface IAuditLedgerDocument extends Document {
  action: string
  entityType: string
  entityId: string
  userId: Types.ObjectId
  before?: Record<string, unknown>
  after?: Record<string, unknown>
  ip?: string
  createdAt: Date
}

const auditLedgerSchema = new Schema<IAuditLedgerDocument>(
  {
    action: { type: String, required: true, maxlength: 100 },
    entityType: { type: String, required: true, maxlength: 100 },
    entityId: { type: String, required: true },
    userId: { type: Schema.Types.ObjectId, ref: 'User', required: true },
    before: { type: Schema.Types.Mixed },
    after: { type: Schema.Types.Mixed },
    ip: { type: String, maxlength: 45 },
  },
  { timestamps: { createdAt: true, updatedAt: false } },
)

auditLedgerSchema.index({ entityType: 1, entityId: 1 })
auditLedgerSchema.index({ userId: 1 })
auditLedgerSchema.index({ createdAt: -1 })

export const AuditLedger = mongoose.model<IAuditLedgerDocument>('AuditLedger', auditLedgerSchema)
