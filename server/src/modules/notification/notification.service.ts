import type { Types } from 'mongoose'
import { Notification, type NotificationDocType } from './notification.model.js'
import { emitToUser } from '../../sockets/index.js'

interface CreateInput {
  userId: string | Types.ObjectId
  type: NotificationDocType
  title: string
  message: string
  link?: string
  data?: Record<string, unknown>
}

export const notificationService = {
  async create(input: CreateInput) {
    const notif = await Notification.create(input)
    // Fire-and-forget — never block the calling operation on socket delivery
    emitToUser(String(input.userId), 'notification:new', {
      _id: String(notif._id),
      type: notif.type,
      title: notif.title,
      message: notif.message,
      link: notif.link,
      read: false,
      createdAt: notif.createdAt,
    })
    return notif
  },

  async list(userId: string, page = 1, limit = 20) {
    const skip = (page - 1) * limit
    const [items, total, unread] = await Promise.all([
      Notification.find({ userId } as object)
        .sort({ createdAt: -1 })
        .skip(skip)
        .limit(limit)
        .lean(),
      Notification.countDocuments({ userId } as object),
      Notification.countDocuments({ userId, read: false } as object),
    ])
    return { items, total, unread, page, pages: Math.ceil(total / limit) }
  },

  async getUnreadCount(userId: string): Promise<number> {
    return Notification.countDocuments({ userId, read: false } as object)
  },

  async markRead(id: string, userId: string) {
    return Notification.findOneAndUpdate(
      { _id: id, userId } as object,
      { read: true },
      { new: true },
    )
  },

  async markAllRead(userId: string) {
    const result = await Notification.updateMany({ userId, read: false } as object, { read: true })
    return result.modifiedCount
  },

  async delete(id: string, userId: string) {
    return Notification.findOneAndDelete({ _id: id, userId } as object)
  },
}
