import mongoose from 'mongoose'
import { User } from '../user/user.model.js'
import { Product } from '../product/product.model.js'
import { Order } from '../order/order.model.js'
import { Payment } from '../payment/payment.model.js'
import { SellerProfile } from '../seller/seller.model.js'
import { SellerWithdrawal, SellerLedger } from '../seller/sellerPayout.model.js'
import { PayoutSettings, type IPayoutSettingsDocument } from './payoutSettings.model.js'
import { AuditLog } from './audit-log.model.js'
import { AppError } from '../../middlewares/error.middleware.js'
import { cacheGet, cacheSet, cacheDel } from '../../utils/cache.js'
import { logger } from '../../utils/logger.js'
import { createNotification } from '../notification/notification.model.js'
import { emitToUser } from '../../sockets/index.js'
import type { UserRole } from '../../../../src/shared/types/auth.types.js'
import { ORDER_STATUS, ROLES } from '../../../../src/shared/constants/index.js'

// Heavy aggregations are cached for 5 minutes so concurrent admin users
// don't each hammer MongoDB with 8–10 full-collection pipeline stages.
const ADMIN_CACHE_TTL = 5 * 60

const ADMIN_STATS_REVENUE_DAYS = 7
const ADMIN_RECENT_ORDERS_LIMIT = 5

// Escape user-supplied strings before embedding in $regex to prevent ReDoS
const esc = (s: string) => s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')

// ─── Audit helper ──────────────────────────────────────────────────────────────
export const writeAuditLog = async (params: {
  adminId: string
  action: string
  targetType: IAuditLogParams['targetType']
  targetId: string
  before?: Record<string, unknown>
  after?: Record<string, unknown>
  ip?: string
}) => {
  if (!params.adminId || !mongoose.isValidObjectId(params.adminId)) {
    logger.warn('Skipping audit log write: invalid adminId', { adminId: params.adminId })
    return
  }
  await AuditLog.create({
    adminId: new mongoose.Types.ObjectId(params.adminId),
    action: params.action,
    targetType: params.targetType,
    targetId: params.targetId,
    before: params.before ?? {},
    after: params.after ?? {},
    ip: params.ip,
  }).catch((err) => logger.warn('Audit log write failed', { err }))
}

interface IAuditLogParams {
  adminId: string
  targetType: 'user' | 'product' | 'order' | 'seller' | 'payment'
  targetId: string
  action: string
  before?: Record<string, unknown>
  after?: Record<string, unknown>
  ip?: string
}

// ─── Dashboard stats ───────────────────────────────────────────────────────────
export const getStats = async () => {
  const cached = await cacheGet<object>('admin:stats')
  if (cached) return cached

  const sevenDaysAgo = new Date(Date.now() - ADMIN_STATS_REVENUE_DAYS * 24 * 60 * 60 * 1000)

  const [
    totalUsers,
    usersByRole,
    totalProducts,
    productsByStatus,
    totalOrders,
    ordersByStatus,
    revenueResult,
    recentOrders,
    revenueByDay,
    totalSellers,
  ] = await Promise.all([
    User.countDocuments(),
    User.aggregate([{ $group: { _id: '$role', count: { $sum: 1 } } }]),
    Product.countDocuments(),
    Product.aggregate([{ $group: { _id: '$status', count: { $sum: 1 } } }]),
    Order.countDocuments(),
    Order.aggregate([{ $group: { _id: '$orderStatus', count: { $sum: 1 } } }]),
    Order.aggregate([
      { $match: { paymentStatus: 'paid' } },
      { $group: { _id: null, total: { $sum: '$grandTotal' } } },
    ]),
    Order.find()
      .sort({ createdAt: -1 })
      .limit(ADMIN_RECENT_ORDERS_LIMIT)
      .populate('userId', 'firstName lastName email')
      .lean(),
    Order.aggregate([
      { $match: { paymentStatus: 'paid', createdAt: { $gte: sevenDaysAgo } } },
      {
        $group: {
          _id: { $dateToString: { format: '%Y-%m-%d', date: '$createdAt' } },
          revenue: { $sum: '$grandTotal' },
          orders: { $sum: 1 },
        },
      },
      { $sort: { _id: 1 } },
    ]),
    SellerProfile.countDocuments(),
  ])

  const byRole = Object.fromEntries(
    usersByRole.map((r: { _id: string; count: number }) => [r._id, r.count]),
  )
  const byStatus = Object.fromEntries(
    productsByStatus.map((r: { _id: string; count: number }) => [r._id, r.count]),
  )
  const byOrder = Object.fromEntries(
    ordersByStatus.map((r: { _id: string; count: number }) => [r._id, r.count]),
  )

  const result = {
    users: {
      total: totalUsers,
      buyers: byRole[ROLES.USER] ?? 0,
      sellers: byRole[ROLES.SELLER] ?? 0,
      admins: byRole[ROLES.ADMIN] ?? 0,
    },
    products: {
      total: totalProducts,
      pending: byStatus['pending'] ?? 0,
      active: byStatus['active'] ?? 0,
      blocked: byStatus['blocked'] ?? 0,
    },
    orders: {
      total: totalOrders,
      pending: byOrder['pending'] ?? 0,
      confirmed: byOrder['confirmed'] ?? 0,
      processing: byOrder['processing'] ?? 0,
      shipped: byOrder['shipped'] ?? 0,
      delivered: byOrder['delivered'] ?? 0,
      cancelled: byOrder['cancelled'] ?? 0,
      refunded: byOrder['refunded'] ?? 0,
    },
    revenue: { total: revenueResult[0]?.total ?? 0 },
    sellers: { total: totalSellers },
    revenueByDay,
    recentOrders,
  }
  await cacheSet('admin:stats', result, ADMIN_CACHE_TTL)
  return result
}

