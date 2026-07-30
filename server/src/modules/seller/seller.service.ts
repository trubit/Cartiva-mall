import mongoose from 'mongoose'
import { SellerProfile } from './seller.model.js'
import { Product } from '../product/product.model.js'
import { Order } from '../order/order.model.js'
import { AppError } from '../../middlewares/error.middleware.js'
import { cacheGet, cacheSet } from '../../utils/cache.js'
import type {
  OnboardSellerInput,
  UpdateSellerProfileInput,
} from '../../../../src/shared/validators/seller.validators.js'

// Seller dashboard + analytics are cached for 60 s so concurrent dashboard
// refreshes don't each run 8–10 aggregation pipelines against MongoDB.
// Earnings are cached for 2 min (slightly stale is acceptable; reads are heavy).
const SELLER_DASHBOARD_TTL = 60
const SELLER_ANALYTICS_TTL = 60
const SELLER_EARNINGS_TTL = 120

// Cap the number of product IDs passed into $in operators.
// A seller with 100k products creates a 100k-element array per aggregation call.
// Above this threshold we trade some precision for query safety and log a warning.
const MAX_IN_PRODUCT_IDS = 2_000

const PLATFORM_FEE = 0.05 // 5 % platform fee

// Returns a MongoDB aggregation expression that sums lineTotal for only the seller's own items
// within a matched order document. Prevents revenue inflation from shared multi-seller carts.
const sellerItemRevenue = (ids: mongoose.Types.ObjectId[]) => ({
  $reduce: {
    input: { $filter: { input: '$items', as: 'i', cond: { $in: ['$$i.productId', ids] } } },
    initialValue: 0,
    in: { $add: ['$$value', '$$this.lineTotal'] },
  },
})

// ─── Onboard ──────────────────────────────────────────────────────────────────
export const onboardSeller = async (userId: string, input: OnboardSellerInput) => {
  const existing = await SellerProfile.findOne({ userId })
  if (existing) throw new AppError('Seller profile already exists', 409)

  return SellerProfile.create({
    userId: new mongoose.Types.ObjectId(userId),
    storeName: input.storeName,
    storeDescription: input.storeDescription ?? '',
    storeAddress: input.storeAddress ?? {},
  })
}

// ─── Get profile ──────────────────────────────────────────────────────────────
export const getSellerProfile = async (userId: string) => {
  const profile = await SellerProfile.findOne({ userId })
  if (!profile) throw new AppError('Seller profile not found. Please complete onboarding.', 404)
  return profile
}

// ─── Update profile ───────────────────────────────────────────────────────────
export const updateSellerProfile = async (userId: string, input: UpdateSellerProfileInput) => {
  const profile = await SellerProfile.findOne({ userId })
  if (!profile) throw new AppError('Seller profile not found', 404)

  if (input.storeName !== undefined) profile.storeName = input.storeName
  if (input.storeDescription !== undefined) profile.storeDescription = input.storeDescription
  if (input.storeLogo !== undefined) profile.storeLogo = input.storeLogo
  if (input.storeAddress) {
    Object.assign(profile.storeAddress, input.storeAddress)
    profile.markModified('storeAddress')
  }

  await profile.save()
  return profile
}

