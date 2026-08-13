import { Schema, model, Document, Types } from 'mongoose'

export interface IMfaDoc extends Document {
  userId: Types.ObjectId
  secret: string
  isEnabled: boolean
  enabledAt?: Date
  recoveryCodes: string[]
  usedRecoveryCodes: string[]
  lastUsedAt?: Date
}

const mfaSchema = new Schema<IMfaDoc>(
  {
    userId: { type: Schema.Types.ObjectId, ref: 'User', required: true, unique: true },
    secret: { type: String, required: true },
    isEnabled: { type: Boolean, default: false },
    enabledAt: { type: Date },
    recoveryCodes: [{ type: String }],
    usedRecoveryCodes: [{ type: String }],
    lastUsedAt: { type: Date },
  },
  { timestamps: true },
)

export const Mfa = model<IMfaDoc>('Mfa', mfaSchema)
