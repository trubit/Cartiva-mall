import mongoose from 'mongoose'
import { User } from '../user/user.model.js'
import { SellerProfile } from './seller.model.js'
import { Product } from '../product/product.model.js'
import { Order } from '../order/order.model.js'
import { SellerPayoutAccount, SellerWithdrawal, SellerLedger } from './sellerPayout.model.js'
import { SellerFee } from '../fee/sellerFee.model.js'
import { getCommissionPolicy, getCartivaCommissionPerUnit } from '../fee/sellerFee.service.js'
import { redis } from '../../database/redis.js'
import * as paystackService from '../payment/paystack.service.js'
import { createNotification } from '../notification/notification.model.js'
import { emitToUser } from '../../sockets/index.js'
import { AppError } from '../../middlewares/error.middleware.js'
import { cacheGet, cacheSet, cacheDel } from '../../utils/cache.js'
import { logger } from '../../utils/logger.js'
import { sendAdminNewWithdrawalEmail } from '../../utils/email.js'
import { getPayoutSettings } from '../admin/admin.service.js'
import { calculateExpectedCompletionDate } from '../../../../src/shared/utils/businessCalendar.js'
import type {
  OnboardSellerInput,
  UpdateSellerProfileInput,
  RequestWithdrawalInput,
  AddPayoutAccountInput,
} from '../../../../src/shared/validators/seller.validators.js'

// Seller dashboard + analytics are cached for 60 s so concurrent dashboard
// refreshes don't each run 8–10 aggregation pipelines against MongoDB.
// Earnings are cached for 2 min (slightly stale is acceptable; reads are heavy).
const SELLER_DASHBOARD_TTL = 60
const SELLER_ANALYTICS_TTL = 60
const SELLER_EARNINGS_TTL = 120

// Cap the number of product IDs passed into $in operators.
// A seller with 100k products creates a 100k-element array per aggregation call.
// Above this threshold we trade some precision for query safety and log a warning.
const MAX_IN_PRODUCT_IDS = 2_000

// Returns a MongoDB aggregation expression that sums lineTotal for only the seller's own items
// within a matched order document. Prevents revenue inflation from shared multi-seller carts.
const sellerItemRevenue = (ids: mongoose.Types.ObjectId[]) => ({
  $reduce: {
    input: { $filter: { input: '$items', as: 'i', cond: { $in: ['$$i.productId', ids] } } },
    initialValue: 0,
    in: { $add: ['$$value', '$$this.lineTotal'] },
  },
})

// Returns an aggregation expression computing seller's gross revenue (product earnings + allocated shipping fee)
const sellerGrossRevenueExpr = (
  sellerOid: mongoose.Types.ObjectId,
  ids: mongoose.Types.ObjectId[],
) => ({
  $let: {
    vars: {
      alloc: {
        $first: {
          $filter: {
            input: { $ifNull: ['$sellerAllocations', []] },
            as: 'sa',
            cond: { $eq: ['$$sa.sellerId', sellerOid] },
          },
        },
      },
      itemRev: sellerItemRevenue(ids),
    },
    in: {
      $cond: [
        { $ne: ['$$alloc', null] },
        {
          $ifNull: [
            '$$alloc.grossAmount',
            { $add: ['$$itemRev', { $ifNull: ['$$alloc.shippingFee', 0] }] },
          ],
        },
        {
          $add: [
            '$$itemRev',
            {
              $cond: [
                {
                  $eq: [
                    {
                      $size: {
                        $filter: {
                          input: { $ifNull: ['$items', []] },
                          as: 'it',
                          cond: { $in: ['$$it.productId', ids] },
                        },
                      },
                    },
                    { $size: { $ifNull: ['$items', []] } },
                  ],
                },
                { $ifNull: ['$shippingFee', 0] },
                0,
              ],
            },
          ],
        },
      ],
    },
  },
})

// ─── Onboard ──────────────────────────────────────────────────────────────────
export const onboardSeller = async (userId: string, input: OnboardSellerInput) => {
  const existing = await SellerProfile.findOne({ userId })
  if (existing) throw new AppError('Seller profile already exists', 409)

  return SellerProfile.create({
    userId: new mongoose.Types.ObjectId(userId),
    storeName: input.storeName,
    storeDescription: input.storeDescription ?? '',
    storeAddress: input.storeAddress ?? {},
  })
}

