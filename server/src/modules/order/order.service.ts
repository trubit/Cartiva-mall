import mongoose from 'mongoose'
import { nanoid } from 'nanoid'
import { Order, type IOrderDocument } from './order.model.js'
import { Checkout } from '../checkout/checkout.model.js'
import { Cart } from '../cart/cart.model.js'
import { Coupon } from '../coupon/coupon.model.js'
import { Product } from '../product/product.model.js'
import { AppError } from '../../middlewares/error.middleware.js'
import { logger } from '../../utils/logger.js'
import { withDbTransaction } from '../../utils/db-transaction.js'
import { eventBus } from '../event-bus/eventBus.service.js'
import { cacheGet, cacheSet, cacheDel } from '../../utils/cache.js'
import { createSellerFeeForOrderItem } from '../fee/sellerFee.service.js'
import { getAuthoritativeShippingFee } from '../shipping/shippingConfig.service.js'
import { refundTransaction as paystackRefund } from '../payment/paystack.service.js'
import {
  ORDER_STATUS,
  PAYMENT_STATUS,
  CANCELLABLE_STATUSES,
  RETURNABLE_STATUSES,
  PAGINATION,
  ROLES,
} from '../../../../src/shared/constants/index.js'
import { currencyService } from '../currency/currency.service.js'
import { Money, roundMoney } from '../../../../src/shared/utils/money.js'
import { emitToUser } from '../../sockets/index.js'
import { notificationService } from '../notification/notification.service.js'
import { sendOrderStatusUpdateEmail } from '../../utils/email.js'
import { sendBuyerDeliveryUpdateSms } from '../../utils/sms.js'
import { User } from '../user/user.model.js'
import type { CreateOrderInput } from '../../../../src/shared/validators/payment.validators.js'
import type {
  CancelOrderInput,
  UpdateOrderStatusInput,
  ReturnRequestInput,
  UpdateReturnStatusInput,
} from '../../../../src/shared/validators/order.validators.js'

// ─── Constants & Helpers ──────────────────────────────────────────────────────
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

// Allowed state transitions table
const ALLOWED_TRANSITIONS: Record<string, string[]> = {
  [ORDER_STATUS.PENDING]: [ORDER_STATUS.CONFIRMED, ORDER_STATUS.PROCESSING, ORDER_STATUS.CANCELLED],
  [ORDER_STATUS.CONFIRMED]: [ORDER_STATUS.PROCESSING, ORDER_STATUS.SHIPPED, ORDER_STATUS.CANCELLED],
  [ORDER_STATUS.PROCESSING]: [
    ORDER_STATUS.SHIPPED,
    ORDER_STATUS.OUT_FOR_DELIVERY,
    ORDER_STATUS.DELIVERED,
    ORDER_STATUS.CANCELLED,
  ],
  [ORDER_STATUS.SHIPPED]: [ORDER_STATUS.OUT_FOR_DELIVERY, ORDER_STATUS.DELIVERED],
  [ORDER_STATUS.OUT_FOR_DELIVERY]: [ORDER_STATUS.DELIVERED],
  [ORDER_STATUS.DELIVERED]: [ORDER_STATUS.RETURNED],
  [ORDER_STATUS.CANCELLED]: [],
  [ORDER_STATUS.RETURNED]: [ORDER_STATUS.REFUNDED],
  [ORDER_STATUS.REFUNDED]: [],
}

export const validateStatusTransition = (
  currentStatus: string,
  nextStatus: string,
  role?: string,
): void => {
  if (currentStatus === nextStatus) return
  if (role === ROLES.ADMIN) return // Admins have full override privilege
  const allowed = ALLOWED_TRANSITIONS[currentStatus] ?? []
  if (!allowed.includes(nextStatus)) {
    throw new AppError(
      `Invalid order status transition from "${currentStatus}" to "${nextStatus}". Allowed target statuses: [${allowed.join(', ') || 'none'}].`,
      400,
    )
  }
}

// Cache keys
const ORDER_CACHE_TTL = 300 // 5 minutes
const getOrderCacheKey = (orderId: string) => `order:detail:${orderId}`
const getOrderNumberCacheKey = (num: string) => `order:number:${num}`

export const invalidateOrderCaches = async (
  orderId: string,
  userId?: string,
  orderNumber?: string,
) => {
  await cacheDel(getOrderCacheKey(orderId))
  if (orderNumber) await cacheDel(getOrderNumberCacheKey(orderNumber))
  if (userId) await cacheDel(`order:user:${userId}:*`)
}

