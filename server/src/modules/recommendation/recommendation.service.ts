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
  userId: string,
  eventType: BehaviorEventType,
  opts: {
    productId?: string
    category?: string
    query?: string
    metadata?: Record<string, unknown>
  } = {},
): Promise<void> {
  const score = EVENT_SCORES[eventType]
  await UserBehavior.create({
    userId: new mongoose.Types.ObjectId(userId),
    eventType,
    score,
    ...(opts.productId ? { productId: new mongoose.Types.ObjectId(opts.productId) } : {}),
    ...(opts.category ? { category: opts.category } : {}),
    ...(opts.query ? { query: opts.query } : {}),
    ...(opts.metadata ? { metadata: opts.metadata } : {}),
  })
}

// ─── Category affinity for a user (last 90 days) ─────────────────────────────

async function getCategoryAffinity(
  userId: string,
): Promise<{ category: string; score: number }[]> {
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
      status: 'active' as const,
      isActive: true,
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
    const existingIds = products.map(
      (p) => (p as unknown as { _id: mongoose.Types.ObjectId })._id,
    )
    const fill = await Product.find({
      status: 'active' as const,
      isActive: true,
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

export async function getFrequentlyBoughtTogether(
  productId: string,
  limit = 8,
): Promise<object[]> {
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
      status: 'active' as const,
      isActive: true,
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
    status: 'active' as const,
    isActive: true,
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