// ─── Get profile ──────────────────────────────────────────────────────────────
export const getSellerProfile = async (userId: string) => {
  const profile = await SellerProfile.findOne({ userId })
  if (!profile) throw new AppError('Seller profile not found. Please complete onboarding.', 404)
  return profile
}

// ─── Update profile ───────────────────────────────────────────────────────────
export const updateSellerProfile = async (userId: string, input: UpdateSellerProfileInput) => {
  const profile = await SellerProfile.findOne({ userId })
  if (!profile) throw new AppError('Seller profile not found', 404)

  if (input.storeName !== undefined) profile.storeName = input.storeName
  if (input.storeDescription !== undefined) profile.storeDescription = input.storeDescription
  if (input.storeLogo !== undefined) profile.storeLogo = input.storeLogo
  if (input.whatsappNumber !== undefined) profile.whatsappNumber = input.whatsappNumber
  if (input.publicLocation !== undefined) profile.publicLocation = input.publicLocation
  if (input.storeAddress) {
    Object.assign(profile.storeAddress, input.storeAddress)
    profile.markModified('storeAddress')
  }

  await profile.save()
  return profile
}

// ─── Dashboard ────────────────────────────────────────────────────────────────
export const getSellerDashboard = async (sellerId: string) => {
  const cacheKey = `seller:dashboard:${sellerId}`
  const cached = await cacheGet<object>(cacheKey)
  if (cached) return cached

  const sellerOid = new mongoose.Types.ObjectId(sellerId)
  let productIds = await Product.find({ sellerId: sellerOid }).distinct('_id')

  // Guard: a seller with tens of thousands of products creates a massive $in array.
  // Cap at MAX_IN_PRODUCT_IDS — very large sellers will see slightly incomplete
  // aggregation counts but the server stays responsive under load.
  if (productIds.length > MAX_IN_PRODUCT_IDS) {
    productIds = productIds.slice(0, MAX_IN_PRODUCT_IDS)
  }

  const now = new Date()
  const thisMonthStart = new Date(now.getFullYear(), now.getMonth(), 1)
  const last30Days = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000)

  const orderMatch =
    productIds.length > 0 ? { 'items.productId': { $in: productIds } } : { _id: null } // matches nothing when seller has no products yet

  const revenueExpr = sellerGrossRevenueExpr(sellerOid, productIds)

  const [
    productStatusBreakdown,
    totalOrders,
    revenueResult,
    thisMonthRevenue,
    pendingOrders,
    rawRecentOrders,
    revenueByDay,
    orderStatusBreakdown,
    topProducts,
  ] = await Promise.all([
    Product.aggregate([
      { $match: { sellerId: sellerOid } },
      { $group: { _id: '$status', count: { $sum: 1 } } },
    ]),
    Order.countDocuments(orderMatch),
    Order.aggregate([
      { $match: { ...orderMatch, paymentStatus: 'paid' } },
      { $group: { _id: null, total: { $sum: revenueExpr } } },
    ]),
    Order.aggregate([
      { $match: { ...orderMatch, paymentStatus: 'paid', createdAt: { $gte: thisMonthStart } } },
      { $group: { _id: null, total: { $sum: revenueExpr } } },
    ]),
    Order.countDocuments({ ...orderMatch, orderStatus: 'pending' }),
    Order.find(orderMatch)
      .sort({ createdAt: -1 })
      .limit(5)
      .populate('userId', 'firstName lastName') // email excluded — buyers' contact info stays private
      .lean(),
    Order.aggregate([
      { $match: { ...orderMatch, paymentStatus: 'paid', createdAt: { $gte: last30Days } } },
      {
        $group: {
          _id: { $dateToString: { format: '%Y-%m-%d', date: '$createdAt' } },
          revenue: { $sum: revenueExpr },
          orders: { $sum: 1 },
        },
      },
      { $sort: { _id: 1 } },
    ]),
    Order.aggregate([
      { $match: orderMatch },
      { $group: { _id: '$orderStatus', count: { $sum: 1 } } },
    ]),
    productIds.length > 0
      ? Order.aggregate([
          { $match: { 'items.productId': { $in: productIds }, paymentStatus: 'paid' } },
          { $unwind: '$items' },
          { $match: { 'items.productId': { $in: productIds } } },
          {
            $group: {
              _id: '$items.productId',
              title: { $first: '$items.title' },
              image: { $first: '$items.image' },
              totalSold: { $sum: '$items.quantity' },
              totalRevenue: { $sum: '$items.lineTotal' },
            },
          },
          { $sort: { totalRevenue: -1 } },
          { $limit: 5 },
        ])
      : Promise.resolve([]),
  ])

  // Strip items belonging to other sellers so Seller A cannot see Seller B's product details
  const pid = new Set(productIds.map((id) => id.toString()))
  const recentOrders = rawRecentOrders.map((o) => ({
    ...o,
    items: o.items.filter((item) =>
      pid.has((item.productId as mongoose.Types.ObjectId).toString()),
    ),
  }))

  const byStatus = Object.fromEntries(
    (productStatusBreakdown as { _id: string; count: number }[]).map((r) => [r._id, r.count]),
  )

  const dashboardResult = {
    stats: {
      totalRevenue: revenueResult[0]?.total ?? 0,
      totalOrders,
      totalProducts:
        (byStatus['active'] ?? 0) + (byStatus['pending'] ?? 0) + (byStatus['blocked'] ?? 0),
      activeProducts: byStatus['active'] ?? 0,
      pendingOrders,
      thisMonthRevenue: thisMonthRevenue[0]?.total ?? 0,
    },
    products: {
      active: byStatus['active'] ?? 0,
      pending: byStatus['pending'] ?? 0,
      blocked: byStatus['blocked'] ?? 0,
    },
    recentOrders,
    revenueByDay,
    orderStatusBreakdown,
    topProducts,
  }
  await cacheSet(cacheKey, dashboardResult, SELLER_DASHBOARD_TTL)
  return dashboardResult
}