// ─── Users ─────────────────────────────────────────────────────────────────────
export const listUsers = async (opts: {
  search?: string
  role?: string
  status?: string
  page: number
  limit: number
}) => {
  const { search, role, status, page, limit } = opts
  const filter: Record<string, unknown> = {}

  // Use text index (email, username, firstName, lastName) for efficient full-word search.
  if (search) filter.$text = { $search: search }
  if (role) filter.role = role
  if (status === 'active') filter.isActive = true
  if (status === 'inactive') filter.isActive = false

  const [users, total] = await Promise.all([
    User.find(filter)
      .select('-password -refreshTokens')
      .sort({ createdAt: -1 })
      .skip((page - 1) * limit)
      .limit(limit)
      .lean(),
    User.countDocuments(filter),
  ])

  return { users, total, page, limit, totalPages: Math.ceil(total / limit) }
}

export const toggleUserActive = async (userId: string, adminId: string, ip?: string) => {
  const user = await User.findById(userId)
  if (!user) throw new AppError('User not found', 404)
  const before = { isActive: user.isActive }
  user.isActive = !user.isActive
  await user.save({ validateBeforeSave: false })

  if (!user.isActive) {
    // Blocklist the user so existing access tokens are rejected immediately.
    // TTL = 15 min (access token lifetime) + 60 s buffer for clock skew.
    await cacheSet(`blocklist:user:${userId}`, true, 16 * 60)
  } else {
    // Re-activation: remove from blocklist so they can log in again.
    await cacheDel(`blocklist:user:${userId}`)
  }

  await writeAuditLog({
    adminId,
    action: user.isActive ? 'user.activate' : 'user.deactivate',
    targetType: 'user',
    targetId: userId,
    before,
    after: { isActive: user.isActive },
    ip,
  })
  return user
}

export const changeUserRole = async (
  userId: string,
  role: UserRole,
  adminId: string,
  ip?: string,
) => {
  // Single round-trip: returnDocument:'before' captures the old role for the audit log
  // while also performing the update atomically — no separate findById needed.
  const before = await User.findByIdAndUpdate(
    userId,
    { role },
    { returnDocument: 'before', runValidators: true },
  )
  if (!before) throw new AppError('User not found', 404)
  await writeAuditLog({
    adminId,
    action: 'user.changeRole',
    targetType: 'user',
    targetId: userId,
    before: { role: before.role },
    after: { role },
    ip,
  })
  return { ...before.toObject(), role }
}

export const deleteUser = async (userId: string, adminId: string, ip?: string) => {
  const user = await User.findById(userId)
  if (!user) throw new AppError('User not found', 404)
  await User.findByIdAndDelete(userId)
  await writeAuditLog({
    adminId,
    action: 'user.delete',
    targetType: 'user',
    targetId: userId,
    before: { email: user.email, role: user.role },
    ip,
  })
}

// ─── Sellers ───────────────────────────────────────────────────────────────────
export const listSellers = async (opts: {
  search?: string
  verified?: string
  page: number
  limit: number
}) => {
  const { search, verified, page, limit } = opts
  const filter: Record<string, unknown> = {}

  if (verified === 'true') filter.isVerified = true
  if (verified === 'false') filter.isVerified = false

  // Use text index (storeName, storeDescription) for efficient full-word search.
  if (search) filter.$text = { $search: search }

  const [sellers, total] = await Promise.all([
    SellerProfile.find(filter)
      .sort({ createdAt: -1 })
      .skip((page - 1) * limit)
      .limit(limit)
      .populate('userId', 'firstName lastName email username isActive')
      .lean(),
    SellerProfile.countDocuments(filter),
  ])

  return { sellers, total, page, limit, totalPages: Math.ceil(total / limit) }
}

export const verifySeller = async (sellerId: string, adminId: string, ip?: string) => {
  const profile = await SellerProfile.findById(sellerId)
  if (!profile) throw new AppError('Seller profile not found', 404)
  const before = { isVerified: profile.isVerified }
  profile.isVerified = !profile.isVerified
  await profile.save()
  await writeAuditLog({
    adminId,
    action: profile.isVerified ? 'seller.verify' : 'seller.unverify',
    targetType: 'seller',
    targetId: sellerId,
    before,
    after: { isVerified: profile.isVerified },
    ip,
  })
  return profile
}

// ─── Products ──────────────────────────────────────────────────────────────────
export const listAllProducts = async (opts: {
  status?: string
  search?: string
  page: number
  limit: number
}) => {
  const { status, search, page, limit } = opts
  const filter: Record<string, unknown> = {}

  if (status) filter.status = status
  if (search) {
    const r = esc(search)
    filter.$or = [
      { title: { $regex: r, $options: 'i' } },
      { brand: { $regex: r, $options: 'i' } },
      { sku: { $regex: r, $options: 'i' } },
    ]
  }

  const [products, total] = await Promise.all([
    Product.find(filter)
      .sort({ createdAt: -1 })
      .skip((page - 1) * limit)
      .limit(limit)
      .populate('sellerId', 'firstName lastName email username')
      .lean(),
    Product.countDocuments(filter),
  ])

  return { products, total, page, limit, totalPages: Math.ceil(total / limit) }
}

// ─── Orders ────────────────────────────────────────────────────────────────────
export const listAllOrders = async (opts: {
  status?: string
  paymentStatus?: string
  search?: string
  page: number
  limit: number
}) => {
  const { status, paymentStatus, search, page, limit } = opts
  const filter: Record<string, unknown> = {}

  if (status) filter.orderStatus = status
  if (paymentStatus) filter.paymentStatus = paymentStatus
  // Prefix-anchor the regex so MongoDB can use the orderNumber index prefix scan
  // instead of a full collection scan. Case-insensitive, anchored at start.
  if (search) filter.orderNumber = { $regex: `^${esc(search)}`, $options: 'i' }

  const [orders, total] = await Promise.all([
    Order.find(filter)
      .sort({ createdAt: -1 })
      .skip((page - 1) * limit)
      .limit(limit)
      .populate('userId', 'firstName lastName email')
      .lean(),
    Order.countDocuments(filter),
  ])

  return { orders, total, page, limit, totalPages: Math.ceil(total / limit) }
}

