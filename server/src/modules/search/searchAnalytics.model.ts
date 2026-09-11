import mongoose, { type Document } from 'mongoose'

export interface ISearchAnalyticsDocument extends Document {
  query: string
  count: number
  resultsCount: number
  lastSearchedAt: Date
}

const searchAnalyticsSchema = new mongoose.Schema<ISearchAnalyticsDocument>(
  {
    query: { type: String, required: true, unique: true, trim: true, lowercase: true, index: true },
    count: { type: Number, default: 1, min: 0 },
    resultsCount: { type: Number, default: 0, min: 0 },
    lastSearchedAt: { type: Date, default: Date.now },
  },
  { timestamps: true },
)

searchAnalyticsSchema.index({ count: -1 })
searchAnalyticsSchema.index({ resultsCount: 1 })

export const SearchAnalytics = mongoose.model<ISearchAnalyticsDocument>(
  'SearchAnalytics',
  searchAnalyticsSchema,
)