// ─── Analytics ────────────────────────────────────────────────────────────────
export const getSellerAnalytics = async (sellerId: string, days = 30) => {
  const cacheKey = `seller:analytics:${sellerId}:${days}`
  const cached = await cacheGet<object>(cacheKey)
  if (cached) return cached

  const sellerOid = new mongoose.Types.ObjectId(sellerId)
  let productIds = await Product.find({ sellerId: sellerOid }).distinct('_id')
  if (productIds.length > MAX_IN_PRODUCT_IDS) productIds = productIds.slice(0, MAX_IN_PRODUCT_IDS)
  const since = new Date(Date.now() - days * 24 * 60 * 60 * 1000)

  const orderMatch =
    productIds.length > 0 ? { 'items.productId': { $in: productIds } } : { _id: null }

  const revenueExpr = sellerItemRevenue(productIds)

  const [revenueByDay, orderStatusBreakdown, topProducts, totals] = await Promise.all([
    Order.aggregate([
      { $match: { ...orderMatch, paymentStatus: 'paid', createdAt: { $gte: since } } },
      {
        $group: {
          _id: { $dateToString: { format: '%Y-%m-%d', date: '$createdAt' } },
          revenue: { $sum: revenueExpr },
          orders: { $sum: 1 },
        },
      },
      { $sort: { _id: 1 } },
    ]),
    Order.aggregate([
      { $match: orderMatch },
      { $group: { _id: '$orderStatus', count: { $sum: 1 } } },
    ]),
    productIds.length > 0
      ? Order.aggregate([
          // createdAt filter applied so topProducts respects the same `days` window as other metrics
          {
            $match: {
              'items.productId': { $in: productIds },
              paymentStatus: 'paid',
              createdAt: { $gte: since },
            },
          },
          { $unwind: '$items' },
          { $match: { 'items.productId': { $in: productIds } } },
          {
            $group: {
              _id: '$items.productId',
              title: { $first: '$items.title' },
              image: { $first: '$items.image' },
              totalSold: { $sum: '$items.quantity' },
              totalRevenue: { $sum: '$items.lineTotal' },
            },
          },
          { $sort: { totalRevenue: -1 } },
          { $limit: 5 },
        ])
      : Promise.resolve([]),
    Order.aggregate([
      { $match: { ...orderMatch, paymentStatus: 'paid' } },
      { $group: { _id: null, totalRevenue: { $sum: revenueExpr }, totalOrders: { $sum: 1 } } },
    ]),
  ])

  const totalRevenue = totals[0]?.totalRevenue ?? 0
  const totalOrders = totals[0]?.totalOrders ?? 0
  const avgOrderValue = totalOrders > 0 ? totalRevenue / totalOrders : 0

  const analyticsResult = {
    revenueByDay,
    orderStatusBreakdown,
    topProducts,
    totalRevenue,
    totalOrders,
    avgOrderValue,
  }
  await cacheSet(cacheKey, analyticsResult, SELLER_ANALYTICS_TTL)
  return analyticsResult
}

