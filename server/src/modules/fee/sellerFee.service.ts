import mongoose from 'mongoose'
import { nanoid } from 'nanoid'
import { SellerFee, type ISellerFeeDocument } from './sellerFee.model.js'
import {
  MarketplaceCommissionPolicy,
  type IMarketplaceCommissionPolicyDocument,
  type CommissionType,
} from './marketplaceFee.model.js'
import { CARTIVA_COMMISSION_CONFIG } from './sellerFee.config.js'
import { currencyService } from '../currency/currency.service.js'
import { Money, roundMoney } from '../../../../src/shared/utils/money.js'
import { User } from '../user/user.model.js'
import { SellerProfile } from '../seller/seller.model.js'
import { SellerLedger } from '../seller/sellerPayout.model.js'
import { Product } from '../product/product.model.js'
import { createNotification } from '../notification/notification.model.js'
import { notificationService } from '../notification/notification.service.js'
import { SMSProvider } from '../notification/providers/smsProvider.js'
import { sendSellerOrderNotificationEmail, type SellerOrderItemSummary } from '../../utils/email.js'
import { emitToUser } from '../../sockets/index.js'
import { AppError } from '../../middlewares/error.middleware.js'
import { logger } from '../../utils/logger.js'
import { redis } from '../../database/redis.js'
import type { IOrderDocument, IOrderItemDoc } from '../order/order.model.js'

const generateCommissionNumber = (): string => {
  const date = new Date()
  const ymd = `${date.getFullYear()}${String(date.getMonth() + 1).padStart(2, '0')}${String(date.getDate()).padStart(2, '0')}`
  const suffix = nanoid(6).toUpperCase()
  return `COMM-${ymd}-${suffix}`
}

const COMMISSION_POLICY_CACHE_KEY = 'cache:config:marketplace_commission_policy'
const CACHE_TTL_SECONDS = 3600

// In-memory fallback if Redis is unreachable
let memoryPolicyCache: any = null
let memoryCacheExpiry = 0

/**
 * Retrieves the active Marketplace Commission Policy from Redis cache or MongoDB.
 * Seeds initial baseline policy automatically if none exists.
 */
export const getCommissionPolicy = async (): Promise<IMarketplaceCommissionPolicyDocument> => {
  try {
    const cached = await redis.get(COMMISSION_POLICY_CACHE_KEY)
    if (cached) {
      return JSON.parse(cached)
    }
  } catch {
    // Redis fail-open
  }

  if (memoryPolicyCache && Date.now() < memoryCacheExpiry) {
    return memoryPolicyCache
  }

  let policy = await MarketplaceCommissionPolicy.findOne({ isActive: true }).sort({ version: -1 })

  if (!policy) {
    policy = await MarketplaceCommissionPolicy.create({
      baseSellerFee: 200,
      baseCurrency: 'NGN',
      commissionType: 'FLAT_PER_UNIT',
      percentageRate: 0,
      currencyRates: CARTIVA_COMMISSION_CONFIG.RATES,
      baseUsdRate: CARTIVA_COMMISSION_CONFIG.BASE_USD_RATE,
      isActive: true,
      version: 1,
      auditTrail: [
        {
          modifiedBy: new mongoose.Types.ObjectId(),
          modifierEmail: 'system@cartiva.mall',
          reason: 'Initial system baseline commission policy seed',
          timestamp: new Date(),
        },
      ],
    })
    logger.info('Seeded initial MarketplaceCommissionPolicy baseline')
  }

  const plainPolicy = policy.toObject ? policy.toObject() : policy
  try {
    await redis.set(
      COMMISSION_POLICY_CACHE_KEY,
      JSON.stringify(plainPolicy),
      'EX',
      CACHE_TTL_SECONDS,
    )
  } catch {
    // ignore redis error
  }
  memoryPolicyCache = plainPolicy
  memoryCacheExpiry = Date.now() + 60_000

  return policy
}

export interface UpdateCommissionPolicyInput {
  baseSellerFee: number
  baseCurrency?: string
  commissionType?: CommissionType
  percentageRate?: number
  currencyRates?: Record<string, number>
  baseUsdRate?: number
  reason?: string
}

/**
 * Updates the Marketplace Commission Policy dynamically.
 * Atomically records an audit entry and invalidates the Redis/memory cache.
 */
