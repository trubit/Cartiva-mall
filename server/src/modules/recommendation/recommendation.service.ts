import mongoose from 'mongoose'
import { redis } from '../../database/redis.js'
import { Product, type IProductDocument } from '../product/product.model.js'
import { Order } from '../order/order.model.js'
import { UserBehavior, EVENT_SCORES, type BehaviorEventType } from './userBehavior.model.js'
import type { ProductCategory } from '../../../../src/shared/constants/index.js'

const CACHE_TTL = {
  personalized: 300,
  fbt: 600,
  bestSellers: 1800,
  newArrivals: 900,
  home: 180,
}

// ─── Behaviour tracking ───────────────────────────────────────────────────────

export async function trackBehavior(
  userId?: string,
  eventType?: BehaviorEventType,
  opts: {
    productId?: string
    category?: string
    query?: string
    anonymousSessionId?: string
    metadata?: Record<string, unknown>
  } = {},
): Promise<void> {
  const type = eventType ?? 'view'
  const score = EVENT_SCORES[type] ?? 1

  await UserBehavior.create({
    ...(userId ? { userId: new mongoose.Types.ObjectId(userId) } : {}),
    ...(opts.anonymousSessionId ? { anonymousSessionId: opts.anonymousSessionId } : {}),
    eventType: type,
    score,
    ...(opts.productId ? { productId: new mongoose.Types.ObjectId(opts.productId) } : {}),
    ...(opts.category ? { category: opts.category } : {}),
    ...(opts.query ? { query: opts.query } : {}),
    ...(opts.metadata ? { metadata: opts.metadata } : {}),
  })

  // Also push to recently viewed Redis set if productId provided
  if (opts.productId && (userId || opts.anonymousSessionId)) {
    const key = `rec:recent:${userId ?? opts.anonymousSessionId}`
    await redis.lpush(key, opts.productId).catch(() => null)
    await redis.ltrim(key, 0, 19).catch(() => null)
    await redis.expire(key, 7 * 24 * 3600).catch(() => null)
  }
}

// ─── Category affinity for a user (last 90 days) ─────────────────────────────

async function getCategoryAffinity(userId: string): Promise<{ category: string; score: number }[]> {
  const result = await UserBehavior.aggregate<{ _id: string; totalScore: number }>([
    {
      $match: {
        userId: new mongoose.Types.ObjectId(userId),
        category: { $ne: null },
        createdAt: { $gte: new Date(Date.now() - 90 * 24 * 3600 * 1000) },
      },
    },
    { $group: { _id: '$category', totalScore: { $sum: '$score' } } },
    { $sort: { totalScore: -1 } },
    { $limit: 5 },
  ])
  return result.map((r) => ({ category: r._id, score: r.totalScore }))
}

// ─── Purchased product IDs for a user ────────────────────────────────────────

async function getPurchasedProductIds(userId: string): Promise<mongoose.Types.ObjectId[]> {
  const orders = await Order.find(
    {
      userId: new mongoose.Types.ObjectId(userId),
      orderStatus: { $in: ['confirmed', 'shipped', 'delivered'] },
    },
    { items: 1 },
  ).lean()
  const ids: mongoose.Types.ObjectId[] = []
  for (const o of orders) {
    for (const item of o.items) ids.push(item.productId as mongoose.Types.ObjectId)
  }
  return ids
}

// ─── Personalized recommendations ────────────────────────────────────────────