// ─── Earnings & Balance Calculation ───────────────────────────────────────────
export const calculateLiveAvailableBalance = async (sellerId: string) => {
  const sellerOid = new mongoose.Types.ObjectId(sellerId)
  let productIds = await Product.find({ sellerId: sellerOid }).distinct('_id')
  if (productIds.length > MAX_IN_PRODUCT_IDS) productIds = productIds.slice(0, MAX_IN_PRODUCT_IDS)

  const now = new Date()
  const thisMonthStart = new Date(now.getFullYear(), now.getMonth(), 1)
  const lastMonthStart = new Date(now.getFullYear(), now.getMonth() - 1, 1)
  const lastMonthEnd = new Date(now.getFullYear(), now.getMonth(), 0, 23, 59, 59)
  const sixMonthsAgo = new Date(now.getFullYear(), now.getMonth() - 5, 1)

  const holdDays = parseInt(process.env.PAYOUT_HOLD_PERIOD_DAYS || '0', 10) || 0
  const holdCutoff = new Date(Date.now() - holdDays * 24 * 60 * 60 * 1000)

  const orderMatch =
    productIds.length > 0 ? { 'items.productId': { $in: productIds } } : { _id: null }

  const revenueExpr = sellerGrossRevenueExpr(sellerOid, productIds)

  const [
    totalResult,
    settledResult,
    thisMonth,
    lastMonth,
    unpaidPending,
    revenueByMonth,
    completedWithdrawalsResult,
    inFlightWithdrawalsResult,
  ] = await Promise.all([
    // All paid non-refunded orders
    Order.aggregate([
      {
        $match: {
          ...orderMatch,
          paymentStatus: 'paid',
          orderStatus: { $nin: ['cancelled', 'refunded', 'returned'] },
        },
      },
      { $group: { _id: null, total: { $sum: revenueExpr } } },
    ]),
    // Settled orders (Delivered or past hold window)
    Order.aggregate([
      {
        $match: {
          ...orderMatch,
          paymentStatus: 'paid',
          orderStatus: { $in: ['delivered', 'confirmed', 'processing', 'shipped'] },
          updatedAt: { $lte: holdDays > 0 ? holdCutoff : new Date() },
        },
      },
      { $group: { _id: null, total: { $sum: revenueExpr } } },
    ]),
    // This month paid orders
    Order.aggregate([
      {
        $match: {
          ...orderMatch,
          paymentStatus: 'paid',
          orderStatus: { $nin: ['cancelled', 'refunded', 'returned'] },
          createdAt: { $gte: thisMonthStart },
        },
      },
      { $group: { _id: null, total: { $sum: revenueExpr } } },
    ]),
    // Last month paid orders
    Order.aggregate([
      {
        $match: {
          ...orderMatch,
          paymentStatus: 'paid',
          orderStatus: { $nin: ['cancelled', 'refunded', 'returned'] },
          createdAt: { $gte: lastMonthStart, $lte: lastMonthEnd },
        },
      },
      { $group: { _id: null, total: { $sum: revenueExpr } } },
    ]),
    // Unpaid pending orders
    Order.aggregate([
      { $match: { ...orderMatch, paymentStatus: 'pending' } },
      { $group: { _id: null, total: { $sum: revenueExpr } } },
    ]),
    // 6-month monthly revenue
    Order.aggregate([
      {
        $match: {
          ...orderMatch,
          paymentStatus: 'paid',
          orderStatus: { $nin: ['cancelled', 'refunded', 'returned'] },
          createdAt: { $gte: sixMonthsAgo },
        },
      },
      {
        $group: {
          _id: { $dateToString: { format: '%Y-%m', date: '$createdAt' } },
          revenue: { $sum: revenueExpr },
          orders: { $sum: 1 },
        },
      },
      { $sort: { _id: 1 } },
    ]),
    // Completed withdrawals sum
    SellerWithdrawal.aggregate([
      { $match: { sellerId: sellerOid, status: 'completed' } },
      { $group: { _id: null, total: { $sum: '$amount' } } },
    ]),
    // In-flight pending/pending_approval/processing withdrawals sum
    SellerWithdrawal.aggregate([
      {
        $match: {
          sellerId: sellerOid,
          status: { $in: ['pending', 'pending_approval', 'processing'] },
        },
      },
      { $group: { _id: null, total: { $sum: '$amount' } } },
    ]),
  ])

  // 1. Authoritative commission calculation from recorded SellerFee or active policy
  const feeAgg = await SellerFee.aggregate([
    { $match: { sellerId: sellerOid, status: { $in: ['PAID', 'PENDING', 'DUE'] } } },
    { $group: { _id: null, total: { $sum: '$totalFee' } } },
  ])
  const recordedCommission = feeAgg[0]?.total ?? 0

  const totalGrossRevenue = totalResult[0]?.total ?? 0
  const settledGrossRevenue = settledResult[0]?.total ?? totalGrossRevenue
  const currency = process.env.PAYSTACK_CURRENCY || 'NGN'

  let totalCommission = recordedCommission
  if (totalCommission === 0 && totalGrossRevenue > 0) {
    const policy = await getCommissionPolicy().catch(() => null)
    if (policy && policy.commissionType === 'PERCENTAGE' && policy.percentageRate) {
      totalCommission = Math.round(totalGrossRevenue * (policy.percentageRate / 100) * 100) / 100
    } else {
      const commPerUnit = await getCartivaCommissionPerUnit(currency).catch(() => 200)
      totalCommission = Math.min(totalGrossRevenue, commPerUnit)
    }
  }

  const totalNetRevenue = Math.max(0, Math.round((totalGrossRevenue - totalCommission) * 100) / 100)
  const settledNetRevenue = Math.max(
    0,
    Math.round((settledGrossRevenue - totalCommission) * 100) / 100,
  )

  const completedWithdrawals = completedWithdrawalsResult[0]?.total ?? 0
  const inFlightWithdrawals = inFlightWithdrawalsResult[0]?.total ?? 0

  // Available balance is Net Settled Revenue minus (Completed + In-Flight Withdrawals)
  const availableBalance = Math.max(
    0,
    Math.round((settledNetRevenue - completedWithdrawals - inFlightWithdrawals) * 100) / 100,
  )

  // Pending balance includes unpaid orders + unsettled hold orders + in-flight withdrawals
  const unpaidPendingTotal = unpaidPending[0]?.total ?? 0
  const unsettledNet = Math.max(0, totalNetRevenue - settledNetRevenue)
  const pendingBalance =
    Math.round((unpaidPendingTotal + unsettledNet + inFlightWithdrawals) * 100) / 100

  const platformFeePercent =
    totalGrossRevenue > 0 ? Math.round((totalCommission / totalGrossRevenue) * 10000) / 100 : 0

  return {
    totalRevenue: totalGrossRevenue,
    netRevenue: totalNetRevenue,
    settledRevenue: settledNetRevenue,
    platformFeePercent,
    thisMonthRevenue: thisMonth[0]?.total ?? 0,
    lastMonthRevenue: lastMonth[0]?.total ?? 0,
    pendingBalance,
    availableBalance,
    withdrawnTotal: completedWithdrawals,
    inFlightWithdrawals,
    currency,
    revenueByMonth,
  }
}