// ─── Create Order ─────────────────────────────────────────────────────────────
export const createOrder = async (
  userId: string,
  input: CreateOrderInput & { idempotencyKey?: string },
): Promise<{ order: IOrderDocument }> => {
  if (input.paymentMethodType && (input.paymentMethodType as any) !== 'paystack') {
    throw new AppError(
      'Cartiva Mall exclusively supports secure online payments via Paystack.',
      400,
    )
  }

  // Idempotency check
  if (input.idempotencyKey) {
    const existing = await Order.findOne({ userId, idempotencyKey: input.idempotencyKey }).lean()
    if (existing) {
      logger.info('Duplicate order creation request prevented via idempotency key', {
        userId,
        idempotencyKey: input.idempotencyKey,
      })
      return { order: existing as unknown as IOrderDocument }
    }
  }

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

  // Populate product snapshots & seller IDs
  const productIds = session.items.map((i) => i.productId)
  const products = await Product.find({ _id: { $in: productIds } }).lean()
  const productMap = new Map(products.map((p) => [p._id.toString(), p]))

  const orderNumber = generateOrderNumber()
  let order!: IOrderDocument

  await withDbTransaction(async (dbSess) => {
    const s = dbSess ? { session: dbSess } : undefined

    const orderItems = session.items.map((i) => {
      const prod = productMap.get(i.productId.toString())
      return {
        productId: i.productId,
        sellerId: prod?.sellerId
          ? new mongoose.Types.ObjectId(prod.sellerId.toString())
          : undefined,
        title: prod?.title ?? i.title,
        image: i.image ?? (prod?.images && prod.images[0]),
        sku: prod?.sku ?? i.sku,
        quantity: i.quantity,
        itemPrice: i.itemPrice,
        lineTotal: i.lineTotal,
        fulfillmentStatus: 'unfulfilled' as const,
      }
    })

    const initialHistoryEntry = {
      status: ORDER_STATUS.PENDING,
      actor: 'customer',
      timestamp: new Date(),
      reason: 'Order created',
    }

    const targetCurrency = (input as any).currency
      ? String((input as any).currency).toUpperCase()
      : 'USD'
    let orderCurrency = 'USD'
    let exchangeRateUsed: number | undefined
    let exchangeRateSource: string | undefined
    let exchangeRateTimestamp: Date | undefined
    let originalCurrency: string | undefined
    let originalAmount: number | undefined

    let subtotal = session.pricing.subtotal
    let discountAmount = session.pricing.discountAmount
    let taxAmount = session.pricing.taxAmount

    if (targetCurrency !== 'USD') {
      const conversion = await currencyService.convert(1.0, 'USD', targetCurrency)
      orderCurrency = targetCurrency
      exchangeRateUsed = conversion.rate
      exchangeRateSource = conversion.rateSource
      exchangeRateTimestamp = new Date(conversion.rateTimestamp)
      originalCurrency = 'USD'
      originalAmount = session.pricing.grandTotal

      subtotal = roundMoney(
        Money.from(session.pricing.subtotal).multiply(conversion.rate).toNumber(),
        targetCurrency,
      )
      discountAmount = roundMoney(
        Money.from(session.pricing.discountAmount).multiply(conversion.rate).toNumber(),
        targetCurrency,
      )
      taxAmount = roundMoney(
        Money.from(session.pricing.taxAmount).multiply(conversion.rate).toNumber(),
        targetCurrency,
      )

      // Convert order items to targetCurrency
      orderItems.forEach((oi) => {
        oi.itemPrice = roundMoney(
          Money.from(oi.itemPrice).multiply(conversion.rate).toNumber(),
          targetCurrency,
        )
        oi.lineTotal = roundMoney(
          Money.from(oi.itemPrice).multiply(oi.quantity).toNumber(),
          targetCurrency,
        )
      })
    }

    // Retrieve authoritative admin-configured fixed shipping price for orderCurrency
    const shippingFee = await getAuthoritativeShippingFee(orderCurrency)
    const shippingDetails: any[] = []

    const grandTotal = Money.from(subtotal)
      .subtract(discountAmount)
      .add(shippingFee)
      .add(taxAmount)
      .round(orderCurrency)

    if ((input as any).paymentMethodType && (input as any).paymentMethodType !== 'paystack') {
      throw new AppError(
        'Cartiva Mall exclusively supports secure online payments via Paystack.',
        400,
      )
    }
    const paymentMethodType = 'paystack'

    const orderDoc = new Order({
      orderNumber,
      userId,
      checkoutSessionId: session._id,
      idempotencyKey: input.idempotencyKey,
      items: orderItems,
      shippingAddress: session.shippingAddress,
      billingAddress: session.billingAddress ?? session.shippingAddress,
      sameAsShipping: session.sameAsShipping,
      shippingMethod: session.shippingMethod,
      subtotal,
      discountAmount,
      shippingFee,
      taxAmount,
      grandTotal,
      couponCode: session.couponCode,
      currency: orderCurrency,
      exchangeRateUsed,
      exchangeRateSource,
      exchangeRateTimestamp,
      originalCurrency,
      originalAmount,
      paymentStatus: PAYMENT_STATUS.PENDING,
      orderStatus: ORDER_STATUS.PENDING,
      paymentMethodType,
      fulfillmentStatus: 'unfulfilled',
      shippingDetails,
      notes: input.notes,
      history: [initialHistoryEntry],
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

  // Publish order.created domain event
  await eventBus.publish({
    eventType: 'order.created',
    aggregateId: order._id.toString(),
    aggregateType: 'Order',
    actorId: userId,
    payload: {
      orderId: order._id.toString(),
      orderNumber: order.orderNumber,
      userId: order.userId.toString(),
      grandTotal: order.grandTotal,
      itemCount: order.items.length,
    },
  })

  logger.info('Audit: Order created successfully', {
    orderId: order._id.toString(),
    orderNumber: order.orderNumber,
    userId,
  })

  await cacheSet(getOrderCacheKey(order._id.toString()), order.toObject(), ORDER_CACHE_TTL)
  return { order }
}

// ─── Get by ID ────────────────────────────────────────────────────────────────
export const getOrderById = async (orderId: string, userId: string): Promise<IOrderDocument> => {
  if (!mongoose.Types.ObjectId.isValid(orderId)) {
    throw new AppError('Invalid order ID format', 400)
  }

  const cached = await cacheGet<IOrderDocument>(getOrderCacheKey(orderId))
  if (cached && cached.userId.toString() === userId) {
    return cached
  }

  const order = await Order.findOne({ _id: orderId, userId }).lean()
  if (!order) throw new AppError('Order not found', 404)

  await cacheSet(getOrderCacheKey(orderId), order, ORDER_CACHE_TTL)
  return order as unknown as IOrderDocument
}

// ─── Get by Number ────────────────────────────────────────────────────────────
export const getOrderByNumber = async (
  orderNumber: string,
  userId: string,
): Promise<IOrderDocument> => {
  const cached = await cacheGet<IOrderDocument>(getOrderNumberCacheKey(orderNumber))
  if (cached && cached.userId.toString() === userId) {
    return cached
  }

  const order = await Order.findOne({ orderNumber, userId }).lean()
  if (!order) throw new AppError('Order not found', 404)

  await cacheSet(getOrderNumberCacheKey(orderNumber), order, ORDER_CACHE_TTL)
  return order as unknown as IOrderDocument
}

// ─── User Orders ──────────────────────────────────────────────────────────────
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

// ─── Cancel Order ─────────────────────────────────────────────────────────────
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
      `This order cannot be cancelled. Orders in "${order.orderStatus}" status cannot be cancelled. If you have already received the item, please submit a return request instead.`,
      400,
    )
  }

  validateStatusTransition(order.orderStatus, ORDER_STATUS.CANCELLED)

  const historyEntry = {
    status: ORDER_STATUS.CANCELLED,
    actor: 'customer',
    timestamp: new Date(),
    reason: input.reason ?? 'Cancelled by customer',
  }

  const $set: Record<string, unknown> = {
    orderStatus: ORDER_STATUS.CANCELLED,
    fulfillmentStatus: 'cancelled',
    ...(input.reason ? { notes: input.reason } : {}),
  }
  const $push = {
    'tracking.events': {
      status: ORDER_STATUS.CANCELLED,
      description: input.reason ?? 'Order cancelled by customer',
      timestamp: new Date(),
    },
    history: historyEntry,
  }

  if (order.paymentStatus === PAYMENT_STATUS.PAID && order.paystackReference) {
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

  const updated = await Order.findByIdAndUpdate(
    orderId,
    { $set, $push },
    { returnDocument: 'after', runValidators: true },
  )
  if (!updated) throw new AppError('Order not found', 404)

  await invalidateOrderCaches(orderId, userId, order.orderNumber)

  // Real-time notification to buyer and sellers
  emitToUser(userId, 'order:updated', {
    orderId: updated._id,
    orderStatus: ORDER_STATUS.CANCELLED,
  })

  // Notify sellers about order cancellation
  try {
    const productIds = updated.items.map((i) => i.productId)
    const products = await Product.find({ _id: { $in: productIds } })
      .select('sellerId')
      .lean()
    const sellerIds = [...new Set(products.map((p) => p.sellerId?.toString()).filter(Boolean))]
    for (const sid of sellerIds) {
      emitToUser(sid, 'order:updated', {
        orderId: updated._id,
        orderStatus: ORDER_STATUS.CANCELLED,
      })
      await notificationService
        .create({
          userId: sid,
          type: 'ORDER_CANCELLED' as any,
          title: `Order #${updated.orderNumber} Cancelled`,
          message: `Order #${updated.orderNumber} was cancelled by the customer.`,
          link: '/seller/orders',
          data: { orderId: updated._id, reason: input.reason },
        })
        .catch(() => {})
    }
  } catch (sellerErr) {
    logger.warn('Failed to notify sellers on cancellation', { sellerErr })
  }

  await eventBus.publish({
    eventType: 'order.cancelled',
    aggregateId: orderId,
    aggregateType: 'Order',
    actorId: userId,
    payload: { orderId, reason: input.reason },
  })

  logger.info('Audit: Order cancelled', { orderId, userId, reason: input.reason })
  return updated
}

// ─── Update Order Status (Seller / Admin) ────────────────────────────────────
export const updateOrderStatus = async (
  orderId: string,
  userId: string,
  role: string,
  input: UpdateOrderStatusInput,
): Promise<IOrderDocument> => {
  const order = await Order.findById(orderId).lean()
  if (!order) throw new AppError('Order not found', 404)

  validateStatusTransition(order.orderStatus, input.orderStatus, role)

  if (role === ROLES.SELLER) {
    const orderItemProductIds = order.items.map((item) => item.productId)
    const sellerProductCount = await Product.countDocuments({
      _id: { $in: orderItemProductIds },
      sellerId: new mongoose.Types.ObjectId(userId),
    })
    if (sellerProductCount === 0) {
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

  if (
    input.orderStatus === ORDER_STATUS.SHIPPED ||
    input.orderStatus === ORDER_STATUS.OUT_FOR_DELIVERY
  ) {
    $set.fulfillmentStatus = 'partially_fulfilled'
  } else if (input.orderStatus === ORDER_STATUS.DELIVERED) {
    $set.fulfillmentStatus = 'fulfilled'
  }

  if (input.tracking) {
    const t = input.tracking
    if (t.trackingNumber) $set['tracking.trackingNumber'] = t.trackingNumber
    if (t.carrier) $set['tracking.carrier'] = t.carrier
    if (t.trackingUrl) $set['tracking.trackingUrl'] = t.trackingUrl
    if (t.estimatedDeliveryDate)
      $set['tracking.estimatedDeliveryDate'] = new Date(t.estimatedDeliveryDate)
  }

  const trackingEvent = {
    status: input.orderStatus,
    location: input.tracking?.location,
    description: input.tracking?.note ?? defaultTrackingNote(input.orderStatus),
    timestamp: new Date(),
  }

  const historyEntry = {
    status: input.orderStatus,
    actor: role,
    timestamp: new Date(),
    reason: input.tracking?.note ?? `Order status updated to ${input.orderStatus}`,
  }

  const updated = await Order.findByIdAndUpdate(
    orderId,
    { $set, $push: { 'tracking.events': trackingEvent, history: historyEntry } },
    { returnDocument: 'after', runValidators: true },
  )
  if (!updated) throw new AppError('Order not found', 404)

  if ([ORDER_STATUS.CONFIRMED, ORDER_STATUS.PROCESSING].includes(input.orderStatus as any)) {
    for (const item of updated.items) {
      await createSellerFeeForOrderItem(updated, item, 'paystack').catch((err) => {
        logger.error('Failed to create seller fee on order status update:', {
          err,
          orderId: updated._id,
        })
      })
    }
  }

  await invalidateOrderCaches(orderId, order.userId.toString(), order.orderNumber)

  // 1. Real-time push to buyer
  const buyerIdStr = order.userId.toString()
  emitToUser(buyerIdStr, 'order:updated', {
    orderId: updated._id,
    orderStatus: input.orderStatus,
    tracking: input.tracking,
  })
  emitToUser(buyerIdStr, 'shipment:updated', {
    orderId: updated._id,
    orderStatus: input.orderStatus,
    tracking: input.tracking,
  })

  // 2. Real-time push to all relevant sellers
  try {
    const productIds = updated.items.map((i) => i.productId)
    const products = await Product.find({ _id: { $in: productIds } })
      .select('sellerId')
      .lean()
    const sellerIds = [...new Set(products.map((p) => p.sellerId?.toString()).filter(Boolean))]
    for (const sid of sellerIds) {
      emitToUser(sid, 'order:updated', {
        orderId: updated._id,
        orderStatus: input.orderStatus,
      })
    }
  } catch (sellerErr) {
    logger.warn('Failed to emit real-time status update to sellers', { sellerErr })
  }

  // 3. Persistent In-App Notification for Buyer
  const statusDisplay = input.orderStatus.replace(/_/g, ' ')
  const notifTitle = `Order #${updated.orderNumber} ${statusDisplay.toUpperCase()}`
  const notifMsg = `Your order #${updated.orderNumber} status is now "${statusDisplay}".${input.tracking?.carrier ? ` Carrier: ${input.tracking.carrier}.` : ''}`

  await notificationService
    .create({
      userId: buyerIdStr,
      type: 'ORDER_STATUS_CHANGED' as any,
      title: notifTitle,
      message: notifMsg,
      link: `/orders/${updated._id}`,
      data: { orderId: updated._id, orderStatus: input.orderStatus, tracking: input.tracking },
    })
    .catch(() => {})

  // 4. Send Transactional Milestone Email & SMS to Buyer
  try {
    const buyerUser = await User.findById(order.userId)
      .select('email firstName lastName phone phoneNumber')
      .lean()
    const buyerEmail = buyerUser?.email
    const buyerName = buyerUser
      ? `${buyerUser.firstName || ''} ${buyerUser.lastName || ''}`.trim()
      : 'Customer'
    const buyerPhone = (buyerUser as any)?.phone || (buyerUser as any)?.phoneNumber

    if (buyerEmail) {
      await sendOrderStatusUpdateEmail(
        buyerEmail,
        buyerName,
        updated.orderNumber,
        input.orderStatus,
        input.tracking?.carrier ?? undefined,
        input.tracking?.trackingNumber ?? undefined,
        input.tracking?.trackingUrl ?? undefined,
      ).catch((e) => logger.warn('Status update email failed', { e }))
    }

    if (buyerPhone && typeof buyerPhone === 'string') {
      await sendBuyerDeliveryUpdateSms(
        buyerPhone,
        updated.orderNumber,
        input.orderStatus,
        input.tracking?.trackingNumber ?? undefined,
      ).catch((e) => logger.warn('Status update SMS failed', { e }))
    }
  } catch (alertErr) {
    logger.warn('Status update external alert failed', { alertErr })
  }

  await eventBus.publish({
    eventType: `order.${input.orderStatus.toLowerCase()}`,
    aggregateId: orderId,
    aggregateType: 'Order',
    actorId: userId,
    payload: { orderId, orderStatus: input.orderStatus, role },
  })

  logger.info('Audit: Order status updated', {
    orderId,
    role,
    newStatus: input.orderStatus,
    actorId: userId,
  })
  return updated
}

// ─── Request Return ───────────────────────────────────────────────────────────
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

  const historyEntry = {
    status: 'return_requested',
    actor: 'customer',
    timestamp: new Date(),
    reason: input.reason,
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
        history: historyEntry,
      },
    },
    { returnDocument: 'after', runValidators: true },
  )
  if (!updated) throw new AppError('Order not found', 404)

  await invalidateOrderCaches(orderId, userId, order.orderNumber)

  await eventBus.publish({
    eventType: 'order.return_requested',
    aggregateId: orderId,
    aggregateType: 'Order',
    actorId: userId,
    payload: { orderId, reason: input.reason },
  })

  return updated
}

// ─── Admin: Update Return Status ─────────────────────────────────────────────
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

  const trackingEvent = {
    status: input.status === 'completed' ? ORDER_STATUS.RETURNED : order.orderStatus,
    description: input.note ?? `Return request ${input.status}`,
    timestamp: new Date(),
  }

  const historyEntry = {
    status: `return_${input.status}`,
    actor: 'admin',
    timestamp: new Date(),
    reason: input.note ?? `Return status updated to ${input.status}`,
  }

  const updated = await Order.findByIdAndUpdate(
    orderId,
    { $set, $push: { 'tracking.events': trackingEvent, history: historyEntry } },
    { returnDocument: 'after', runValidators: true },
  )
  if (!updated) throw new AppError('Order not found', 404)

  await invalidateOrderCaches(orderId, order.userId.toString(), order.orderNumber)
  return updated
}

