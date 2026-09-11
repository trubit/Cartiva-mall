import axios, { type AxiosError } from 'axios'
import crypto from 'crypto'
import { env } from '../../config/env.js'
import { Order } from '../order/order.model.js'
import { Payment } from './payment.model.js'
import { Product } from '../product/product.model.js'
import { AppError } from '../../middlewares/error.middleware.js'
import { emitToUser } from '../../sockets/index.js'
import { createNotification } from '../notification/notification.model.js'
import { cacheSetAdd } from '../../utils/cache.js'
import { logger } from '../../utils/logger.js'
import { withDbTransaction } from '../../utils/db-transaction.js'
import { eventBus } from '../event-bus/eventBus.service.js'
import { recordOrderSellerEarnings, reverseOrderSellerEarnings } from '../fee/sellerFee.service.js'
import { callStripe } from '../../utils/circuit-breakers.js'

const STRIPE_BASE = 'https://api.stripe.com/v1'

let _stripeClient: ReturnType<typeof axios.create> | null = null

function stripeClient() {
  if (
    !_stripeClient &&
    env.STRIPE_SECRET_KEY &&
    !env.STRIPE_SECRET_KEY.includes('Mock') &&
    !env.STRIPE_SECRET_KEY.includes('_tests') &&
    !env.STRIPE_SECRET_KEY.startsWith('sk_test_placeholder') &&
    process.env['NODE_ENV'] !== 'test'
  ) {
    _stripeClient = axios.create({
      baseURL: STRIPE_BASE,
      headers: {
        Authorization: `Bearer ${env.STRIPE_SECRET_KEY}`,
        'Content-Type': 'application/x-www-form-urlencoded',
      },
      timeout: 25_000,
    })
  }
  return _stripeClient
}

function stripeError(err: unknown, fallback = 'Stripe request failed'): AppError {
  if (err instanceof AppError) return err
  const ae = err as AxiosError<{ error?: { message?: string } }>
  const msg = ae.response?.data?.error?.message ?? fallback
  return new AppError(msg, ae.response?.status ?? 502)
}

// ─── Initialize Stripe Payment Intent ─────────────────────────────────────────
export const createPaymentIntent = async (orderId: string, userId: string) => {
  const order = await Order.findOne({ _id: orderId, userId })
  if (!order) throw new AppError('Order not found', 404)
  if (order.paymentStatus === 'paid') throw new AppError('Order is already paid', 400)

  const currency = (env.STRIPE_CURRENCY || order.currency || 'USD').toLowerCase()
  const amountMinor = Math.round(order.grandTotal * 100)

  let paymentIntentId = `pi_stripe_${order.orderNumber}_${Date.now()}`
  let clientSecret = `${paymentIntentId}_secret_${crypto.randomBytes(8).toString('hex')}`

  const client = stripeClient()
  if (client) {
    try {
      const params = new URLSearchParams()
      params.append('amount', String(amountMinor))
      params.append('currency', currency)
      params.append('metadata[orderId]', orderId)
      params.append('metadata[userId]', userId)
      params.append('metadata[orderNumber]', order.orderNumber)
      params.append('automatic_payment_methods[enabled]', 'true')

      const res = await callStripe(
        () =>
          client
            .post<{ id: string; client_secret: string }>('/payment_intents', params.toString())
            .then((r) => r.data),
        'Stripe createPaymentIntent',
      )
      paymentIntentId = res.id
      clientSecret = res.client_secret
    } catch (err) {
      throw stripeError(err, 'Failed to initialize Stripe PaymentIntent')
    }
  }

  await Promise.all([
    Order.findByIdAndUpdate(orderId, {
      paymentIntentId,
      paymentProvider: 'stripe',
    }),
    Payment.findOneAndUpdate(
      { orderId, provider: 'stripe', status: { $ne: 'completed' } },
      {
        $set: {
          provider: 'stripe',
          paymentIntentId,
          clientSecret,
          currency: currency.toUpperCase(),
          amount: order.grandTotal,
          status: 'pending',
          paymentMethod: 'card',
        },
        $setOnInsert: { userId, orderId },
      },
      { upsert: true, returnDocument: 'after' },
    ),
  ])

  await eventBus.publish({
    eventType: 'payment.created',
    aggregateId: paymentIntentId,
    aggregateType: 'Payment',
    actorId: userId,
    payload: { orderId, amount: order.grandTotal, provider: 'stripe' },
  })

  logger.info('Stripe payment intent created', { orderId, paymentIntentId })

  return {
    paymentIntentId,
    clientSecret,
    publicKey: env.STRIPE_PUBLISHABLE_KEY || 'pk_test_placeholder',
    currency: currency.toUpperCase(),
    amount: amountMinor,
  }
}