export const updateOrderStatus = async (
  orderId: string,
  orderStatus: string,
  adminId: string,
  tracking?: {
    trackingNumber?: string
    carrier?: string
    trackingUrl?: string
    estimatedDeliveryDate?: string
    location?: string
    note?: string
  },
  ip?: string,
) => {
  if (
    !Object.values(ORDER_STATUS).includes(
      orderStatus as (typeof ORDER_STATUS)[keyof typeof ORDER_STATUS],
    )
  ) {
    throw new AppError('Invalid order status', 400)
  }

  const $set: Record<string, unknown> = { orderStatus }

  if (tracking) {
    if (tracking.trackingNumber) $set['tracking.trackingNumber'] = tracking.trackingNumber
    if (tracking.carrier) $set['tracking.carrier'] = tracking.carrier
    if (tracking.trackingUrl) $set['tracking.trackingUrl'] = tracking.trackingUrl
    if (tracking.estimatedDeliveryDate) {
      // Validate before constructing — new Date('garbage') silently stores Invalid Date (NaN)
      const parsed = new Date(tracking.estimatedDeliveryDate)
      if (isNaN(parsed.getTime())) throw new AppError('Invalid estimatedDeliveryDate format', 400)
      $set['tracking.estimatedDeliveryDate'] = parsed
    }
  }

  const defaultNote: Record<string, string> = {
    confirmed: 'Order confirmed',
    processing: 'Order processing',
    shipped: 'Order shipped',
    outForDelivery: 'Out for delivery',
    delivered: 'Delivered',
    cancelled: 'Cancelled',
    refunded: 'Refunded',
  }

  const event = {
    status: orderStatus,
    location: tracking?.location,
    description: tracking?.note ?? defaultNote[orderStatus] ?? 'Status updated by admin',
    timestamp: new Date(),
  }

  const order = await Order.findByIdAndUpdate(
    orderId,
    { $set, $push: { 'tracking.events': event } },
    { returnDocument: 'after', runValidators: true },
  ).populate('userId', 'firstName lastName email')

  if (!order) throw new AppError('Order not found', 404)

  await writeAuditLog({
    adminId,
    action: 'order.updateStatus',
    targetType: 'order',
    targetId: orderId,
    after: { orderStatus, tracking },
    ip,
  })

  // Invalidate cached stats so the next admin page load reflects this change
  void cacheDel('admin:stats')

  return order
}

// ─── Payments ──────────────────────────────────────────────────────────────────
export const listPayments = async (opts: { status?: string; page: number; limit: number }) => {
  const { status, page, limit } = opts
  const filter: Record<string, unknown> = {}
  if (status) filter.status = status

  const [payments, total] = await Promise.all([
    Payment.find(filter)
      .sort({ createdAt: -1 })
      .skip((page - 1) * limit)
      .limit(limit)
      .populate('userId', 'firstName lastName email')
      .populate('orderId', 'orderNumber grandTotal')
      .lean(),
    Payment.countDocuments(filter),
  ])

  return { payments, total, page, limit, totalPages: Math.ceil(total / limit) }
}

// ─── Analytics ─────────────────────────────────────────────────────────────────
export const getPlatformAnalytics = async (days = 30) => {
  const cacheKey = `admin:analytics:${days}`
  const cached = await cacheGet<object>(cacheKey)
  if (cached) return cached

  const since = new Date(Date.now() - days * 24 * 60 * 60 * 1000)
  const prevSince = new Date(Date.now() - days * 2 * 24 * 60 * 60 * 1000)
  const [
    revenueByDay,
    categoryBreakdown,
    topSellers,
    topProducts,
    userGrowth,
    orderFulfillment,
    currentPeriodRevenue,
    prevPeriodRevenue,
  ] = await Promise.all([
    // Daily revenue trend
    Order.aggregate([
      { $match: { paymentStatus: 'paid', createdAt: { $gte: since } } },
      {
        $group: {
          _id: { $dateToString: { format: '%Y-%m-%d', date: '$createdAt' } },
          revenue: { $sum: '$grandTotal' },
          orders: { $sum: 1 },
        },
      },
      { $sort: { _id: 1 } },
    ]),
    // Revenue by product category
    Order.aggregate([
      { $match: { paymentStatus: 'paid', createdAt: { $gte: since } } },
      { $unwind: '$items' },
      {
        $lookup: {
          from: 'products',
          localField: 'items.productId',
          foreignField: '_id',
          as: 'product',
        },
      },
      { $unwind: { path: '$product', preserveNullAndEmptyArrays: true } },
      {
        $group: {
          _id: { $ifNull: ['$product.category', 'Unknown'] },
          revenue: { $sum: '$items.lineTotal' },
          sold: { $sum: '$items.quantity' },
        },
      },
      { $sort: { revenue: -1 } },
      { $limit: 8 },
    ]),
    // Top sellers by revenue
    Order.aggregate([
      { $match: { paymentStatus: 'paid', createdAt: { $gte: since } } },
      { $unwind: '$items' },
      {
        $lookup: {
          from: 'products',
          localField: 'items.productId',
          foreignField: '_id',
          as: 'product',
        },
      },
      { $unwind: { path: '$product', preserveNullAndEmptyArrays: true } },
      {
        $group: {
          _id: '$product.sellerId',
          revenue: { $sum: '$items.lineTotal' },
          orders: { $sum: 1 },
        },
      },
      { $sort: { revenue: -1 } },
      { $limit: 5 },
      {
        $lookup: {
          from: 'users',
          localField: '_id',
          foreignField: '_id',
          as: 'user',
        },
      },
      { $unwind: { path: '$user', preserveNullAndEmptyArrays: true } },
      {
        $project: {
          revenue: 1,
          orders: 1,
          name: { $concat: ['$user.firstName', ' ', '$user.lastName'] },
          email: '$user.email',
        },
      },
    ]),
    // Top products by revenue
    Order.aggregate([
      { $match: { paymentStatus: 'paid', createdAt: { $gte: since } } },
      { $unwind: '$items' },
      {
        $group: {
          _id: '$items.productId',
          title: { $first: '$items.title' },
          image: { $first: '$items.image' },
          revenue: { $sum: '$items.lineTotal' },
          unitsSold: { $sum: '$items.quantity' },
        },
      },
      { $sort: { revenue: -1 } },
      { $limit: 10 },
    ]),
    // Monthly user registrations (last 6 months)
    User.aggregate([
      { $match: { createdAt: { $gte: new Date(Date.now() - 180 * 24 * 60 * 60 * 1000) } } },
      {
        $group: {
          _id: { $dateToString: { format: '%Y-%m', date: '$createdAt' } },
          users: { $sum: 1 },
        },
      },
      { $sort: { _id: 1 } },
    ]),
    // Order fulfillment rate
    Order.aggregate([{ $group: { _id: '$orderStatus', count: { $sum: 1 } } }]),
    // Current period revenue
    Order.aggregate([
      { $match: { paymentStatus: 'paid', createdAt: { $gte: since } } },
      { $group: { _id: null, total: { $sum: '$grandTotal' } } },
    ]),
    // Previous period revenue (for % change)
    Order.aggregate([
      { $match: { paymentStatus: 'paid', createdAt: { $gte: prevSince, $lt: since } } },
      { $group: { _id: null, total: { $sum: '$grandTotal' } } },
    ]),
  ])

  const curr = currentPeriodRevenue[0]?.total ?? 0
  const prev = prevPeriodRevenue[0]?.total ?? 0
  const revenueGrowth = prev > 0 ? ((curr - prev) / prev) * 100 : 0

  const analyticsResult = {
    revenueByDay,
    categoryBreakdown,
    topSellers,
    topProducts,
    userGrowth,
    orderFulfillment,
    summary: {
      currentRevenue: curr,
      prevRevenue: prev,
      revenueGrowth: Math.round(revenueGrowth * 10) / 10,
    },
  }
  await cacheSet(cacheKey, analyticsResult, ADMIN_CACHE_TTL)
  return analyticsResult
}

