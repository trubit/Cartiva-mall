import { Schema, model, Document } from 'mongoose'

export interface IPermissionDoc extends Document {
  name: string
  resource: string
  action: string
  description?: string
  isSystem: boolean
}

const permissionSchema = new Schema<IPermissionDoc>(
  {
    name: { type: String, required: true, unique: true },
    resource: { type: String, required: true },
    action: { type: String, required: true },
    description: { type: String },
    isSystem: { type: Boolean, default: false },
  },
  { timestamps: true },
)

permissionSchema.index({ resource: 1, action: 1 }, { unique: true })
permissionSchema.index({ isSystem: 1 })

export const Permission = model<IPermissionDoc>('Permission', permissionSchema)