// ─── Seller Orders ────────────────────────────────────────────────────────────
export const getSellerOrders = async (
  sellerId: string,
  opts: { status?: string; page?: number; limit?: number },
): Promise<{ orders: IOrderDocument[]; total: number }> => {
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

  // Filter order items in response to contain only items owned by this seller for data isolation
  const sellerOrders = (orders as unknown as IOrderDocument[]).map((ord) => {
    const sellerItems = ord.items.filter((item) =>
      productIds.some((pid) => pid.toString() === item.productId.toString()),
    )
    return { ...ord, items: sellerItems } as IOrderDocument
  })

  return { orders: sellerOrders, total }
}

// ─── Admin Orders ─────────────────────────────────────────────────────────────
export const getAdminOrders = async (opts: {
  status?: string
  paymentStatus?: string
  search?: string
  page?: number
  limit?: number
}): Promise<{ orders: IOrderDocument[]; total: number }> => {
  const filter: Record<string, unknown> = {}
  if (opts.status) filter.orderStatus = opts.status
  if (opts.paymentStatus) filter.paymentStatus = opts.paymentStatus
  if (opts.search) {
    const escaped = opts.search.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')
    filter.$or = [
      { orderNumber: { $regex: escaped, $options: 'i' } },
      { 'shippingAddress.fullName': { $regex: escaped, $options: 'i' } },
    ]
  }

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

  return { orders: orders as unknown as IOrderDocument[], total }
}