// ─── Fraud alerts (rule-based) ─────────────────────────────────────────────────
export const getFraudAlerts = async () => {
  const cached = await cacheGet<object>('admin:fraud:alerts')
  if (cached) return cached

  const oneHour = new Date(Date.now() - 60 * 60 * 1000)
  const oneDay = new Date(Date.now() - 24 * 60 * 60 * 1000)
  const sevenDay = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000)

  const [velocityAlerts, highValueNewUsers, multipleFailures] = await Promise.all([
    // Rule 1: User placing > 3 orders in 1 hour
    Order.aggregate([
      { $match: { createdAt: { $gte: oneHour } } },
      { $group: { _id: '$userId', orderCount: { $sum: 1 }, totalAmount: { $sum: '$grandTotal' } } },
      { $match: { orderCount: { $gt: 3 } } },
      {
        $lookup: {
          from: 'users',
          localField: '_id',
          foreignField: '_id',
          as: 'user',
        },
      },
      { $unwind: { path: '$user', preserveNullAndEmptyArrays: true } },
      {
        $project: {
          orderCount: 1,
          totalAmount: 1,
          email: '$user.email',
          name: { $concat: ['$user.firstName', ' ', '$user.lastName'] },
          type: { $literal: 'high_velocity' },
          severity: { $literal: 'high' },
          description: {
            $concat: [
              { $toString: '$orderCount' },
              ' orders in the last hour — possible fraudulent activity',
            ],
          },
        },
      },
    ]),
    // Rule 2: Orders > $500 from accounts < 7 days old.
    // createdAt filter is pushed into the $lookup pipeline so MongoDB filters early
    // rather than joining all users then discarding most with a post-lookup $match.
    Order.aggregate([
      { $match: { grandTotal: { $gt: 500 }, createdAt: { $gte: oneDay } } },
      {
        $lookup: {
          from: 'users',
          let: { uid: '$userId' },
          pipeline: [
            {
              $match: {
                $expr: {
                  $and: [{ $eq: ['$_id', '$$uid'] }, { $gte: ['$createdAt', sevenDay] }],
                },
              },
            },
          ],
          as: 'user',
        },
      },
      { $unwind: { path: '$user', preserveNullAndEmptyArrays: false } },
      {
        $project: {
          grandTotal: 1,
          orderStatus: 1,
          email: '$user.email',
          name: { $concat: ['$user.firstName', ' ', '$user.lastName'] },
          type: { $literal: 'high_value_new_account' },
          severity: { $literal: 'medium' },
          description: {
            $concat: [
              'High-value order ($',
              { $toString: { $round: ['$grandTotal', 0] } },
              ') from account < 7 days old',
            ],
          },
        },
      },
      { $limit: 20 },
    ]),
    // Rule 3: More than 2 failed payments in 24 hours from same user
    Payment.aggregate([
      { $match: { status: 'failed', createdAt: { $gte: oneDay } } },
      { $group: { _id: '$userId', failureCount: { $sum: 1 } } },
      { $match: { failureCount: { $gt: 2 } } },
      {
        $lookup: {
          from: 'users',
          localField: '_id',
          foreignField: '_id',
          as: 'user',
        },
      },
      { $unwind: { path: '$user', preserveNullAndEmptyArrays: true } },
      {
        $project: {
          failureCount: 1,
          email: '$user.email',
          name: { $concat: ['$user.firstName', ' ', '$user.lastName'] },
          type: { $literal: 'multiple_payment_failures' },
          severity: { $literal: 'medium' },
          description: {
            $concat: [{ $toString: '$failureCount' }, ' failed payment attempts in 24 hours'],
          },
        },
      },
    ]),
  ])

  const alerts = [
    ...velocityAlerts.map((a) => ({ ...a, ruleType: 'high_velocity' })),
    ...highValueNewUsers.map((a) => ({ ...a, ruleType: 'high_value_new_account' })),
    ...multipleFailures.map((a) => ({ ...a, ruleType: 'multiple_payment_failures' })),
  ]

  const fraudResult = { alerts, total: alerts.length }
  await cacheSet('admin:fraud:alerts', fraudResult, ADMIN_CACHE_TTL)
  return fraudResult
}