export const getSellerEarnings = async (sellerId: string) => {
  const cacheKey = `seller:earnings:${sellerId}`
  const cached = await cacheGet<object>(cacheKey)
  if (cached) return cached

  const earnings = await calculateLiveAvailableBalance(sellerId)
  await cacheSet(cacheKey, earnings, SELLER_EARNINGS_TTL)
  return earnings
}

// ─── Request Withdrawal ───────────────────────────────────────────────────────
export const requestWithdrawal = async (userId: string, input: RequestWithdrawalInput) => {
  const sellerOid = new mongoose.Types.ObjectId(userId)

  // Concurrency Mutex Lock: prevent simultaneous race conditions from the same seller
  const lockKey = `lock:withdrawal:${userId}`
  let lockAcquired: boolean
  try {
    const res = await redis.set(lockKey, 'locked', 'PX', 10000, 'NX')
    lockAcquired = res === 'OK'
  } catch {
    lockAcquired = true // Fallback if redis unavailable
  }

  if (!lockAcquired) {
    throw new AppError(
      'A withdrawal request is currently being processed for your account. Please wait a moment.',
      409,
    )
  }

  try {
    // 1. Amount validation
    const amount = Math.round(input.amount * 100) / 100
    if (isNaN(amount) || !isFinite(amount) || amount <= 0) {
      throw new AppError('Invalid withdrawal amount', 400)
    }
    const MIN_WITHDRAWAL = 1
    if (amount < MIN_WITHDRAWAL) {
      throw new AppError(`Minimum withdrawal amount is ${MIN_WITHDRAWAL}`, 400)
    }

    // 2. Idempotency check
    if (input.idempotencyKey) {
      const existing = await SellerWithdrawal.findOne({
        sellerId: sellerOid,
        idempotencyKey: input.idempotencyKey,
      })
      if (existing) return existing
    }

    // 3. Payout Account Verification
    const payoutAccount = await SellerPayoutAccount.findOne({
      _id: input.payoutAccountId,
      sellerId: sellerOid,
    })
    if (!payoutAccount) {
      throw new AppError('Payout bank account not found or does not belong to you', 404)
    }

    // 4. Live Balance Verification under lock
    const earnings = await calculateLiveAvailableBalance(userId)
    if (amount > earnings.availableBalance) {
      throw new AppError(
        `Insufficient available balance. Available: ${earnings.currency} ${earnings.availableBalance.toFixed(2)}, Requested: ${earnings.currency} ${amount.toFixed(2)}`,
        400,
      )
    }

    // 5. Generate withdrawal record
    const withdrawalNumber = `WD-${Date.now().toString(36).toUpperCase()}-${Math.random().toString(36).substring(2, 7).toUpperCase()}`
    const fee = 0
    const netAmount = amount - fee
    const currency = payoutAccount.currency || earnings.currency || 'NGN'
    const requestedAt = new Date()
    const expectedCompletionDate = calculateExpectedCompletionDate(requestedAt)

    const withdrawal = new SellerWithdrawal({
      withdrawalNumber,
      sellerId: sellerOid,
      amount,
      fee,
      netAmount,
      currency,
      status: 'processing',
      payoutMethod: 'paystack',
      payoutAccount: {
        bankName: payoutAccount.bankName,
        bankCode: payoutAccount.bankCode,
        accountNumber: payoutAccount.accountNumber,
        accountName: payoutAccount.accountName,
        recipientCode: payoutAccount.recipientCode,
      },
      idempotencyKey: input.idempotencyKey,
      requestedAt,
      expectedCompletionDate,
      auditLog: [
        {
          status: 'processing',
          note: `Withdrawal request submitted for ${currency} ${netAmount.toFixed(2)} to ${payoutAccount.bankName} (•••• ${payoutAccount.accountNumber.slice(-4)}). Processing takes up to 7 working days.`,
          actorId: sellerOid,
          timestamp: requestedAt,
        },
      ],
    })

    await withdrawal.save()

    // 6. Record in Ledger
    await SellerLedger.create({
      sellerId: sellerOid,
      type: 'WITHDRAWAL_RESERVE',
      amount: -amount,
      currency,
      balanceAfter: earnings.availableBalance - amount,
      referenceType: 'withdrawal',
      referenceId: withdrawalNumber,
      description: `Funds reserved for withdrawal ${withdrawalNumber} to ${payoutAccount.bankName} (•••• ${payoutAccount.accountNumber.slice(-4)})`,
    })

    // Invalidate earnings cache
    await cacheDel(`seller:earnings:${userId}`)

    // 7. Initiate Real Transfer via Paystack if configured
    let routedToManual = false
    if (process.env.PAYSTACK_SECRET_KEY && payoutAccount.recipientCode) {
      try {
        const transferRes = await paystackService.initiateTransfer({
          amountMinor: Math.round(netAmount * 100),
          recipientCode: payoutAccount.recipientCode,
          reason: `Cartiva Seller Payout - ${withdrawalNumber}`,
          reference: withdrawalNumber,
        })

        withdrawal.providerTransferCode = transferRes.transferCode
        withdrawal.providerReference = transferRes.reference
        if (transferRes.status === 'success') {
          withdrawal.status = 'completed'
          withdrawal.completedAt = new Date()
          withdrawal.auditLog.push({
            status: 'completed',
            note: 'Payout completed successfully. Funds disbursed to bank.',
            timestamp: new Date(),
          })
        }
        await withdrawal.save()
      } catch (err: any) {
        logger.warn('Paystack automated transfer async dispatch queued or failed:', {
          message: err.message,
          withdrawalNumber,
        })
        withdrawal.status = 'pending_approval'
        withdrawal.auditLog.push({
          status: 'pending_approval',
          note: 'Standard Security & Routing: Request queued for payment operations review and direct bank transfer.',
          timestamp: new Date(),
        })
        routedToManual = true
        await withdrawal.save()
      }
    } else {
      withdrawal.status = 'pending_approval'
      withdrawal.auditLog.push({
        status: 'pending_approval',
        note: 'Payment Operations Review: Queued for payment operations review and direct bank transfer.',
        timestamp: new Date(),
      })
      routedToManual = true
      await withdrawal.save()
    }

    // 8. Dispatch notification to seller and admin
    const notifMessage = routedToManual
      ? `Your withdrawal request for ${currency} ${amount.toFixed(2)} has been securely queued for bank fulfillment. Processing takes up to 7 working days.`
      : `Your withdrawal request for ${currency} ${amount.toFixed(2)} has been received and is being processed. Processing takes up to 7 working days.`

    const notif = await createNotification({
      userId,
      type: 'payment',
      title: 'Withdrawal Requested',
      message: notifMessage,
      link: '/seller/payouts',
    }).catch(() => null)
    if (notif) emitToUser(userId, 'notification:new', notif)

    try {
      const adminUsers = await User.find({ role: 'admin' }).select('_id').lean()
      for (const admin of adminUsers) {
        const aNotif = await createNotification({
          userId: admin._id.toString(),
          type: 'payment',
          title: 'New Withdrawal Requires Fulfillment',
          message: `Seller withdrawal of ${currency} ${amount.toFixed(2)} (${withdrawalNumber}) is waiting for manual fulfillment.`,
          link: '/admin/withdrawals',
        }).catch(() => null)
        if (aNotif) emitToUser(admin._id.toString(), 'notification:new', aNotif)
      }
    } catch (e) {
      logger.warn('Failed to dispatch admin notification for withdrawal', { e })
    }

    // 9. Dispatch high-priority email notification to person(s) in charge of payouts
    try {
      const payoutSettings = await getPayoutSettings().catch(() => null)
      if (payoutSettings && payoutSettings.notifyOnWithdrawalRequest !== false) {
        const emails = payoutSettings.notificationEmails || []
        if (emails.length > 0) {
          const sellerProfile = await SellerProfile.findOne({ userId: sellerOid }).lean()
          const sellerUser = await User.findById(sellerOid).lean()

          const sellerStoreName =
            sellerProfile?.storeName ||
            `${sellerUser?.firstName || ''} ${sellerUser?.lastName || ''}`.trim() ||
            'Seller'
          const sellerEmail = sellerUser?.email || 'seller@cartivamall.com'

          for (const recipientEmail of emails) {
            sendAdminNewWithdrawalEmail({
              to: recipientEmail,
              sellerStoreName,
              sellerEmail,
              withdrawalNumber,
              amount: netAmount,
              currency,
              bankName: payoutAccount.bankName,
              accountNumber: payoutAccount.accountNumber,
              accountName: payoutAccount.accountName,
              requestedAt: new Date(),
            }).catch((mailErr) => {
              logger.warn('Failed to deliver withdrawal alert email to admin recipient:', {
                recipientEmail,
                withdrawalNumber,
                error: mailErr.message,
              })
            })
          }
        }
      }
    } catch (mailDispatchErr) {
      logger.warn('Failed to dispatch payout notification email:', { mailDispatchErr })
    }

    return withdrawal
  } finally {
    try {
      await redis.del(lockKey)
    } catch {
      // ignore
    }
  }
}

