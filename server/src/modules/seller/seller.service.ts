import mongoose from 'mongoose'
import { SellerProfile } from './seller.model.js'
import { Product } from '../product/product.model.js'
import { Order } from '../order/order.model.js'
import { SellerPayoutAccount, SellerWithdrawal, SellerLedger } from './sellerPayout.model.js'
import * as paystackService from '../payment/paystack.service.js'
import { createNotification } from '../notification/notification.model.js'
import { emitToUser } from '../../sockets/index.js'
import { AppError } from '../../middlewares/error.middleware.js'
import { cacheGet, cacheSet, cacheDel } from '../../utils/cache.js'
import { logger } from '../../utils/logger.js'
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

const PLATFORM_FEE = 0.05 // 5 % platform fee

// Returns a MongoDB aggregation expression that sums lineTotal for only the seller's own items
// within a matched order document. Prevents revenue inflation from shared multi-seller carts.
const sellerItemRevenue = (ids: mongoose.Types.ObjectId[]) => ({
  $reduce: {
    input: { $filter: { input: '$items', as: 'i', cond: { $in: ['$$i.productId', ids] } } },
    initialValue: 0,
    in: { $add: ['$$value', '$$this.lineTotal'] },
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

  const revenueExpr = sellerItemRevenue(productIds)

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

  const revenueExpr = sellerItemRevenue(productIds)

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
    // In-flight pending/processing withdrawals sum
    SellerWithdrawal.aggregate([
      { $match: { sellerId: sellerOid, status: { $in: ['pending', 'processing'] } } },
      { $group: { _id: null, total: { $sum: '$amount' } } },
    ]),
  ])

  const totalGrossRevenue = totalResult[0]?.total ?? 0
  const settledGrossRevenue = settledResult[0]?.total ?? totalGrossRevenue
  const totalNetRevenue = Math.round(totalGrossRevenue * (1 - PLATFORM_FEE) * 100) / 100
  const settledNetRevenue = Math.round(settledGrossRevenue * (1 - PLATFORM_FEE) * 100) / 100

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

  const currency = process.env.PAYSTACK_CURRENCY || 'NGN'

  return {
    totalRevenue: totalGrossRevenue,
    netRevenue: totalNetRevenue,
    settledRevenue: settledNetRevenue,
    platformFeePercent: PLATFORM_FEE * 100,
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

  // 4. Live Balance Verification
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
    requestedAt: new Date(),
    auditLog: [
      {
        status: 'processing',
        note: `Withdrawal request submitted for ${currency} ${netAmount.toFixed(2)} to ${payoutAccount.bankName} (${payoutAccount.accountNumber})`,
        actorId: sellerOid,
        timestamp: new Date(),
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
    description: `Funds reserved for withdrawal ${withdrawalNumber} to ${payoutAccount.bankName} (${payoutAccount.accountNumber})`,
  })

  // Invalidate earnings cache
  await cacheDel(`seller:earnings:${userId}`)

  // 7. Initiate Real Transfer via Paystack if configured
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
          note: 'Paystack transfer completed synchronously',
          timestamp: new Date(),
        })
      }
      await withdrawal.save()
    } catch (err: any) {
      logger.warn('Paystack automated transfer async dispatch queued or failed:', {
        message: err.message,
        withdrawalNumber,
      })
      withdrawal.auditLog.push({
        status: 'processing',
        note: `Transfer queued. Provider response: ${err.message || 'Queued for processing'}`,
        timestamp: new Date(),
      })
      await withdrawal.save()
    }
  }

  // 8. Dispatch notification
  const notif = await createNotification({
    userId,
    type: 'payment',
    title: 'Withdrawal Requested',
    message: `Your withdrawal request for ${currency} ${amount.toFixed(2)} has been received and is being processed.`,
    link: '/seller/payouts',
  }).catch(() => null)
  if (notif) emitToUser(userId, 'notification:new', notif)

  return withdrawal
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
  return SellerPayoutAccount.find({ sellerId: sellerOid })
    .sort({ isDefault: -1, createdAt: -1 })
    .lean()
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
    } catch {
      // If bank resolution fails or mock test mode, preserve supplied name
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

  // 3. Check existing count
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
        currency: input.currency || 'NGN',
        isDefault,
        isVerified: true,
      },
    },
    { upsert: true, new: true, setDefaultsOnInsert: true },
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
