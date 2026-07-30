import mongoose from 'mongoose'
import { User } from '../user/user.model.js'
import { Order } from '../order/order.model.js'
import { Payment } from '../payment/payment.model.js'
import { Product } from '../product/product.model.js'
import { Wishlist } from '../wishlist/wishlist.model.js'
import { Notification, createNotification } from '../notification/notification.model.js'
import { AppError } from '../../middlewares/error.middleware.js'
import { emitToUser } from '../../sockets/index.js'
import { cacheGet, cacheSet } from '../../utils/cache.js'
import { ORDER_STATUS, PAGINATION } from '../../../../src/shared/constants/index.js'
import type {
  DashboardSettingsInput,
  ChangePasswordInput,
} from '../../../../src/shared/validators/dashboard.validators.js'

const DASHBOARD_SUMMARY_TTL = 30 // seconds — short enough to reflect recent changes

// ─── Summary ──────────────────────────────────────────────────────────────────
export const getDashboardSummary = async (userId: string) => {
  const cacheKey = `dashboard:summary:${userId}`
  const cached = await cacheGet<object>(cacheKey)
  if (cached) return cached

  const [user, orderAgg, wishlist, unreadCount, recentOrders] = await Promise.all([
    User.findById(userId).lean(),
    Order.aggregate([
      { $match: { userId: new mongoose.Types.ObjectId(userId) } },
      {
        $group: {
          _id: null,
          total: { $sum: 1 },
          pending: { $sum: { $cond: [{ $eq: ['$orderStatus', ORDER_STATUS.PENDING] }, 1, 0] } },
          processing: {
            $sum: { $cond: [{ $eq: ['$orderStatus', ORDER_STATUS.PROCESSING] }, 1, 0] },
          },
          shipped: { $sum: { $cond: [{ $eq: ['$orderStatus', ORDER_STATUS.SHIPPED] }, 1, 0] } },
          delivered: { $sum: { $cond: [{ $eq: ['$orderStatus', ORDER_STATUS.DELIVERED] }, 1, 0] } },
          cancelled: { $sum: { $cond: [{ $eq: ['$orderStatus', ORDER_STATUS.CANCELLED] }, 1, 0] } },
          totalSpent: { $sum: { $cond: [{ $eq: ['$paymentStatus', 'paid'] }, '$grandTotal', 0] } },
        },
      },
    ]),
    Wishlist.findOne({ userId }).lean(),
    Notification.countDocuments({ userId, read: false }),
    Order.find({ userId })
      .sort({ createdAt: -1 })
      .limit(5)
      .select('orderNumber orderStatus paymentStatus grandTotal createdAt items')
      .lean(),
  ])

  if (!user) throw new AppError('User not found', 404)

  const stats = orderAgg[0] ?? {
    total: 0,
    pending: 0,
    processing: 0,
    shipped: 0,
    delivered: 0,
    cancelled: 0,
    totalSpent: 0,
  }

  const summary = {
    user,
    orderStats: {
      total: stats.total,
      pending: stats.pending,
      processing: stats.processing,
      shipped: stats.shipped,
      delivered: stats.delivered,
      cancelled: stats.cancelled,
      totalSpent: stats.totalSpent,
    },
    wishlistCount: wishlist?.items.length ?? 0,
    unreadNotifications: unreadCount,
    recentOrders,
  }
  await cacheSet(cacheKey, summary, DASHBOARD_SUMMARY_TTL)
  return summary
}

// ─── Wishlist ─────────────────────────────────────────────────────────────────
export const getWishlist = async (userId: string) => {
  const wishlist = await Wishlist.findOne({ userId }).populate({
    path: 'items.productId',
    select: 'title images price discountPrice ratingsAverage ratingsCount status slug',
    match: { status: 'active', isActive: true },
  })

  if (!wishlist) return { items: [], total: 0 }

  // Filter out any items where product was deleted or inactive
  const active = wishlist.items.filter((i) => i.productId != null)
  return { items: active, total: active.length }
}

export const addToWishlist = async (userId: string, productId: string) => {
  const product = await Product.findById(productId)
  if (!product) throw new AppError('Product not found', 404)
  if (product.status !== 'active') throw new AppError('Product is not available', 400)

  const oid = new mongoose.Types.ObjectId(productId)

  const wishlist = await Wishlist.findOneAndUpdate(
    { userId },
    { $addToSet: { items: { productId: oid, addedAt: new Date() } } },
    { upsert: true, new: true },
  )

  return wishlist
}

export const removeFromWishlist = async (userId: string, productId: string) => {
  const oid = new mongoose.Types.ObjectId(productId)
  await Wishlist.findOneAndUpdate({ userId }, { $pull: { items: { productId: oid } } })
}

export const checkWishlist = async (userId: string, productId: string): Promise<boolean> => {
  const oid = new mongoose.Types.ObjectId(productId)
  const exists = await Wishlist.exists({ userId, 'items.productId': oid })
  return Boolean(exists)
}

