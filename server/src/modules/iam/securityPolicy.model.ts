import { Schema, model, Document } from 'mongoose'

export interface ISecurityPolicyDoc extends Document {
  name: string
  type: 'ip_allowlist' | 'mfa_requirement' | 'session_limit' | 'password_policy'
  rules: Record<string, unknown>
  isActive: boolean
  appliesTo: 'all' | 'admin' | 'vendor' | 'user'
}

const securityPolicySchema = new Schema<ISecurityPolicyDoc>(
  {
    name: { type: String, required: true, unique: true },
    type: {
      type: String,
      enum: ['ip_allowlist', 'mfa_requirement', 'session_limit', 'password_policy'],
      required: true,
    },
    rules: { type: Schema.Types.Mixed, default: {} },
    isActive: { type: Boolean, default: true },
    appliesTo: {
      type: String,
      enum: ['all', 'admin', 'vendor', 'user'],
      default: 'all',
    },
  },
  { timestamps: true },
)

securityPolicySchema.index({ type: 1 })
securityPolicySchema.index({ isActive: 1 })
securityPolicySchema.index({ appliesTo: 1 })

export const SecurityPolicy = model<ISecurityPolicyDoc>('SecurityPolicy', securityPolicySchema)
