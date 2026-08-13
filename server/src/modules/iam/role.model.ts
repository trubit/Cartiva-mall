import { Schema, model, Document, Types } from 'mongoose'

export interface IRoleDoc extends Document {
  name: string
  slug: string
  description?: string
  permissions: Types.ObjectId[]
  isSystem: boolean
  status: 'active' | 'inactive'
}

const roleSchema = new Schema<IRoleDoc>(
  {
    name: { type: String, required: true, unique: true },
    slug: { type: String, required: true, unique: true },
    description: { type: String },
    permissions: [{ type: Schema.Types.ObjectId, ref: 'Permission' }],
    isSystem: { type: Boolean, default: false },
    status: { type: String, enum: ['active', 'inactive'], default: 'active' },
  },
  { timestamps: true },
)

roleSchema.index({ status: 1 })
roleSchema.index({ isSystem: 1 })

export const Role = model<IRoleDoc>('Role', roleSchema)
