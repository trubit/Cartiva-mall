import mongoose, { type Document } from 'mongoose'

export interface IBrandDocument extends Document {
  name: string
  slug: string
  description?: string
  logoUrl?: string
  websiteUrl?: string
  status: 'ACTIVE' | 'INACTIVE'
  metadata: Record<string, unknown>
  createdAt: Date
  updatedAt: Date
}

const brandSchema = new mongoose.Schema<IBrandDocument>(
  {
    name: { type: String, required: true, trim: true, maxlength: 100 },
    slug: { type: String, required: true, unique: true, trim: true, lowercase: true },
    description: { type: String, trim: true, maxlength: 1000 },
    logoUrl: { type: String, trim: true },
    websiteUrl: { type: String, trim: true },
    status: { type: String, enum: ['ACTIVE', 'INACTIVE'], default: 'ACTIVE' },
    metadata: { type: Map, of: mongoose.Schema.Types.Mixed, default: {} },
  },
  {
    timestamps: true,
    toJSON: {
      virtuals: true,
      transform: (_doc, ret: Record<string, unknown>) => {
        delete ret.__v
        return ret
      },
    },
  },
)

brandSchema.index({ status: 1 })

export const Brand = mongoose.model<IBrandDocument>('Brand', brandSchema)