// ─── Reports ───────────────────────────────────────────────────────────────────
export const getReports = async (period: 'week' | 'month' | 'quarter' | 'year' = 'month') => {
  const cacheKey = `admin:reports:${period}`
  const cached = await cacheGet<object>(cacheKey)
  if (cached) return cached

  const periodMs: Record<string, number> = {
    week: 7 * 24 * 60 * 60 * 1000,
    month: 30 * 24 * 60 * 60 * 1000,
    quarter: 90 * 24 * 60 * 60 * 1000,
    year: 365 * 24 * 60 * 60 * 1000,
  }

  const since = new Date(Date.now() - (periodMs[period] ?? periodMs.month))

  const [revenueSummary, orderSummary, userSummary, categoryReport, sellerReport] =
    await Promise.all([
      Order.aggregate([
        { $match: { paymentStatus: 'paid', createdAt: { $gte: since } } },
        {
          $group: {
            _id: null,
            total: { $sum: '$grandTotal' },
            count: { $sum: 1 },
            avgValue: { $avg: '$grandTotal' },
            minValue: { $min: '$grandTotal' },
            maxValue: { $max: '$grandTotal' },
          },
        },
      ]),
      Order.aggregate([
        { $match: { createdAt: { $gte: since } } },
        { $group: { _id: '$orderStatus', count: { $sum: 1 } } },
      ]),
      User.aggregate([
        { $match: { createdAt: { $gte: since } } },
        { $group: { _id: '$role', count: { $sum: 1 } } },
      ]),
      Order.aggregate([
        { $match: { paymentStatus: 'paid', createdAt: { $gte: since } } },
        { $unwind: '$items' },
        {
          $lookup: {
            from: 'products',
            localField: 'items.productId',
            foreignField: '_id',
            as: 'product',
          },
        },
        { $unwind: { path: '$product', preserveNullAndEmptyArrays: true } },
        {
          $group: {
            _id: { $ifNull: ['$product.category', 'Unknown'] },
            revenue: { $sum: '$items.lineTotal' },
            sold: { $sum: '$items.quantity' },
          },
        },
        { $sort: { revenue: -1 } },
      ]),
      // Start from orders and propagate through products to sellers.
      // The previous SellerProfile-first $lookup was uncorrelated — it joined ALL orders
      // to EVERY seller (Cartesian product), producing incorrect counts.
      Order.aggregate([
        { $match: { paymentStatus: 'paid', createdAt: { $gte: since } } },
        { $unwind: '$items' },
        {
          $lookup: {
            from: 'products',
            localField: 'items.productId',
            foreignField: '_id',
            as: 'product',
          },
        },
        { $unwind: { path: '$product', preserveNullAndEmptyArrays: true } },
        {
          $group: {
            _id: '$product.sellerId',
            orderCount: { $addToSet: '$_id' },
          },
        },
        {
          $project: {
            sellerId: '$_id',
            orderCount: { $size: '$orderCount' },
          },
        },
        { $sort: { orderCount: -1 } },
        { $limit: 10 },
        {
          $lookup: {
            from: 'sellerprofiles',
            localField: 'sellerId',
            foreignField: 'userId',
            as: 'profile',
          },
        },
        { $unwind: { path: '$profile', preserveNullAndEmptyArrays: true } },
        {
          $project: {
            _id: 0,
            storeName: { $ifNull: ['$profile.storeName', 'Unknown'] },
            isVerified: { $ifNull: ['$profile.isVerified', false] },
            orderCount: 1,
          },
        },
      ]),
    ])

  const reportResult = {
    period,
    since,
    revenue: revenueSummary[0] ?? { total: 0, count: 0, avgValue: 0, minValue: 0, maxValue: 0 },
    orders: Object.fromEntries(
      orderSummary.map((r: { _id: string; count: number }) => [r._id, r.count]),
    ),
    newUsers: Object.fromEntries(
      userSummary.map((r: { _id: string; count: number }) => [r._id, r.count]),
    ),
    categories: categoryReport,
    topSellers: sellerReport,
  }
  await cacheSet(cacheKey, reportResult, ADMIN_CACHE_TTL)
  return reportResult
}

// ─── Audit logs ────────────────────────────────────────────────────────────────
export const getAuditLogs = async (opts: { page: number; limit: number; action?: string }) => {
  const { page, limit, action } = opts
  const filter: Record<string, unknown> = {}
  if (action) filter.action = { $regex: esc(action), $options: 'i' }

  const [logs, total] = await Promise.all([
    AuditLog.find(filter)
      .sort({ createdAt: -1 })
      .skip((page - 1) * limit)
      .limit(limit)
      .populate('adminId', 'firstName lastName email'),
    AuditLog.countDocuments(filter),
  ])

  return { logs, total, page, limit, totalPages: Math.ceil(total / limit) }
}

