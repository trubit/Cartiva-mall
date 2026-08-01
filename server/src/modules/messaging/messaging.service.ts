import mongoose from 'mongoose'
import { Conversation } from './conversation.model.js'
import { Message } from './message.model.js'
import { AppError } from '../../middlewares/error.middleware.js'
import { emitToUser } from '../../sockets/index.js'

export const messagingService = {
  /** Find or create a 1-to-1 conversation, optionally scoped to a product/order */
  async getOrCreateConversation(
    initiatorId: string,
    recipientId: string,
    opts: { productId?: string; orderId?: string; subject?: string } = {},
  ) {
    if (initiatorId === recipientId) throw new AppError('Cannot message yourself', 400)

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
    if (!convo) {
      convo = await Conversation.create({
        participants,
        ...(opts.productId ? { productId: opts.productId } : {}),
        ...(opts.orderId ? { orderId: opts.orderId } : {}),
        ...(opts.subject ? { subject: opts.subject } : {}),
      })
    }
    return convo
  },

  async listConversations(userId: string, page = 1, limit = 20) {
    const skip = (page - 1) * limit
    const oid = new mongoose.Types.ObjectId(userId)
    const [items, total] = await Promise.all([
      Conversation.find({ participants: oid } as object)
        .sort({ lastMessageAt: -1 })
        .skip(skip)
        .limit(limit)
        .populate('participants', 'firstName lastName avatar')
        .populate('productId', 'title images')
        .lean(),
      Conversation.countDocuments({ participants: oid } as object),
    ])
    return { items, total, page, pages: Math.ceil(total / limit) }
  },

  async getConversation(id: string, userId: string) {
    const convo = await Conversation.findOne({ _id: id } as object)
      .populate('participants', 'firstName lastName avatar')
      .populate('productId', 'title images')
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

    // Update conversation summary
    const preview = sanitized.length > 100 ? `${sanitized.slice(0, 97)}…` : sanitized
    const update: Record<string, unknown> = { lastMessage: preview, lastMessageAt: new Date() }
    // Increment unread counts for all participants except the sender
    for (const pid of participantIds) {
      if (pid !== senderId) {
        const key = `unreadCounts.${pid}`
        update[key] = (convo.unreadCounts.get(pid) ?? 0) + 1
      }
    }
    await Conversation.updateOne({ _id: conversationId } as object, { $set: update })

    // Push real-time event to all conversation participants
    const populated = await msg.populate('senderId', 'firstName lastName avatar')
    for (const pid of participantIds) {
      if (pid !== senderId) {
        emitToUser(pid, 'message:new', { conversationId, message: populated })
      }
    }

    return msg
  },

  async getMessages(conversationId: string, userId: string, page = 1, limit = 30) {
    const convo = await Conversation.findById(conversationId)
    if (!convo) throw new AppError('Conversation not found', 404)
    if (!convo.participants.map(String).includes(userId)) throw new AppError('Access denied', 403)

    const skip = (page - 1) * limit
    const [items, total] = await Promise.all([
      Message.find({ conversationId } as object)
        .sort({ createdAt: -1 })
        .skip(skip)
        .limit(limit)
        .populate('senderId', 'firstName lastName avatar')
        .lean(),
      Message.countDocuments({ conversationId } as object),
    ])

    // Mark messages as read
    await Message.updateMany(
      {
        conversationId,
        readBy: { $ne: new mongoose.Types.ObjectId(userId) },
      } as object,
      { $addToSet: { readBy: new mongoose.Types.ObjectId(userId) } },
    )
    // Reset unread count for this user
    await Conversation.updateOne({ _id: conversationId } as object, {
      $set: { [`unreadCounts.${userId}`]: 0 },
    })

    return { items: items.reverse(), total, page, pages: Math.ceil(total / limit) }
  },

  async editMessage(msgId: string, userId: string, newContent: string) {
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
    return msg
  },

  async deleteMessage(msgId: string, userId: string) {
    const msg = await Message.findById(msgId)
    if (!msg) throw new AppError('Message not found', 404)
    if (String(msg.senderId) !== userId) throw new AppError('Access denied', 403)
    msg.deletedAt = new Date()
    await msg.save()
    return msg
  },
}
