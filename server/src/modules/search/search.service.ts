import mongoose from 'mongoose'
import { ProductSearchIndex, type ISearchIndexDocument } from './searchIndex.model.js'
import { SearchAnalytics } from './searchAnalytics.model.js'
import { Product } from '../product/product.model.js'
import { cacheGet, cacheSet } from '../../utils/cache.js'
import { logSecurityEvent } from '../iam/auditLog.service.js'

export interface SearchQueryParams {
  q?: string
  category?: string
  brand?: string
  sellerId?: string
  minPrice?: number
  maxPrice?: number
  minRating?: number
  inStockOnly?: boolean
  sort?: 'relevance' | 'price_asc' | 'price_desc' | 'newest' | 'rating' | 'popular'
  page?: number
  limit?: number
}

const escRegex = (s: string) => s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')

export const searchService = {
  // ─── Search Products ────────────────────────────────────────────────────────
  async search(params: SearchQueryParams) {
    const page = Math.max(1, params.page ?? 1)
    const limit = Math.min(100, Math.max(1, params.limit ?? 20))
    const skip = (page - 1) * limit

    const filter: Record<string, unknown> = { isAvailable: true }

    if (params.q && params.q.trim()) {
      filter.$text = { $search: params.q.trim() }
    }
    if (params.category) filter.category = params.category
    if (params.brand) filter.brand = new RegExp(escRegex(params.brand), 'i')
    if (params.sellerId && mongoose.Types.ObjectId.isValid(params.sellerId)) {
      filter.sellerId = new mongoose.Types.ObjectId(params.sellerId)
    }
    if (params.inStockOnly) filter.stockQuantity = { $gt: 0 }

    if (params.minPrice !== undefined || params.maxPrice !== undefined) {
      filter.price = {}
      if (params.minPrice !== undefined)
        (filter.price as Record<string, number>).$gte = params.minPrice
      if (params.maxPrice !== undefined)
        (filter.price as Record<string, number>).$lte = params.maxPrice
    }

    if (params.minRating !== undefined) {
      filter.ratingsAverage = { $gte: params.minRating }
    }

    // Sort order mapping
    let sortObj: Record<string, 1 | -1>
    switch (params.sort) {
      case 'price_asc':
        sortObj = { price: 1 }
        break
      case 'price_desc':
        sortObj = { price: -1 }
        break
      case 'rating':
        sortObj = { ratingsAverage: -1 }
        break
      case 'newest':
        sortObj = { createdAt: -1 }
        break
      case 'popular':
        sortObj = { popularityScore: -1 }
        break
      case 'relevance':
      default:
        sortObj = params.q
          ? ({ score: { $meta: 'textScore' } } as unknown as Record<string, 1 | -1>)
          : { popularityScore: -1 }
    }

    const [items, total] = await Promise.all([
      ProductSearchIndex.find(filter).sort(sortObj).skip(skip).limit(limit).lean(),
      ProductSearchIndex.countDocuments(filter),
    ])

    // Log analytics asynchronously
    if (params.q && params.q.trim().length > 1) {
      void SearchAnalytics.findOneAndUpdate(
        { query: params.q.trim().toLowerCase() },
        { $inc: { count: 1 }, $set: { resultsCount: total, lastSearchedAt: new Date() } },
        { upsert: true },
      )
    }

    return {
      items,
      total,
      page,
      limit,
      totalPages: Math.ceil(total / limit),
      hasNext: page * limit < total,
      hasPrev: page > 1,
    }
  },

  // ─── Autocomplete / Suggestions ─────────────────────────────────────────────
  async getSuggestions(query: string, limit = 8) {
    if (!query || query.trim().length < 2) return []

    const cacheKey = `search:suggestions:${query.trim().toLowerCase()}`
    const cached = await cacheGet<string[]>(cacheKey)
    if (cached) return cached

    const regex = new RegExp(`^${escRegex(query.trim())}`, 'i')
    const matches = await ProductSearchIndex.find({
      $or: [{ title: regex }, { brand: regex }, { tags: regex }],
      isAvailable: true,
    })
      .select('title brand category')
      .limit(limit)
      .lean()

    const suggestions = Array.from(new Set(matches.map((m) => m.title).filter(Boolean))).slice(
      0,
      limit,
    )

    await cacheSet(cacheKey, suggestions, 300)
    return suggestions
  },

  // ─── Search Analytics ───────────────────────────────────────────────────────
  async getAnalytics() {
    const [popular, zeroResults] = await Promise.all([
      SearchAnalytics.find({ resultsCount: { $gt: 0 } })
        .sort({ count: -1 })
        .limit(10)
        .lean(),
      SearchAnalytics.find({ resultsCount: 0 }).sort({ count: -1 }).limit(10).lean(),
    ])
    return { popular, zeroResults }
  },

  // ─── Index Sync / Rebuild ───────────────────────────────────────────────────
  async upsertProductIndex(
    productId: string,
    version?: number,
  ): Promise<ISearchIndexDocument | null> {
    if (!mongoose.Types.ObjectId.isValid(productId)) return null

    const product = await Product.findById(productId)
    if (!product || product.status === 'ARCHIVED' || product.status === 'blocked') {
      await ProductSearchIndex.deleteOne({ productId: new mongoose.Types.ObjectId(productId) })
      return null
    }

    const doc = await ProductSearchIndex.findOneAndUpdate(
      { productId: new mongoose.Types.ObjectId(productId) },
      {
        $set: {
          title: product.title,
          description: product.description,
          brand: product.brand,
          category: product.category,
          sellerId: product.sellerId,
          price: product.price,
          ratingsAverage: product.ratingsAverage,
          ratingsCount: product.ratingsCount,
          stockQuantity: product.stockQuantity,
          isAvailable: product.isActive && product.stockQuantity > 0,
          tags: product.tags,
          keywords: product.searchKeywords ?? [],
          popularityScore: (product.views ?? 0) + (product.ratingsCount ?? 0) * 10,
          version: version ?? 1,
        },
      },
      { upsert: true, returnDocument: 'after' },
    )

    return doc
  },

  async rebuildIndex(adminUserId: string) {
    const products = await Product.find({
      status: { $in: ['PUBLISHED', 'active', 'APPROVED'] },
      isActive: true,
    })

    let indexedCount = 0
    for (const p of products) {
      await this.upsertProductIndex(p._id.toString())
      indexedCount++
    }

    await logSecurityEvent({
      eventType: 'admin.search_reindex',
      userId: adminUserId,
      details: { indexedCount },
    })

    return { indexedCount, totalProducts: products.length }
  },
}