// ─── Marketplace Financial Breakdown & Reconciliation ────────────────────────
export const getFinancialBreakdown = async () => {
  const [paymentAgg, orderAgg, refundAgg, withdrawalAgg, ledgerAgg] = await Promise.all([
    Payment.aggregate([
      { $match: { status: { $in: ['completed', 'success'] } } },
      {
        $group: {
          _id: null,
          totalVerifiedPayments: { $sum: '$amount' },
          totalPaystackFees: { $sum: { $ifNull: ['$paystackFee', 0] } },
          totalNetSettlement: {
            $sum: {
              $ifNull: [
                '$netPlatformSettlement',
                { $subtract: ['$amount', { $ifNull: ['$paystackFee', 0] }] },
              ],
            },
          },
          count: { $sum: 1 },
        },
      },
    ]),
    Order.aggregate([
      { $match: { paymentStatus: 'paid' } },
      {
        $group: {
          _id: null,
          grossSales: { $sum: '$grandTotal' },
          sellerEarningsAllocated: { $sum: { $ifNull: ['$sellerEarnings', 0] } },
          platformCommissionEarned: { $sum: { $ifNull: ['$platformCommission', 0] } },
          orderPaystackFees: { $sum: { $ifNull: ['$paystackFee', 0] } },
          count: { $sum: 1 },
        },
      },
    ]),
    Order.aggregate([
      { $match: { orderStatus: { $in: ['refunded', 'cancelled'] } } },
      {
        $group: {
          _id: '$orderStatus',
          totalAmount: { $sum: '$grandTotal' },
          count: { $sum: 1 },
        },
      },
    ]),
    SellerWithdrawal.aggregate([
      {
        $group: {
          _id: '$status',
          totalAmount: { $sum: '$amount' },
          totalNetAmount: { $sum: '$netAmount' },
          totalFee: { $sum: '$fee' },
          count: { $sum: 1 },
        },
      },
    ]),
    SellerLedger.aggregate([
      {
        $group: {
          _id: '$type',
          totalAmount: { $sum: '$amount' },
          count: { $sum: 1 },
        },
      },
    ]),
  ])

  const payments = paymentAgg[0] ?? {
    totalVerifiedPayments: 0,
    totalPaystackFees: 0,
    totalNetSettlement: 0,
    count: 0,
  }
  const orders = orderAgg[0] ?? {
    grossSales: 0,
    sellerEarningsAllocated: 0,
    platformCommissionEarned: 0,
    orderPaystackFees: 0,
    count: 0,
  }

  const withdrawalsByStatus = Object.fromEntries(
    withdrawalAgg.map(
      (w: { _id: string; totalAmount: number; totalNetAmount: number; count: number }) => [
        w._id,
        { amount: w.totalAmount, netAmount: w.totalNetAmount, count: w.count },
      ],
    ),
  )
  const pendingWithdrawals =
    (withdrawalsByStatus['pending']?.amount ?? 0) +
    (withdrawalsByStatus['pending_approval']?.amount ?? 0) +
    (withdrawalsByStatus['processing']?.amount ?? 0)
  const completedWithdrawals = withdrawalsByStatus['completed']?.amount ?? 0
  const failedWithdrawals = withdrawalsByStatus['failed']?.amount ?? 0

  const refundsByStatus = Object.fromEntries(
    refundAgg.map((r: { _id: string; totalAmount: number; count: number }) => [
      r._id,
      { amount: r.totalAmount, count: r.count },
    ]),
  )
  const totalRefunded = refundsByStatus['refunded']?.amount ?? 0
  const totalCancelled = refundsByStatus['cancelled']?.amount ?? 0

  const ledgerByType = Object.fromEntries(
    ledgerAgg.map((l: { _id: string; totalAmount: number; count: number }) => [
      l._id,
      { amount: l.totalAmount, count: l.count },
    ]),
  )

  const totalComponents =
    orders.sellerEarningsAllocated + orders.platformCommissionEarned + payments.totalPaystackFees
  const discrepancy = Math.round((payments.totalVerifiedPayments - totalComponents) * 100) / 100

  return {
    verifiedBuyerPayments: {
      total: payments.totalVerifiedPayments,
      count: payments.count,
    },
    sellerEarnings: {
      allocated: orders.sellerEarningsAllocated,
      withdrawn: completedWithdrawals,
      pendingWithdrawal: pendingWithdrawals,
    },
    platformCommission: {
      earned: orders.platformCommissionEarned,
      netSettlement: payments.totalNetSettlement,
    },
    paystackFees: {
      actualRecorded: payments.totalPaystackFees,
      orderFees: orders.orderPaystackFees,
    },
    withdrawals: {
      pending: {
        amount: pendingWithdrawals,
        count:
          (withdrawalsByStatus['pending']?.count ?? 0) +
          (withdrawalsByStatus['pending_approval']?.count ?? 0) +
          (withdrawalsByStatus['processing']?.count ?? 0),
      },
      completed: {
        amount: completedWithdrawals,
        count: withdrawalsByStatus['completed']?.count ?? 0,
      },
      failed: {
        amount: failedWithdrawals,
        count: withdrawalsByStatus['failed']?.count ?? 0,
      },
    },
    refundsAndAdjustments: {
      refundedOrdersAmount: totalRefunded,
      refundedOrdersCount: refundsByStatus['refunded']?.count ?? 0,
      cancelledOrdersAmount: totalCancelled,
      cancelledOrdersCount: refundsByStatus['cancelled']?.count ?? 0,
      ledgerAdjustments: ledgerByType['ADJUSTMENT']?.amount ?? 0,
    },
    reconciliation: {
      verifiedBuyerPayments: payments.totalVerifiedPayments,
      sumOfAllocationsAndFees: totalComponents,
      discrepancy,
      status: Math.abs(discrepancy) < 0.01 ? 'RECONCILED' : 'DISCREPANCY_DETECTED',
    },
  }
}

// ─── Admin Withdrawals List ───────────────────────────────────────────────────
export const listAdminWithdrawals = async (opts: {
  status?: string
  sellerId?: string
  page: number
  limit: number
}) => {
  const { status, sellerId, page, limit } = opts
  const filter: Record<string, unknown> = {}
  if (status) filter.status = status
  if (sellerId && mongoose.isValidObjectId(sellerId))
    filter.sellerId = new mongoose.Types.ObjectId(sellerId)

  const [withdrawals, total] = await Promise.all([
    SellerWithdrawal.find(filter)
      .sort({ createdAt: -1 })
      .skip((page - 1) * limit)
      .limit(limit)
      .populate('sellerId', 'firstName lastName email storeName')
      .populate('fulfilledBy', 'firstName lastName email')
      .lean(),
    SellerWithdrawal.countDocuments(filter),
  ])

  return { withdrawals, total, page, limit, totalPages: Math.ceil(total / limit) }
}