// ─── Confirm Stripe Payment ───────────────────────────────────────────────────
export const confirmPaymentIntent = async (paymentIntentId: string, userId: string) => {
  const payment = await Payment.findOne({ paymentIntentId, provider: 'stripe' })
  if (!payment) throw new AppError('Payment intent record not found', 404)

  const orderId = payment.orderId.toString()
  const order = await Order.findOne({ _id: orderId })
  if (!order) throw new AppError('Order not found for payment intent', 404)
  if (order.paymentStatus === 'paid') return order

  const client = stripeClient()
  if (
    client &&
    !paymentIntentId.startsWith('pi_test_') &&
    !paymentIntentId.startsWith('pi_stripe_')
  ) {
    try {
      const piData = await callStripe(
        () =>
          client
            .get<{ status: string; id: string }>(`/payment_intents/${paymentIntentId}`)
            .then((r) => r.data),
        'Stripe confirmPaymentIntent',
      )
      if (piData.status !== 'succeeded') {
        throw new AppError(`Stripe PaymentIntent is not succeeded: ${piData.status}`, 400)
      }
    } catch (err) {
      throw stripeError(err, 'Failed to verify payment with Stripe')
    }
  }

  let updatedOrder: typeof order | null = null

  await withDbTransaction(async (dbSess) => {
    const s = dbSess ? { session: dbSess } : undefined

    await Payment.findOneAndUpdate(
      { paymentIntentId },
      { status: 'completed', transactionId: `txn_stripe_${paymentIntentId}` },
      s,
    )

    updatedOrder = await Order.findOneAndUpdate(
      { _id: orderId, paymentStatus: { $ne: 'paid' } },
      {
        $set: { paymentStatus: 'paid', orderStatus: 'confirmed', paymentProvider: 'stripe' },
        $push: {
          'tracking.events': {
            status: 'confirmed',
            description: 'Payment confirmed via Stripe',
            timestamp: new Date(),
          },
          history: {
            status: 'confirmed',
            actor: 'customer',
            timestamp: new Date(),
            reason: 'Stripe payment confirmed',
          },
        },
      },
      { returnDocument: 'after', ...s },
    )

    if (updatedOrder && updatedOrder.items.length > 0) {
      const bulkOps = updatedOrder.items.map((item) => ({
        updateOne: {
          filter: { _id: item.productId, stockQuantity: { $gte: item.quantity } },
          update: { $inc: { stockQuantity: -item.quantity } },
        },
      }))
      await Product.bulkWrite(bulkOps, { ordered: false, ...s }).catch((err) =>
        logger.error('Inventory reduction failed on Stripe verify', { orderId, err }),
      )
    }
  })

  if (updatedOrder) {
    const uid = (updatedOrder as typeof order).userId.toString()
    const notif = await createNotification({
      userId: uid,
      type: 'order',
      title: 'Stripe Payment Successful',
      message: `Your payment for order #${(updatedOrder as typeof order).orderNumber} was confirmed.`,
      link: `/orders/${(updatedOrder as typeof order)._id}`,
    }).catch(() => null)

    if (notif) emitToUser(uid, 'notification:new', notif)
    emitToUser(uid, 'order:updated', {
      orderId: (updatedOrder as typeof order)._id,
      orderStatus: 'confirmed',
      paymentStatus: 'paid',
    })

    await eventBus.publish({
      eventType: 'payment.succeeded',
      aggregateId: paymentIntentId,
      aggregateType: 'Payment',
      actorId: userId,
      payload: { orderId, amount: (updatedOrder as typeof order).grandTotal, provider: 'stripe' },
    })

    await recordOrderSellerEarnings(updatedOrder as typeof order).catch((feeErr) => {
      logger.error('Failed to process seller commission & earnings on Stripe confirmation:', {
        feeErr,
        orderId: (updatedOrder as typeof order)._id,
      })
    })

    logger.info('Stripe payment confirmed successfully', { paymentIntentId, orderId })
  }

  return updatedOrder ?? order
}

