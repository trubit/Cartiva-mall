import { Vendor } from './vendor.model.js'
import { VendorProfile } from './vendorProfile.model.js'
import { VendorStorefront } from './vendorStorefront.model.js'
import { VendorDocument } from './vendorDocument.model.js'
import { VendorVerification } from './vendorVerification.model.js'
import { VendorPayout } from './vendorPayout.model.js'
import { VendorScore } from './vendorScore.model.js'
import { VendorAudit, type AuditAction } from './vendorAudit.model.js'
import { Commission } from './commission.model.js'
import { User } from '../user/user.model.js'
import { AppError } from '../../middlewares/error.middleware.js'
import { notificationService } from '../notification/notification.service.js'
import type { BusinessType, VendorStatus } from './vendor.model.js'
import type { DocumentType } from './vendorDocument.model.js'
import type { VerificationStepName } from './vendorVerification.model.js'
import type { PayoutMethod } from './vendorPayout.model.js'

const audit = (
  vendorId: string,
  action: AuditAction,
  performedBy: string,
  metadata?: Record<string, unknown>,
) => {
  VendorAudit.create({ vendorId, action, performedBy, metadata }).catch(() => {})
}

const notify = (args: Parameters<typeof notificationService.create>[0]) =>
  notificationService.create(args).catch(() => {})