export const updateCommissionPolicy = async (
  adminUserId: string,
  input: UpdateCommissionPolicyInput,
): Promise<IMarketplaceCommissionPolicyDocument> => {
  const admin = await User.findById(adminUserId).select('email role').lean()
  if (!admin) {
    throw new AppError('Admin user not found', 404)
  }

  const currentPolicy = await getCommissionPolicy()
  const previousState = currentPolicy.toObject ? currentPolicy.toObject() : currentPolicy

  if (input.baseSellerFee < 0) {
    throw new AppError('Base seller fee cannot be negative', 400)
  }
  if (
    input.percentageRate !== undefined &&
    (input.percentageRate < 0 || input.percentageRate > 100)
  ) {
    throw new AppError('Percentage rate must be between 0 and 100', 400)
  }
  if (input.baseUsdRate !== undefined && input.baseUsdRate < 0) {
    throw new AppError('Base USD rate cannot be negative', 400)
  }

  const baseCurrency = (input.baseCurrency || currentPolicy.baseCurrency || 'NGN').toUpperCase()
  const commissionType = input.commissionType || currentPolicy.commissionType || 'FLAT_PER_UNIT'
  const percentageRate =
    input.percentageRate !== undefined ? input.percentageRate : currentPolicy.percentageRate || 0
  const baseUsdRate =
    input.baseUsdRate !== undefined ? input.baseUsdRate : currentPolicy.baseUsdRate || 0.15

  const currentRates =
    currentPolicy.currencyRates instanceof Map
      ? Object.fromEntries(currentPolicy.currencyRates)
      : currentPolicy.currencyRates || {}

  const updatedCurrencyRates = {
    ...currentRates,
    ...(input.currencyRates || {}),
    [baseCurrency]: input.baseSellerFee,
  }

  const newVersion = (previousState.version || 1) + 1

  const auditEntry = {
    modifiedBy: new mongoose.Types.ObjectId(adminUserId),
    modifierEmail: admin.email,
    previousState: {
      baseSellerFee: previousState.baseSellerFee,
      baseCurrency: previousState.baseCurrency,
      commissionType: previousState.commissionType,
      percentageRate: previousState.percentageRate,
      baseUsdRate: previousState.baseUsdRate,
      version: previousState.version,
    },
    newState: {
      baseSellerFee: input.baseSellerFee,
      baseCurrency,
      commissionType,
      percentageRate,
      baseUsdRate,
      version: newVersion,
    },
    reason: input.reason || 'Admin dynamic commission update',
    timestamp: new Date(),
  }

  const updated = await MarketplaceCommissionPolicy.findByIdAndUpdate(
    currentPolicy._id,
    {
      $set: {
        baseSellerFee: input.baseSellerFee,
        baseCurrency,
        commissionType,
        percentageRate,
        currencyRates: updatedCurrencyRates,
        baseUsdRate,
        lastModifiedBy: adminUserId,
        isActive: true,
        version: newVersion,
      },
      $push: { auditTrail: { $each: [auditEntry], $slice: -50 } },
    },
    { returnDocument: 'after', upsert: true },
  )

  await clearCommissionPolicyCache()

  logger.info(`Marketplace Commission Policy updated by admin ${admin.email} (v${updated.version})`)
  return updated
}

/**
 * Explicitly clears the commission policy Redis and in-memory caches.
 */
export const clearCommissionPolicyCache = async (): Promise<void> => {
  try {
    if (redis.status === 'wait') {
      await redis.connect().catch(() => {})
    }
    if (redis.status === 'ready') {
      await redis.del(COMMISSION_POLICY_CACHE_KEY)
    }
  } catch {
    // Redis fail-open
  }
  memoryPolicyCache = null
  memoryCacheExpiry = 0
}

/**
 * Returns authoritative Cartiva commission per product unit for the specified currency,
 * fetched dynamically from the active database policy with fallback to the currency engine.
 */
export const getCartivaCommissionPerUnit = async (currency: string): Promise<number> => {
  const curr = (currency || 'NGN').toUpperCase()
  const policy = await getCommissionPolicy()

  const rates =
    policy.currencyRates instanceof Map
      ? Object.fromEntries(policy.currencyRates)
      : policy.currencyRates || {}

  if (rates[curr] !== undefined && rates[curr] !== null) {
    return Number(rates[curr])
  }

  // Fallback to converting base USD rate using live currency engine
  const baseUsd = policy.baseUsdRate || 0.15
  const conversion = await currencyService.convert(baseUsd, 'USD', curr)
  return roundMoney(conversion.targetAmount, curr)
}