// ─── Dashboard ────────────────────────────────────────────────────────────────
export const getSellerDashboard = async (sellerId: string) => {
  const cacheKey = `seller:dashboard:${sellerId}`
  const cached = await cacheGet<object>(cacheKey)
  if (cached) return cached

  const sellerOid = new mongoose.Types.ObjectId(sellerId)
  let productIds = await Product.find({ sellerId: sellerOid }).distinct('_id')

  // Guard: a seller with tens of thousands of products creates a massive $in array.
  // Cap at MAX_IN_PRODUCT_IDS — very large sellers will see slightly incomplete
  // aggregation counts but the server stays responsive under load.
  if (productIds.length > MAX_IN_PRODUCT_IDS) {
    productIds = productIds.slice(0, MAX_IN_PRODUCT_IDS)
  }

  const now = new Date()
  const thisMonthStart = new Date(now.getFullYear(), now.getMonth(), 1)
  const last30Days = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000)

  const orderMatch =
    productIds.length > 0 ? { 'items.productId': { $in: productIds } } : { _id: null } // matches nothing when seller has no products yet

  const revenueExpr = sellerItemRevenue(productIds)

  const [
    productStatusBreakdown,
    totalOrders,
    revenueResult,
    thisMonthRevenue,
    pendingOrders,
    rawRecentOrders,
    revenueByDay,
    orderStatusBreakdown,
    topProducts,
  ] = await Promise.all([
    Product.aggregate([
      { $match: { sellerId: sellerOid } },
      { $group: { _id: '$status', count: { $sum: 1 } } },
    ]),
    Order.countDocuments(orderMatch),
    Order.aggregate([
      { $match: { ...orderMatch, paymentStatus: 'paid' } },
      { $group: { _id: null, total: { $sum: revenueExpr } } },
    ]),
    Order.aggregate([
      { $match: { ...orderMatch, paymentStatus: 'paid', createdAt: { $gte: thisMonthStart } } },
      { $group: { _id: null, total: { $sum: revenueExpr } } },
    ]),
    Order.countDocuments({ ...orderMatch, orderStatus: 'pending' }),
    Order.find(orderMatch)
      .sort({ createdAt: -1 })
      .limit(5)
      .populate('userId', 'firstName lastName') // email excluded — buyers' contact info stays private
      .lean(),
    Order.aggregate([
      { $match: { ...orderMatch, paymentStatus: 'paid', createdAt: { $gte: last30Days } } },
      {
        $group: {
          _id: { $dateToString: { format: '%Y-%m-%d', date: '$createdAt' } },
          revenue: { $sum: revenueExpr },
          orders: { $sum: 1 },
        },
      },
      { $sort: { _id: 1 } },
    ]),
    Order.aggregate([
      { $match: orderMatch },
      { $group: { _id: '$orderStatus', count: { $sum: 1 } } },
    ]),
    productIds.length > 0
      ? Order.aggregate([
          { $match: { 'items.productId': { $in: productIds }, paymentStatus: 'paid' } },
          { $unwind: '$items' },
          { $match: { 'items.productId': { $in: productIds } } },
          {
            $group: {
              _id: '$items.productId',
              title: { $first: '$items.title' },
              image: { $first: '$items.image' },
              totalSold: { $sum: '$items.quantity' },
              totalRevenue: { $sum: '$items.lineTotal' },
            },
          },
          { $sort: { totalRevenue: -1 } },
          { $limit: 5 },
        ])
      : Promise.resolve([]),
  ])

  // Strip items belonging to other sellers so Seller A cannot see Seller B's product details
  const pid = new Set(productIds.map((id) => id.toString()))
  const recentOrders = rawRecentOrders.map((o) => ({
    ...o,
    items: o.items.filter((item) =>
      pid.has((item.productId as mongoose.Types.ObjectId).toString()),
    ),
  }))

  const byStatus = Object.fromEntries(
    (productStatusBreakdown as { _id: string; count: number }[]).map((r) => [r._id, r.count]),
  )

  const dashboardResult = {
    stats: {
      totalRevenue: revenueResult[0]?.total ?? 0,
      totalOrders,
      totalProducts:
        (byStatus['active'] ?? 0) + (byStatus['pending'] ?? 0) + (byStatus['blocked'] ?? 0),
      activeProducts: byStatus['active'] ?? 0,
      pendingOrders,
      thisMonthRevenue: thisMonthRevenue[0]?.total ?? 0,
    },
    products: {
      active: byStatus['active'] ?? 0,
      pending: byStatus['pending'] ?? 0,
      blocked: byStatus['blocked'] ?? 0,
    },
    recentOrders,
    revenueByDay,
    orderStatusBreakdown,
    topProducts,
  }
  await cacheSet(cacheKey, dashboardResult, SELLER_DASHBOARD_TTL)
  return dashboardResult
}

