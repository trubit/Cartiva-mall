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
import {
  createSellerFeeForOrderItem,
  getCartivaCommissionPerUnit,
} from '../fee/sellerFee.service.js'
import { calculateSellerOrderAllocations } from './orderShippingAllocation.js'
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

    // Calculate seller allocations with customer-paid shipping fee allocated to fulfilling sellers
    const commissionPerUnit = await getCartivaCommissionPerUnit(orderCurrency).catch(() => 200)
    const sellerAllocMap = calculateSellerOrderAllocations(
      orderItems,
      shippingFee,
      orderCurrency,
      commissionPerUnit,
    )
    const initialSellerAllocations = Array.from(sellerAllocMap.values()).map((s) => ({
      ...s,
      status: 'pending' as const,
      fulfillmentStatus: 'unfulfilled' as const,
    }))
    const totalPlatformCommission = roundMoney(
      initialSellerAllocations.reduce((sum, s) => sum + s.commissionAmount, 0),
      orderCurrency,
    )
    const totalSellerEarnings = roundMoney(
      initialSellerAllocations.reduce((sum, s) => sum + s.netAmount, 0),
      orderCurrency,
    )

    if ((input as any).paymentMethodType && (input as any).paymentMethodType !== 'paystack') {
      throw new AppError(
        'Cartival Mall exclusively supports secure online payments via Paystack.',
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
      platformCommission: totalPlatformCommission,
      sellerEarnings: totalSellerEarnings,
      sellerAllocations: initialSellerAllocations,
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

      // If status is updated to SHIPPED, send the mandated seller shipment notification
      if (input.orderStatus === ORDER_STATUS.SHIPPED) {
        notificationService
          .create({
            userId: sid,
            type: 'order',
            audience: 'SELLER',
            title: 'Order Shipment Update',
            message:
              'Please ensure your shipment details and order status are up to date. The customer and Cartival Mall will be able to see the latest delivery status available in the system.',
            link: '/seller/orders',
            data: {
              orderId: String(updated._id),
              orderNumber: updated.orderNumber,
              status: 'shipped',
              tracking: input.tracking,
            },
          })
          .catch((err) => {
            logger.warn('Failed to send Order Shipment Update notification to seller', {
              err,
              sellerId: sid,
            })
          })
      }
    }
  } catch (sellerErr) {
    logger.warn('Failed to emit real-time status update to sellers', { sellerErr })
  }

  // 3. Persistent In-App Notification for Buyer
  const isShippedOrOut = [ORDER_STATUS.SHIPPED, ORDER_STATUS.OUT_FOR_DELIVERY].includes(
    input.orderStatus as any,
  )
  const notifTitle = isShippedOrOut
    ? 'Has Your Order Arrived?'
    : `Order #${updated.orderNumber} ${input.orderStatus.replace(/_/g, ' ').toUpperCase()}`
  const notifMsg = isShippedOrOut
    ? 'Your order has been marked as shipped by the seller. Please confirm delivery only after the product has physically arrived at your doorstep. Once you confirm successful delivery, the seller and Cartival Mall will be notified, and your order status will be updated.'
    : `Your order #${updated.orderNumber} status is now "${input.orderStatus.replace(/_/g, ' ')}".${input.tracking?.carrier ? ` Carrier: ${input.tracking.carrier}.` : ''}`

  await notificationService
    .create({
      userId: buyerIdStr,
      type: isShippedOrOut ? 'shipping' : ('ORDER_STATUS_CHANGED' as any),
      audience: 'BUYER',
      title: notifTitle,
      message: notifMsg,
      link: `/orders/${updated._id}`,
      data: {
        orderId: String(updated._id),
        orderNumber: updated.orderNumber,
        orderStatus: input.orderStatus,
        tracking: input.tracking,
      },
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

// ─── Confirm Delivery (Customer / Admin) ──────────────────────────────────────
export const confirmDelivery = async (
  orderId: string,
  userId: string,
  role: string,
): Promise<{ order: IOrderDocument; alreadyConfirmed?: boolean; message: string }> => {
  const order = await Order.findById(orderId)
  if (!order) throw new AppError('Order not found', 404)

  // Security check: Only the buyer of the order or an admin can confirm delivery receipt
  const isBuyer = order.userId.toString() === userId
  const isAdmin = role === ROLES.ADMIN
  if (!isBuyer && !isAdmin) {
    throw new AppError('You are not authorized to confirm delivery for this order', 403)
  }

  // Idempotency: if already confirmed, return idempotently without duplicate records or notifications
  if (order.deliveryConfirmedAt) {
    return {
      order,
      alreadyConfirmed: true,
      message: 'Delivery receipt was already confirmed.',
    }
  }

  // An order must be shipped, out for delivery, or delivered to be confirmed by the customer
  const confirmableStatuses = [
    ORDER_STATUS.SHIPPED,
    ORDER_STATUS.OUT_FOR_DELIVERY,
    ORDER_STATUS.DELIVERED,
  ] as string[]
  if (!confirmableStatuses.includes(order.orderStatus)) {
    throw new AppError(
      `Delivery receipt cannot be confirmed for an order with status "${order.orderStatus}". The order must be shipped first.`,
      400,
    )
  }

  const now = new Date()
  order.orderStatus = ORDER_STATUS.DELIVERED
  order.fulfillmentStatus = 'fulfilled'
  order.deliveryConfirmedAt = now
  order.deliveryConfirmedBy = new mongoose.Types.ObjectId(userId)
  order.deliveryConfirmationSource = isAdmin ? 'admin' : 'customer'

  const trackingEvent = {
    status: ORDER_STATUS.DELIVERED,
    description: 'Customer confirmed delivery receipt',
    timestamp: now,
  }

  const historyEntry = {
    status: 'delivery_confirmed',
    actor: isAdmin ? 'admin' : 'customer',
    reason: 'Customer confirmed receipt of the order',
    timestamp: now,
  }

  if (!order.tracking) {
    order.tracking = { events: [] }
  }
  order.tracking.events.push(trackingEvent)
  order.history.push(historyEntry)

  // Update seller allocations
  if (order.sellerAllocations && order.sellerAllocations.length > 0) {
    for (const alloc of order.sellerAllocations) {
      alloc.fulfillmentStatus = 'delivered_confirmed'
      alloc.deliveryConfirmedAt = now
      if (!alloc.deliveredAt) alloc.deliveredAt = now
    }
  }

  await order.save()
  await invalidateOrderCaches(orderId, order.userId.toString(), order.orderNumber)

  // 1. Identify all fulfilling sellers
  const sellerIdSet = new Set<string>()
  if (order.sellerAllocations && order.sellerAllocations.length > 0) {
    for (const alloc of order.sellerAllocations) {
      if (alloc.sellerId) sellerIdSet.add(alloc.sellerId.toString())
    }
  }
  for (const item of order.items) {
    if (item.sellerId) {
      sellerIdSet.add(item.sellerId.toString())
    }
  }

  // 2. Notify each seller with the mandated delivery confirmation notification
  for (const sid of sellerIdSet) {
    await notificationService
      .create({
        userId: sid,
        type: 'order',
        audience: 'SELLER',
        title: 'Delivery Successfully Confirmed',
        message:
          'The buyer has confirmed that your order was successfully delivered to their doorstep. The shipping alert for this order has been cleared from your active seller dashboard. The customer-paid shipping fee is included in your payout calculation, subject to payment verification, applicable deductions, refunds, and settlement rules. You can review the order and payout breakdown in your seller dashboard.',
        link: '/seller/orders',
        data: {
          orderId: String(order._id),
          orderNumber: order.orderNumber,
          deliveryConfirmedAt: now,
          status: 'delivered_confirmed',
        },
      })
      .catch((err) => {
        logger.warn('Failed to send delivery confirmation notification to seller', {
          err,
          sellerId: sid,
        })
      })

    emitToUser(sid, 'order:delivery_confirmed', {
      orderId: order._id,
      orderNumber: order.orderNumber,
      deliveryConfirmedAt: now,
    })
    emitToUser(sid, 'order:updated', {
      orderId: order._id,
      orderStatus: order.orderStatus,
      deliveryConfirmedAt: now,
    })
  }

  // 3. Notify Cartival Mall Admin
  try {
    const adminUsers = await User.find({ role: ROLES.ADMIN }).select('_id').lean()
    for (const admin of adminUsers) {
      await notificationService
        .create({
          userId: admin._id.toString(),
          type: 'order',
          audience: 'ADMIN',
          title: 'Buyer Confirmed Successful Delivery',
          message: `The buyer has confirmed successful delivery for Order #${order.orderNumber}. The order status has been updated, and the seller has been notified. The associated shipping fee and seller payout records are available for review.`,
          link: '/admin/orders',
          data: {
            orderId: String(order._id),
            orderNumber: order.orderNumber,
            deliveryConfirmedAt: now,
          },
        })
        .catch(() => {})

      emitToUser(admin._id.toString(), 'admin:order_delivery_confirmed', {
        orderId: order._id,
        orderNumber: order.orderNumber,
        deliveryConfirmedAt: now,
      })
    }
  } catch (adminNotifErr) {
    logger.warn('Failed to notify admins of delivery confirmation', { adminNotifErr })
  }

  // 4. Real-time push to buyer
  emitToUser(order.userId.toString(), 'order:delivery_confirmed', {
    orderId: order._id,
    orderNumber: order.orderNumber,
    deliveryConfirmedAt: now,
  })
  emitToUser(order.userId.toString(), 'order:updated', {
    orderId: order._id,
    orderStatus: order.orderStatus,
    deliveryConfirmedAt: now,
  })

  // 5. Publish to EventBus
  await eventBus.publish({
    eventType: 'order.delivery_confirmed',
    aggregateId: orderId,
    aggregateType: 'Order',
    actorId: userId,
    payload: {
      orderId,
      orderNumber: order.orderNumber,
      deliveryConfirmedAt: now,
      confirmedBy: userId,
      source: isAdmin ? 'admin' : 'customer',
    },
  })

  logger.info('Audit: Order delivery confirmed', {
    orderId,
    orderNumber: order.orderNumber,
    actorId: userId,
    role,
  })

  return {
    order,
    alreadyConfirmed: false,
    message: 'Delivery receipt successfully confirmed.',
  }
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

  // Filter order items in response to contain only items owned by this seller for data isolation,
  // and compute seller-specific financial breakdown including allocated customer-paid shipping fee
  const sellerOrders = (orders as unknown as IOrderDocument[]).map((ord) => {
    const sellerItems = ord.items.filter((item) =>
      productIds.some((pid) => pid.toString() === item.productId.toString()),
    )

    const sellerOidStr = sellerId.toString()
    const alloc = ord.sellerAllocations?.find((a) => a.sellerId?.toString() === sellerOidStr)

    const sellerSubtotal = roundMoney(
      sellerItems.reduce((sum, it) => Money.from(sum).add(it.lineTotal).toNumber(), 0),
      ord.currency,
    )

    let sellerShipping: number
    let sellerCommission: number
    let sellerGross: number
    let sellerNet: number
    let sellerFulfillmentStatus = alloc?.fulfillmentStatus || ord.fulfillmentStatus || 'unfulfilled'

    if (alloc) {
      sellerShipping = alloc.shippingFee ?? 0
      sellerCommission = alloc.commissionAmount
      sellerGross = alloc.grossAmount
      sellerNet = alloc.netAmount
      if (alloc.fulfillmentStatus) sellerFulfillmentStatus = alloc.fulfillmentStatus
    } else {
      // Proportional fallback for legacy orders without stored allocations
      const totalOrderProductSubtotal = ord.items.reduce(
        (sum, it) => Money.from(sum).add(it.lineTotal).toNumber(),
        0,
      )
      const ratio = totalOrderProductSubtotal > 0 ? sellerSubtotal / totalOrderProductSubtotal : 1
      sellerShipping = roundMoney(
        Money.from(ord.shippingFee || 0)
          .multiply(ratio)
          .toNumber(),
        ord.currency,
      )
      const totalUnits = sellerItems.reduce((sum, it) => sum + (it.quantity || 1), 0)
      sellerCommission = roundMoney(200 * totalUnits, ord.currency) // ₦200 per unit policy
      sellerGross = Money.from(sellerSubtotal).add(sellerShipping).round(ord.currency)
      sellerNet = Math.max(
        0,
        Money.from(sellerGross).subtract(sellerCommission).round(ord.currency),
      )
    }

    return {
      ...ord,
      items: sellerItems,
      sellerBreakdown: {
        sellerProductSubtotal: sellerSubtotal,
        sellerShippingFee: sellerShipping,
        sellerCommission,
        sellerGrossAmount: sellerGross,
        sellerNetAmount: sellerNet,
        sellerFulfillmentStatus,
        carrier: alloc?.carrier || ord.tracking?.carrier,
        trackingNumber: alloc?.trackingNumber || ord.tracking?.trackingNumber,
      },
    } as unknown as IOrderDocument
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
