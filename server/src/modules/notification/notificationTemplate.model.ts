import mongoose, { type Document } from 'mongoose'

export type TemplateChannel = 'IN_APP' | 'EMAIL' | 'PUSH' | 'SMS'

export interface INotificationTemplateDocument extends Document {
  templateId: string
  type: string
  channel: TemplateChannel
  locale: string
  subject?: string
  body: string
  variables: string[]
  version: number
  active: boolean
  createdAt: Date
  updatedAt: Date
}

const notificationTemplateSchema = new mongoose.Schema<INotificationTemplateDocument>(
  {
    templateId: { type: String, required: true, unique: true, index: true },
    type: { type: String, required: true, index: true },
    channel: { type: String, enum: ['IN_APP', 'EMAIL', 'PUSH', 'SMS'], required: true },
    locale: { type: String, default: 'en', index: true },
    subject: { type: String, trim: true },
    body: { type: String, required: true },
    variables: { type: [String], default: [] },
    version: { type: Number, default: 1 },
    active: { type: Boolean, default: true, index: true },
  },
  { timestamps: true },
)

notificationTemplateSchema.index({ type: 1, channel: 1, locale: 1 })

export const NotificationTemplate = mongoose.model<INotificationTemplateDocument>(
  'NotificationTemplate',
  notificationTemplateSchema,
)

// Safe string interpolation preventing code injection
export const renderTemplate = (
  templateBody: string,
  variables: Record<string, unknown>,
): string => {
  return templateBody.replace(/\{\{\s*([a-zA-Z0-9_]+)\s*\}\}/g, (_, key) => {
    const val = variables[key]
    if (val === undefined || val === null) return ''
    return String(val).replace(/</g, '&lt;').replace(/>/g, '&gt;')
  })
}
