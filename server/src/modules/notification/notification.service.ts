import mongoose, { type Types } from 'mongoose'
import { v4 as uuidv4 } from 'uuid'
import {
  Notification,
  type NotificationDocType,
  type NotificationChannel,
  type NotificationPriority,
} from './notification.model.js'
import { NotificationPreference, DEFAULT_PREFERENCES } from './notificationPreference.model.js'
import { DeviceToken, type DevicePlatform } from './deviceToken.model.js'
import { emitToUser } from '../../sockets/index.js'
import { AppError } from '../../middlewares/error.middleware.js'
import { logSecurityEvent } from '../iam/auditLog.service.js'

import { redis } from '../../database/redis.js'

interface CreateInput {
  userId: string | Types.ObjectId
  type: NotificationDocType
  title: string
  message: string
  channel?: NotificationChannel
  priority?: NotificationPriority
  link?: string
  data?: Record<string, unknown>
}

const invalidateUserNotifCache = async (userId: string) => {
  try {
    const keys = await redis.keys(`notif:*:${userId}*`)
    if (keys.length > 0) await redis.del(...keys)
  } catch {
    // Redis fail-safe
  }
}

export const notificationService = {
  // ─── Create & Dispatch Notification ─────────────────────────────────────────
  async create(input: CreateInput) {
    const notificationId = `NOT-${uuidv4().replace(/-/g, '').slice(0, 12).toUpperCase()}`

    const notif = await Notification.create({
      notificationId,
      userId: input.userId,
      type: input.type,
      channel: input.channel ?? 'IN_APP',
      priority: input.priority ?? 'NORMAL',
      status: 'DELIVERED',
      title: input.title,
      message: input.message,
      link: input.link,
      data: input.data,
      deliveredAt: new Date(),
    })

    await invalidateUserNotifCache(String(input.userId))
    const unreadCount = await this.getUnreadCount(String(input.userId))

    // Realtime Socket delivery
    emitToUser(String(input.userId), 'notification:new', {
      _id: String(notif._id),
      notificationId: notif.notificationId,
      type: notif.type,
      title: notif.title,
      message: notif.message,
      link: notif.link,
      read: false,
      createdAt: notif.createdAt,
    })

    emitToUser(String(input.userId), 'notification:unread_count', { unreadCount })

    return notif
  },

  // ─── List User Notifications ────────────────────────────────────────────────
  async list(userId: string, page = 1, limit = 20) {
    if (!mongoose.Types.ObjectId.isValid(userId)) throw new AppError('Invalid user ID', 400)
    const cacheKey = `notif:list:${userId}:${page}:${limit}`

    try {
      const cached = await redis.get(cacheKey)
      if (cached) return JSON.parse(cached)
    } catch {
      // Redis fail-safe
    }

    const skip = (page - 1) * limit
    const [items, total, unread] = await Promise.all([
      Notification.find({ userId: new mongoose.Types.ObjectId(userId) })
        .sort({ createdAt: -1 })
        .skip(skip)
        .limit(limit)
        .lean(),
      Notification.countDocuments({ userId: new mongoose.Types.ObjectId(userId) }),
      Notification.countDocuments({ userId: new mongoose.Types.ObjectId(userId), read: false }),
    ])
    const result = { items, total, unread, page, pages: Math.ceil(total / limit) }

    try {
      await redis.setex(cacheKey, 10, JSON.stringify(result))
    } catch {
      // Redis fail-safe
    }

    return result
  },

  async getUnreadCount(userId: string): Promise<number> {
    if (!mongoose.Types.ObjectId.isValid(userId)) return 0
    const cacheKey = `notif:unread:${userId}`

    try {
      const cached = await redis.get(cacheKey)
      if (cached !== null) return parseInt(cached, 10)
    } catch {
      // Redis fail-safe
    }

    const count = await Notification.countDocuments({
      userId: new mongoose.Types.ObjectId(userId),
      read: false,
    })

    try {
      await redis.setex(cacheKey, 10, String(count))
    } catch {
      // Redis fail-safe
    }

    return count
  },

  async markRead(id: string, userId: string) {
    if (!mongoose.Types.ObjectId.isValid(userId)) throw new AppError('Invalid user ID', 400)
    const filter = mongoose.Types.ObjectId.isValid(id)
      ? { _id: new mongoose.Types.ObjectId(id), userId: new mongoose.Types.ObjectId(userId) }
      : { notificationId: id, userId: new mongoose.Types.ObjectId(userId) }

    const notif = await Notification.findOneAndUpdate(
      filter as object,
      { read: true },
      { returnDocument: 'after' },
    )
    if (!notif) throw new AppError('Notification not found or access denied', 404)

    await invalidateUserNotifCache(userId)
    const unreadCount = await this.getUnreadCount(userId)
    emitToUser(userId, 'notification:unread_count', { unreadCount })

    return notif
  },

  async markAllRead(userId: string) {
    if (!mongoose.Types.ObjectId.isValid(userId)) throw new AppError('Invalid user ID', 400)
    const result = await Notification.updateMany(
      { userId: new mongoose.Types.ObjectId(userId), read: false },
      { read: true },
    )
    await invalidateUserNotifCache(userId)
    emitToUser(userId, 'notification:unread_count', { unreadCount: 0 })
    return result.modifiedCount
  },

  async delete(id: string, userId: string) {
    if (!mongoose.Types.ObjectId.isValid(userId)) throw new AppError('Invalid user ID', 400)
    const filter = mongoose.Types.ObjectId.isValid(id)
      ? { _id: new mongoose.Types.ObjectId(id), userId: new mongoose.Types.ObjectId(userId) }
      : { notificationId: id, userId: new mongoose.Types.ObjectId(userId) }

    return Notification.findOneAndDelete(filter as object)
  },

  // ─── Preferences ────────────────────────────────────────────────────────────
  async getPreferences(userId: string) {
    if (!mongoose.Types.ObjectId.isValid(userId)) throw new AppError('Invalid user ID', 400)
    let prefsDoc = await NotificationPreference.findOne({
      userId: new mongoose.Types.ObjectId(userId),
    })
    if (!prefsDoc) {
      prefsDoc = await NotificationPreference.create({
        userId: new mongoose.Types.ObjectId(userId),
        preferences: DEFAULT_PREFERENCES,
      })
    }
    return prefsDoc
  },

  async updatePreferences(
    userId: string,
    preferencesInput: Array<{
      notificationType: string
      inApp: boolean
      email: boolean
      push: boolean
      sms: boolean
    }>,
  ) {
    if (!mongoose.Types.ObjectId.isValid(userId)) throw new AppError('Invalid user ID', 400)

    // Security notifications cannot be disabled
    const sanitized = preferencesInput.map((item) => {
      if (item.notificationType === 'security_alerts') {
        return { ...item, inApp: true, email: true, push: true, sms: true }
      }
      return item
    })

    const updated = await NotificationPreference.findOneAndUpdate(
      { userId: new mongoose.Types.ObjectId(userId) },
      { preferences: sanitized },
      { upsert: true, returnDocument: 'after' },
    )
    return updated
  },

  // ─── Device Tokens ──────────────────────────────────────────────────────────
  async registerDeviceToken(
    userId: string,
    deviceId: string,
    platform: DevicePlatform,
    pushToken: string,
  ) {
    if (!mongoose.Types.ObjectId.isValid(userId)) throw new AppError('Invalid user ID', 400)
    return DeviceToken.findOneAndUpdate(
      { deviceId },
      {
        userId: new mongoose.Types.ObjectId(userId),
        platform,
        pushToken,
        active: true,
        lastSeenAt: new Date(),
      },
      { upsert: true, returnDocument: 'after' },
    )
  },

  // ─── Admin Broadcast ────────────────────────────────────────────────────────
  async broadcastAdminNotification(
    adminUserId: string,
    input: { title: string; message: string; type?: NotificationDocType; link?: string },
  ) {
    const notificationId = `BC-${uuidv4().replace(/-/g, '').slice(0, 10).toUpperCase()}`

    await logSecurityEvent({
      eventType: 'admin.notification_broadcast',
      userId: adminUserId,
      details: { title: input.title, notificationId },
    })

    return { broadcastId: notificationId, title: input.title, status: 'QUEUED' }
  },
}