export const vendorsService = {
  // ─── Registration ────────────────────────────────────────────────────────────

  async register(
    userId: string,
    data: { businessName: string; businessType: BusinessType; displayName: string },
  ) {
    const existing = await Vendor.findOne({ userId } as object)
    if (existing) throw new AppError('Vendor profile already exists', 409)

    const vendor = await Vendor.create({
      userId,
      businessName: data.businessName,
      businessType: data.businessType,
    })

    await VendorProfile.create({ vendorId: vendor._id, displayName: data.displayName })
    await VendorVerification.create({ vendorId: vendor._id })

    audit(String(vendor._id), 'registered', userId)

    notify({
      userId,
      type: 'system',
      title: 'Vendor Application Received',
      message: 'Your vendor application is under review. We will notify you of the outcome.',
      link: '/seller/verification',
    })

    return vendor
  },

  // ─── Profile ─────────────────────────────────────────────────────────────────

  async getVendor(vendorId: string) {
    const vendor = await Vendor.findById(vendorId).lean()
    if (!vendor) throw new AppError('Vendor not found', 404)
    const [profile, storefront, verification, latestScore] = await Promise.all([
      VendorProfile.findOne({ vendorId } as object).lean(),
      VendorStorefront.findOne({ vendorId } as object).lean(),
      VendorVerification.findOne({ vendorId } as object).lean(),
      VendorScore.findOne({ vendorId } as object)
        .sort({ period: -1 })
        .lean(),
    ])
    return { vendor, profile, storefront, verification, latestScore }
  },

  async getVendorByUserId(userId: string) {
    const vendor = await Vendor.findOne({ userId } as object).lean()
    if (!vendor) throw new AppError('Vendor profile not found', 404)
    return vendorsService.getVendor(String(vendor._id))
  },

  async updateProfile(
    vendorId: string,
    userId: string,
    data: Partial<{
      businessName: string
      bio: string
      website: string
      phone: string
      address: Record<string, string>
      socialLinks: Record<string, string>
      taxId: string
    }>,
  ) {
    const vendor = await Vendor.findById(vendorId)
    if (!vendor) throw new AppError('Vendor not found', 404)
    if (String(vendor.userId) !== userId) throw new AppError('Forbidden', 403)

    if (data.businessName) vendor.businessName = data.businessName
    await vendor.save()

    const profileUpdate: Record<string, unknown> = {}
    if (data.bio !== undefined) profileUpdate.bio = data.bio
    if (data.website !== undefined) profileUpdate.website = data.website
    if (data.phone !== undefined) profileUpdate.phone = data.phone
    if (data.address !== undefined) profileUpdate.address = data.address
    if (data.socialLinks !== undefined) profileUpdate.socialLinks = data.socialLinks
    if (data.taxId !== undefined) profileUpdate.taxId = data.taxId

    const profile = await VendorProfile.findOneAndUpdate(
      { vendorId } as object,
      { $set: profileUpdate },
      { returnDocument: 'after', upsert: true },
    )

    audit(vendorId, 'profile_updated', userId)
    return { vendor, profile }
  },

  // ─── Verification ────────────────────────────────────────────────────────────

  async submitVerification(vendorId: string, userId: string, step: VerificationStepName) {
    const vendor = await Vendor.findById(vendorId)
    if (!vendor) throw new AppError('Vendor not found', 404)
    if (String(vendor.userId) !== userId) throw new AppError('Forbidden', 403)

    const verif = await VendorVerification.findOne({ vendorId } as object)
    if (!verif) throw new AppError('Verification record not found', 404)

    const stepDoc = verif.steps.find((s) => s.step === step)
    if (!stepDoc) throw new AppError('Invalid verification step', 400)
    stepDoc.status = 'submitted'
    stepDoc.submittedAt = new Date()
    verif.overallStatus = 'in_progress'

    // Update vendor verificationStatus
    vendor.verificationStatus = 'in_progress'
    await Promise.all([verif.save(), vendor.save()])

    audit(vendorId, 'verification_submitted', userId, { step })
    return verif
  },

  // ─── Storefront ──────────────────────────────────────────────────────────────

  async createOrUpdateStorefront(
    vendorId: string,
    userId: string,
    data: {
      name: string
      slug: string
      description?: string
      logo?: string
      banner?: string
      policies?: Record<string, string>
      theme?: Record<string, string>
    },
  ) {
    const vendor = await Vendor.findById(vendorId)
    if (!vendor) throw new AppError('Vendor not found', 404)
    if (String(vendor.userId) !== userId) throw new AppError('Forbidden', 403)

    const slug = data.slug.toLowerCase().replace(/[^a-z0-9-]/g, '-')

    // Ensure slug uniqueness (exclude current vendor's own storefront)
    const existing = await VendorStorefront.findOne({ slug, vendorId: { $ne: vendorId } } as object)
    if (existing) throw new AppError('Storefront slug is already taken', 409)

    const isNew = !(await VendorStorefront.findOne({ vendorId } as object))

    const storefront = await VendorStorefront.findOneAndUpdate(
      { vendorId } as object,
      { $set: { ...data, slug, vendorId } },
      { returnDocument: 'after', upsert: true, setDefaultsOnInsert: true },
    )

    audit(vendorId, isNew ? 'storefront_created' : 'storefront_updated', userId)
    return storefront
  },

  async getStorefrontBySlug(slug: string) {
    const storefront = await VendorStorefront.findOne({ slug, isPublic: true } as object)
      .populate({ path: 'vendorId', select: 'businessName businessType status' })
      .lean()
    if (!storefront) throw new AppError('Storefront not found', 404)
    return storefront
  },

  // ─── Documents ───────────────────────────────────────────────────────────────

  async uploadDocument(
    vendorId: string,
    userId: string,
    data: {
      type: DocumentType
      fileUrl: string
      fileName: string
      fileSize?: number
      mimeType?: string
      expiresAt?: string
    },
  ) {
    const vendor = await Vendor.findById(vendorId)
    if (!vendor) throw new AppError('Vendor not found', 404)
    if (String(vendor.userId) !== userId) throw new AppError('Forbidden', 403)

    const doc = await VendorDocument.create({
      vendorId,
      ...data,
      expiresAt: data.expiresAt ? new Date(data.expiresAt) : undefined,
    })

    audit(vendorId, 'document_uploaded', userId, { type: data.type, documentId: String(doc._id) })
    return doc
  },

  async listDocuments(vendorId: string, userId: string) {
    const vendor = await Vendor.findById(vendorId)
    if (!vendor) throw new AppError('Vendor not found', 404)
    if (String(vendor.userId) !== userId) throw new AppError('Forbidden', 403)

    return VendorDocument.find({ vendorId } as object)
      .sort({ createdAt: -1 })
      .lean()
  },

  // ─── Analytics ───────────────────────────────────────────────────────────────

  async getAnalytics(vendorId: string, userId: string) {
    const vendor = await Vendor.findById(vendorId)
    if (!vendor) throw new AppError('Vendor not found', 404)
    if (String(vendor.userId) !== userId) throw new AppError('Forbidden', 403)

    const sellerId = String(vendor.userId)
    const thirtyDaysAgo = new Date(Date.now() - 30 * 86400000)

    const [totalCommissions, recentCommissions, score, subscription] = await Promise.all([
      Commission.aggregate([
        { $match: { sellerId: vendor.userId } },
        {
          $group: {
            _id: null,
            totalRevenue: { $sum: '$saleAmount' },
            totalEarnings: { $sum: '$sellerEarning' },
            totalOrders: { $sum: 1 },
          },
        },
      ]),
      Commission.find({
        sellerId: vendor.userId,
        createdAt: { $gte: thirtyDaysAgo },
      } as object)
        .sort({ createdAt: -1 })
        .limit(10)
        .lean(),
      VendorScore.findOne({ vendorId } as object)
        .sort({ period: -1 })
        .lean(),
      VendorDocument.countDocuments({ vendorId, status: 'approved' } as object),
    ])

    return {
      summary: totalCommissions[0] ?? { totalRevenue: 0, totalEarnings: 0, totalOrders: 0 },
      recentCommissions,
      score,
      approvedDocuments: subscription,
      sellerId,
    }
  },

  // ─── Performance Score ───────────────────────────────────────────────────────

  async getScore(vendorId: string) {
    const score = await VendorScore.findOne({ vendorId } as object)
      .sort({ period: -1 })
      .lean()
    return score
  },

  // ─── Payouts ─────────────────────────────────────────────────────────────────

  async requestPayout(
    vendorId: string,
    userId: string,
    data: { method: PayoutMethod; periodStart: string; periodEnd: string },
  ) {
    const vendor = await Vendor.findById(vendorId)
    if (!vendor) throw new AppError('Vendor not found', 404)
    if (String(vendor.userId) !== userId) throw new AppError('Forbidden', 403)
    if (vendor.status !== 'active') throw new AppError('Vendor is not active', 400)

    const periodStart = new Date(data.periodStart)
    const periodEnd = new Date(data.periodEnd)

    // Find unpaid commissions in this period
    const commissions = await Commission.find({
      sellerId: vendor.userId,
      status: 'calculated',
      createdAt: { $gte: periodStart, $lte: periodEnd },
    } as object).lean()

    if (commissions.length === 0)
      throw new AppError('No unpaid commissions found for this period', 400)

    const totalAmount = commissions.reduce((sum, c) => sum + c.sellerEarning, 0)

    // Check for pending payout for same period
    const pendingPayout = await VendorPayout.findOne({
      vendorId,
      status: { $in: ['pending', 'processing'] },
    } as object)
    if (pendingPayout) throw new AppError('A payout is already pending', 400)

    const payout = await VendorPayout.create({
      vendorId,
      amount: totalAmount,
      method: data.method,
      periodStart,
      periodEnd,
      commissionsIncluded: commissions.map((c) => c._id),
    })

    // Mark commissions as paid
    await Commission.updateMany({ _id: { $in: commissions.map((c) => c._id) } } as object, {
      $set: { status: 'paid', payoutId: payout._id },
    })

    audit(vendorId, 'payout_requested', userId, {
      amount: totalAmount,
      payoutId: String(payout._id),
    })

    notify({
      userId,
      type: 'system',
      title: 'Payout Requested',
      message: `Your payout of $${totalAmount.toFixed(2)} has been requested and is pending processing.`,
      link: '/seller/payouts',
    })

    return payout
  },

  async listPayouts(vendorId: string, userId: string, page = 1, limit = 20) {
    const vendor = await Vendor.findById(vendorId)
    if (!vendor) throw new AppError('Vendor not found', 404)
    if (String(vendor.userId) !== userId) throw new AppError('Forbidden', 403)

    const skip = (page - 1) * limit
    const [items, total] = await Promise.all([
      VendorPayout.find({ vendorId } as object)
        .sort({ createdAt: -1 })
        .skip(skip)
        .limit(limit)
        .lean(),
      VendorPayout.countDocuments({ vendorId } as object),
    ])

    return { items, total, page, pages: Math.ceil(total / limit) }
  },

  // ─── Audit Log ───────────────────────────────────────────────────────────────

  async getAuditLog(vendorId: string, page = 1, limit = 30) {
    const skip = (page - 1) * limit
    const [items, total] = await Promise.all([
      VendorAudit.find({ vendorId } as object)
        .sort({ createdAt: -1 })
        .skip(skip)
        .limit(limit)
        .populate('performedBy', 'firstName lastName role')
        .lean(),
      VendorAudit.countDocuments({ vendorId } as object),
    ])
    return { items, total, page, pages: Math.ceil(total / limit) }
  },

  // ─── Admin operations ────────────────────────────────────────────────────────

  async listAllVendors(
    page = 1,
    limit = 20,
    filters: { status?: VendorStatus; verificationStatus?: string } = {},
  ) {
    const skip = (page - 1) * limit
    const query: Record<string, unknown> = {}
    if (filters.status) query.status = filters.status
    if (filters.verificationStatus) query.verificationStatus = filters.verificationStatus

    const [items, total] = await Promise.all([
      Vendor.find(query as object)
        .sort({ createdAt: -1 })
        .skip(skip)
        .limit(limit)
        .populate('userId', 'firstName lastName email')
        .lean(),
      Vendor.countDocuments(query as object),
    ])

    return { items, total, page, pages: Math.ceil(total / limit) }
  },

  async getPendingApprovals(page = 1, limit = 20) {
    const skip = (page - 1) * limit
    const query = { status: 'pending' } as object
    const [items, total] = await Promise.all([
      Vendor.find(query)
        .sort({ createdAt: 1 })
        .skip(skip)
        .limit(limit)
        .populate('userId', 'firstName lastName email createdAt')
        .lean(),
      Vendor.countDocuments(query),
    ])
    return { items, total, page, pages: Math.ceil(total / limit) }
  },

  async approveVendor(vendorId: string, adminId: string) {
    const vendor = await Vendor.findByIdAndUpdate(
      vendorId,
      {
        $set: {
          status: 'active',
          isApproved: true,
          approvedAt: new Date(),
          approvedBy: adminId,
          rejectionReason: undefined,
        },
      },
      { returnDocument: 'after' },
    ).populate('userId', 'firstName lastName email')

    if (!vendor) throw new AppError('Vendor not found', 404)

    // Set user role to seller if not already
    await User.findByIdAndUpdate(vendor.userId, { $set: { role: 'seller', isActive: true } })

    audit(vendorId, 'approved', adminId)

    notify({
      userId: String(vendor.userId),
      type: 'system',
      title: 'Vendor Application Approved',
      message:
        'Your vendor application has been approved! You can now start selling on TrusonShopp.',
      link: '/seller',
    })

    return vendor
  },

  async rejectVendor(vendorId: string, adminId: string, reason: string) {
    const vendor = await Vendor.findByIdAndUpdate(
      vendorId,
      { $set: { status: 'rejected', isApproved: false, rejectionReason: reason } },
      { returnDocument: 'after' },
    )
    if (!vendor) throw new AppError('Vendor not found', 404)

    audit(vendorId, 'rejected', adminId, { reason })

    notify({
      userId: String(vendor.userId),
      type: 'security',
      title: 'Vendor Application Rejected',
      message: `Your vendor application was not approved. Reason: ${reason}`,
      link: '/seller/verification',
    })

    return vendor
  },

  async suspendVendorFull(vendorId: string, adminId: string, reason: string) {
    const vendor = await Vendor.findByIdAndUpdate(
      vendorId,
      { $set: { status: 'suspended', suspensionReason: reason } },
      { returnDocument: 'after' },
    )
    if (!vendor) throw new AppError('Vendor not found', 404)

    await User.findByIdAndUpdate(vendor.userId, { $set: { isActive: false } })
    audit(vendorId, 'suspended', adminId, { reason })

    notify({
      userId: String(vendor.userId),
      type: 'security',
      title: 'Vendor Account Suspended',
      message: `Your vendor account has been suspended. Reason: ${reason}. Contact support to appeal.`,
    })

    return vendor
  },

  async reactivateVendor(vendorId: string, adminId: string) {
    const vendor = await Vendor.findByIdAndUpdate(
      vendorId,
      { $set: { status: 'active', suspensionReason: undefined } },
      { returnDocument: 'after' },
    )
    if (!vendor) throw new AppError('Vendor not found', 404)

    await User.findByIdAndUpdate(vendor.userId, { $set: { isActive: true } })
    audit(vendorId, 'reactivated', adminId)

    notify({
      userId: String(vendor.userId),
      type: 'system',
      title: 'Vendor Account Reactivated',
      message: 'Your vendor account has been reactivated. You can resume selling.',
      link: '/seller',
    })

    return vendor
  },

  async blacklistVendor(vendorId: string, adminId: string, reason: string) {
    const vendor = await Vendor.findByIdAndUpdate(
      vendorId,
      { $set: { status: 'blacklisted', blacklistReason: reason, isApproved: false } },
      { returnDocument: 'after' },
    )
    if (!vendor) throw new AppError('Vendor not found', 404)

    await User.findByIdAndUpdate(vendor.userId, { $set: { isActive: false } })
    audit(vendorId, 'blacklisted', adminId, { reason })

    notify({
      userId: String(vendor.userId),
      type: 'security',
      title: 'Vendor Account Blacklisted',
      message: 'Your vendor account has been permanently suspended.',
    })

    return vendor
  },

  async adminReviewDocument(
    documentId: string,
    adminId: string,
    status: 'approved' | 'rejected',
    rejectionReason?: string,
  ) {
    const doc = await VendorDocument.findByIdAndUpdate(
      documentId,
      {
        $set: {
          status,
          reviewedAt: new Date(),
          reviewedBy: adminId,
          rejectionReason: rejectionReason ?? undefined,
        },
      },
      { returnDocument: 'after' },
    )
    if (!doc) throw new AppError('Document not found', 404)

    audit(
      String(doc.vendorId),
      status === 'approved' ? 'document_approved' : 'document_rejected',
      adminId,
      { documentId },
    )

    notify({
      userId: adminId,
      type: 'system',
      title: `Document ${status}`,
      message: `A vendor document has been ${status}.`,
    })

    return doc
  },

  async processPayout(payoutId: string, adminId: string, transactionId: string) {
    const payout = await VendorPayout.findByIdAndUpdate(
      payoutId,
      {
        $set: {
          status: 'completed',
          transactionId,
          processedAt: new Date(),
          processedBy: adminId,
        },
      },
      { returnDocument: 'after' },
    )
    if (!payout) throw new AppError('Payout not found', 404)

    audit(String(payout.vendorId), 'payout_completed', adminId, { payoutId, transactionId })

    notify({
      userId: adminId,
      type: 'system',
      title: 'Payout Processed',
      message: `Payout of $${payout.amount.toFixed(2)} has been completed.`,
    })

    return payout
  },
}