/**
 * Records per-item Cartiva commission upon successful Paystack payment confirmation.
 * Idempotent: safe against retries and duplicate webhooks.
 */
export const createSellerFeeForOrderItem = async (
  order: IOrderDocument,
  item: IOrderItemDoc,
  _paymentMethodType: 'paystack' = 'paystack',
  dbSession?: mongoose.ClientSession,
): Promise<ISellerFeeDocument | null> => {
  let sellerId = item.sellerId
  if (!sellerId) {
    const product = await Product.findById(item.productId).select('sellerId').lean()
    if (product?.sellerId) {
      sellerId = product.sellerId
    }
  }

  if (!sellerId) {
    logger.warn('Skipping commission record: no sellerId associated with product', {
      productId: item.productId,
      orderId: order._id,
    })
    return null
  }

  const existing = await SellerFee.findOne({
    orderId: order._id,
    productId: item.productId,
  })
  if (existing) {
    return existing
  }

  const orderCurrency = (order.currency || 'NGN').toUpperCase()
  const quantity = Math.max(1, item.quantity)
  const feePerUnit = await getCartivaCommissionPerUnit(orderCurrency)
  const totalFee = roundMoney(Money.from(feePerUnit).multiply(quantity).toNumber(), orderCurrency)

  const feeNumber = generateCommissionNumber()

  const fee = new SellerFee({
    feeNumber,
    sellerId,
    productId: item.productId,
    orderId: order._id,
    orderNumber: order.orderNumber,
    quantity,
    baseFeeAmount: feePerUnit,
    baseFeeCurrency: orderCurrency,
    feePerUnit,
    totalFee,
    currency: orderCurrency,
    paymentMethodType: 'paystack',
    status: 'PAID',
    dueAt: new Date(),
    paidAt: new Date(),
    auditLog: [
      {
        event: 'COMMISSION_RECORDED',
        note: `Cartiva Commission of ${orderCurrency} ${totalFee.toFixed(2)} (${quantity} unit(s) @ ${orderCurrency} ${feePerUnit.toFixed(2)}/unit) recorded for order #${order.orderNumber}`,
        timestamp: new Date(),
      },
    ],
  })

  const opts = dbSession ? { session: dbSession } : {}
  await fee.save(opts)
  return fee
}

/**
 * Processes complete order sales, Cartiva commission, and seller net earnings release.
 * Groups by seller and credits net earnings to seller ledger idempotently.
 */
