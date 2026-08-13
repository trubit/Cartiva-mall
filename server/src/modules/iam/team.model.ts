import { Schema, model, Document, Types } from 'mongoose'

export interface ITeamDoc extends Document {
  name: string
  description?: string
  organizationId: Types.ObjectId
  leaderId?: Types.ObjectId
  memberIds: Types.ObjectId[]
  roleIds: Types.ObjectId[]
  isActive: boolean
}

const teamSchema = new Schema<ITeamDoc>(
  {
    name: { type: String, required: true },
    description: { type: String },
    organizationId: { type: Schema.Types.ObjectId, ref: 'Organization', required: true },
    leaderId: { type: Schema.Types.ObjectId, ref: 'User' },
    memberIds: [{ type: Schema.Types.ObjectId, ref: 'User' }],
    roleIds: [{ type: Schema.Types.ObjectId, ref: 'Role' }],
    isActive: { type: Boolean, default: true },
  },
  { timestamps: true },
)

teamSchema.index({ organizationId: 1 })
teamSchema.index({ memberIds: 1 })
teamSchema.index({ name: 1, organizationId: 1 }, { unique: true })

export const Team = model<ITeamDoc>('Team', teamSchema)
