import mongoose from 'mongoose'
import { nanoid } from 'nanoid'
import { Order } from './order.model.js'
import { Checkout } from '../checkout/checkout.model.js'
import { Cart } from '../cart/cart.model.js'
import { Coupon } from '../coupon/coupon.model.js'
import { Product } from '../product/product.model.js'
import { AppError } from '../../middlewares/error.middleware.js'
import { logger } from '../../utils/logger.js'
import { withDbTransaction } from '../../utils/db-transaction.js'
import { refundTransaction as paystackRefund } from '../payment/paystack.service.js'
import {
  ORDER_STATUS,
  PAYMENT_STATUS,
  CANCELLABLE_STATUSES,
  RETURNABLE_STATUSES,
  PAGINATION,
  ROLES,
} from '../../../../src/shared/constants/index.js'
import type { CreateOrderInput } from '../../../../src/shared/validators/payment.validators.js'
import type {
  CancelOrderInput,
  UpdateOrderStatusInput,
  ReturnRequestInput,
  UpdateReturnStatusInput,
} from '../../../../src/shared/validators/order.validators.js'
import type { IOrderDocument } from './order.model.js'

// ─── Helpers ──────────────────────────────────────────────────────────────────
const generateOrderNumber = (): string => {
  const date = new Date()
  const ymd = `${date.getFullYear()}${String(date.getMonth() + 1).padStart(2, '0')}${String(date.getDate()).padStart(2, '0')}`
  const suffix = nanoid(6).toUpperCase()
  return `TSM-${ymd}-${suffix}`
}

const defaultTrackingNote = (status: string): string => {
  const map: Record<string, string> = {
    confirmed: 'Order confirmed and ready for processing',
    processing: 'Your order is being prepared and packed',
    shipped: 'Your order has been shipped',
    outForDelivery: 'Your order is out for delivery',
    delivered: 'Your order has been delivered',
    cancelled: 'Order has been cancelled',
    returned: 'Return request has been initiated',
    refunded: 'Order has been refunded',
  }
  return map[status] ?? 'Order status updated'
}

// ─── Create order ─────────────────────────────────────────────────────────────
export const createOrder = async (
  userId: string,
  input: CreateOrderInput,
): Promise<{ order: IOrderDocument }> => {
  const session = await Checkout.findOne({
    _id: input.checkoutSessionId,
    userId,
    status: 'pending',
    expiresAt: { $gt: new Date() },
  })

  if (!session) {
    throw new AppError('Checkout session not found or expired. Please restart checkout.', 404)
  }
  if (!session.shippingAddress) {
    throw new AppError('Shipping address is required before placing an order.', 400)
  }
  if (session.items.length === 0) {
    throw new AppError('Cannot create an order from an empty checkout session.', 400)
  }

  const orderNumber = generateOrderNumber()
  let order!: IOrderDocument

  await withDbTransaction(async (dbSess) => {
    const s = dbSess ? { session: dbSess } : undefined
    const orderDoc = new Order({
      orderNumber,
      userId,
      checkoutSessionId: session._id,
      items: session.items.map((i) => ({
        productId: i.productId,
        title: i.title,
        image: i.image,
        sku: i.sku,
        quantity: i.quantity,
        itemPrice: i.itemPrice,
        lineTotal: i.lineTotal,
      })),
      shippingAddress: session.shippingAddress,
      billingAddress: session.billingAddress ?? session.shippingAddress,
      sameAsShipping: session.sameAsShipping,
      shippingMethod: session.shippingMethod,
      subtotal: session.pricing.subtotal,
      discountAmount: session.pricing.discountAmount,
      shippingFee: session.pricing.shippingFee,
      taxAmount: session.pricing.taxAmount,
      grandTotal: session.pricing.grandTotal,
      couponCode: session.couponCode,
      paymentStatus: PAYMENT_STATUS.PENDING,
      orderStatus: ORDER_STATUS.PENDING,
      notes: input.notes,
      tracking: {
        events: [
          {
            status: ORDER_STATUS.PENDING,
            description: 'Order placed — awaiting payment',
            timestamp: new Date(),
          },
        ],
      },
    })
    await orderDoc.save(s)
    order = orderDoc

    if (session.couponCode) {
      await Coupon.updateOne({ code: session.couponCode }, { $inc: { usedCount: 1 } }, s)
    }

    session.status = 'completed'
    await session.save(s)

    await Cart.updateOne(
      { userId: new mongoose.Types.ObjectId(userId) },
      {
        $set: {
          items: [],
          couponCode: undefined,
          discountAmount: 0,
          cartTotal: 0,
          shippingCost: 0,
          taxAmount: 0,
          grandTotal: 0,
        },
      },
      s,
    )
  })

  return { order }
}

// ─── Get by ID (user-scoped) ──────────────────────────────────────────────────
export const getOrderById = async (orderId: string, userId: string): Promise<IOrderDocument> => {
  const order = await Order.findOne({ _id: orderId, userId }).lean()
  if (!order) throw new AppError('Order not found', 404)
  return order as unknown as IOrderDocument
}