export async function getPersonalizedRecommendations(
  userId: string,
  limit = 12,
): Promise<IProductDocument[]> {
  const key = `rec:personalized:${userId}:${limit}`
  const cached = await redis.get(key)
  if (cached) return JSON.parse(cached) as IProductDocument[]

  const [affinities, purchasedIds] = await Promise.all([
    getCategoryAffinity(userId),
    getPurchasedProductIds(userId),
  ])

  let products: IProductDocument[] = []

  if (affinities.length > 0) {
    const topCategories = affinities.map((a) => a.category) as ProductCategory[]
    products = await Product.find({
      status: { $in: ['PUBLISHED', 'active', 'APPROVED'] },
      category: { $in: topCategories },
      stockQuantity: { $gt: 0 },
      ...(purchasedIds.length > 0 ? { _id: { $nin: purchasedIds } } : {}),
    } as object)
      .sort({ ratingsAverage: -1, views: -1 })
      .limit(limit)
      .lean()
  }

  // Cold-start fill
  if (products.length < limit) {
    const needed = limit - products.length
    const existingIds = products.map((p) => (p as unknown as { _id: mongoose.Types.ObjectId })._id)
    const fill = await Product.find({
      status: { $in: ['PUBLISHED', 'active', 'APPROVED'] },
      ratingsAverage: { $gte: 4 },
      stockQuantity: { $gt: 0 },
      _id: { $nin: [...purchasedIds, ...existingIds] },
    } as object)
      .sort({ ratingsAverage: -1 })
      .limit(needed)
      .lean()
    products = [...products, ...fill]
  }

  void redis.setex(key, CACHE_TTL.personalized, JSON.stringify(products))
  return products
}

// ─── Frequently Bought Together ───────────────────────────────────────────────

export async function getFrequentlyBoughtTogether(productId: string, limit = 8): Promise<object[]> {
  const key = `rec:fbt:${productId}:${limit}`
  const cached = await redis.get(key)
  if (cached) return JSON.parse(cached) as object[]

  const pid = new mongoose.Types.ObjectId(productId)

  const result = await Order.aggregate([
    {
      $match: {
        'items.productId': pid,
        orderStatus: { $in: ['confirmed', 'shipped', 'delivered'] },
      },
    },
    { $unwind: '$items' },
    { $match: { 'items.productId': { $ne: pid } } },
    { $group: { _id: '$items.productId', count: { $sum: 1 } } },
    { $sort: { count: -1 } },
    { $limit: limit * 2 },
    { $lookup: { from: 'products', localField: '_id', foreignField: '_id', as: 'product' } },
    { $unwind: '$product' },
    {
      $match: {
        'product.status': 'active',
        'product.isActive': true,
        'product.stockQuantity': { $gt: 0 },
      },
    },
    { $replaceRoot: { newRoot: '$product' } },
    { $limit: limit },
  ])

  void redis.setex(key, CACHE_TTL.fbt, JSON.stringify(result))
  return result
}

// ─── Best Sellers ─────────────────────────────────────────────────────────────

export async function getBestSellers(limit = 12, category?: string): Promise<object[]> {
  const key = `rec:bestsellers:${category ?? 'all'}:${limit}`
  const cached = await redis.get(key)
  if (cached) return JSON.parse(cached) as object[]

  const sixMonthsAgo = new Date(Date.now() - 180 * 24 * 3600 * 1000)

  const pipeline: mongoose.PipelineStage[] = [
    {
      $match: {
        orderStatus: { $in: ['confirmed', 'shipped', 'delivered'] },
        createdAt: { $gte: sixMonthsAgo },
      },
    },
    { $unwind: '$items' },
    { $group: { _id: '$items.productId', totalSold: { $sum: '$items.quantity' } } },
    { $sort: { totalSold: -1 } },
    { $limit: limit * 3 },
    { $lookup: { from: 'products', localField: '_id', foreignField: '_id', as: 'product' } },
    { $unwind: '$product' },
    {
      $match: {
        'product.status': 'active',
        'product.isActive': true,
        'product.stockQuantity': { $gt: 0 },
        ...(category ? { 'product.category': category } : {}),
      },
    },
    { $addFields: { 'product.totalSold': '$totalSold' } },
    { $replaceRoot: { newRoot: '$product' } },
    { $limit: limit },
  ]

  const result = await Order.aggregate(pipeline)

  if (result.length < limit) {
    const existingIds = result.map(
      (p: Record<string, unknown>) => new mongoose.Types.ObjectId(String(p._id)),
    )
    const fill = await Product.find({
      status: { $in: ['PUBLISHED', 'active', 'APPROVED'] },
      stockQuantity: { $gt: 0 },
      ...(existingIds.length ? { _id: { $nin: existingIds } } : {}),
      ...(category ? { category: category as ProductCategory } : {}),
    } as object)
      .sort({ ratingsAverage: -1, ratingsCount: -1 })
      .limit(limit - result.length)
      .lean()
    result.push(...fill)
  }

  void redis.setex(key, CACHE_TTL.bestSellers, JSON.stringify(result))
  return result
}

