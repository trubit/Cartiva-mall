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
import { callPaystack } from '../../utils/circuit-breakers.js'
import { withDbTransaction } from '../../utils/db-transaction.js'

const PAYSTACK_BASE = 'https://api.paystack.co'

// Reuse HTTP keep-alive connections across calls; initialised lazily.
let _client: ReturnType<typeof axios.create> | null = null

function client() {
  if (!env.PAYSTACK_SECRET_KEY) throw new AppError('Paystack is not configured on this server', 503)
  if (!_client) {
    _client = axios.create({
      baseURL: PAYSTACK_BASE,
      headers: {
        Authorization: `Bearer ${env.PAYSTACK_SECRET_KEY}`,
        'Content-Type': 'application/json',
      },
      // callPaystack wraps with its own timeout — set this higher so only
      // the circuit-breaker timeout fires, not axios's own.
      timeout: 25_000,
    })
  }
  return _client
}

function paystackError(err: unknown, fallback = 'Paystack request failed'): AppError {
  if (err instanceof AppError) return err
  const ae = err as AxiosError<{ message?: string }>
  const msg = ae.response?.data?.message ?? fallback
  return new AppError(msg, ae.response?.status ?? 502)
}

// ─── Stable idempotent reference key per order ────────────────────────────────
// Using a stable reference (no Date.now()) means re-calling initialize for the
// same order returns the same reference, so we never create duplicate Payment records.
const orderReference = (orderNumber: string) => `TSM-${orderNumber}`

// ─── Initialize ───────────────────────────────────────────────────────────────
export const initializeTransaction = async (orderId: string, userId: string, email: string) => {
  const order = await Order.findOne({ _id: orderId, userId })
  if (!order) throw new AppError('Order not found', 404)
  if (order.paymentStatus === 'paid') throw new AppError('Order is already paid', 400)

  const currency = env.PAYSTACK_CURRENCY
  const amountMinor = Math.round(order.grandTotal * 100)
  const reference = orderReference(order.orderNumber)

  type InitRes = { data: { access_code: string; authorization_url: string } }
  let initData: InitRes
  try {
    initData = await callPaystack(
      () =>
        client()
          .post<InitRes>('/transaction/initialize', {
            email,
            amount: amountMinor,
            currency,
            reference,
            metadata: {
              orderId: orderId.toString(),
              userId: userId.toString(),
              orderNumber: order.orderNumber,
            },
            callback_url: `${env.FRONTEND_URL}/payment/paystack-callback?orderId=${orderId}`,
          })
          .then((r) => r.data),
      'Paystack initialize',
    )
  } catch (err) {
    throw paystackError(err, 'Failed to initialize Paystack transaction')
  }

  // Upsert so repeat calls are idempotent — one Payment record per order.
  await Promise.all([
    Order.findByIdAndUpdate(orderId, { paystackReference: reference }),
    Payment.findOneAndUpdate(
      { orderId, paymentMethod: 'paystack', status: { $ne: 'completed' } },
      {
        $set: {
          paymentIntentId: reference,
          currency,
          amount: order.grandTotal,
          status: 'pending',
        },
        $setOnInsert: { userId, orderId },
      },
      { upsert: true },
    ),
  ])

  return {
    reference,
    accessCode: initData.data.access_code,
    authorizationUrl: initData.data.authorization_url,
    publicKey: env.PAYSTACK_PUBLIC_KEY,
    currency,
    amount: amountMinor,
  }
}

