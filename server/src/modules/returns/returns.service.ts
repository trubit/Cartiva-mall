import { Return, type ReturnStatus, type ReturnType } from './return.model.js'
import { Dispute, type DisputeType, type DisputeResolution } from './dispute.model.js'
import { Order } from '../order/order.model.js'
import { AppError } from '../../middlewares/error.middleware.js'
import { notificationService } from '../notification/notification.service.js'
import { emitToUser } from '../../sockets/index.js'
import {
  RETURN_WINDOW_DAYS,
  RETURNABLE_STATUSES,
  type ReturnReason,
} from '../../../../src/shared/constants/index.js'

export const returnsService = {
  async submitReturn(
    userId: string,
    input: {
      orderId: string
      type: ReturnType
      reason: ReturnReason
      description?: string
      items: { sku: string; quantity: number; reason: ReturnReason }[]
    },
  ) {
    const order = await Order.findById(input.orderId)
    if (!order) throw new AppError('Order not found', 404)
    if (String(order.userId) !== userId) throw new AppError('Access denied', 403)

    const statuses = RETURNABLE_STATUSES as readonly string[]
    if (!statuses.includes(order.orderStatus)) {
      throw new AppError('Order is not eligible for return', 400)
    }

    // Check return window
    const daysSinceDelivery = (Date.now() - order.updatedAt.getTime()) / (1000 * 60 * 60 * 24)
    if (daysSinceDelivery > RETURN_WINDOW_DAYS) {
      throw new AppError(`Return window of ${RETURN_WINDOW_DAYS} days has expired`, 400)
    }

    // Prevent duplicate open returns for the same order
    const existing = await Return.findOne({
      orderId: input.orderId,
      status: { $nin: ['rejected', 'completed'] },
    } as object)
    if (existing) throw new AppError('A return request is already open for this order', 409)

    // Map input items to order items for enrichment
    const returnItems = input.items.map((ri) => {
      const orderItem = order.items.find((oi) => oi.sku === ri.sku)
      return {
        productId: orderItem?.productId ?? ri.sku,
        sku: ri.sku,
        title: orderItem?.title ?? ri.sku,
        quantity: ri.quantity,
        reason: ri.reason,
      }
    })

    const returnDoc = await Return.create({
      orderId: input.orderId,
      userId,
      type: input.type,
      items: returnItems,
      reason: input.reason,
      description: input.description,
    })

    // Mirror into Order's embedded returnRequest
    await Order.updateOne({ _id: input.orderId } as object, {
      $set: {
        returnRequest: {
          reason: input.reason,
          description: input.description,
          status: 'pending',
          requestedAt: new Date(),
        },
      },
    })

    void notificationService.create({
      userId,
      type: 'order',
      title: 'Return Request Submitted',
      message: `Your return request for order #${order.orderNumber} has been submitted and is under review.`,
      link: `/dashboard/returns/${String(returnDoc._id)}`,
    })

    return returnDoc
  },

  async listReturns(userId: string, role: string, page = 1, limit = 10) {
    const skip = (page - 1) * limit
    const filter = role === 'admin' ? ({} as object) : ({ userId } as object)
    const [items, total] = await Promise.all([
      Return.find(filter)
        .sort({ createdAt: -1 })
        .skip(skip)
        .limit(limit)
        .populate('orderId', 'orderNumber grandTotal')
        .populate('userId', 'firstName lastName email')
        .lean(),
      Return.countDocuments(filter),
    ])
    return { items, total, page, pages: Math.ceil(total / limit) }
  },

  async getReturn(id: string, userId: string, role: string) {
    const ret = await Return.findById(id).populate('orderId', 'orderNumber grandTotal items').lean()
    if (!ret) throw new AppError('Return not found', 404)
    if (role !== 'admin' && String(ret.userId) !== userId) throw new AppError('Access denied', 403)
    return ret
  },

  async updateReturnStatus(
    id: string,
    status: ReturnStatus,
    _adminId: string,
    opts: { refundAmount?: number; adminNotes?: string; sellerResponse?: string } = {},
  ) {
    const ret = await Return.findById(id).populate('orderId', 'orderNumber userId')
    if (!ret) throw new AppError('Return not found', 404)

    ret.status = status
    if (opts.refundAmount !== undefined) ret.refundAmount = opts.refundAmount
    if (opts.adminNotes) ret.adminNotes = opts.adminNotes
    if (opts.sellerResponse) ret.sellerResponse = opts.sellerResponse
    if (['refunded', 'completed', 'rejected'].includes(status)) ret.resolvedAt = new Date()
    await ret.save()

    // Mirror to Order
    const orderReturnStatus =
      status === 'approved'
        ? 'approved'
        : status === 'rejected'
          ? 'rejected'
          : status === 'refunded' || status === 'completed'
            ? 'completed'
            : 'pending'
    await Order.updateOne({ _id: ret.orderId } as object, {
      $set: { 'returnRequest.status': orderReturnStatus },
    })

    const order = ret.orderId as unknown as { orderNumber: string; userId: string }
    const titles: Partial<Record<ReturnStatus, string>> = {
      approved: 'Return Approved',
      rejected: 'Return Rejected',
      refunded: 'Refund Processed',
      completed: 'Return Completed',
    }
    if (titles[status]) {
      void notificationService.create({
        userId: order.userId,
        type: 'order',
        title: titles[status]!,
        message: `Your return for order #${order.orderNumber} has been ${status}.`,
        link: `/dashboard/returns/${id}`,
      })
    }

    emitToUser(String(order.userId), 'return:updated', { returnId: id, status })
    return ret
  },

  // ─── Disputes ────────────────────────────────────────────────────────────────

  async openDispute(
    userId: string,
    input: {
      orderId: string
      returnId?: string
      type: DisputeType
      description: string
      respondentId: string
    },
  ) {
    const order = await Order.findById(input.orderId)
    if (!order) throw new AppError('Order not found', 404)
    if (String(order.userId) !== userId && String(order.userId) !== input.respondentId) {
      throw new AppError('Not a party to this order', 403)
    }

    const existing = await Dispute.findOne({
      orderId: input.orderId,
      complainantId: userId,
      status: { $nin: ['resolved', 'closed'] },
    } as object)
    if (existing) throw new AppError('An open dispute already exists for this order', 409)

    const dispute = await Dispute.create({
      orderId: input.orderId,
      ...(input.returnId ? { returnId: input.returnId } : {}),
      complainantId: userId,
      respondentId: input.respondentId,
      type: input.type,
      description: input.description,
    })

    void notificationService.create({
      userId: input.respondentId,
      type: 'order',
      title: 'Dispute Opened',
      message: `A dispute has been opened for order. Please review and respond.`,
      link: `/dashboard/disputes/${String(dispute._id)}`,
    })

    return dispute
  },

  async listDisputes(userId: string, role: string, page = 1, limit = 10) {
    const skip = (page - 1) * limit
    const filter =
      role === 'admin'
        ? ({} as object)
        : ({ $or: [{ complainantId: userId }, { respondentId: userId }] } as object)
    const [items, total] = await Promise.all([
      Dispute.find(filter)
        .sort({ createdAt: -1 })
        .skip(skip)
        .limit(limit)
        .populate('complainantId', 'firstName lastName')
        .populate('respondentId', 'firstName lastName')
        .lean(),
      Dispute.countDocuments(filter),
    ])
    return { items, total, page, pages: Math.ceil(total / limit) }
  },

  async addDisputeMessage(id: string, userId: string, role: string, content: string) {
    const dispute = await Dispute.findById(id)
    if (!dispute) throw new AppError('Dispute not found', 404)

    const isParty =
      String(dispute.complainantId) === userId ||
      String(dispute.respondentId) === userId ||
      role === 'admin'
    if (!isParty) throw new AppError('Access denied', 403)
    if (['resolved', 'closed'].includes(dispute.status)) {
      throw new AppError('Dispute is closed', 400)
    }

    const msgRole =
      role === 'admin' ? 'admin' : String(dispute.complainantId) === userId ? 'buyer' : 'seller'
    dispute.messages.push({
      senderId: dispute.complainantId,
      role: msgRole,
      content: content.trim(),
      createdAt: new Date(),
    })
    await dispute.save()

    // Notify the other party
    const notifyId =
      String(dispute.complainantId) === userId
        ? String(dispute.respondentId)
        : String(dispute.complainantId)
    void notificationService.create({
      userId: notifyId,
      type: 'order',
      title: 'New Message in Dispute',
      message: content.slice(0, 100),
      link: `/dashboard/disputes/${id}`,
    })
    emitToUser(notifyId, 'dispute:message', { disputeId: id })
    return dispute
  },

  async resolveDispute(id: string, resolution: DisputeResolution, notes: string) {
    const dispute = await Dispute.findById(id)
    if (!dispute) throw new AppError('Dispute not found', 404)

    dispute.status = 'resolved'
    dispute.resolution = resolution
    dispute.resolutionNotes = notes
    dispute.resolvedAt = new Date()
    await dispute.save()

    for (const uid of [String(dispute.complainantId), String(dispute.respondentId)]) {
      void notificationService.create({
        userId: uid,
        type: 'order',
        title: 'Dispute Resolved',
        message: `Your dispute has been resolved: ${resolution.replace('_', ' ')}.`,
        link: `/dashboard/disputes/${id}`,
      })
      emitToUser(uid, 'dispute:resolved', { disputeId: id, resolution })
    }

    return dispute
  },
}
