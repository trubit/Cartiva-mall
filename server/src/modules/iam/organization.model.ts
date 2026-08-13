import { Schema, model, Document, Types } from 'mongoose'

export interface IOrganizationDoc extends Document {
  name: string
  slug: string
  description?: string
  ownerId: Types.ObjectId
  memberIds: Types.ObjectId[]
  isActive: boolean
  settings: Record<string, unknown>
}

const organizationSchema = new Schema<IOrganizationDoc>(
  {
    name: { type: String, required: true, unique: true },
    slug: { type: String, required: true, unique: true },
    description: { type: String },
    ownerId: { type: Schema.Types.ObjectId, ref: 'User', required: true },
    memberIds: [{ type: Schema.Types.ObjectId, ref: 'User' }],
    isActive: { type: Boolean, default: true },
    settings: { type: Schema.Types.Mixed, default: {} },
  },
  { timestamps: true },
)

organizationSchema.index({ ownerId: 1 })
organizationSchema.index({ memberIds: 1 })

export const Organization = model<IOrganizationDoc>('Organization', organizationSchema)