// ─── New Arrivals ─────────────────────────────────────────────────────────────

export async function getNewArrivals(limit = 12): Promise<IProductDocument[]> {
  const key = `rec:newarrivals:${limit}`
  const cached = await redis.get(key)
  if (cached) return JSON.parse(cached) as IProductDocument[]

  const result = await Product.find({
    status: { $in: ['PUBLISHED', 'active', 'APPROVED'] },
    stockQuantity: { $gt: 0 },
  } as object)
    .sort({ createdAt: -1 })
    .limit(limit)
    .lean()

  void redis.setex(key, CACHE_TTL.newArrivals, JSON.stringify(result))
  return result
}

// ─── Home recommendations bundle ─────────────────────────────────────────────

export async function getHomeRecommendations(userId?: string): Promise<{
  bestSellers: object[]
  newArrivals: IProductDocument[]
  personalizedForYou: IProductDocument[] | object[]
}> {
  const key = `rec:home:${userId ?? 'anon'}`
  const cached = await redis.get(key)
  if (cached)
    return JSON.parse(cached) as {
      bestSellers: object[]
      newArrivals: IProductDocument[]
      personalizedForYou: IProductDocument[] | object[]
    }

  const [bestSellers, newArrivals, personalizedForYou] = await Promise.all([
    getBestSellers(12),
    getNewArrivals(12),
    userId ? getPersonalizedRecommendations(userId, 12) : Promise.resolve([]),
  ])

  const bundle = { bestSellers, newArrivals, personalizedForYou }
  void redis.setex(key, CACHE_TTL.home, JSON.stringify(bundle))
  return bundle
}

// ─── Invalidate caches (call after purchase) ──────────────────────────────────

export async function invalidateProductCaches(productId: string): Promise<void> {
  const fbtKeys = await redis.keys(`rec:fbt:${productId}:*`)
  if (fbtKeys.length) await redis.del(...fbtKeys)
  const bsKeys = await redis.keys('rec:bestsellers:*')
  if (bsKeys.length) await redis.del(...bsKeys)
}

// ─── Similar Products ─────────────────────────────────────────────────────────

export async function getSimilarProducts(
  productId: string,
  limit = 8,
): Promise<IProductDocument[]> {
  const key = `rec:similar:${productId}:${limit}`
  const cached = await redis.get(key)
  if (cached) return JSON.parse(cached) as IProductDocument[]

  const target = await Product.findById(productId).lean()
  if (!target) return []

  const minPrice = Math.max(0, target.price * 0.7)
  const maxPrice = target.price * 1.3

  const products = await Product.find({
    _id: { $ne: new mongoose.Types.ObjectId(productId) },
    status: { $in: ['PUBLISHED', 'active', 'APPROVED'] },
    stockQuantity: { $gt: 0 },
    category: target.category,
    price: { $gte: minPrice, $lte: maxPrice },
  } as object)
    .sort({ ratingsAverage: -1, views: -1 })
    .limit(limit)
    .lean()

  void redis.setex(key, 900, JSON.stringify(products))
  return products as unknown as IProductDocument[]
}

// ─── Related / Complementary Products ─────────────────────────────────────────

export async function getRelatedProducts(
  productId: string,
  limit = 8,
): Promise<IProductDocument[]> {
  const key = `rec:related:${productId}:${limit}`
  const cached = await redis.get(key)
  if (cached) return JSON.parse(cached) as IProductDocument[]

  const target = await Product.findById(productId).lean()
  if (!target) return []

  // Related products from brand or category with non-overlapping price points
  const products = await Product.find({
    _id: { $ne: new mongoose.Types.ObjectId(productId) },
    status: { $in: ['PUBLISHED', 'active', 'APPROVED'] },
    stockQuantity: { $gt: 0 },
    $or: [{ brand: target.brand }, { category: target.category }],
  } as object)
    .sort({ ratingsCount: -1, createdAt: -1 })
    .limit(limit)
    .lean()

  void redis.setex(key, 900, JSON.stringify(products))
  return products as unknown as IProductDocument[]
}