// ─── User's orders ────────────────────────────────────────────────────────────
export const getUserOrders = async (
  userId: string,
  opts?: {
    status?: string
    page?: number
    limit?: number
  },
): Promise<{ orders: IOrderDocument[]; total: number }> => {
  const filter: Record<string, unknown> = { userId }
  if (opts?.status) filter.orderStatus = opts.status

  const page = Math.max(1, opts?.page ?? PAGINATION.DEFAULT_PAGE)
  const limit = Math.min(PAGINATION.MAX_LIMIT, opts?.limit ?? PAGINATION.DEFAULT_LIMIT)

  const [orders, total] = await Promise.all([
    Order.find(filter)
      .sort({ createdAt: -1 })
      .skip((page - 1) * limit)
      .limit(limit)
      .lean(),
    Order.countDocuments(filter),
  ])
  return { orders: orders as IOrderDocument[], total }
}

// ─── Cancel order ─────────────────────────────────────────────────────────────
export const cancelOrder = async (
  orderId: string,
  userId: string,
  input: CancelOrderInput,
): Promise<IOrderDocument> => {
  const order = await Order.findOne({ _id: orderId, userId }).lean()
  if (!order) throw new AppError('Order not found', 404)

  const isCancellable = (CANCELLABLE_STATUSES as readonly string[]).includes(order.orderStatus)
  if (!isCancellable) {
    throw new AppError(
      `This order cannot be cancelled. Orders in "${order.orderStatus}" status cannot be cancelled. ` +
        'If you have already received the item, please submit a return request instead.',
      400,
    )
  }

  const $set: Record<string, unknown> = {
    orderStatus: ORDER_STATUS.CANCELLED,
    ...(input.reason ? { notes: input.reason } : {}),
  }
  const $push = {
    'tracking.events': {
      status: ORDER_STATUS.CANCELLED,
      description: input.reason ?? 'Order cancelled by customer',
      timestamp: new Date(),
    },
  }

  // If already paid → issue refund via the correct provider before cancelling.
  // Throwing on failure is intentional: the order is NOT marked cancelled if
  // the refund cannot be issued, preventing a state where money is taken but
  // the order is "cancelled" with no refund on record.
  if (order.paymentStatus === PAYMENT_STATUS.PAID) {
    if (order.paystackReference) {
      try {
        await paystackRefund(orderId, userId, input.reason ?? 'Customer cancellation')
        $set['paymentStatus'] = PAYMENT_STATUS.REFUNDED
        logger.info('Paystack refund initiated on order cancellation', { orderId })
      } catch (err) {
        logger.error('Paystack refund failed on order cancellation', { orderId, err })
        throw new AppError(
          'Unable to process refund at this time. Please contact support to cancel and receive your refund.',
          502,
        )
      }
    }
  }

  const updated = await Order.findByIdAndUpdate(
    orderId,
    { $set, $push },
    { returnDocument: 'after', runValidators: true },
  )
  if (!updated) throw new AppError('Order not found', 404)
  return updated
}

// ─── Update order status (seller / admin) ────────────────────────────────────
export const updateOrderStatus = async (
  orderId: string,
  userId: string,
  role: string,
  input: UpdateOrderStatusInput,
): Promise<IOrderDocument> => {
  const order = await Order.findById(orderId).lean()
  if (!order) throw new AppError('Order not found', 404)

  // Sellers may only update orders containing their own products.
  // Check only the products already in this order (bounded by order.items length)
  // rather than loading every product owned by the seller into memory.
  if (role === ROLES.SELLER) {
    const orderItemProductIds = order.items.map((item) => item.productId)
    const sellerProductCount = await Product.countDocuments({
      _id: { $in: orderItemProductIds },
      sellerId: new mongoose.Types.ObjectId(userId),
    })
    const hasSellerItems = sellerProductCount > 0
    if (!hasSellerItems) {
      throw new AppError('You are not authorised to update this order', 403)
    }

    const sellerAllowed = [
      ORDER_STATUS.PROCESSING,
      ORDER_STATUS.SHIPPED,
      ORDER_STATUS.OUT_FOR_DELIVERY,
      ORDER_STATUS.DELIVERED,
    ] as string[]
    if (!sellerAllowed.includes(input.orderStatus)) {
      throw new AppError(
        'Sellers can only advance orders to: processing, shipped, outForDelivery, or delivered',
        400,
      )
    }
  }

  const $set: Record<string, unknown> = { orderStatus: input.orderStatus }

  if (input.tracking) {
    const t = input.tracking
    if (t.trackingNumber) $set['tracking.trackingNumber'] = t.trackingNumber
    if (t.carrier) $set['tracking.carrier'] = t.carrier
    if (t.trackingUrl) $set['tracking.trackingUrl'] = t.trackingUrl
    if (t.estimatedDeliveryDate)
      $set['tracking.estimatedDeliveryDate'] = new Date(t.estimatedDeliveryDate)
  }

  const event = {
    status: input.orderStatus,
    location: input.tracking?.location,
    description: input.tracking?.note ?? defaultTrackingNote(input.orderStatus),
    timestamp: new Date(),
  }

  const updated = await Order.findByIdAndUpdate(
    orderId,
    { $set, $push: { 'tracking.events': event } },
    { returnDocument: 'after', runValidators: true },
  )
  if (!updated) throw new AppError('Order not found', 404)
  return updated
}

