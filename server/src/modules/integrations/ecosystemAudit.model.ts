import mongoose, { Schema, type Document } from 'mongoose'

export interface IEcosystemAuditDocument extends Document {
  integrationId: string
  action: string
  actor: string
  details: Record<string, unknown>
  ipAddress?: string
  timestamp: Date
}

const EcosystemAuditSchema = new Schema<IEcosystemAuditDocument>(
  {
    integrationId: { type: String, required: true, index: true },
    action: { type: String, required: true, index: true },
    actor: { type: String, required: true, default: 'system' },
    details: { type: Schema.Types.Mixed, default: {} },
    ipAddress: { type: String },
    timestamp: { type: Date, default: Date.now },
  },
  { timestamps: true },
)

export const EcosystemAudit =
  mongoose.models.EcosystemAudit ||
  mongoose.model<IEcosystemAuditDocument>('EcosystemAudit', EcosystemAuditSchema)
