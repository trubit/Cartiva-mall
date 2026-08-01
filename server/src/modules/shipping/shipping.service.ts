import { v4 as uuidv4 } from 'uuid'
import { Shipment, type ShipmentStatus } from './shipment.model.js'
import { Order } from '../order/order.model.js'
import { AppError } from '../../middlewares/error.middleware.js'
import { notificationService } from '../notification/notification.service.js'
import { emitToUser } from '../../sockets/index.js'

export const shippingService = {
  async createShipment(
    orderId: string,
    userId: string,
    input: {
      carrier: string
      estimatedDelivery?: string
      shippingCost?: number
      weight?: number
      sellerId?: string
    },
  ) {
    const order = await Order.findById(orderId)
    if (!order) throw new AppError('Order not found', 404)
    if (String(order.userId) !== userId && order.orderStatus === 'pending') {
      throw new AppError('Order is not ready for shipment', 400)
    }

    const existing = await Shipment.findOne({ orderId } as object)
    if (existing) throw new AppError('Shipment already exists for this order', 409)

    const trackingNumber = `TRK-${uuidv4().replace(/-/g, '').slice(0, 12).toUpperCase()}`

    const shipment = await Shipment.create({
      orderId,
      userId: order.userId,
      ...(input.sellerId ? { sellerId: input.sellerId } : {}),
      carrier: input.carrier,
      trackingNumber,
      shippingCost: input.shippingCost ?? 0,
      weight: input.weight,
      ...(input.estimatedDelivery ? { estimatedDelivery: new Date(input.estimatedDelivery) } : {}),
      shippingAddress: order.shippingAddress,
      events: [{ status: 'pending', description: 'Shipment created', timestamp: new Date() }],
    })

    // Update order tracking info
    await Order.updateOne(
      { _id: orderId } as object,
      {
        $set: {
          'tracking.trackingNumber': trackingNumber,
          'tracking.carrier': input.carrier,
          ...(input.estimatedDelivery
            ? { 'tracking.estimatedDeliveryDate': new Date(input.estimatedDelivery) }
            : {}),
        },
        $push: {
          'tracking.events': {
            status: 'pending',
            description: 'Label created',
            timestamp: new Date(),
          },
        },
      },
    )

    void notificationService.create({
      userId: order.userId,
      type: 'order',
      title: 'Shipment Created',
      message: `Your order #${order.orderNumber} has been shipped via ${input.carrier}. Tracking: ${trackingNumber}`,
      link: `/dashboard/orders/${orderId}`,
      data: { orderId, trackingNumber },
    })

    return shipment
  },

  async getShipment(shipmentId: string, userId: string, role: string) {
    const shipment = await Shipment.findById(shipmentId).lean()
    if (!shipment) throw new AppError('Shipment not found', 404)
    if (role !== 'admin' && String(shipment.userId) !== userId && String(shipment.sellerId) !== userId) {
      throw new AppError('Access denied', 403)
    }
    return shipment
  },

  async getByTrackingNumber(trackingNumber: string) {
    const shipment = await Shipment.findOne({ trackingNumber } as object)
      .populate('orderId', 'orderNumber orderStatus')
      .lean()
    if (!shipment) throw new AppError('Shipment not found', 404)
    return shipment
  },

  async listForUser(userId: string, page = 1, limit = 10) {
    const skip = (page - 1) * limit
    const [items, total] = await Promise.all([
      Shipment.find({ userId } as object)
        .sort({ createdAt: -1 })
        .skip(skip)
        .limit(limit)
        .populate('orderId', 'orderNumber grandTotal')
        .lean(),
      Shipment.countDocuments({ userId } as object),
    ])
    return { items, total, page, pages: Math.ceil(total / limit) }
  },

  async listForAdmin(page = 1, limit = 20, status?: string) {
    const skip = (page - 1) * limit
    const filter = status ? ({ status } as object) : ({} as object)
    const [items, total] = await Promise.all([
      Shipment.find(filter)
        .sort({ createdAt: -1 })
        .skip(skip)
        .limit(limit)
        .populate('orderId', 'orderNumber')
        .populate('userId', 'firstName lastName email')
        .lean(),
      Shipment.countDocuments(filter),
    ])
    return { items, total, page, pages: Math.ceil(total / limit) }
  },

  async updateStatus(shipmentId: string, status: ShipmentStatus, description: string, location?: string) {
    const shipment = await Shipment.findById(shipmentId)
    if (!shipment) throw new AppError('Shipment not found', 404)

    shipment.status = status
    const event = { status, description, timestamp: new Date(), ...(location ? { location } : {}) }
    shipment.events.push(event)
    if (status === 'delivered') shipment.deliveredAt = new Date()
    await shipment.save()

    // Mirror tracking event into Order
    await Order.updateOne(
      { _id: shipment.orderId } as object,
      {
        $set: { orderStatus: status === 'delivered' ? 'delivered' : status === 'out_for_delivery' ? 'outForDelivery' : undefined },
        $push: { 'tracking.events': { status, description, ...(location ? { location } : {}), timestamp: new Date() } },
      },
    )

    // Notify buyer of meaningful status changes
    const notifTitles: Partial<Record<ShipmentStatus, string>> = {
      picked_up: 'Package Picked Up',
      in_transit: 'Shipment In Transit',
      out_for_delivery: 'Out for Delivery',
      delivered: 'Package Delivered',
      failed: 'Delivery Failed',
    }
    if (notifTitles[status]) {
      void notificationService.create({
        userId: shipment.userId,
        type: 'order',
        title: notifTitles[status]!,
        message: description,
        link: `/dashboard/orders/${String(shipment.orderId)}`,
        data: { shipmentId, status },
      })
    }

    emitToUser(String(shipment.userId), 'shipment:updated', { shipmentId, status, event })
    return shipment
  },
}