export const recordOrderSellerEarnings = async (
  order: IOrderDocument,
  dbSession?: mongoose.ClientSession,
): Promise<void> => {
  const opts = dbSession ? { session: dbSession } : {}
  const orderCurrency = (order.currency || 'NGN').toUpperCase()

  // 1. Group line items by seller
  const sellerMap = new Map<
    string,
    {
      sellerId: mongoose.Types.ObjectId
      items: IOrderItemDoc[]
      gross: number
      commission: number
    }
  >()

  for (const item of order.items) {
    let sellerId = item.sellerId
    if (!sellerId) {
      const p = await Product.findById(item.productId).select('sellerId').lean()
      if (p?.sellerId) sellerId = p.sellerId
    }
    if (!sellerId) continue

    const sellerKey = sellerId.toString()
    if (!sellerMap.has(sellerKey)) {
      sellerMap.set(sellerKey, {
        sellerId: new mongoose.Types.ObjectId(sellerKey),
        items: [],
        gross: 0,
        commission: 0,
      })
    }

    const entry = sellerMap.get(sellerKey)!
    entry.items.push(item)

    const itemCommissionRate = await getCartivaCommissionPerUnit(orderCurrency)
    const itemCommission = roundMoney(
      Money.from(itemCommissionRate).multiply(item.quantity).toNumber(),
      orderCurrency,
    )

    entry.gross = Money.from(entry.gross).add(item.lineTotal).round(orderCurrency)
    entry.commission = Money.from(entry.commission).add(itemCommission).round(orderCurrency)

    // Ensure individual item fee/commission record is saved
    await createSellerFeeForOrderItem(order, item, 'paystack', dbSession)
  }

  // 2. For each seller, release net earnings idempotently
  for (const [, sellerData] of sellerMap) {
    const { sellerId, gross, commission } = sellerData
    const sellerNet = Money.from(gross).subtract(commission).round(orderCurrency)

    // Idempotency: verify this order has not already released earnings for this seller
    const existingLedger = await SellerLedger.findOne({
      sellerId,
      referenceType: 'order',
      referenceId: order.orderNumber,
      type: 'ORDER_SALE',
    })

    if (!existingLedger) {
      // Find latest balance
      const lastEntry = await SellerLedger.findOne({ sellerId }).sort({ createdAt: -1 })
      const prevBalance = lastEntry?.balanceAfter ?? 0
      const newBalance = Money.from(prevBalance).add(sellerNet).round(orderCurrency)

      await SellerLedger.create(
        [
          {
            sellerId,
            type: 'ORDER_SALE',
            amount: sellerNet,
            currency: orderCurrency,
            balanceAfter: newBalance,
            referenceType: 'order',
            referenceId: order.orderNumber,
            description: `Order #${order.orderNumber} sale (Gross: ${orderCurrency} ${gross.toFixed(2)}, Commission: ${orderCurrency} ${commission.toFixed(2)}, Net: ${orderCurrency} ${sellerNet.toFixed(2)})`,
          },
        ],
        opts,
      )

      // Increment seller profile earnings
      await SellerProfile.findOneAndUpdate(
        { userId: sellerId },
        {
          $inc: {
            totalSales: gross,
            totalEarnings: sellerNet,
          },
        },
        opts,
      )

      // 1. In-App Notification & Real-Time Socket.IO
      const sellerIdStr = sellerId.toString()
      const itemSummaries: SellerOrderItemSummary[] = sellerData.items.map((it) => ({
        title: it.title,
        quantity: it.quantity,
        price: it.itemPrice,
        lineTotal: it.lineTotal,
      }))

      const itemTitles = sellerData.items.map((it) => `${it.quantity}x ${it.title}`).join(', ')

      await notificationService
        .create({
          userId: sellerIdStr,
          type: 'order',
          title: 'New Paid Order Received!',
          message: `Order #${order.orderNumber} confirmed. Purchased: ${itemTitles}. Net Earnings: ${orderCurrency} ${sellerNet.toFixed(2)}.`,
          link: '/seller/orders',
          data: {
            orderId: String(order._id),
            orderNumber: order.orderNumber,
            gross,
            commission,
            netEarnings: sellerNet,
            currency: orderCurrency,
            items: itemSummaries,
          },
        })
        .catch((err) => {
          logger.warn('Failed to create in-app seller order notification', {
            error: err,
            sellerId: sellerIdStr,
          })
        })

      // Real-time order event to seller room
      emitToUser(sellerIdStr, 'order:new', {
        orderId: String(order._id),
        orderNumber: order.orderNumber,
        netEarnings: sellerNet,
        currency: orderCurrency,
      })

      // 2. Fetch Seller Account for Transactional Email & SMS
      try {
        const sellerUser = await User.findById(sellerId)
          .select('firstName lastName email phoneNumber')
          .lean()
        const sellerProfile = await SellerProfile.findOne({ userId: sellerId })
          .select('whatsappNumber')
          .lean()

        const sellerName = sellerUser
          ? `${sellerUser.firstName} ${sellerUser.lastName || ''}`.trim()
          : 'Seller'
        const sellerEmail = sellerUser?.email

        // Send Email Notification
        if (sellerEmail) {
          await sendSellerOrderNotificationEmail(
            sellerEmail,
            sellerName,
            order.orderNumber,
            orderCurrency,
            itemSummaries,
            gross,
            commission,
            sellerNet,
          ).catch((err) => {
            logger.warn('Failed to send seller order notification email', {
              error: err,
              sellerId: sellerIdStr,
            })
          })
        }

        // Send SMS Notification
        const rawPhone = sellerProfile?.whatsappNumber || sellerUser?.phoneNumber

        if (rawPhone && rawPhone.trim()) {
          const smsText = `Cartiva: You have received a new paid order #${order.orderNumber} (${orderCurrency} ${sellerNet.toFixed(2)}). Please log in to your seller dashboard to process it.`
          await SMSProvider.send({ phone: rawPhone.trim(), message: smsText }).catch((err) => {
            logger.warn('Failed to send seller order notification SMS', {
              error: err,
              sellerId: sellerIdStr,
            })
          })
        }
      } catch (dispatchErr) {
        logger.error('Error during seller external notification dispatch', {
          error: dispatchErr,
          sellerId: sellerIdStr,
        })
      }

      // 3. Direct In-App Conversation Message from Buyer to Seller
      try {
        const buyerIdStr = order.userId?.toString()
        if (buyerIdStr && buyerIdStr !== sellerIdStr) {
          const { messagingService } = await import('../messaging/messaging.service.js')
          const convo = await messagingService.getOrCreateConversation(buyerIdStr, sellerIdStr, {
            orderId: String(order._id),
            subject: `Order #${order.orderNumber}`,
          })
          const messageContent = `🛒 New Order Placed: #${order.orderNumber}\n\nItems purchased:\n${sellerData.items.map((it) => `• ${it.quantity}x ${it.title} (${orderCurrency} ${it.lineTotal.toFixed(2)})`).join('\n')}\n\nOrder Total for your store: ${orderCurrency} ${sellerNet.toFixed(2)}\n\nPlease prepare the order for processing.`
          await messagingService.sendMessage(String(convo._id), buyerIdStr, messageContent, 'text')
        }
      } catch (msgErr) {
        logger.warn('Failed to send order conversation message to seller', {
          error: msgErr,
          sellerId: sellerIdStr,
        })
      }
    }
  }
}