// ─── Verify (called by frontend after popup closes) ───────────────────────────
export const verifyTransaction = async (reference: string, userId: string) => {
  type TxRes = { data: Record<string, unknown> }
  let tx: Record<string, unknown>
  try {
    const res = await callPaystack(
      () =>
        client()
          .get<TxRes>(`/transaction/verify/${encodeURIComponent(reference)}`)
          .then((r) => r.data),
      'Paystack verify',
    )
    tx = res.data
  } catch (err) {
    throw paystackError(err, 'Failed to verify transaction with Paystack')
  }

  if (tx.status !== 'success') {
    throw new AppError(`Payment not completed — Paystack status: ${String(tx.status)}`, 400)
  }

  const meta = tx.metadata as Record<string, string> | undefined
  const orderId = meta?.orderId
  if (!orderId) throw new AppError('Paystack metadata missing orderId', 400)

  const order = await Order.findOne({ _id: orderId, userId, paystackReference: reference })
  if (!order) throw new AppError('Order not found for this payment reference', 404)
  if (order.paymentStatus === 'paid') return order

  let updated: (typeof order) | null = null

  // Atomic: update Payment + Order + deduct stock in one DB transaction.
  // Stock deduction runs inside the transaction so a subsequent crash cannot
  // leave inventory un-decremented after the order is confirmed.
  await withDbTransaction(async (dbSess) => {
    const s = dbSess ? { session: dbSess } : undefined

    await Payment.findOneAndUpdate(
      { paymentIntentId: reference },
      { status: 'completed', transactionId: String(tx.id ?? '') },
      s,
    )

    updated = await Order.findOneAndUpdate(
      { _id: orderId, userId, paymentStatus: { $ne: 'paid' } },
      {
        $set: { paymentStatus: 'paid', orderStatus: 'confirmed' },
        $push: {
          'tracking.events': {
            status: 'confirmed',
            description: 'Payment confirmed via Paystack — order is being processed',
            timestamp: new Date(),
          },
        },
      },
      { returnDocument: 'after', ...s },
    )

    if (updated && updated.items.length > 0) {
      const bulkOps = updated.items.map((item) => ({
        updateOne: {
          filter: { _id: item.productId, stockQuantity: { $gte: item.quantity } },
          update: { $inc: { stockQuantity: -item.quantity } },
        },
      }))
      const result = await Product.bulkWrite(bulkOps, { ordered: false, ...s })
      if (result.modifiedCount < updated.items.length) {
        logger.error('Inventory reduction incomplete on Paystack verify — possible oversell', {
          orderId: updated._id,
          expected: updated.items.length,
          modified: result.modifiedCount,
        })
      }
    }
  })

  // Notifications fire after the transaction commits — side effects outside the
  // transaction prevent duplicate delivery on retry.
  if (!updated) {
    return (await Order.findById(orderId)) ?? order
  }

  const uid = (updated as typeof order).userId.toString()
  const notif = await createNotification({
    userId: uid,
    type: 'order',
    title: 'Payment confirmed',
    message: `Your Paystack payment for order #${(updated as typeof order).orderNumber} was successful. We are now processing your order.`,
    link: `/orders/${(updated as typeof order)._id}`,
  }).catch(() => null)
  if (notif) emitToUser(uid, 'notification:new', notif)
  emitToUser(uid, 'order:updated', {
    orderId: (updated as typeof order)._id,
    orderStatus: 'confirmed',
    paymentStatus: 'paid',
  })

  logger.info('Paystack payment verified', { reference, orderId })
  return updated as typeof order
}