// ─── Reconciliation Helper ───────────────────────────────────────────────────
export const reconcileOrderState = async (orderId: string) => {
  const order = await Order.findById(orderId)
  if (!order) return { reconciled: false, reason: 'Order not found' }

  const discrepancies: string[] = []

  // Check 1: Payment paid but order status pending
  if (order.paymentStatus === PAYMENT_STATUS.PAID && order.orderStatus === ORDER_STATUS.PENDING) {
    discrepancies.push('Payment is PAID but Order status is PENDING')
    order.orderStatus = ORDER_STATUS.CONFIRMED
    await order.save()
  }

  return {
    reconciled: discrepancies.length > 0,
    discrepancies,
    orderId,
    currentStatus: order.orderStatus,
    paymentStatus: order.paymentStatus,
  }
}

// ─── Physical Bank Transfer: Submit Payment Proof (Deprecated) ───────────────
export interface SubmitPhysicalPaymentProofInput {
  reference: string
  amount: number
  bankName?: string
  senderName?: string
  proofUrl?: string
  notes?: string
}

export const submitPhysicalPaymentProof = async (
  _orderId: string,
  _userId: string,
  _input: SubmitPhysicalPaymentProofInput,
): Promise<IOrderDocument> => {
  throw new AppError(
    'Direct physical bank transfer has been removed. Please pay securely using Paystack.',
    410,
  )
}

// ─── Physical Bank Transfer: Admin Verification (Deprecated) ─────────────────
export interface VerifyPhysicalPaymentInput {
  decision: 'CONFIRM' | 'REJECT'
  notes?: string
}

export const verifyPhysicalPayment = async (
  _orderId: string,
  _adminId: string,
  _input: VerifyPhysicalPaymentInput,
): Promise<IOrderDocument> => {
  throw new AppError(
    'Manual physical payment verification has been removed. Paystack payment confirmation is automatic.',
    410,
  )
}

// ─── Get Pending Physical Payments for Admin Review (Deprecated) ─────────────
export const getPendingPhysicalPayments = async (_opts: {
  page?: number
  limit?: number
}): Promise<{ orders: IOrderDocument[]; total: number }> => {
  return { orders: [], total: 0 }
}