// ─── Admin Withdrawal Fulfillment & Actions ───────────────────────────────────
export const fulfillManualWithdrawal = async (params: {
  adminId: string
  withdrawalId: string
  manualReference: string
  note?: string
}) => {
  const { adminId, withdrawalId, manualReference, note } = params
  if (!manualReference || !manualReference.trim()) {
    throw new AppError('Manual bank payout reference / transaction ID is required', 400)
  }

  if (!adminId || !mongoose.isValidObjectId(adminId)) {
    throw new AppError('Invalid admin ID format', 400)
  }

  if (!withdrawalId || !withdrawalId.trim()) {
    throw new AppError('Withdrawal ID is required', 400)
  }

  const trimmedWdId = withdrawalId.trim()
  const isOid = mongoose.isValidObjectId(trimmedWdId)
  const isWdNum = typeof trimmedWdId === 'string' && /^WD-[A-Za-z0-9_-]+$/i.test(trimmedWdId)

  if (!isOid && !isWdNum) {
    throw new AppError('Invalid withdrawal ID format', 400)
  }

  const query: Record<string, unknown> = isOid
    ? { _id: new mongoose.Types.ObjectId(trimmedWdId) }
    : { withdrawalNumber: trimmedWdId.toUpperCase() }

  const withdrawal = await SellerWithdrawal.findOne(query)

  if (!withdrawal) {
    throw new AppError('Withdrawal record not found', 404)
  }

  if (withdrawal.status === 'completed') {
    throw new AppError('Withdrawal is already marked as completed', 400)
  }

  if (['failed', 'cancelled', 'reversed'].includes(withdrawal.status)) {
    throw new AppError(`Cannot fulfill a withdrawal in '${withdrawal.status}' state`, 400)
  }

  const sellerId = (withdrawal.sellerId as any)?._id || withdrawal.sellerId
  if (!sellerId || !mongoose.isValidObjectId(sellerId)) {
    throw new AppError('Withdrawal record contains invalid seller reference', 400)
  }

  const previousStatus = withdrawal.status
  withdrawal.status = 'completed'
  withdrawal.payoutMethod = 'manual'
  withdrawal.manualPayoutReference = manualReference.trim()
  withdrawal.fulfilledBy = new mongoose.Types.ObjectId(adminId)
  withdrawal.fulfilledAt = new Date()
  withdrawal.completedAt = new Date()
  withdrawal.auditLog.push({
    status: 'completed',
    note: `Payout fulfilled. Bank Reference: ${manualReference.trim()}${note ? `. Note: ${note.trim()}` : ''}`,
    actorId: new mongoose.Types.ObjectId(adminId),
    timestamp: new Date(),
  })

  await withdrawal.save()

  const bankName = withdrawal.payoutAccount?.bankName || 'Unknown Bank'
  const accountNumber = withdrawal.payoutAccount?.accountNumber || 'Unknown Account'

  // Record in financial ledger
  await SellerLedger.create({
    sellerId: new mongoose.Types.ObjectId(sellerId.toString()),
    type: 'WITHDRAWAL_SETTLED',
    amount: -withdrawal.amount,
    currency: withdrawal.currency,
    balanceAfter: 0,
    referenceType: 'withdrawal',
    referenceId: withdrawal.withdrawalNumber,
    description: `Manual bank transfer of ${withdrawal.currency} ${withdrawal.netAmount.toFixed(2)} fulfilled by admin (Ref: ${manualReference.trim()}) to ${bankName} (${accountNumber})`,
  })

  // Invalidate caches
  await cacheDel(`seller:earnings:${sellerId.toString()}`)
  await cacheDel('admin:stats')
  await cacheDel('admin:financial_reconciliation')

  // Notify seller
  const uid = sellerId.toString()
  const maskedAccount = accountNumber.length >= 4 ? `••••${accountNumber.slice(-4)}` : '••••'
  const notif = await createNotification({
    userId: uid,
    type: 'payment',
    title: 'Withdrawal Fulfilled',
    message: `Your withdrawal of ${withdrawal.currency} ${withdrawal.netAmount.toLocaleString()} has been fulfilled via manual bank transfer (${bankName} - ${maskedAccount}). Transaction Ref: ${manualReference.trim()}`,
    link: '/seller/payouts',
  }).catch(() => null)

  if (notif) emitToUser(uid, 'notification:new', notif)
  emitToUser(uid, 'seller:withdrawal:updated', {
    withdrawalId: withdrawal._id,
    status: 'completed',
  })

  // Write admin audit log
  await writeAuditLog({
    adminId,
    action: 'withdrawal:manual_fulfilled',
    targetType: 'seller',
    targetId: withdrawal._id.toString(),
    before: { status: previousStatus },
    after: {
      status: 'completed',
      withdrawalNumber: withdrawal.withdrawalNumber,
      manualReference: manualReference.trim(),
      netAmount: withdrawal.netAmount,
    },
  })

  return withdrawal
}

export const rejectWithdrawal = async (params: {
  adminId: string
  withdrawalId: string
  reason: string
}) => {
  const { adminId, withdrawalId, reason } = params
  if (!reason || !reason.trim()) {
    throw new AppError('A valid rejection reason is required', 400)
  }

  if (!adminId || !mongoose.isValidObjectId(adminId)) {
    throw new AppError('Invalid admin ID format', 400)
  }

  if (!withdrawalId || !withdrawalId.trim()) {
    throw new AppError('Withdrawal ID is required', 400)
  }

  const trimmedWdId = withdrawalId.trim()
  const isOid = mongoose.isValidObjectId(trimmedWdId)
  const isWdNum = typeof trimmedWdId === 'string' && /^WD-[A-Za-z0-9_-]+$/i.test(trimmedWdId)

  if (!isOid && !isWdNum) {
    throw new AppError('Invalid withdrawal ID format', 400)
  }

  const query: Record<string, unknown> = isOid
    ? { _id: new mongoose.Types.ObjectId(trimmedWdId) }
    : { withdrawalNumber: trimmedWdId.toUpperCase() }

  const withdrawal = await SellerWithdrawal.findOne(query)

  if (!withdrawal) {
    throw new AppError('Withdrawal record not found', 404)
  }

  if (withdrawal.status === 'completed') {
    throw new AppError('Cannot reject an already completed withdrawal', 400)
  }

  if (['failed', 'cancelled', 'reversed', 'rejected'].includes(withdrawal.status)) {
    throw new AppError(`Withdrawal is already in '${withdrawal.status}' state`, 400)
  }

  const sellerId = (withdrawal.sellerId as any)?._id || withdrawal.sellerId
  if (!sellerId || !mongoose.isValidObjectId(sellerId)) {
    throw new AppError('Withdrawal record contains invalid seller reference', 400)
  }

  const previousStatus = withdrawal.status
  withdrawal.status = 'rejected'
  withdrawal.failureReason = reason.trim()
  withdrawal.auditLog.push({
    status: 'rejected',
    note: `Withdrawal rejected by admin. Reason: ${reason.trim()}`,
    actorId: new mongoose.Types.ObjectId(adminId),
    timestamp: new Date(),
  })

  await withdrawal.save()

  const lastLedger = await SellerLedger.findOne({
    sellerId: new mongoose.Types.ObjectId(sellerId.toString()),
  }).sort({ createdAt: -1 })
  const computedBalanceAfter = (lastLedger?.balanceAfter ?? 0) + withdrawal.amount

  // Restore funds to seller's available balance in Ledger
  await SellerLedger.create({
    sellerId: new mongoose.Types.ObjectId(sellerId.toString()),
    type: 'WITHDRAWAL_REVERSED',
    amount: withdrawal.amount,
    currency: withdrawal.currency,
    balanceAfter: computedBalanceAfter,
    referenceType: 'withdrawal',
    referenceId: withdrawal.withdrawalNumber,
    description: `Reversal of rejected withdrawal ${withdrawal.withdrawalNumber}: ${reason.trim()}`,
  })

  // Invalidate caches
  await cacheDel(`seller:earnings:${sellerId.toString()}`)
  await cacheDel('admin:stats')
  await cacheDel('admin:financial_reconciliation')

  // Notify seller
  const uid = sellerId.toString()
  const notif = await createNotification({
    userId: uid,
    type: 'payment',
    title: 'Withdrawal Rejected',
    message: `Your withdrawal request for ${withdrawal.currency} ${withdrawal.amount.toLocaleString()} was declined (${reason.trim()}). Your balance has been restored to your available funds.`,
    link: '/seller/payouts',
  }).catch(() => null)

  if (notif) emitToUser(uid, 'notification:new', notif)
  emitToUser(uid, 'seller:withdrawal:updated', {
    withdrawalId: withdrawal._id,
    status: 'rejected',
  })

  // Write admin audit log
  await writeAuditLog({
    adminId,
    action: 'withdrawal:rejected',
    targetType: 'seller',
    targetId: withdrawal._id.toString(),
    before: { status: previousStatus },
    after: {
      status: 'rejected',
      withdrawalNumber: withdrawal.withdrawalNumber,
      reason: reason.trim(),
    },
  })

  return withdrawal
}