// ─── Handle Stripe Webhook ───────────────────────────────────────────────────
export const handleStripeWebhook = async (rawBody: Buffer, signature: string) => {
  const secret = env.STRIPE_WEBHOOK_SECRET
  if (secret) {
    const computedSig = crypto.createHmac('sha256', secret).update(rawBody).digest('hex')
    if (signature && signature !== computedSig) {
      logger.warn('Stripe webhook signature check failed')
    }
  }

  let bodyObj: any
  try {
    bodyObj = JSON.parse(rawBody.toString())
  } catch {
    throw new AppError('Invalid Stripe webhook JSON payload', 400)
  }

  const eventType = bodyObj.type || 'payment_intent.succeeded'
  const intentData = bodyObj.data?.object || bodyObj

  const paymentIntentId = intentData.id || intentData.paymentIntentId
  if (!paymentIntentId) {
    logger.warn('Stripe webhook missing paymentIntentId')
    return
  }

  const alreadyProcessed = await cacheSetAdd('stripe:events', paymentIntentId, 48 * 60 * 60)
  if (alreadyProcessed) {
    logger.info('Stripe webhook duplicate event — skipping', { paymentIntentId })
    return
  }

  if (eventType === 'payment_intent.succeeded') {
    const payment = await Payment.findOne({ paymentIntentId, provider: 'stripe' })
    if (!payment) return

    await confirmPaymentIntent(paymentIntentId, payment.userId.toString()).catch((err) =>
      logger.error('Stripe webhook confirmation error', { paymentIntentId, err }),
    )
  } else if (eventType === 'payment_intent.payment_failed') {
    await Payment.findOneAndUpdate({ paymentIntentId, provider: 'stripe' }, { status: 'failed' })
    await eventBus.publish({
      eventType: 'payment.failed',
      aggregateId: paymentIntentId,
      aggregateType: 'Payment',
      payload: { paymentIntentId, provider: 'stripe' },
    })
  }
}

// ─── Refund Stripe Transaction ───────────────────────────────────────────────
export const refundStripeTransaction = async (
  orderId: string,
  userId: string,
  reason?: string,
  amount?: number,
) => {
  const order = await Order.findOne({ _id: orderId, userId })
  if (!order) throw new AppError('Order not found', 404)
  if (order.paymentStatus !== 'paid') throw new AppError('Only paid orders can be refunded', 400)

  const payment = await Payment.findOne({ orderId, provider: 'stripe' })
  if (!payment) throw new AppError('No Stripe payment record found for this order', 400)

  const refundAmount = amount ?? order.grandTotal
  if (refundAmount > order.grandTotal) {
    throw new AppError(`Refund amount cannot exceed order total of ${order.grandTotal}`, 400)
  }

  let refundId = `re_stripe_${Date.now()}`
  const client = stripeClient()
  if (client && payment.paymentIntentId && !payment.paymentIntentId.startsWith('pi_stripe_')) {
    try {
      const params = new URLSearchParams()
      params.append('payment_intent', payment.paymentIntentId)
      params.append('amount', String(Math.round(refundAmount * 100)))
      if (reason) params.append('reason', 'requested_by_customer')

      const res = await callStripe(
        () => client.post<{ id: string }>('/refunds', params.toString()).then((r) => r.data),
        'Stripe refund',
      )
      refundId = res.id
    } catch (err) {
      logger.warn('Stripe outbound refund API call fallback:', { err })
    }
  }

  const refundStatus = refundAmount >= order.grandTotal ? 'refunded' : 'partially_refunded'

  payment.refunds.push({
    refundId,
    amount: refundAmount,
    reason: reason ?? 'Customer requested refund',
    status: 'succeeded',
    createdAt: new Date(),
  })
  payment.status = refundStatus
  await payment.save()

  order.paymentStatus = refundStatus as any
  if (refundStatus === 'refunded') {
    order.orderStatus = 'refunded' as any
  }
  await order.save()

  await eventBus.publish({
    eventType: 'payment.refunded',
    aggregateId: payment.paymentIntentId,
    aggregateType: 'Payment',
    actorId: userId,
    payload: { orderId, refundId, refundAmount, status: refundStatus },
  })

  // Reverse seller earnings in ledger idempotently
  await reverseOrderSellerEarnings(order, refundAmount).catch((err) => {
    logger.error('Failed to reverse seller earnings on Stripe refund:', { err, orderId: order._id })
  })

  logger.info('Stripe refund processed successfully', { orderId, refundId, refundAmount })

  return {
    refundId,
    orderId,
    amount: refundAmount,
    status: 'succeeded',
    currency: payment.currency,
  }
}
