import { v4 as uuidv4 } from 'uuid'
import { Shipment, type ShipmentStatus } from './shipment.model.js'
import { Fulfillment } from './fulfillment.model.js'
import { CarrierAdapter } from './carrierAdapter.js'
import { Order } from '../order/order.model.js'
import { AppError } from '../../middlewares/error.middleware.js'
import { notificationService } from '../notification/notification.service.js'
import { emitToUser } from '../../sockets/index.js'
import { eventBus } from '../event-bus/eventBus.service.js'

export const shippingService = {
  // ─── Create Fulfillment Record ──────────────────────────────────────────────
  async createFulfillment(
    orderId: string,
    sellerId: string,
    items: { productId: string; title: string; quantity: number; sku?: string }[],
    shippingAddress: {
      fullName: string
      phone: string
      street: string
      city: string
      state: string
      country: string
      postalCode: string
    },
    warehouseId?: string,
  ) {
    const order = await Order.findById(orderId)
    if (!order) throw new AppError('Order not found', 404)

    const fulfillmentId = `FUL-${uuidv4().replace(/-/g, '').slice(0, 10).toUpperCase()}`

    const fulfillment = await Fulfillment.create({
      fulfillmentId,
      orderId,
      userId: order.userId,
      sellerId,
      warehouseId,
      status: 'PENDING',
      items,
      shippingAddress,
    })

    return fulfillment
  },

  // ─── Create Shipment ────────────────────────────────────────────────────────
  async createShipment(
    orderId: string,
    userId: string,
    input: {
      carrier: string
      estimatedDelivery?: string
      shippingCost?: number
      weight?: number
      sellerId?: string
      fulfillmentId?: string
    },
  ) {
    const order = await Order.findById(orderId)
    if (!order) throw new AppError('Order not found', 404)
    if (String(order.userId) !== userId && order.orderStatus === 'pending') {
      throw new AppError('Order is not ready for shipment', 400)
    }

    const existing = await Shipment.findOne({ orderId } as object)
    if (existing) throw new AppError('Shipment already exists for this order', 409)

    const carrierDetails = CarrierAdapter.createShipmentLabel(input.carrier)
    const shipmentId = `SHP-${uuidv4().replace(/-/g, '').slice(0, 10).toUpperCase()}`

    const shipment = await Shipment.create({
      shipmentId,
      fulfillmentId: input.fulfillmentId,
      orderId,
      userId: order.userId,
      ...(input.sellerId ? { sellerId: input.sellerId } : {}),
      carrier: carrierDetails.carrierName,
      trackingNumber: carrierDetails.trackingNumber,
      trackingUrl: carrierDetails.trackingUrl,
      labelUrl: carrierDetails.labelUrl,
      shippingCost: input.shippingCost ?? 0,
      weight: input.weight,
      status: 'LABEL_CREATED',
      estimatedDelivery: input.estimatedDelivery
        ? new Date(input.estimatedDelivery)
        : new Date(Date.now() + carrierDetails.estimatedDeliveryDays * 86400000),
      shippingAddress: order.shippingAddress,
      events: [
        { status: 'LABEL_CREATED', description: 'Shipping label created', timestamp: new Date() },
      ],
    })

    if (input.fulfillmentId) {
      await Fulfillment.findByIdAndUpdate(input.fulfillmentId, { status: 'SHIPPED' })
    }

    // Update order tracking info
    await Order.updateOne({ _id: orderId } as object, {
      $set: {
        'tracking.trackingNumber': carrierDetails.trackingNumber,
        'tracking.carrier': carrierDetails.carrierName,
        'tracking.estimatedDeliveryDate': shipment.estimatedDelivery,
      },
      $push: {
        'tracking.events': {
          status: 'LABEL_CREATED',
          description: 'Label created',
          timestamp: new Date(),
        },
      },
    })

    void notificationService.create({
      userId: order.userId,
      type: 'order',
      title: 'Shipment Created',
      message: `Your order #${order.orderNumber} has been shipped via ${carrierDetails.carrierName}. Tracking: ${carrierDetails.trackingNumber}`,
      link: `/dashboard/orders/${orderId}`,
      data: { orderId, trackingNumber: carrierDetails.trackingNumber },
    })

    await eventBus.publish({
      eventType: 'shipment.created',
      aggregateId: shipmentId,
      aggregateType: 'Shipment',
      payload: {
        shipmentId,
        orderId,
        carrier: carrierDetails.carrierName,
        trackingNumber: carrierDetails.trackingNumber,
      },
    })

    return shipment
  },

  async getShipment(shipmentId: string, userId: string, role: string) {
    const shipment = await Shipment.findById(shipmentId).lean()
    if (!shipment) throw new AppError('Shipment not found', 404)
    if (
      role !== 'admin' &&
      String(shipment.userId) !== userId &&
      String(shipment.sellerId) !== userId
    ) {
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

  async updateStatus(
    shipmentId: string,
    status: ShipmentStatus,
    description: string,
    location?: string,
  ) {
    const shipment = await Shipment.findById(shipmentId)
    if (!shipment) throw new AppError('Shipment not found', 404)

    shipment.status = status
    const event = { status, description, timestamp: new Date(), ...(location ? { location } : {}) }
    shipment.events.push(event)
    if (status === 'DELIVERED') shipment.deliveredAt = new Date()
    await shipment.save()

    if (shipment.fulfillmentId) {
      await Fulfillment.findByIdAndUpdate(shipment.fulfillmentId, {
        status:
          status === 'DELIVERED'
            ? 'DELIVERED'
            : status === 'DELIVERY_FAILED'
              ? 'FAILED'
              : 'PROCESSING',
      })
    }

    // Mirror tracking event into Order
    await Order.updateOne({ _id: shipment.orderId } as object, {
      $set: {
        orderStatus:
          status === 'DELIVERED'
            ? 'delivered'
            : status === 'OUT_FOR_DELIVERY'
              ? 'outForDelivery'
              : undefined,
      },
      $push: {
        'tracking.events': {
          status,
          description,
          ...(location ? { location } : {}),
          timestamp: new Date(),
        },
      },
    })

    // Notify buyer of status changes
    const notifTitles: Partial<Record<ShipmentStatus, string>> = {
      PICKED_UP: 'Package Picked Up',
      IN_TRANSIT: 'Shipment In Transit',
      OUT_FOR_DELIVERY: 'Out for Delivery',
      DELIVERED: 'Package Delivered',
      DELIVERY_FAILED: 'Delivery Failed',
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

    await eventBus.publish({
      eventType:
        status === 'DELIVERED'
          ? 'shipment.delivered'
          : status === 'DELIVERY_FAILED'
            ? 'shipment.failed'
            : 'shipment.updated',
      aggregateId: shipmentId,
      aggregateType: 'Shipment',
      payload: { shipmentId, status, description, location },
    })

    emitToUser(String(shipment.userId), 'shipment:updated', { shipmentId, status, event })
    return shipment
  },
}
