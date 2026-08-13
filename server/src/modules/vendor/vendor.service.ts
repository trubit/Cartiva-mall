import {
  VendorSubscription,
  getPlanDefaults,
  type SubscriptionPlan,
} from './vendorSubscription.model.js'
import { Commission } from './commission.model.js'
import { User } from '../user/user.model.js'
import { AppError } from '../../middlewares/error.middleware.js'
import { notificationService } from '../notification/notification.service.js'

export const vendorService = {
  // ─── Subscriptions ──────────────────────────────────────────────────────────

  async getSubscription(sellerId: string) {
    const sub = await VendorSubscription.findOne({
      sellerId,
      status: 'active',
    } as object).sort({ endDate: -1 })
    return sub
  },

  async subscribePlan(sellerId: string, plan: SubscriptionPlan) {
    // Deactivate any existing active subscription
    await VendorSubscription.updateMany({ sellerId, status: 'active' } as object, {
      $set: { status: 'cancelled' },
    })

    const defaults = getPlanDefaults(plan)
    const startDate = new Date()
    const endDate = new Date(startDate)
    endDate.setMonth(endDate.getMonth() + 1)

    const sub = await VendorSubscription.create({
      sellerId,
      plan,
      startDate,
      endDate,
      ...defaults,
    })

    void notificationService.create({
      userId: sellerId,
      type: 'system',
      title: 'Subscription Activated',
      message: `Your ${plan} plan is now active until ${endDate.toLocaleDateString()}.`,
      link: '/seller/subscription',
    })

    return sub
  },

  async cancelSubscription(sellerId: string) {
    const sub = await VendorSubscription.findOneAndUpdate(
      { sellerId, status: 'active' } as object,
      { $set: { status: 'cancelled' } },
      { returnDocument: 'after' },
    )
    if (!sub) throw new AppError('No active subscription found', 404)
    return sub
  },

  // ─── Commissions ────────────────────────────────────────────────────────────

  async calculateCommission(orderId: string, sellerId: string, saleAmount: number) {
    const sub = await this.getSubscription(sellerId)
    const rate = sub?.commissionRate ?? 15 // default 15% if no subscription

    const commissionAmount = Math.round(((saleAmount * rate) / 100) * 100) / 100
    const sellerEarning = Math.round((saleAmount - commissionAmount) * 100) / 100

    const now = new Date()
    const periodStart = new Date(now.getFullYear(), now.getMonth(), 1)
    const periodEnd = new Date(now.getFullYear(), now.getMonth() + 1, 0)

    return Commission.create({
      orderId,
      sellerId,
      saleAmount,
      commissionRate: rate,
      commissionAmount,
      platformAmount: commissionAmount,
      sellerEarning,
      status: 'calculated',
      periodStart,
      periodEnd,
    })
  },

  async getCommissions(sellerId: string, role: string, page = 1, limit = 20) {
    const skip = (page - 1) * limit
    const filter = role === 'admin' ? ({} as object) : ({ sellerId } as object)
    const [items, total, aggregate] = await Promise.all([
      Commission.find(filter)
        .sort({ createdAt: -1 })
        .skip(skip)
        .limit(limit)
        .populate('orderId', 'orderNumber')
        .lean(),
      Commission.countDocuments(filter),
      Commission.aggregate([
        { $match: role === 'admin' ? {} : { sellerId } },
        {
          $group: {
            _id: null,
            totalSales: { $sum: '$saleAmount' },
            totalCommission: { $sum: '$commissionAmount' },
            totalEarnings: { $sum: '$sellerEarning' },
          },
        },
      ]),
    ])
    const summary = aggregate[0] ?? { totalSales: 0, totalCommission: 0, totalEarnings: 0 }
    return { items, total, page, pages: Math.ceil(total / limit), summary }
  },

  // ─── Admin vendor management ─────────────────────────────────────────────────

  async listVendors(page = 1, limit = 20, status?: string) {
    const skip = (page - 1) * limit
    const [items, total] = await Promise.all([
      User.find({ role: 'seller', ...(status ? { isActive: status === 'active' } : {}) } as object)
        .select('-password -resetToken -resetTokenExpiry')
        .sort({ createdAt: -1 })
        .skip(skip)
        .limit(limit)
        .lean(),
      User.countDocuments({ role: 'seller' } as object),
    ])
    // Enrich with subscription info
    const sellerIds = items.map((u) => u._id)
    const subs = await VendorSubscription.find({
      sellerId: { $in: sellerIds },
      status: 'active',
    } as object).lean()
    const subMap = new Map(subs.map((s) => [String(s.sellerId), s]))
    const enriched = items.map((u) => ({
      ...u,
      subscription: subMap.get(String(u._id)) ?? null,
    }))
    return { items: enriched, total, page, pages: Math.ceil(total / limit) }
  },

  async suspendVendor(sellerId: string, _adminId: string) {
    const user = await User.findByIdAndUpdate(
      sellerId,
      { $set: { isActive: false } },
      { returnDocument: 'after' },
    )
    if (!user) throw new AppError('Vendor not found', 404)
    await VendorSubscription.updateMany({ sellerId, status: 'active' } as object, {
      $set: { status: 'suspended' },
    })
    void notificationService.create({
      userId: sellerId,
      type: 'security',
      title: 'Account Suspended',
      message: 'Your vendor account has been suspended. Please contact support.',
    })
    return { success: true }
  },

  async reinstateVendor(sellerId: string) {
    const user = await User.findByIdAndUpdate(
      sellerId,
      { $set: { isActive: true } },
      { returnDocument: 'after' },
    )
    if (!user) throw new AppError('Vendor not found', 404)
    void notificationService.create({
      userId: sellerId,
      type: 'system',
      title: 'Account Reinstated',
      message: 'Your vendor account has been reinstated. You can now sell on the platform.',
    })
    return { success: true }
  },

  async getVendorStats(sellerId: string) {
    const [sub, commissions] = await Promise.all([
      VendorSubscription.findOne({ sellerId, status: 'active' } as object),
      Commission.aggregate([
        { $match: { sellerId } },
        {
          $group: {
            _id: null,
            totalSales: { $sum: '$saleAmount' },
            totalEarnings: { $sum: '$sellerEarning' },
            totalOrders: { $sum: 1 },
          },
        },
      ]),
    ])
    const stats = commissions[0] ?? { totalSales: 0, totalEarnings: 0, totalOrders: 0 }
    return { subscription: sub, ...stats }
  },
}
