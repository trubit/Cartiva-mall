import mongoose, { type Document, type Types } from 'mongoose'

export interface ICategoryDocument extends Document {
  name: string
  slug: string
  description?: string
  parentCategoryId?: Types.ObjectId
  icon?: string
  status: 'ACTIVE' | 'INACTIVE'
  metadata: Record<string, unknown>
  createdAt: Date
  updatedAt: Date
}

const categorySchema = new mongoose.Schema<ICategoryDocument>(
  {
    name: { type: String, required: true, trim: true, maxlength: 100 },
    slug: { type: String, required: true, unique: true, trim: true, lowercase: true },
    description: { type: String, trim: true, maxlength: 1000 },
    parentCategoryId: { type: mongoose.Schema.Types.ObjectId, ref: 'Category', default: null },
    icon: { type: String, trim: true },
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

categorySchema.index({ parentCategoryId: 1 })
categorySchema.index({ status: 1 })

export const Category = mongoose.model<ICategoryDocument>('Category', categorySchema)
