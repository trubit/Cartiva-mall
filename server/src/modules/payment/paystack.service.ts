import axios, { type AxiosError } from 'axios'
import crypto from 'crypto'
import mongoose from 'mongoose'
import { env } from '../../config/env.js'
import { Order } from '../order/order.model.js'
import { invalidateOrderCaches } from '../order/order.service.js'
import { Payment } from './payment.model.js'
import { Product } from '../product/product.model.js'
import { Cart } from '../cart/cart.model.js'
import {
  SellerWithdrawal,
  SellerLedger,
  SellerPayoutAccount,
} from '../seller/sellerPayout.model.js'
import { AppError } from '../../middlewares/error.middleware.js'
import { emitToUser } from '../../sockets/index.js'
import { createNotification } from '../notification/notification.model.js'
import { cacheGet, cacheSet, cacheSetAdd } from '../../utils/cache.js'
import { logger } from '../../utils/logger.js'
import { callPaystack } from '../../utils/circuit-breakers.js'
import { withDbTransaction } from '../../utils/db-transaction.js'
import { eventBus } from '../event-bus/eventBus.service.js'
import {
  recordOrderSellerEarnings,
  reverseOrderSellerEarnings,
  getCartivaCommissionPerUnit,
} from '../fee/sellerFee.service.js'
import { currencyService } from '../currency/currency.service.js'
import { toMinorUnits, roundMoney, Money } from '../../../../src/shared/utils/money.js'
import { User } from '../user/user.model.js'
import { sendBuyerOrderConfirmationEmail } from '../../utils/email.js'
import { sendBuyerOrderConfirmationSms } from '../../utils/sms.js'

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

  const paystackTargetCurrency = (env.PAYSTACK_CURRENCY || 'NGN').toUpperCase()
  let payableAmount = order.grandTotal
  const orderCurrency = (order.currency || 'USD').toUpperCase()

  if (orderCurrency !== paystackTargetCurrency) {
    const conv = await currencyService.convert(
      order.grandTotal,
      orderCurrency,
      paystackTargetCurrency,
    )
    payableAmount = conv.targetAmount
  }

  const amountMinor = toMinorUnits(payableAmount, paystackTargetCurrency)
  const reference = orderReference(order.orderNumber)

  // 1. Calculate per-seller financial breakdown for this order
  const sellerMap = new Map<
    string,
    {
      sellerId: mongoose.Types.ObjectId
      productSubtotal: number
      shippingFee: number
      gross: number
      commission: number
      net: number
      subaccountCode?: string
    }
  >()

  const commissionPerUnit = await getCartivaCommissionPerUnit(paystackTargetCurrency)

  for (const item of order.items) {
    let sellerId = item.sellerId
    if (!sellerId) {
      const prod = await Product.findById(item.productId).select('sellerId').lean()
      if (prod?.sellerId) sellerId = prod.sellerId
    }
    if (!sellerId) continue

    const sellerKey = sellerId.toString()
    if (!sellerMap.has(sellerKey)) {
      sellerMap.set(sellerKey, {
        sellerId: new mongoose.Types.ObjectId(sellerKey),
        productSubtotal: 0,
        shippingFee: 0,
        gross: 0,
        commission: 0,
        net: 0,
      })
    }

    const entry = sellerMap.get(sellerKey)!
    let lineTotalInTarget = item.lineTotal
    if (orderCurrency !== paystackTargetCurrency) {
      const conv = await currencyService.convert(
        item.lineTotal,
        orderCurrency,
        paystackTargetCurrency,
      )
      lineTotalInTarget = conv.targetAmount
    }

    const itemCommission = roundMoney(
      Money.from(commissionPerUnit).multiply(item.quantity).toNumber(),
      paystackTargetCurrency,
    )

    entry.productSubtotal = Money.from(entry.productSubtotal)
      .add(lineTotalInTarget)
      .round(paystackTargetCurrency)
    entry.commission = Money.from(entry.commission)
      .add(itemCommission)
      .round(paystackTargetCurrency)
  }

  // Allocate customer-paid shipping fee to the seller(s)
  let shippingFeeInTarget = order.shippingFee || 0
  if (orderCurrency !== paystackTargetCurrency && shippingFeeInTarget > 0) {
    const conv = await currencyService.convert(
      shippingFeeInTarget,
      orderCurrency,
      paystackTargetCurrency,
    )
    shippingFeeInTarget = conv.targetAmount
  }

  const sellersList = Array.from(sellerMap.values())
  if (sellersList.length === 1) {
    sellersList[0].shippingFee = shippingFeeInTarget
  } else if (sellersList.length > 1 && shippingFeeInTarget > 0) {
    const totalSubtotalInTarget = sellersList.reduce(
      (sum, s) => Money.from(sum).add(s.productSubtotal).toNumber(),
      0,
    )
    let assignedShipping = 0
    // Sort descending by productSubtotal to identify the primary seller for remainder allocation
    const sortedIndices = sellersList
      .map((s, idx) => ({ idx, subtotal: s.productSubtotal }))
      .sort((a, b) => b.subtotal - a.subtotal)

    for (const s of sellersList) {
      const ratio =
        totalSubtotalInTarget > 0
          ? s.productSubtotal / totalSubtotalInTarget
          : 1 / sellersList.length
      const allocated = roundMoney(
        Money.from(shippingFeeInTarget).multiply(ratio).toNumber(),
        paystackTargetCurrency,
      )
      s.shippingFee = allocated
      assignedShipping = Money.from(assignedShipping).add(allocated).round(paystackTargetCurrency)
    }

    const remainder = roundMoney(
      Money.from(shippingFeeInTarget).subtract(assignedShipping).toNumber(),
      paystackTargetCurrency,
    )
    if (remainder !== 0 && sortedIndices.length > 0) {
      const primaryIdx = sortedIndices[0].idx
      sellersList[primaryIdx].shippingFee = Money.from(sellersList[primaryIdx].shippingFee)
        .add(remainder)
        .round(paystackTargetCurrency)
    }
  }

  // Compute final seller gross and net earnings
  for (const s of sellersList) {
    s.gross = Money.from(s.productSubtotal).add(s.shippingFee).round(paystackTargetCurrency)
    s.net = Math.max(0, Money.from(s.gross).subtract(s.commission).round(paystackTargetCurrency))
  }

  // 2. Check if all sellers have active Paystack subaccounts
  let allHaveSubaccounts = sellerMap.size > 0
  for (const [, sData] of sellerMap) {
    const payoutAcc = await SellerPayoutAccount.findOne({
      sellerId: sData.sellerId,
      subaccountCode: { $exists: true, $ne: '' },
    }).sort({ isDefault: -1, createdAt: -1 })

    if (payoutAcc?.subaccountCode) {
      sData.subaccountCode = payoutAcc.subaccountCode
    } else {
      allHaveSubaccounts = false
    }
  }

  const sellerBreakdowns = Array.from(sellerMap.values()).map((s) => ({
    sellerId: s.sellerId,
    productSubtotal: s.productSubtotal,
    shippingFee: s.shippingFee,
    grossAmount: s.gross,
    commissionAmount: s.commission,
    netAmount: s.net,
    subaccountCode: s.subaccountCode,
  }))

  const totalPlatformCommission = roundMoney(
    sellerBreakdowns.reduce((sum, s) => sum + s.commissionAmount, 0),
    paystackTargetCurrency,
  )
  const totalSellerEarnings = roundMoney(
    sellerBreakdowns.reduce((sum, s) => sum + s.netAmount, 0),
    paystackTargetCurrency,
  )

  let splitCode: string | undefined
  let subaccountCode: string | undefined
  let settlementType: 'direct_split' | 'platform_escrow_withdrawal' = 'platform_escrow_withdrawal'

  const initPayload: Record<string, unknown> = {
    email,
    amount: amountMinor,
    currency: paystackTargetCurrency,
    reference,
    metadata: {
      orderId: orderId.toString(),
      userId: userId.toString(),
      orderNumber: order.orderNumber,
      sellerCount: sellerMap.size,
      totalPlatformCommission,
      totalSellerEarnings,
      settlementType,
    },
    callback_url: `${env.FRONTEND_URL}/payment/paystack-callback?orderId=${orderId}`,
  }

  // 3. Configure direct split if sellers have subaccounts
  if (allHaveSubaccounts && sellerMap.size === 1) {
    const single = sellerBreakdowns[0]
    subaccountCode = single.subaccountCode
    settlementType = 'direct_split'
    initPayload.subaccount = subaccountCode
    initPayload.transaction_charge = toMinorUnits(single.commissionAmount, paystackTargetCurrency)
    initPayload.bearer = 'account' // Platform bears gateway processing fee from commission
    ;(initPayload.metadata as Record<string, unknown>).settlementType = 'direct_split'
    ;(initPayload.metadata as Record<string, unknown>).subaccountCode = subaccountCode
  } else if (allHaveSubaccounts && sellerMap.size > 1) {
    try {
      const splitRes = await createSplit({
        name: `Cartiva-${order.orderNumber}`,
        type: 'flat',
        currency: paystackTargetCurrency,
        subaccounts: sellerBreakdowns.map((s) => ({
          subaccount: s.subaccountCode!,
          share: toMinorUnits(s.netAmount, paystackTargetCurrency),
        })),
        bearerType: 'account',
      })
      splitCode = splitRes.splitCode
      settlementType = 'direct_split'
      initPayload.split_code = splitCode
      ;(initPayload.metadata as Record<string, unknown>).settlementType = 'direct_split'
      ;(initPayload.metadata as Record<string, unknown>).splitCode = splitCode
    } catch (splitErr) {
      logger.warn(
        'Could not create Paystack multi-split, falling back to managed balance withdrawal',
        {
          splitErr,
          orderNumber: order.orderNumber,
        },
      )
      settlementType = 'platform_escrow_withdrawal'
    }
  }

  type InitRes = { data: { access_code: string; authorization_url: string } }
  let initData: InitRes
  try {
    initData = await callPaystack(
      () =>
        client()
          .post<InitRes>('/transaction/initialize', initPayload)
          .then((r) => r.data),
      'Paystack initialize',
    )
  } catch (err) {
    throw paystackError(err, 'Failed to initialize Paystack transaction')
  }

  // Upsert so repeat calls are idempotent — one Payment record per order.
  const sellerAllocationsDoc = sellerBreakdowns.map((s) => ({
    sellerId: s.sellerId,
    productSubtotal: s.productSubtotal,
    shippingFee: s.shippingFee,
    grossAmount: s.grossAmount,
    commissionAmount: s.commissionAmount,
    netAmount: s.netAmount,
    subaccountCode: s.subaccountCode,
    status: 'pending' as const,
    fulfillmentStatus: 'unfulfilled' as const,
  }))

  await Promise.all([
    Order.findByIdAndUpdate(orderId, {
      paystackReference: reference,
      platformCommission: totalPlatformCommission,
      sellerEarnings: totalSellerEarnings,
      sellerAllocations: sellerAllocationsDoc,
    }),
    Payment.findOneAndUpdate(
      { orderId, paymentMethod: 'paystack', status: { $ne: 'completed' } },
      {
        $set: {
          paymentIntentId: reference,
          currency: paystackTargetCurrency,
          amount: payableAmount,
          status: 'pending',
          splitCode,
          subaccountCode,
          settlementType,
          sellerBreakdown: sellerBreakdowns,
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
    currency: paystackTargetCurrency,
    amount: amountMinor,
    payableAmount,
    splitCode,
    subaccountCode,
    settlementType,
    platformCommission: totalPlatformCommission,
    sellerEarnings: totalSellerEarnings,
  }
}

// ─── Verify (called by frontend after popup closes) ───────────────────────────
export const verifyTransaction = async (
  reference: string,
  _userId?: string,
  clientOrderId?: string,
) => {
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
    const raw = res as any
    tx = raw?.data && typeof raw.data === 'object' ? raw.data : raw
  } catch (err) {
    throw paystackError(err, 'Failed to verify transaction with Paystack')
  }

  const meta = tx.metadata as Record<string, any> | undefined
  let orderId = clientOrderId || (meta?.orderId as string | undefined)
  if (!orderId && Array.isArray(meta?.custom_fields)) {
    const field = meta.custom_fields.find(
      (f: any) => f.variable_name === 'orderId' || f.name === 'orderId',
    )
    if (field) orderId = field.value
  }

  // Find order by ID, paystackReference, orderNumber or through payment intent
  let order: any = null
  if (orderId && mongoose.isValidObjectId(orderId)) {
    order = await Order.findById(orderId)
  }
  if (!order) {
    order = await Order.findOne({ paystackReference: reference })
  }
  if (!order && reference.startsWith('TSM-')) {
    order = await Order.findOne({ orderNumber: reference.replace(/^TSM-/, '') })
  }
  if (!order) {
    const paymentDoc = await Payment.findOne({ paymentIntentId: reference })
    if (paymentDoc?.orderId) {
      order = await Order.findById(paymentDoc.orderId)
    }
  }

  const txStatus = String(tx?.status || '')
  if (txStatus !== 'success') {
    if (order && txStatus === 'failed') {
      await Promise.all([
        Order.findByIdAndUpdate(order._id, {
          paymentStatus: 'failed',
          orderStatus: 'cancelled',
        }),
        Payment.findOneAndUpdate(
          { $or: [{ paymentIntentId: reference }, { orderId: order._id }] },
          { status: 'failed' },
        ),
      ])
    }
    throw new AppError(`Payment not completed — Paystack status: ${txStatus || 'pending'}`, 400)
  }

  if (!order) throw new AppError('Order not found for this payment reference', 404)
  if (order.paymentStatus === 'paid') return order

  // Validate amount in minor units
  const paystackTargetCurrency = (env.PAYSTACK_CURRENCY || 'NGN').toUpperCase()
  let expectedPayable = order.grandTotal
  if ((order.currency || 'USD').toUpperCase() !== paystackTargetCurrency) {
    const conv = await currencyService.convert(
      order.grandTotal,
      order.currency || 'USD',
      paystackTargetCurrency,
    )
    expectedPayable = conv.targetAmount
  }
  const expectedAmountMinor = toMinorUnits(expectedPayable, paystackTargetCurrency)
  const actualAmountMinor = Number(tx.amount || 0)
  if (actualAmountMinor > 0 && actualAmountMinor < expectedAmountMinor * 0.99) {
    logger.error('Paystack amount mismatch detected on verification', {
      reference,
      orderId: order._id,
      expectedAmountMinor,
      actualAmountMinor,
    })
    throw new AppError('Payment amount mismatch: amount received is less than expected', 400)
  }

  const resolvedOrderId = order._id.toString()
  let updated: typeof order | null = null

  // Authoritatively extract actual Paystack fee from transaction verify response
  const actualFeeMinor = typeof tx.fees === 'number' ? tx.fees : 0
  const actualFee = actualFeeMinor > 0 ? actualFeeMinor / 100 : 0
  const paidAmount = typeof tx.amount === 'number' ? tx.amount / 100 : order.grandTotal

  // Atomic: update Payment + Order + deduct stock in one DB transaction.
  // Stock deduction runs inside the transaction so a subsequent crash cannot
  // leave inventory un-decremented after the order is confirmed.
  await withDbTransaction(async (dbSess) => {
    const s = dbSess ? { session: dbSess } : undefined

    await Payment.findOneAndUpdate(
      { $or: [{ paymentIntentId: reference }, { orderId: order._id }] },
      {
        $set: {
          status: 'completed',
          transactionId: String(tx.id ?? ''),
          paymentIntentId: reference,
          amount: paidAmount,
          currency: (tx.currency as string) || order.currency,
          paystackFee: actualFee,
          paystackFeeMinor: actualFeeMinor,
          netPlatformSettlement: Math.max(0, paidAmount - actualFee),
        },
      },
      { upsert: true, ...s },
    )

    updated = await Order.findOneAndUpdate(
      { _id: order._id, paymentStatus: { $ne: 'paid' } },
      {
        $set: {
          paymentStatus: 'paid',
          orderStatus: 'confirmed',
          paystackReference: reference,
          paystackFee: actualFee,
        },
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
      const bulkOps = updated.items.map((item: any) => ({
        updateOne: {
          filter: { _id: item.productId, stockQuantity: { $gte: item.quantity } },
          update: { $inc: { stockQuantity: -item.quantity, soldCount: item.quantity } },
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

  // Clear buyer's cart items for the confirmed order
  if (order.userId && order.items?.length > 0) {
    const pids = order.items.map((i: any) => i.productId)
    await Cart.findOneAndUpdate(
      { userId: order.userId },
      { $pull: { items: { productId: { $in: pids } } } },
    ).catch((err) => logger.warn('Cart cleanup after payment non-fatal error', { err }))
  }

  // Notifications fire after the transaction commits — side effects outside the
  // transaction prevent duplicate delivery on retry.
  const finalOrder = updated ?? (await Order.findById(resolvedOrderId)) ?? order
  const uid = (finalOrder as typeof order).userId.toString()

  // Invalidate Redis order caches so subsequent reads (even on immediate refresh) see the latest PAID state
  await invalidateOrderCaches(resolvedOrderId, uid, (finalOrder as typeof order).orderNumber)

  // Record Cartiva commission and credit seller net earnings idempotently
  await recordOrderSellerEarnings(finalOrder as typeof order).catch((feeErr) => {
    logger.error('Failed to process seller commission & earnings on Paystack verify:', {
      feeErr,
      orderId: (finalOrder as typeof order)._id,
    })
  })
  const notif = await createNotification({
    userId: uid,
    type: 'order',
    title: 'Payment confirmed',
    message: `Your Paystack payment for order #${(finalOrder as typeof order).orderNumber} was successful. We are now processing your order.`,
    link: `/orders/${(finalOrder as typeof order)._id}`,
  }).catch(() => null)
  if (notif) emitToUser(uid, 'notification:new', notif)
  emitToUser(uid, 'order:updated', {
    orderId: (finalOrder as typeof order)._id,
    orderStatus: 'confirmed',
    paymentStatus: 'paid',
  })

  // Dispatch Buyer Confirmation Email & SMS
  try {
    const buyerUser = await User.findById(uid)
      .select('email firstName lastName phone phoneNumber')
      .lean()
    const buyerEmail = buyerUser?.email
    const buyerName = buyerUser
      ? `${buyerUser.firstName || ''} ${buyerUser.lastName || ''}`.trim()
      : 'Customer'
    const buyerPhone = (buyerUser as any)?.phone || (buyerUser as any)?.phoneNumber
    const itemSummaries = (finalOrder as any).items.map((i: any) => ({
      title: i.title,
      quantity: i.quantity,
      price: i.price,
      lineTotal: i.subtotal,
    }))

    if (buyerEmail) {
      await sendBuyerOrderConfirmationEmail(
        buyerEmail,
        buyerName,
        (finalOrder as any).orderNumber,
        (finalOrder as any).currency,
        itemSummaries,
        (finalOrder as any).grandTotal,
      ).catch((e) => logger.warn('Buyer confirmation email failed', { e }))
    }

    if (buyerPhone && typeof buyerPhone === 'string') {
      await sendBuyerOrderConfirmationSms(
        buyerPhone,
        (finalOrder as any).orderNumber,
        (finalOrder as any).grandTotal,
        (finalOrder as any).currency,
      ).catch((e) => logger.warn('Buyer confirmation SMS failed', { e }))
    }
  } catch (buyerAlertErr) {
    logger.warn('Buyer alert dispatch error', { buyerAlertErr })
  }

  await eventBus.publish({
    eventType: 'payment.succeeded',
    aggregateId: reference,
    aggregateType: 'Payment',
    actorId: uid,
    payload: {
      orderId: resolvedOrderId,
      amount: (finalOrder as typeof order).grandTotal,
      provider: 'paystack',
    },
  })

  logger.info('Paystack payment verified', { reference, orderId: resolvedOrderId })
  return finalOrder as typeof order
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

  // ─── Event Handlers ────────────────────────────────────────────────────────
  if (event.event === 'charge.success') {
    const tx = event.data
    const reference = tx.reference as string | undefined
    const meta = tx.metadata as Record<string, any> | undefined
    let orderId = meta?.orderId as string | undefined
    if (!orderId && Array.isArray(meta?.custom_fields)) {
      const field = meta.custom_fields.find(
        (f: any) => f.variable_name === 'orderId' || f.name === 'orderId',
      )
      if (field) orderId = field.value
    }

    if (!reference) {
      logger.warn('Paystack webhook missing reference', { reference, orderId })
      return
    }

    // Idempotency: Paystack delivers webhooks at-least-once; 48h covers max retry window.
    const alreadyProcessed = await cacheSetAdd('paystack:events', reference, 48 * 60 * 60)
    if (alreadyProcessed) {
      logger.info('Paystack webhook duplicate — skipping', { reference })
      return
    }

    let order: any = null
    if (orderId && mongoose.isValidObjectId(orderId)) {
      order = await Order.findById(orderId)
    }
    if (!order) {
      order = await Order.findOne({ paystackReference: reference })
    }
    if (!order && reference.startsWith('TSM-')) {
      order = await Order.findOne({ orderNumber: reference.replace(/^TSM-/, '') })
    }
    if (!order) {
      const paymentDoc = await Payment.findOne({ paymentIntentId: reference })
      if (paymentDoc?.orderId) {
        order = await Order.findById(paymentDoc.orderId)
      }
    }

    if (!order || order.paymentStatus === 'paid') {
      logger.info('Paystack webhook: order already paid or not found', { orderId, reference })
      return
    }

    // Validate amount in minor units
    const paystackTargetCurrency = (env.PAYSTACK_CURRENCY || 'NGN').toUpperCase()
    let expectedPayable = order.grandTotal
    if ((order.currency || 'USD').toUpperCase() !== paystackTargetCurrency) {
      const conv = await currencyService.convert(
        order.grandTotal,
        order.currency || 'USD',
        paystackTargetCurrency,
      )
      expectedPayable = conv.targetAmount
    }
    const expectedAmountMinor = toMinorUnits(expectedPayable, paystackTargetCurrency)
    const actualAmountMinor = Number(tx.amount || 0)
    if (actualAmountMinor > 0 && actualAmountMinor < expectedAmountMinor * 0.99) {
      logger.error('Paystack webhook amount mismatch detected — skipping order confirmation', {
        reference,
        orderId: order._id,
        expectedAmountMinor,
        actualAmountMinor,
      })
      return
    }

    const resolvedOrderId = order._id.toString()
    let confirmed: typeof order | null = null

    // Authoritatively extract actual Paystack fee from webhook payload
    const actualFeeMinor = typeof tx.fees === 'number' ? tx.fees : 0
    const actualFee = actualFeeMinor > 0 ? actualFeeMinor / 100 : 0
    const paidAmount = typeof tx.amount === 'number' ? tx.amount / 100 : order.grandTotal

    await withDbTransaction(async (dbSess) => {
      const s = dbSess ? { session: dbSess } : undefined

      await Payment.findOneAndUpdate(
        { $or: [{ paymentIntentId: reference }, { orderId: order._id }] },
        {
          $set: {
            status: 'completed',
            transactionId: String(tx.id ?? ''),
            paymentIntentId: reference,
            amount: paidAmount,
            currency: (tx.currency as string) || order.currency,
            paystackFee: actualFee,
            paystackFeeMinor: actualFeeMinor,
            netPlatformSettlement: Math.max(0, paidAmount - actualFee),
          },
        },
        { upsert: true, ...s },
      )

      confirmed = await Order.findOneAndUpdate(
        { _id: order._id, paymentStatus: { $ne: 'paid' } },
        {
          $set: {
            paymentStatus: 'paid',
            orderStatus: 'confirmed',
            paystackReference: reference,
            paystackFee: actualFee,
          },
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
        const bulkOps = confirmed.items.map((item: any) => ({
          updateOne: {
            filter: { _id: item.productId, stockQuantity: { $gte: item.quantity } },
            update: { $inc: { stockQuantity: -item.quantity, soldCount: item.quantity } },
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

    // Clear buyer's cart items for the confirmed order
    if (order.userId && order.items?.length > 0) {
      const pids = order.items.map((i: any) => i.productId)
      await Cart.findOneAndUpdate(
        { userId: order.userId },
        { $pull: { items: { productId: { $in: pids } } } },
      ).catch((err) => logger.warn('Cart cleanup after webhook non-fatal error', { err }))
    }

    const finalConfirmed = confirmed ?? (await Order.findById(resolvedOrderId)) ?? order
    const uid = (finalConfirmed as typeof order).userId.toString()

    // Invalidate Redis order caches so subsequent reads (even on immediate refresh) see the latest PAID state
    await invalidateOrderCaches(resolvedOrderId, uid, (finalConfirmed as typeof order).orderNumber)

    // Record Cartiva commission and credit seller net earnings idempotently
    await recordOrderSellerEarnings(finalConfirmed as typeof order).catch((feeErr) => {
      logger.error('Failed to process seller commission & earnings on Paystack webhook:', {
        feeErr,
        orderId: (finalConfirmed as typeof order)._id,
      })
    })
    const notif = await createNotification({
      userId: uid,
      type: 'order',
      title: 'Payment confirmed',
      message: `Your Paystack payment for order #${(finalConfirmed as typeof order).orderNumber} was successful. We are now processing your order.`,
      link: `/orders/${(finalConfirmed as typeof order)._id}`,
    }).catch(() => null)
    if (notif) emitToUser(uid, 'notification:new', notif)
    emitToUser(uid, 'order:updated', {
      orderId: (finalConfirmed as typeof order)._id,
      orderStatus: 'confirmed',
      paymentStatus: 'paid',
    })

    await eventBus.publish({
      eventType: 'payment.succeeded',
      aggregateId: reference,
      aggregateType: 'Payment',
      actorId: uid,
      payload: {
        orderId: resolvedOrderId,
        amount: (finalConfirmed as typeof order).grandTotal,
        provider: 'paystack',
      },
    })

    logger.info('Paystack webhook: order confirmed & marked as paid', {
      orderId: resolvedOrderId,
      reference,
    })
  }

  // ─── Transfer Success (Payout completed) ───────────────────────────────────
  if (event.event === 'transfer.success') {
    const tx = event.data
    const reference = (tx.reference as string) || (tx.transfer_code as string)
    if (!reference) return

    const alreadyProcessed = await cacheSetAdd(
      'paystack:events',
      `tx-success-${reference}`,
      48 * 3600,
    )
    if (alreadyProcessed) return

    const txRef = typeof tx.reference === 'string' ? tx.reference : undefined
    const txTrfCode = typeof tx.transfer_code === 'string' ? tx.transfer_code : undefined
    const conditions: Array<{
      withdrawalNumber?: string
      providerReference?: string
      providerTransferCode?: string
    }> = []
    if (txRef) {
      conditions.push({ withdrawalNumber: txRef }, { providerReference: txRef })
    }
    if (txTrfCode) {
      conditions.push({ providerTransferCode: txTrfCode })
    }
    if (reference) {
      conditions.push(
        { providerReference: reference },
        { providerTransferCode: reference },
        { withdrawalNumber: reference },
      )
    }
    if (conditions.length === 0) return

    const withdrawal = await SellerWithdrawal.findOne({
      $or: conditions,
      status: { $in: ['pending', 'processing'] },
    })

    if (withdrawal) {
      withdrawal.status = 'completed'
      withdrawal.completedAt = new Date()
      withdrawal.auditLog.push({
        status: 'completed',
        note: 'Transfer verified and completed by Paystack webhook',
        timestamp: new Date(),
      })
      await withdrawal.save()

      // Record in ledger
      await SellerLedger.create({
        sellerId: withdrawal.sellerId,
        type: 'WITHDRAWAL_SETTLED',
        amount: -withdrawal.amount,
        currency: withdrawal.currency,
        balanceAfter: 0, // Informational balance checkpoint
        referenceType: 'withdrawal',
        referenceId: withdrawal.withdrawalNumber,
        description: `Payout of ${withdrawal.currency} ${withdrawal.netAmount.toFixed(2)} completed to ${withdrawal.payoutAccount.bankName} (${withdrawal.payoutAccount.accountNumber})`,
      })

      const uid = withdrawal.sellerId.toString()
      const notif = await createNotification({
        userId: uid,
        type: 'payment',
        title: 'Withdrawal Completed',
        message: `Your withdrawal of ${withdrawal.currency} ${withdrawal.netAmount.toLocaleString()} has been sent to your bank account.`,
        link: '/seller/payouts',
      }).catch(() => null)
      if (notif) emitToUser(uid, 'notification:new', notif)
      emitToUser(uid, 'seller:withdrawal:updated', {
        withdrawalId: withdrawal._id,
        status: 'completed',
      })

      logger.info('Paystack transfer.success processed', {
        withdrawalNumber: withdrawal.withdrawalNumber,
      })
    }
    return
  }

  // ─── Transfer Failed (Payout failed — restore balance) ──────────────────────
  if (event.event === 'transfer.failed' || event.event === 'transfer.reversed') {
    const tx = event.data
    const reference = (tx.reference as string) || (tx.transfer_code as string)
    if (!reference) return

    const alreadyProcessed = await cacheSetAdd(
      'paystack:events',
      `tx-failed-${reference}`,
      48 * 3600,
    )
    if (alreadyProcessed) return

    const txRef = typeof tx.reference === 'string' ? tx.reference : undefined
    const txTrfCode = typeof tx.transfer_code === 'string' ? tx.transfer_code : undefined
    const conditions: Array<{
      withdrawalNumber?: string
      providerReference?: string
      providerTransferCode?: string
    }> = []
    if (txRef) {
      conditions.push({ withdrawalNumber: txRef }, { providerReference: txRef })
    }
    if (txTrfCode) {
      conditions.push({ providerTransferCode: txTrfCode })
    }
    if (reference) {
      conditions.push(
        { providerReference: reference },
        { providerTransferCode: reference },
        { withdrawalNumber: reference },
      )
    }
    if (conditions.length === 0) return

    const withdrawal = await SellerWithdrawal.findOne({
      $or: conditions,
      status: { $nin: ['failed', 'reversed'] },
    })

    if (withdrawal) {
      const isReversal = event.event === 'transfer.reversed'
      withdrawal.status = isReversal ? 'reversed' : 'failed'
      withdrawal.failureReason =
        (tx.reason as string) ||
        (tx.gateway_response as string) ||
        'Transfer declined or reversed by bank'
      withdrawal.auditLog.push({
        status: withdrawal.status,
        note: `Paystack webhook event: ${event.event}. Reason: ${withdrawal.failureReason}`,
        timestamp: new Date(),
      })
      await withdrawal.save()

      const lastLedger = await SellerLedger.findOne({ sellerId: withdrawal.sellerId }).sort({
        createdAt: -1,
      })
      const computedBalanceAfter = (lastLedger?.balanceAfter ?? 0) + withdrawal.amount

      // Record reversal in ledger so funds are safely returned to seller's available balance
      await SellerLedger.create({
        sellerId: withdrawal.sellerId,
        type: 'WITHDRAWAL_REVERSED',
        amount: withdrawal.amount,
        currency: withdrawal.currency,
        balanceAfter: computedBalanceAfter,
        referenceType: 'withdrawal',
        referenceId: withdrawal.withdrawalNumber,
        description: `Reversal of failed withdrawal ${withdrawal.withdrawalNumber}: ${withdrawal.failureReason}`,
      })

      const uid = withdrawal.sellerId.toString()
      const notif = await createNotification({
        userId: uid,
        type: 'payment',
        title: isReversal ? 'Withdrawal Reversed' : 'Withdrawal Failed',
        message: `Your withdrawal of ${withdrawal.currency} ${withdrawal.amount.toLocaleString()} was ${withdrawal.status}. Reason: ${withdrawal.failureReason}. Your balance has been restored.`,
        link: '/seller/payouts',
      }).catch(() => null)
      if (notif) emitToUser(uid, 'notification:new', notif)
      emitToUser(uid, 'seller:withdrawal:updated', {
        withdrawalId: withdrawal._id,
        status: withdrawal.status,
      })

      logger.warn(`Paystack ${event.event} processed`, {
        withdrawalNumber: withdrawal.withdrawalNumber,
        reason: withdrawal.failureReason,
      })
    }
    return
  }

  logger.info('Unhandled Paystack event', { event: event.event })
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
  if (order.paymentStatus !== 'paid') throw new AppError('Only paid orders can be refunded', 400)

  const refundAmountMinor = amount ? Math.round(amount * 100) : Math.round(order.grandTotal * 100)

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

  // Reverse seller earnings in ledger idempotently
  await reverseOrderSellerEarnings(order, amount).catch((err) => {
    logger.error('Failed to reverse seller earnings on Paystack refund:', {
      err,
      orderId: order._id,
    })
  })

  return {
    refundId: String(refundData.data.id),
    orderId: order._id.toString(),
    amount: refundData.data.amount / 100,
    status: refundData.data.status,
    currency: refundData.data.currency,
  }
}

// ─── Real Paystack Payout / Transfers Integration ──────────────────────────────

export interface IPaystackBank {
  id: number
  name: string
  slug: string
  code: string
  longcode?: string
  gateway?: string
  pay_with_bank?: boolean
  active: boolean
  is_deleted?: boolean
  country?: string
  currency?: string
  type?: string
}

/**
 * List supported banks for transfer/payout
 */
export const listBanks = async (currency = 'NGN'): Promise<IPaystackBank[]> => {
  const cacheKey = `paystack:banks:${currency}`
  const cached = await cacheGet<IPaystackBank[]>(cacheKey)
  if (cached && Array.isArray(cached) && cached.length > 0) return cached

  type BankRes = { status: boolean; data: IPaystackBank[] }
  try {
    const res = await callPaystack(
      () =>
        client()
          .get<BankRes>(`/bank?currency=${encodeURIComponent(currency)}&country=nigeria`)
          .then((r) => r.data),
      'Paystack listBanks',
    )
    if (res.data && Array.isArray(res.data)) {
      // Filter active commercial banks, deduplicate by code & sort alphabetically
      const seen = new Set<string>()
      const banks = res.data
        .filter((b) => {
          if (!b.active || !b.code) return false
          if (seen.has(b.code)) return false
          seen.add(b.code)
          return true
        })
        .sort((a, b) => a.name.localeCompare(b.name))
      await cacheSet(cacheKey, banks, 24 * 60 * 60) // Cache 24h
      return banks
    }
    return []
  } catch (err) {
    logger.warn('Failed to fetch Paystack bank list, returning fallback list', { err })
    // Fallback list of major Nigerian banks in case of upstream temporary connectivity
    return [
      { id: 1, name: 'Access Bank', slug: 'access-bank', code: '044', active: true },
      {
        id: 2,
        name: 'First Bank of Nigeria',
        slug: 'first-bank-of-nigeria',
        code: '011',
        active: true,
      },
      { id: 3, name: 'Guaranty Trust Bank (GTBank)', slug: 'gtbank', code: '058', active: true },
      { id: 4, name: 'United Bank For Africa (UBA)', slug: 'uba', code: '033', active: true },
      { id: 5, name: 'Zenith Bank', slug: 'zenith-bank', code: '057', active: true },
      { id: 6, name: 'Kuda Bank', slug: 'kuda-bank', code: '50211', active: true },
      { id: 7, name: 'OPay Digital Services', slug: 'opay', code: '999992', active: true },
      { id: 8, name: 'Palmpay', slug: 'palmpay', code: '999991', active: true },
      { id: 9, name: 'Stanbic IBTC Bank', slug: 'stanbic-ibtc-bank', code: '221', active: true },
      { id: 10, name: 'Fidelity Bank', slug: 'fidelity-bank', code: '070', active: true },
    ]
  }
}

/**
 * Real-time account number validation and name inquiry with the bank
 */
export const resolveAccountNumber = async (
  accountNumber: string,
  bankCode: string,
): Promise<{ accountNumber: string; accountName: string; bankId?: number }> => {
  type ResolveRes = {
    status: boolean
    message: string
    data: { account_number: string; account_name: string; bank_id?: number }
  }

  try {
    const res = await callPaystack(
      () =>
        client()
          .get<ResolveRes>(
            `/bank/resolve?account_number=${encodeURIComponent(accountNumber.trim())}&bank_code=${encodeURIComponent(bankCode.trim())}`,
          )
          .then((r) => r.data),
      'Paystack resolveAccountNumber',
    )
    if (!res.status || !res.data?.account_name) {
      throw new AppError(
        'Could not resolve bank account details. Please check the account number and bank.',
        400,
      )
    }
    return {
      accountNumber: res.data.account_number,
      accountName: res.data.account_name,
      bankId: res.data.bank_id,
    }
  } catch (err) {
    throw paystackError(
      err,
      'Could not verify account details with bank. Please verify account number and bank selection.',
    )
  }
}

export const resolveAccount = resolveAccountNumber

/**
 * Creates a Paystack transfer recipient for automated payouts
 */
export const createTransferRecipient = async (data: {
  name: string
  accountNumber: string
  bankCode: string
  currency?: string
}): Promise<{ recipientCode: string; details: Record<string, unknown> }> => {
  type RecipientRes = {
    status: boolean
    message: string
    data: {
      recipient_code: string
      name: string
      details: Record<string, unknown>
    }
  }

  try {
    const res = await callPaystack(
      () =>
        client()
          .post<RecipientRes>('/transferrecipient', {
            type: 'nuban',
            name: data.name,
            account_number: data.accountNumber.trim(),
            bank_code: data.bankCode.trim(),
            currency: data.currency || env.PAYSTACK_CURRENCY || 'NGN',
          })
          .then((r) => r.data),
      'Paystack createTransferRecipient',
    )
    if (!res.status || !res.data?.recipient_code) {
      throw new AppError('Failed to register payout account with provider', 400)
    }
    return {
      recipientCode: res.data.recipient_code,
      details: res.data.details,
    }
  } catch (err) {
    throw paystackError(err, 'Failed to create transfer recipient on Paystack')
  }
}

/**
 * Creates a Paystack subaccount for a seller to support direct split payments
 */
export const createSubaccount = async (data: {
  businessName: string
  settlementBank: string
  accountNumber: string
  percentageCharge?: number
  description?: string
}): Promise<{ subaccountCode: string; details: Record<string, unknown> }> => {
  type SubaccountRes = {
    status: boolean
    message: string
    data: {
      subaccount_code: string
      business_name: string
      [key: string]: unknown
    }
  }

  try {
    const res = await callPaystack(
      () =>
        client()
          .post<SubaccountRes>('/subaccount', {
            business_name: data.businessName,
            settlement_bank: data.settlementBank.trim(),
            account_number: data.accountNumber.trim(),
            percentage_charge: data.percentageCharge ?? 0,
            description: data.description || `Cartiva Seller Subaccount: ${data.businessName}`,
          })
          .then((r) => r.data),
      'Paystack createSubaccount',
    )
    if (!res.status || !res.data?.subaccount_code) {
      throw new AppError('Failed to create Paystack subaccount', 400)
    }
    return {
      subaccountCode: res.data.subaccount_code,
      details: res.data,
    }
  } catch (err) {
    throw paystackError(err, 'Failed to create subaccount on Paystack')
  }
}

/**
 * Creates a Paystack Multi-Split payment configuration
 */
export const createSplit = async (data: {
  name: string
  type: 'flat' | 'percentage'
  currency: string
  subaccounts: Array<{ subaccount: string; share: number }>
  bearerType?: 'all' | 'account' | 'subaccount' | 'all-proportional'
}): Promise<{ splitCode: string; details: Record<string, unknown> }> => {
  type SplitRes = {
    status: boolean
    message: string
    data: {
      split_code: string
      [key: string]: unknown
    }
  }

  try {
    const res = await callPaystack(
      () =>
        client()
          .post<SplitRes>('/split', {
            name: data.name,
            type: data.type,
            currency: data.currency,
            subaccounts: data.subaccounts,
            bearer_type: data.bearerType || 'account',
          })
          .then((r) => r.data),
      'Paystack createSplit',
    )
    if (!res.status || !res.data?.split_code) {
      throw new AppError('Failed to create Paystack transaction split', 400)
    }
    return {
      splitCode: res.data.split_code,
      details: res.data,
    }
  } catch (err) {
    throw paystackError(err, 'Failed to create split configuration on Paystack')
  }
}

/**
 * Initiates an automated real money bank payout transfer via Paystack
 */
export const initiateTransfer = async (data: {
  amountMinor: number
  recipientCode: string
  reason: string
  reference: string
}): Promise<{ transferCode: string; status: string; reference: string }> => {
  type TransferRes = {
    status: boolean
    message: string
    data: {
      transfer_code: string
      reference: string
      status: string
      amount: number
      currency: string
    }
  }

  try {
    const res = await callPaystack(
      () =>
        client()
          .post<TransferRes>('/transfer', {
            source: 'balance',
            amount: data.amountMinor,
            recipient: data.recipientCode,
            reason: data.reason,
            reference: data.reference,
          })
          .then((r) => r.data),
      'Paystack initiateTransfer',
    )
    if (!res.status || !res.data) {
      throw new AppError(res.message || 'Transfer failed to initiate', 400)
    }
    return {
      transferCode: res.data.transfer_code,
      status: res.data.status,
      reference: res.data.reference,
    }
  } catch (err) {
    throw paystackError(err, 'Paystack transfer request failed')
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
