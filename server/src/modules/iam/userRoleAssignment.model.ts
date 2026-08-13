import { Schema, model, Document, Types } from 'mongoose'

export interface IUserRoleAssignmentDoc extends Document {
  userId: Types.ObjectId
  roleId: Types.ObjectId
  assignedBy: Types.ObjectId
}

const userRoleAssignmentSchema = new Schema<IUserRoleAssignmentDoc>(
  {
    userId: { type: Schema.Types.ObjectId, ref: 'User', required: true },
    roleId: { type: Schema.Types.ObjectId, ref: 'Role', required: true },
    assignedBy: { type: Schema.Types.ObjectId, ref: 'User', required: true },
  },
  { timestamps: { createdAt: true, updatedAt: false } },
)

userRoleAssignmentSchema.index({ userId: 1 })
userRoleAssignmentSchema.index({ roleId: 1 })
userRoleAssignmentSchema.index({ userId: 1, roleId: 1 }, { unique: true })

export const UserRoleAssignment = model<IUserRoleAssignmentDoc>(
  'UserRoleAssignment',
  userRoleAssignmentSchema,
)
