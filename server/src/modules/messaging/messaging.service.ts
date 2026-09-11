import mongoose from 'mongoose'
import { Conversation } from './conversation.model.js'
import { Message } from './message.model.js'
import { User } from '../user/user.model.js'
import { notificationService } from '../notification/notification.service.js'
import { AppError } from '../../middlewares/error.middleware.js'
import { emitToUser, getSocketIO } from '../../sockets/index.js'
import { logger } from '../../utils/logger.js'

export const messagingService = {
  /** Find or create a 1-to-1 conversation, optionally scoped to a product/order */
  async getOrCreateConversation(
    initiatorId: string,
    recipientId: string,
    opts: { productId?: string; orderId?: string; subject?: string } = {},
  ) {
    if (initiatorId === recipientId) throw new AppError('Cannot message yourself', 400)

    if (!mongoose.Types.ObjectId.isValid(recipientId)) {
      throw new AppError('Invalid recipient ID', 400)
    }

    const recipientExists = await User.findById(recipientId).select('_id firstName lastName')
    if (!recipientExists) throw new AppError('Recipient user does not exist', 404)

    const participants = [
      new mongoose.Types.ObjectId(initiatorId),
      new mongoose.Types.ObjectId(recipientId),
    ]

    const filter: Record<string, unknown> = {
      participants: { $all: participants, $size: 2 },
    }
    if (opts.orderId) filter.orderId = opts.orderId
    else if (opts.productId) filter.productId = opts.productId

    let convo = await Conversation.findOne(filter as object)
      .populate('participants', 'firstName lastName avatar email role')
      .populate('productId', 'title images price')
      .lean()

    if (!convo) {
      const created = await Conversation.create({
        participants,
        ...(opts.productId ? { productId: opts.productId } : {}),
        ...(opts.orderId ? { orderId: opts.orderId } : {}),
        ...(opts.subject ? { subject: opts.subject } : {}),
      })

      convo = await Conversation.findById(created._id)
        .populate('participants', 'firstName lastName avatar email role')
        .populate('productId', 'title images price')
        .lean()
    }
    return convo!
  },

  async listConversations(userId: string, page = 1, limit = 20) {
    const skip = (page - 1) * limit
    const oid = new mongoose.Types.ObjectId(userId)
    const [items, total] = await Promise.all([
      Conversation.find({ participants: oid } as object)
        .sort({ lastMessageAt: -1, updatedAt: -1 })
        .skip(skip)
        .limit(limit)
        .populate('participants', 'firstName lastName avatar email role')
        .populate('productId', 'title images price')
        .lean(),
      Conversation.countDocuments({ participants: oid } as object),
    ])

    // Calculate unread totals
    let unreadTotal = 0
    for (const c of items) {
      const counts = c.unreadCounts as Record<string, number> | Map<string, number> | undefined
      const count = counts instanceof Map ? counts.get(userId) : counts?.[userId]
      if (count && count > 0) unreadTotal += 1
    }

    return { items, total, unreadTotal, page, pages: Math.ceil(total / limit) }
  },

  async getConversation(id: string, userId: string) {
    if (!mongoose.Types.ObjectId.isValid(id)) throw new AppError('Invalid conversation ID', 400)
    const convo = await Conversation.findOne({ _id: id } as object)
      .populate('participants', 'firstName lastName avatar email role')
      .populate('productId', 'title images price')
      .lean()
    if (!convo) throw new AppError('Conversation not found', 404)
    const participantIds = (convo.participants as { _id: unknown }[]).map((p) => String(p._id))
    if (!participantIds.includes(userId)) throw new AppError('Access denied', 403)
    return convo
  },

  async sendMessage(
    conversationId: string,
    senderId: string,
    content: string,
    type: 'text' | 'image' = 'text',
    imageUrl?: string,
  ) {
    if (!mongoose.Types.ObjectId.isValid(conversationId))
      throw new AppError('Invalid conversation ID', 400)
    const convo = await Conversation.findById(conversationId)
    if (!convo) throw new AppError('Conversation not found', 404)

    const participantIds = convo.participants.map(String)
    if (!participantIds.includes(senderId)) throw new AppError('Access denied', 403)

    const sanitized = content.trim()
    if (!sanitized) throw new AppError('Message cannot be empty', 400)

    const msg = await Message.create({
      conversationId,
      senderId,
      content: sanitized,
      type,
      ...(imageUrl ? { imageUrl } : {}),
      readBy: [new mongoose.Types.ObjectId(senderId)],
    })

    // Update conversation summary & unread counters
    const preview = sanitized.length > 100 ? `${sanitized.slice(0, 97)}…` : sanitized
    const update: Record<string, unknown> = { lastMessage: preview, lastMessageAt: new Date() }
    for (const pid of participantIds) {
      if (pid !== senderId) {
        const key = `unreadCounts.${pid}`
        update[key] = (convo.unreadCounts.get(pid) ?? 0) + 1
      }
    }
    await Conversation.updateOne({ _id: conversationId } as object, { $set: update })

    // Populate sender info for return and event payload
    const populated = await msg.populate('senderId', 'firstName lastName avatar email role')
    const messagePayload = populated.toJSON()

    // 1. Broadcast real-time message event to conversation room
    try {
      const io = getSocketIO()
      io.to(`conversation:${conversationId}`).emit('message:new', messagePayload)
    } catch {
      // Non-fatal if socket not yet initialized in isolated test
    }

    // 2. Deliver to individual participant rooms & trigger notifications
    const senderName =
      populated.senderId &&
      typeof populated.senderId === 'object' &&
      'firstName' in populated.senderId
        ? `${(populated.senderId as any).firstName} ${(populated.senderId as any).lastName || ''}`.trim()
        : 'User'

    for (const pid of participantIds) {
      if (pid !== senderId) {
        emitToUser(pid, 'message:new', messagePayload)
        emitToUser(pid, 'conversation:updated', {
          conversationId,
          lastMessage: preview,
          lastMessageAt: new Date(),
        })

        // Persistent notification for message recipient
        await notificationService
          .create({
            userId: pid,
            type: 'message',
            title: `New message from ${senderName}`,
            message: preview,
            link: `/messages?conversationId=${conversationId}`,
            data: { conversationId, messageId: String(msg._id) },
          })
          .catch((err) => {
            logger.warn('Failed to create message notification', { err, recipientId: pid })
          })
      }
    }

    return populated
  },

  async getMessages(conversationId: string, userId: string, page = 1, limit = 30) {
    if (!mongoose.Types.ObjectId.isValid(conversationId))
      throw new AppError('Invalid conversation ID', 400)
    const convo = await Conversation.findById(conversationId)
    if (!convo) throw new AppError('Conversation not found', 404)
    if (!convo.participants.map(String).includes(userId)) throw new AppError('Access denied', 403)

    const skip = (page - 1) * limit
    const [items, total] = await Promise.all([
      Message.find({ conversationId } as object)
        .sort({ createdAt: -1 })
        .skip(skip)
        .limit(limit)
        .populate('senderId', 'firstName lastName avatar email role')
        .lean(),
      Message.countDocuments({ conversationId } as object),
    ])

    // Mark all unread messages as read by this user
    await Message.updateMany(
      {
        conversationId,
        readBy: { $ne: new mongoose.Types.ObjectId(userId) },
      } as object,
      { $addToSet: { readBy: new mongoose.Types.ObjectId(userId) } },
    )
    // Reset conversation unread count for this user
    await Conversation.updateOne({ _id: conversationId } as object, {
      $set: { [`unreadCounts.${userId}`]: 0 },
    })

    // Emit read receipt event to conversation
    try {
      const io = getSocketIO()
      io.to(`conversation:${conversationId}`).emit('message:read', {
        conversationId,
        readBy: userId,
        readAt: new Date(),
      })
    } catch {
      // Non-fatal
    }

    return { items: items.reverse(), total, page, pages: Math.ceil(total / limit) }
  },

  async getUnreadCount(userId: string) {
    const oid = new mongoose.Types.ObjectId(userId)
    const convos = await Conversation.find({ participants: oid } as object).lean()
    let unreadConversations = 0
    let unreadMessages = 0

    for (const c of convos) {
      const counts = c.unreadCounts as Record<string, number> | Map<string, number> | undefined
      const count = counts instanceof Map ? counts.get(userId) : counts?.[userId]
      if (count && count > 0) {
        unreadConversations += 1
        unreadMessages += count
      }
    }

    return { unreadConversations, unreadMessages }
  },

  async editMessage(msgId: string, userId: string, newContent: string) {
    if (!mongoose.Types.ObjectId.isValid(msgId)) throw new AppError('Invalid message ID', 400)
    const msg = await Message.findById(msgId)
    if (!msg) throw new AppError('Message not found', 404)
    if (String(msg.senderId) !== userId) throw new AppError('Access denied', 403)
    if (msg.deletedAt) throw new AppError('Cannot edit a deleted message', 400)

    // 15-minute edit window
    const ageMs = Date.now() - msg.createdAt.getTime()
    if (ageMs > 15 * 60 * 1000) throw new AppError('Edit window has expired', 400)

    msg.content = newContent.trim()
    msg.editedAt = new Date()
    await msg.save()

    const populated = await msg.populate('senderId', 'firstName lastName avatar email role')
    const payload = populated.toJSON()

    try {
      const io = getSocketIO()
      io.to(`conversation:${msg.conversationId}`).emit('message:edited', payload)
    } catch {
      // Non-fatal
    }

    return populated
  },

  async deleteMessage(msgId: string, userId: string) {
    if (!mongoose.Types.ObjectId.isValid(msgId)) throw new AppError('Invalid message ID', 400)
    const msg = await Message.findById(msgId)
    if (!msg) throw new AppError('Message not found', 404)
    if (String(msg.senderId) !== userId) throw new AppError('Access denied', 403)
    msg.deletedAt = new Date()
    await msg.save()

    try {
      const io = getSocketIO()
      io.to(`conversation:${msg.conversationId}`).emit('message:deleted', {
        _id: msg._id,
        conversationId: msg.conversationId,
        deletedAt: msg.deletedAt,
      })
    } catch {
      // Non-fatal
    }

    return msg
  },
}