/**
 * Reverses seller earnings when an order is refunded.
 * Creates an immutable compensating ORDER_REFUND entry in SellerLedger.
 */
export const reverseOrderSellerEarnings = async (
  order: IOrderDocument,
  _refundAmount?: number,
  dbSession?: mongoose.ClientSession,
): Promise<void> => {
  const opts = dbSession ? { session: dbSession } : {}
  const orderCurrency = (order.currency || 'NGN').toUpperCase()

  // 1. Group line items by seller
  const sellerMap = new Map<
    string,
    {
      sellerId: mongoose.Types.ObjectId
      items: IOrderItemDoc[]
      gross: number
      commission: number
    }
  >()

  for (const item of order.items) {
    let sellerId = item.sellerId
    if (!sellerId) {
      const p = await Product.findById(item.productId).select('sellerId').lean()
      if (p?.sellerId) sellerId = p.sellerId
    }
    if (!sellerId) continue

    const sellerKey = sellerId.toString()
    if (!sellerMap.has(sellerKey)) {
      sellerMap.set(sellerKey, {
        sellerId: new mongoose.Types.ObjectId(sellerKey),
        items: [],
        gross: 0,
        commission: 0,
      })
    }

    const entry = sellerMap.get(sellerKey)!
    entry.items.push(item)

    const itemCommissionRate = await getCartivaCommissionPerUnit(orderCurrency)
    const itemCommission = roundMoney(
      Money.from(itemCommissionRate).multiply(item.quantity).toNumber(),
      orderCurrency,
    )

    entry.gross = Money.from(entry.gross).add(item.lineTotal).round(orderCurrency)
    entry.commission = Money.from(entry.commission).add(itemCommission).round(orderCurrency)
  }

  // 2. For each seller, post compensating refund entry
  for (const [, sellerData] of sellerMap) {
    const { sellerId, gross, commission } = sellerData
    const sellerNet = Money.from(gross).subtract(commission).round(orderCurrency)

    const existingRefundLedger = await SellerLedger.findOne({
      sellerId,
      referenceType: 'refund',
      referenceId: order.orderNumber,
      type: 'ORDER_REFUND',
    })

    if (!existingRefundLedger) {
      const lastEntry = await SellerLedger.findOne({ sellerId }).sort({ createdAt: -1 })
      const prevBalance = lastEntry?.balanceAfter ?? 0
      const newBalance = Money.from(prevBalance).subtract(sellerNet).round(orderCurrency)

      await SellerLedger.create(
        [
          {
            sellerId,
            type: 'ORDER_REFUND',
            amount: -sellerNet,
            currency: orderCurrency,
            balanceAfter: newBalance,
            referenceType: 'refund',
            referenceId: order.orderNumber,
            description: `Compensating refund for order #${order.orderNumber} (Gross: -${orderCurrency} ${gross.toFixed(2)}, Commission Reversal: +${orderCurrency} ${commission.toFixed(2)}, Net Reversal: -${orderCurrency} ${sellerNet.toFixed(2)})`,
          },
        ],
        opts,
      )

      await SellerProfile.findOneAndUpdate(
        { userId: sellerId },
        {
          $inc: {
            totalSales: -gross,
            totalEarnings: -sellerNet,
          },
        },
        opts,
      )

      const sellerIdStr = sellerId.toString()
      const notif = await createNotification({
        userId: sellerIdStr,
        type: 'order',
        title: 'Order Refund Processed',
        message: `Order #${order.orderNumber} was refunded. Net earnings adjusted by -${orderCurrency} ${sellerNet.toFixed(2)}.`,
        link: '/seller/orders',
      }).catch(() => null)

      if (notif) emitToUser(sellerIdStr, 'notification:new', notif)
    }
  }
}