// ─── Webhook (server-to-server, Paystack calls this) ──────────────────────────
export const handleWebhook = async (rawBody: Buffer, signature: string) => {
  if (!env.PAYSTACK_SECRET_KEY) return

  const hash = crypto.createHmac('sha512', env.PAYSTACK_SECRET_KEY).update(rawBody).digest('hex')

  if (
    hash.length !== signature.length ||
    !crypto.timingSafeEqual(Buffer.from(hash), Buffer.from(signature))
  ) {
    throw new AppError('Invalid Paystack webhook signature', 400)
  }

  const event = JSON.parse(rawBody.toString()) as {
    event: string
    data: Record<string, unknown>
  }

  if (event.event !== 'charge.success') {
    logger.info('Unhandled Paystack event', { event: event.event })
    return
  }

  const tx = event.data
  const reference = tx.reference as string | undefined
  const meta = tx.metadata as Record<string, string> | undefined
  const orderId = meta?.orderId

  if (!orderId || !reference) {
    logger.warn('Paystack webhook missing reference/orderId', { reference, orderId })
    return
  }

  // Idempotency: Paystack delivers webhooks at-least-once; 48h covers max retry window.
  const alreadyProcessed = await cacheSetAdd('paystack:events', reference, 48 * 60 * 60)
  if (alreadyProcessed) {
    logger.info('Paystack webhook duplicate — skipping', { reference })
    return
  }

  const order = await Order.findOne({
    _id: orderId,
    paystackReference: reference,
    paymentStatus: { $ne: 'paid' },
  })
  if (!order) {
    logger.info('Paystack webhook: order already paid or not found', { orderId, reference })
    return
  }

  let confirmed: typeof order | null = null

  await withDbTransaction(async (dbSess) => {
    const s = dbSess ? { session: dbSess } : undefined

    await Payment.findOneAndUpdate(
      { paymentIntentId: reference },
      { status: 'completed', transactionId: String(tx.id ?? '') },
      s,
    )

    confirmed = await Order.findOneAndUpdate(
      { _id: orderId, paymentStatus: { $ne: 'paid' } },
      {
        $set: { paymentStatus: 'paid', orderStatus: 'confirmed' },
        $push: {
          'tracking.events': {
            status: 'confirmed',
            description: 'Payment confirmed via Paystack webhook',
            timestamp: new Date(),
          },
        },
      },
      { returnDocument: 'after', ...s },
    )

    if (confirmed && confirmed.items.length > 0) {
      const bulkOps = confirmed.items.map((item) => ({
        updateOne: {
          filter: { _id: item.productId, stockQuantity: { $gte: item.quantity } },
          update: { $inc: { stockQuantity: -item.quantity } },
        },
      }))
      const result = await Product.bulkWrite(bulkOps, { ordered: false, ...s })
      if (result.modifiedCount < confirmed.items.length) {
        logger.error('Inventory reduction incomplete on Paystack webhook — possible oversell', {
          orderId: confirmed._id,
          expected: confirmed.items.length,
          modified: result.modifiedCount,
        })
      }
    }
  })

  if (confirmed) {
    const uid = (confirmed as typeof order).userId.toString()
    const notif = await createNotification({
      userId: uid,
      type: 'order',
      title: 'Payment confirmed',
      message: `Your payment for order #${(confirmed as typeof order).orderNumber} was successful.`,
      link: `/orders/${(confirmed as typeof order)._id}`,
    }).catch(() => null)
    if (notif) emitToUser(uid, 'notification:new', notif)
    emitToUser(uid, 'order:updated', {
      orderId: (confirmed as typeof order)._id,
      orderStatus: 'confirmed',
      paymentStatus: 'paid',
    })
  }

  logger.info('Paystack webhook: order confirmed', { orderId, reference })
}

// ─── Refund ───────────────────────────────────────────────────────────────────
export const refundTransaction = async (
  orderId: string,
  userId: string,
  reason?: string,
  // amount in order-currency units (e.g. 5.00 = ₦5); defaults to full order total
  amount?: number,
) => {
  const order = await Order.findOne({ _id: orderId, userId })
  if (!order) throw new AppError('Order not found', 404)
  if (!order.paystackReference) throw new AppError('No Paystack reference for this order', 400)
  if (order.paymentStatus !== 'paid')
    throw new AppError('Only paid orders can be refunded', 400)

  const refundAmountMinor = amount
    ? Math.round(amount * 100)
    : Math.round(order.grandTotal * 100)

  type RefundRes = {
    status: boolean
    data: { id: number; status: string; amount: number; currency: string }
  }
  let refundData: RefundRes
  try {
    refundData = await callPaystack(
      () =>
        client()
          .post<RefundRes>('/refund', {
            transaction: order.paystackReference,
            amount: refundAmountMinor,
            merchant_note: reason ?? 'Customer refund request',
          })
          .then((r) => r.data),
      'Paystack refund',
    )
  } catch (err) {
    throw paystackError(err, 'Paystack refund request failed')
  }

  if (!refundData.status) {
    throw new AppError('Paystack declined the refund request', 502)
  }

  await Promise.all([
    Payment.findOneAndUpdate({ paymentIntentId: order.paystackReference }, { status: 'refunded' }),
    Order.findByIdAndUpdate(orderId, { paymentStatus: 'refunded', orderStatus: 'refunded' }),
  ])

  return {
    refundId: String(refundData.data.id),
    orderId: order._id.toString(),
    amount: refundData.data.amount / 100,
    status: refundData.data.status,
    currency: refundData.data.currency,
  }
}

// ─── Available providers (for frontend capability check) ──────────────────────
export const getProviders = () => {
  const providers: Record<string, { enabled: boolean; methods: string[]; currencies: string[] }> = {
    paystack: {
      enabled: Boolean(env.PAYSTACK_SECRET_KEY),
      methods: ['card', 'bank_transfer', 'ussd', 'mobile_money', 'qr'],
      currencies: [env.PAYSTACK_CURRENCY || 'NGN'],
    },
  }
  return providers
}