// ─── List Withdrawals ─────────────────────────────────────────────────────────
export const getSellerWithdrawals = async (
  userId: string,
  query: { page?: number; limit?: number; status?: string } = {},
) => {
  const sellerOid = new mongoose.Types.ObjectId(userId)
  const page = Math.max(1, query.page ?? 1)
  const limit = Math.min(100, Math.max(1, query.limit ?? 20))
  const skip = (page - 1) * limit

  const filter: Record<string, unknown> = { sellerId: sellerOid }
  if (query.status) {
    filter.status = query.status
  }

  const [withdrawals, total] = await Promise.all([
    SellerWithdrawal.find(filter).sort({ createdAt: -1 }).skip(skip).limit(limit).lean(),
    SellerWithdrawal.countDocuments(filter),
  ])

  return {
    withdrawals,
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

// ─── Payout Bank Accounts ─────────────────────────────────────────────────────
export const getSellerPayoutAccounts = async (userId: string) => {
  const sellerOid = new mongoose.Types.ObjectId(userId)
  const accounts = await SellerPayoutAccount.find({ sellerId: sellerOid })
    .sort({ isDefault: -1, createdAt: -1 })
    .lean()
  return accounts.map((acc) => ({
    ...acc,
    accountNumber: acc.accountNumber ? `••••${acc.accountNumber.slice(-4)}` : '',
  }))
}

export const addSellerPayoutAccount = async (userId: string, input: AddPayoutAccountInput) => {
  const sellerOid = new mongoose.Types.ObjectId(userId)

  // 1. Resolve Account Name with Bank via Paystack if configured
  let resolvedAccountName = input.accountName.trim()
  if (process.env.PAYSTACK_SECRET_KEY) {
    try {
      const resolved = await paystackService.resolveAccountNumber(
        input.accountNumber,
        input.bankCode,
      )
      if (resolved.accountName) {
        resolvedAccountName = resolved.accountName
      }
    } catch (err: any) {
      if (err instanceof AppError && err.statusCode === 400) {
        throw new AppError(`Bank verification failed: ${err.message}`, 400)
      }
      logger.warn('Paystack account resolution check non-fatal or failed', {
        err,
        accountNumber: input.accountNumber,
      })
    }
  }

  // 2. Create Paystack Transfer Recipient if configured
  let recipientCode: string | undefined
  if (process.env.PAYSTACK_SECRET_KEY) {
    try {
      const recipient = await paystackService.createTransferRecipient({
        name: resolvedAccountName,
        accountNumber: input.accountNumber,
        bankCode: input.bankCode,
        currency: input.currency || 'NGN',
      })
      recipientCode = recipient.recipientCode
    } catch {
      // Non-blocking for offline/testing modes
    }
  }

  // 3. Create Paystack Subaccount for direct payment splits
  let subaccountCode: string | undefined
  if (process.env.PAYSTACK_SECRET_KEY) {
    try {
      const subacc = await paystackService.createSubaccount({
        businessName: resolvedAccountName,
        settlementBank: input.bankCode,
        accountNumber: input.accountNumber,
        percentageCharge: 0,
      })
      subaccountCode = subacc.subaccountCode
    } catch {
      // Non-blocking for offline/testing modes
    }
  }

  // 4. Check existing count
  const existingCount = await SellerPayoutAccount.countDocuments({ sellerId: sellerOid })
  const isDefault = input.isDefault || existingCount === 0

  if (isDefault) {
    await SellerPayoutAccount.updateMany({ sellerId: sellerOid }, { $set: { isDefault: false } })
  }

  const account = await SellerPayoutAccount.findOneAndUpdate(
    {
      sellerId: sellerOid,
      accountNumber: input.accountNumber.trim(),
      bankCode: input.bankCode.trim(),
    },
    {
      $set: {
        bankName: input.bankName.trim(),
        accountName: resolvedAccountName,
        recipientCode,
        subaccountCode,
        currency: input.currency || 'NGN',
        isDefault,
        isVerified: true,
      },
    },
    { upsert: true, returnDocument: 'after', setDefaultsOnInsert: true },
  )

  return account
}

export const deleteSellerPayoutAccount = async (userId: string, accountId: string) => {
  const sellerOid = new mongoose.Types.ObjectId(userId)
  const deleted = await SellerPayoutAccount.findOneAndDelete({
    _id: accountId,
    sellerId: sellerOid,
  })
  if (!deleted) throw new AppError('Payout account not found', 404)
  return deleted
}

export const getAvailableBanks = async (currency = 'NGN') => {
  return paystackService.listBanks(currency)
}

export const resolveBankAccount = async (accountNumber: string, bankCode: string) => {
  return paystackService.resolveAccountNumber(accountNumber, bankCode)
}

// ─── Financial Ledger ─────────────────────────────────────────────────────────
export const getSellerLedger = async (
  userId: string,
  query: { page?: number; limit?: number } = {},
) => {
  const sellerOid = new mongoose.Types.ObjectId(userId)
  const page = Math.max(1, query.page ?? 1)
  const limit = Math.min(100, Math.max(1, query.limit ?? 20))
  const skip = (page - 1) * limit

  const [entries, total] = await Promise.all([
    SellerLedger.find({ sellerId: sellerOid })
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(limit)
      .lean(),
    SellerLedger.countDocuments({ sellerId: sellerOid }),
  ])

  return {
    entries,
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