// ─── Trending Products ────────────────────────────────────────────────────────

export async function getTrendingProducts(limit = 12): Promise<IProductDocument[]> {
  const key = `rec:trending:${limit}`
  const cached = await redis.get(key)
  if (cached) return JSON.parse(cached) as IProductDocument[]

  const sevenDaysAgo = new Date(Date.now() - 7 * 24 * 3600 * 1000)

  const aggregated = await UserBehavior.aggregate<{ _id: mongoose.Types.ObjectId; score: number }>([
    { $match: { createdAt: { $gte: sevenDaysAgo }, productId: { $ne: null } } },
    { $group: { _id: '$productId', score: { $sum: '$score' } } },
    { $sort: { score: -1 } },
    { $limit: limit * 2 },
  ])

  const pids = aggregated.map((a) => a._id)
  let products = await Product.find({
    _id: { $in: pids },
    status: { $in: ['PUBLISHED', 'active', 'APPROVED'] },
    stockQuantity: { $gt: 0 },
  } as object).lean()

  if (products.length < limit) {
    const existing = new Set(products.map((p) => p._id.toString()))
    const fill = await Product.find({
      status: { $in: ['PUBLISHED', 'active', 'APPROVED'] },
      stockQuantity: { $gt: 0 },
      _id: { $nin: Array.from(existing).map((id) => new mongoose.Types.ObjectId(id)) },
    } as object)
      .sort({ views: -1, ratingsAverage: -1 })
      .limit(limit - products.length)
      .lean()
    products = [...products, ...fill]
  }

  void redis.setex(key, 300, JSON.stringify(products))
  return products as unknown as IProductDocument[]
}

// ─── Popular Products ─────────────────────────────────────────────────────────

export async function getPopularProducts(limit = 12): Promise<IProductDocument[]> {
  const key = `rec:popular:${limit}`
  const cached = await redis.get(key)
  if (cached) return JSON.parse(cached) as IProductDocument[]

  const products = await Product.find({
    status: { $in: ['PUBLISHED', 'active', 'APPROVED'] },
    stockQuantity: { $gt: 0 },
  } as object)
    .sort({ ratingsAverage: -1, ratingsCount: -1, views: -1 })
    .limit(limit)
    .lean()

  void redis.setex(key, 600, JSON.stringify(products))
  return products as unknown as IProductDocument[]
}

// ─── Recently Viewed ──────────────────────────────────────────────────────────

export async function getRecentlyViewed(
  userIdOrSessionId: string,
  limit = 12,
): Promise<IProductDocument[]> {
  const key = `rec:recent:${userIdOrSessionId}`
  const productIds = await redis.lrange(key, 0, limit - 1).catch(() => [])

  if (productIds.length > 0) {
    const oids = productIds.map((id) => new mongoose.Types.ObjectId(id))
    const products = await Product.find({
      _id: { $in: oids },
      status: { $in: ['PUBLISHED', 'active', 'APPROVED'] },
    } as object).lean()
    return products as unknown as IProductDocument[]
  }

  // Fallback to behavior records in DB
  const isMongoId = mongoose.isValidObjectId(userIdOrSessionId)
  const filter: Record<string, unknown> = isMongoId
    ? {
        userId: new mongoose.Types.ObjectId(userIdOrSessionId),
        eventType: 'view',
        productId: { $ne: null },
      }
    : { anonymousSessionId: userIdOrSessionId, eventType: 'view', productId: { $ne: null } }

  const events = await UserBehavior.find(filter).sort({ createdAt: -1 }).limit(limit).lean()

  const pids = events.map((e) => e.productId).filter(Boolean) as mongoose.Types.ObjectId[]
  if (pids.length === 0) return []

  const products = await Product.find({
    _id: { $in: pids },
    status: { $in: ['PUBLISHED', 'active', 'APPROVED'] },
  } as object).lean()

  return products as unknown as IProductDocument[]
}