// ─── Analytics ────────────────────────────────────────────────────────────────
export const getSellerAnalytics = async (sellerId: string, days = 30) => {
  const cacheKey = `seller:analytics:${sellerId}:${days}`
  const cached = await cacheGet<object>(cacheKey)
  if (cached) return cached

  const sellerOid = new mongoose.Types.ObjectId(sellerId)
  let productIds = await Product.find({ sellerId: sellerOid }).distinct('_id')
  if (productIds.length > MAX_IN_PRODUCT_IDS) productIds = productIds.slice(0, MAX_IN_PRODUCT_IDS)
  const since = new Date(Date.now() - days * 24 * 60 * 60 * 1000)

  const orderMatch =
    productIds.length > 0 ? { 'items.productId': { $in: productIds } } : { _id: null }

  const revenueExpr = sellerItemRevenue(productIds)

  const [revenueByDay, orderStatusBreakdown, topProducts, totals] = await Promise.all([
    Order.aggregate([
      { $match: { ...orderMatch, paymentStatus: 'paid', createdAt: { $gte: since } } },
      {
        $group: {
          _id: { $dateToString: { format: '%Y-%m-%d', date: '$createdAt' } },
          revenue: { $sum: revenueExpr },
          orders: { $sum: 1 },
        },
      },
      { $sort: { _id: 1 } },
    ]),
    Order.aggregate([
      { $match: orderMatch },
      { $group: { _id: '$orderStatus', count: { $sum: 1 } } },
    ]),
    productIds.length > 0
      ? Order.aggregate([
          // createdAt filter applied so topProducts respects the same `days` window as other metrics
          {
            $match: {
              'items.productId': { $in: productIds },
              paymentStatus: 'paid',
              createdAt: { $gte: since },
            },
          },
          { $unwind: '$items' },
          { $match: { 'items.productId': { $in: productIds } } },
          {
            $group: {
              _id: '$items.productId',
              title: { $first: '$items.title' },
              image: { $first: '$items.image' },
              totalSold: { $sum: '$items.quantity' },
              totalRevenue: { $sum: '$items.lineTotal' },
            },
          },
          { $sort: { totalRevenue: -1 } },
          { $limit: 5 },
        ])
      : Promise.resolve([]),
    Order.aggregate([
      { $match: { ...orderMatch, paymentStatus: 'paid' } },
      { $group: { _id: null, totalRevenue: { $sum: revenueExpr }, totalOrders: { $sum: 1 } } },
    ]),
  ])

  const totalRevenue = totals[0]?.totalRevenue ?? 0
  const totalOrders = totals[0]?.totalOrders ?? 0
  const avgOrderValue = totalOrders > 0 ? totalRevenue / totalOrders : 0

  const analyticsResult = {
    revenueByDay,
    orderStatusBreakdown,
    topProducts,
    totalRevenue,
    totalOrders,
    avgOrderValue,
  }
  await cacheSet(cacheKey, analyticsResult, SELLER_ANALYTICS_TTL)
  return analyticsResult
}

// ─── Earnings ─────────────────────────────────────────────────────────────────
export const getSellerEarnings = async (sellerId: string) => {
  const cacheKey = `seller:earnings:${sellerId}`
  const cached = await cacheGet<object>(cacheKey)
  if (cached) return cached

  const sellerOid = new mongoose.Types.ObjectId(sellerId)
  let productIds = await Product.find({ sellerId: sellerOid }).distinct('_id')
  if (productIds.length > MAX_IN_PRODUCT_IDS) productIds = productIds.slice(0, MAX_IN_PRODUCT_IDS)

  const now = new Date()
  const thisMonthStart = new Date(now.getFullYear(), now.getMonth(), 1)
  const lastMonthStart = new Date(now.getFullYear(), now.getMonth() - 1, 1)
  const lastMonthEnd = new Date(now.getFullYear(), now.getMonth(), 0, 23, 59, 59)
  const sixMonthsAgo = new Date(now.getFullYear(), now.getMonth() - 5, 1)

  const orderMatch =
    productIds.length > 0 ? { 'items.productId': { $in: productIds } } : { _id: null }

  const revenueExpr = sellerItemRevenue(productIds)

  const [totalResult, thisMonth, lastMonth, pending, revenueByMonth] = await Promise.all([
    Order.aggregate([
      { $match: { ...orderMatch, paymentStatus: 'paid' } },
      { $group: { _id: null, total: { $sum: revenueExpr } } },
    ]),
    Order.aggregate([
      { $match: { ...orderMatch, paymentStatus: 'paid', createdAt: { $gte: thisMonthStart } } },
      { $group: { _id: null, total: { $sum: revenueExpr } } },
    ]),
    Order.aggregate([
      {
        $match: {
          ...orderMatch,
          paymentStatus: 'paid',
          createdAt: { $gte: lastMonthStart, $lte: lastMonthEnd },
        },
      },
      { $group: { _id: null, total: { $sum: revenueExpr } } },
    ]),
    Order.aggregate([
      { $match: { ...orderMatch, paymentStatus: 'pending' } },
      { $group: { _id: null, total: { $sum: revenueExpr } } },
    ]),
    Order.aggregate([
      { $match: { ...orderMatch, paymentStatus: 'paid', createdAt: { $gte: sixMonthsAgo } } },
      {
        $group: {
          _id: { $dateToString: { format: '%Y-%m', date: '$createdAt' } },
          revenue: { $sum: revenueExpr },
          orders: { $sum: 1 },
        },
      },
      { $sort: { _id: 1 } },
    ]),
  ])

  const totalRevenue = totalResult[0]?.total ?? 0
  const netRevenue = totalRevenue * (1 - PLATFORM_FEE)

  const earningsResult = {
    totalRevenue,
    netRevenue,
    platformFeePercent: PLATFORM_FEE * 100,
    thisMonthRevenue: thisMonth[0]?.total ?? 0,
    lastMonthRevenue: lastMonth[0]?.total ?? 0,
    pendingBalance: pending[0]?.total ?? 0,
    availableBalance: netRevenue,
    revenueByMonth,
  }
  await cacheSet(cacheKey, earningsResult, SELLER_EARNINGS_TTL)
  return earningsResult
}