// ─── Request return ───────────────────────────────────────────────────────────
export const requestReturn = async (
  orderId: string,
  userId: string,
  input: ReturnRequestInput,
): Promise<IOrderDocument> => {
  const order = await Order.findOne({ _id: orderId, userId }).lean()
  if (!order) throw new AppError('Order not found', 404)

  const isReturnable = (RETURNABLE_STATUSES as readonly string[]).includes(order.orderStatus)
  if (!isReturnable) {
    throw new AppError('Returns can only be requested for delivered orders.', 400)
  }

  if (order.returnRequest) {
    throw new AppError('A return request already exists for this order.', 400)
  }

  const updated = await Order.findByIdAndUpdate(
    orderId,
    {
      $set: {
        returnRequest: {
          reason: input.reason,
          description: input.description,
          status: 'pending',
          requestedAt: new Date(),
        },
      },
      $push: {
        'tracking.events': {
          status: ORDER_STATUS.RETURNED,
          description: `Return requested: ${input.reason}`,
          timestamp: new Date(),
        },
      },
    },
    { returnDocument: 'after', runValidators: true },
  )
  if (!updated) throw new AppError('Order not found', 404)
  return updated
}

// ─── Admin: update return request status ─────────────────────────────────────
export const updateReturnStatus = async (
  orderId: string,
  input: UpdateReturnStatusInput,
): Promise<IOrderDocument> => {
  const order = await Order.findById(orderId).lean()
  if (!order) throw new AppError('Order not found', 404)
  if (!order.returnRequest) throw new AppError('No return request found for this order', 404)

  const $set: Record<string, unknown> = {
    'returnRequest.status': input.status,
    'returnRequest.resolvedAt': new Date(),
  }
  if (input.refundAmount !== undefined) $set['returnRequest.refundAmount'] = input.refundAmount

  if (input.status === 'completed') {
    $set.orderStatus = ORDER_STATUS.RETURNED

    // Issue the actual refund via the correct payment provider.
    // Throw on failure so the DB is not marked as refunded without money moving.
    const refundAmount = input.refundAmount ?? order.grandTotal

    if (order.paystackReference) {
      try {
        await paystackRefund(
          orderId,
          order.userId.toString(),
          input.note ?? 'Return approved',
          refundAmount,
        )
        $set.paymentStatus = PAYMENT_STATUS.REFUNDED
        logger.info('Paystack refund issued on return approval', { orderId, refundAmount })
      } catch (err) {
        logger.error('Paystack refund failed on return approval', { orderId, err })
        throw new AppError(
          'Failed to process refund. Please retry or issue the refund manually via the Paystack dashboard.',
          502,
        )
      }
    } else {
      logger.warn('Return approved but no Paystack reference found — manual refund required', {
        orderId,
        grandTotal: order.grandTotal,
      })
      $set.paymentStatus = PAYMENT_STATUS.REFUNDED
    }
  }

  const event = {
    status: input.status === 'completed' ? ORDER_STATUS.RETURNED : order.orderStatus,
    description: input.note ?? `Return request ${input.status}`,
    timestamp: new Date(),
  }

  const updated = await Order.findByIdAndUpdate(
    orderId,
    { $set, $push: { 'tracking.events': event } },
    { returnDocument: 'after', runValidators: true },
  )
  if (!updated) throw new AppError('Order not found', 404)
  return updated
}

// ─── Seller orders ────────────────────────────────────────────────────────────
export const getSellerOrders = async (
  sellerId: string,
  opts: { status?: string; page?: number; limit?: number },
): Promise<{ orders: IOrderDocument[]; total: number }> => {
  // .distinct() hits the 16 MB BSON limit on large catalogs; lean select streams instead.
  const productDocs = await Product.find({ sellerId }).select('_id').lean()
  const productIds = productDocs.map((p) => p._id)

  if (productIds.length === 0) {
    return { orders: [], total: 0 }
  }

  const filter: Record<string, unknown> = {
    'items.productId': { $in: productIds },
  }
  if (opts.status) filter.orderStatus = opts.status

  const page = Math.max(1, opts.page ?? PAGINATION.DEFAULT_PAGE)
  const limit = Math.min(PAGINATION.MAX_LIMIT, opts.limit ?? PAGINATION.DEFAULT_LIMIT)

  const [orders, total] = await Promise.all([
    Order.find(filter)
      .sort({ createdAt: -1 })
      .skip((page - 1) * limit)
      .limit(limit)
      .populate('userId', 'firstName lastName email')
      .lean(),
    Order.countDocuments(filter),
  ])
  return { orders: orders as IOrderDocument[], total }
}