export const reconcileStuckWithdrawals = async (adminId?: string) => {
  // Find withdrawals stuck in processing with starter business or unfulfilled transfer errors
  const stuckList = await SellerWithdrawal.find({
    status: 'processing',
  })

  const updated: string[] = []
  for (const wd of stuckList) {
    const hasStarterError = wd.auditLog.some((a) =>
      /starter business|third party payouts|not enabled|transfer disabled/i.test(a.note || ''),
    )
    if (hasStarterError || !wd.providerTransferCode) {
      wd.status = 'pending_approval'
      wd.auditLog.push({
        status: 'pending_approval',
        note: 'Standard Security Verification: Verified and queued for direct bank fulfillment.',
        actorId:
          adminId && mongoose.isValidObjectId(adminId)
            ? new mongoose.Types.ObjectId(adminId)
            : undefined,
        timestamp: new Date(),
      })
      await wd.save()
      await cacheDel(`seller:earnings:${wd.sellerId}`)
      updated.push(wd.withdrawalNumber)
    }
  }

  await cacheDel('admin:stats')
  await cacheDel('admin:financial_reconciliation')

  return {
    reconciledCount: updated.length,
    withdrawalNumbers: updated,
  }
}

// ─── Payout Notification Settings ─────────────────────────────────────────────
export const getPayoutSettings = async (): Promise<IPayoutSettingsDocument> => {
  const cached = await cacheGet<IPayoutSettingsDocument>('admin:payout_settings')
  if (cached) return cached

  let settings = await PayoutSettings.findOne({ key: 'DEFAULT' })
  if (!settings) {
    const envEmails = process.env.PAYOUT_NOTIFICATION_EMAIL
      ? process.env.PAYOUT_NOTIFICATION_EMAIL.split(',')
          .map((e) => e.trim())
          .filter(Boolean)
      : []

    if (envEmails.length === 0) {
      const admins = await User.find({ role: 'admin' }).select('email').limit(3).lean()
      for (const a of admins) {
        if (a.email && !envEmails.includes(a.email)) {
          envEmails.push(a.email)
        }
      }
    }

    settings = await PayoutSettings.findOneAndUpdate(
      { key: 'DEFAULT' },
      {
        $setOnInsert: {
          key: 'DEFAULT',
          notificationEmails: envEmails,
          notifyOnWithdrawalRequest: true,
        },
      },
      { upsert: true, returnDocument: 'after', setDefaultsOnInsert: true },
    )
  }

  if (!settings) {
    throw new AppError('Unable to retrieve or initialize payout settings', 500)
  }

  await cacheSet('admin:payout_settings', settings, 300)
  return settings
}

export const updatePayoutSettings = async (params: {
  adminId: string
  notificationEmails: string[]
  notifyOnWithdrawalRequest?: boolean
}): Promise<IPayoutSettingsDocument> => {
  const { adminId, notificationEmails, notifyOnWithdrawalRequest } = params

  if (!adminId || !mongoose.isValidObjectId(adminId)) {
    throw new AppError('Invalid admin ID format', 400)
  }

  const cleanedEmails = Array.from(
    new Set(
      notificationEmails
        .map((e) => e.trim().toLowerCase())
        .filter((e) => /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(e)),
    ),
  )

  if (cleanedEmails.length === 0 && notifyOnWithdrawalRequest !== false) {
    throw new AppError('At least one valid notification email address is required', 400)
  }

  const previous = await getPayoutSettings()

  const updated = await PayoutSettings.findOneAndUpdate(
    { key: 'DEFAULT' },
    {
      $set: {
        notificationEmails: cleanedEmails,
        notifyOnWithdrawalRequest: notifyOnWithdrawalRequest ?? true,
        updatedBy: new mongoose.Types.ObjectId(adminId),
      },
    },
    { upsert: true, returnDocument: 'after' },
  )

  if (!updated) {
    throw new AppError('Failed to update payout settings', 500)
  }

  await cacheDel('admin:payout_settings')

  await writeAuditLog({
    adminId,
    action: 'payout_settings:updated',
    targetType: 'seller',
    targetId: updated._id.toString(),
    before: {
      notificationEmails: previous.notificationEmails,
      notifyOnWithdrawalRequest: previous.notifyOnWithdrawalRequest,
    },
    after: {
      notificationEmails: updated.notificationEmails,
      notifyOnWithdrawalRequest: updated.notifyOnWithdrawalRequest,
    },
  })

  return updated
}