// ─── Notifications ────────────────────────────────────────────────────────────
export const getNotifications = async (
  userId: string,
  page: number = 1,
  limit: number = PAGINATION.DEFAULT_LIMIT,
) => {
  const skip = (page - 1) * limit
  const uid = new mongoose.Types.ObjectId(userId)

  // Single aggregation replaces three separate queries (find + 2× countDocuments).
  const [result] = await Notification.aggregate([
    { $match: { userId: uid } },
    {
      $facet: {
        notifications: [{ $sort: { createdAt: -1 } }, { $skip: skip }, { $limit: limit }],
        total: [{ $count: 'count' }],
        unread: [{ $match: { read: false } }, { $count: 'count' }],
      },
    },
  ])

  return {
    notifications: result?.notifications ?? [],
    total: (result?.total[0]?.count as number) ?? 0,
    unread: (result?.unread[0]?.count as number) ?? 0,
  }
}

export const markNotificationRead = async (userId: string, notificationId: string) => {
  const notification = await Notification.findOneAndUpdate(
    { _id: notificationId, userId },
    { read: true },
    { new: true },
  )
  if (!notification) throw new AppError('Notification not found', 404)
  return notification
}

export const markAllNotificationsRead = async (userId: string): Promise<void> => {
  await Notification.updateMany({ userId, read: false }, { read: true })
}

export const getUnreadNotificationCount = async (userId: string): Promise<number> =>
  Notification.countDocuments({ userId, read: false })

// ─── Payment History ──────────────────────────────────────────────────────────
export const getPaymentHistory = async (
  userId: string,
  page: number = 1,
  limit: number = PAGINATION.DEFAULT_LIMIT,
) => {
  const skip = (page - 1) * limit
  const [payments, total] = await Promise.all([
    Payment.find({ userId })
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(limit)
      .populate({ path: 'orderId', select: 'orderNumber grandTotal orderStatus createdAt' })
      .lean(),
    Payment.countDocuments({ userId }),
  ])
  return { payments, total }
}

// ─── Recently Viewed ──────────────────────────────────────────────────────────
const MAX_RECENT = 20

export const trackRecentProduct = async (userId: string, productId: string): Promise<void> => {
  const user = await User.findById(userId)
  if (!user) return

  const oid = productId
  const prefs = (user.preferences ?? {}) as Record<string, unknown>
  const current =
    (prefs.recentlyViewed as Array<{ productId: string; viewedAt: string }> | undefined) ?? []

  // Remove if already present, then prepend
  const filtered = current.filter((r) => r.productId !== oid)
  const updated = [{ productId: oid, viewedAt: new Date().toISOString() }, ...filtered].slice(
    0,
    MAX_RECENT,
  )

  user.preferences = { ...prefs, recentlyViewed: updated }
  await user.save({ validateBeforeSave: false })
}

export const getRecentProducts = async (userId: string) => {
  const user = await User.findById(userId)
  if (!user) return []

  const prefs = (user.preferences ?? {}) as Record<string, unknown>
  const recent =
    (prefs.recentlyViewed as Array<{ productId: string; viewedAt: string }> | undefined) ?? []
  if (recent.length === 0) return []

  const ids = recent.slice(0, MAX_RECENT).map((r) => r.productId)
  const products = await Product.find({ _id: { $in: ids }, status: 'active', isActive: true })
    .select('title images price discountPrice ratingsAverage ratingsCount status')
    .limit(MAX_RECENT)

  // Restore order (most recent first)
  const productMap = new Map(products.map((p) => [p._id.toString(), p]))
  return ids.map((id) => productMap.get(id)).filter(Boolean)
}

// ─── Account Settings ─────────────────────────────────────────────────────────
export const updateSettings = async (userId: string, input: DashboardSettingsInput) => {
  const user = await User.findByIdAndUpdate(
    userId,
    { $set: input },
    { new: true, runValidators: true },
  )
  if (!user) throw new AppError('User not found', 404)
  return user
}

// ─── Change Password ──────────────────────────────────────────────────────────
export const changePassword = async (userId: string, input: ChangePasswordInput): Promise<void> => {
  const user = await User.findById(userId).select('+password')
  if (!user) throw new AppError('User not found', 404)

  const valid = await user.comparePassword(input.currentPassword)
  if (!valid) throw new AppError('Current password is incorrect', 401)

  if (input.newPassword === input.currentPassword) {
    throw new AppError('New password must be different from current password', 400)
  }

  user.password = input.newPassword
  await user.save()

  const notif = await createNotification({
    userId: userId,
    type: 'security',
    title: 'Password changed',
    message:
      'Your account password was changed successfully. If this was not you, contact support immediately.',
    link: '/dashboard/security',
  }).catch(() => null)

  if (notif) emitToUser(userId, 'notification:new', notif)
}