/**
 * Returns seller earnings & commission history for seller dashboard
 */
export const getSellerFees = async (
  sellerId: string,
  query: { page?: number; limit?: number; status?: string } = {},
) => {
  const sellerOid = new mongoose.Types.ObjectId(sellerId)
  const page = Math.max(1, query.page ?? 1)
  const limit = Math.min(100, Math.max(1, query.limit ?? 20))
  const skip = (page - 1) * limit

  const filter: Record<string, unknown> = { sellerId: sellerOid }

  const [commissions, total, profile, ledgerEntries] = await Promise.all([
    SellerFee.find(filter)
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(limit)
      .populate('productId', 'title image images price')
      .lean(),
    SellerFee.countDocuments(filter),
    SellerProfile.findOne({ userId: sellerOid })
      .select('storeName totalSales totalEarnings accountStatus')
      .lean(),
    SellerLedger.find({ sellerId: sellerOid, type: 'ORDER_SALE' })
      .sort({ createdAt: -1 })
      .limit(50)
      .lean(),
  ])

  const totalCommissionAmount = commissions.reduce((sum, c) => sum + (c.totalFee || 0), 0)

  return {
    fees: commissions,
    commissions,
    summary: {
      accountStatus: 'ACTIVE',
      totalSales: profile?.totalSales ?? 0,
      totalEarnings: profile?.totalEarnings ?? 0,
      totalCommission: totalCommissionAmount,
      recentSales: ledgerEntries,
    },
    pagination: {
      total,
      page,
      limit,
      totalPages: Math.ceil(total / limit) || 1,
      hasNext: page < Math.ceil(total / limit),
      hasPrev: page > 1,
    },
  }
}

/**
 * Admin Commission Analytics:
 * Total Cartiva commission, by currency, by seller, and gross sales breakdown
 */
export const getAdminCommissionStats = async (
  query: { startDate?: string; endDate?: string } = {},
) => {
  const match: Record<string, unknown> = {}
  if (query.startDate || query.endDate) {
    const dateFilter: Record<string, Date> = {}
    if (query.startDate) dateFilter.$gte = new Date(query.startDate)
    if (query.endDate) dateFilter.$lte = new Date(query.endDate)
    match.createdAt = dateFilter
  }

  const [byCurrency, totalCommissionsCount, recentCommissions] = await Promise.all([
    SellerFee.aggregate([
      { $match: match },
      {
        $group: {
          _id: '$currency',
          totalCommission: { $sum: '$totalFee' },
          totalUnitsSold: { $sum: '$quantity' },
          orderCount: { $addToSet: '$orderId' },
        },
      },
      {
        $project: {
          currency: '$_id',
          totalCommission: 1,
          totalUnitsSold: 1,
          orderCount: { $size: '$orderCount' },
        },
      },
    ]),
    SellerFee.countDocuments(match),
    SellerFee.find(match)
      .sort({ createdAt: -1 })
      .limit(50)
      .populate('sellerId', 'storeName email')
      .populate('productId', 'title price')
      .lean(),
  ])

  return {
    byCurrency,
    totalCommissionsCount,
    recentCommissions,
  }
}

/**
 * Deprecated legacy functions kept as safe no-ops to prevent runtime errors
 */
export const processFeeEnforcement = async () => {
  // Safe no-op: All accounts are restored to ACTIVE; automatic commission is in place.
  await User.updateMany(
    { accountStatus: 'RESTRICTED' },
    { $set: { accountStatus: 'ACTIVE' }, $unset: { restrictionReason: 1, restrictedAt: 1 } },
  )
  await SellerProfile.updateMany(
    { accountStatus: 'RESTRICTED' },
    { $set: { accountStatus: 'ACTIVE' }, $unset: { restrictionReason: 1, restrictedAt: 1 } },
  )
  return { warningsSent: 0, accountsRestricted: 0 }
}

export const submitFeePayment = async (_userId?: string, _feeId?: string, _data?: any) => {
  throw new AppError(
    'Manual seller fee payment is obsolete. Commission is automatically deducted from sales.',
    410,
  )
}

export const adminVerifyFeePayment = async (
  _adminUserId?: string,
  _feeId?: string,
  _approved?: boolean,
  _notes?: string,
) => {
  throw new AppError(
    'Manual fee verification is obsolete. Commission is automatically accounted for.',
    410,
  )
}
