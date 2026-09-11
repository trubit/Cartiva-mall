import mongoose from 'mongoose'
import { SellerProfile, type KycStatus } from './seller.model.js'
import { User } from '../user/user.model.js'
import { AppError } from '../../middlewares/error.middleware.js'
import { notificationService } from '../notification/notification.service.js'
import * as paystackService from '../payment/paystack.service.js'
import { emitToUser } from '../../sockets/index.js'
import { cacheDel } from '../../utils/cache.js'
import { logger } from '../../utils/logger.js'
import {
  uploadImagePath,
  uploadDocumentPath,
  deleteImage,
  isCloudinaryConfigured,
} from '../../config/cloudinary.js'
import type {
  SubmitKycInput,
  CreateStoreInput,
  AdminReviewKycInput,
} from '../../../../src/shared/validators/seller.validators.js'

export const sellerKycService = {
  /**
   * Fetch current seller's KYC and Store status
   */
  async getMyKycStatus(userId: string) {
    let profile = await SellerProfile.findOne({ userId })
    if (!profile) {
      const user = await User.findById(userId)
      if (!user) throw new AppError('User not found', 404)
      profile = await SellerProfile.create({
        userId,
        storeName: `${user.firstName || 'Seller'}'s Store`,
        accountStatus: 'ACTIVE',
        kycStatus: 'NOT_STARTED',
        storeCreated: false,
      })
    }

    const isVerified = Boolean(profile.isVerified || profile.kycStatus === 'VERIFIED')
    const kycStatus: KycStatus = isVerified ? 'VERIFIED' : profile.kycStatus || 'NOT_STARTED'

    if (profile.isVerified && profile.kycStatus !== 'VERIFIED') {
      profile.kycStatus = 'VERIFIED'
      await profile.save().catch(() => {})
    }

    return {
      kycStatus,
      isVerified,
      storeCreated: profile.storeCreated || false,
      storeName: profile.storeName,
      storeSlug: profile.storeSlug,
      storeDescription: profile.storeDescription,
      storeCategory: profile.storeCategory,
      storeLogo: profile.storeLogo,
      accountStatus: profile.accountStatus,
      kycData: profile.kycData
        ? {
            businessType: profile.kycData.businessType,
            legalName: profile.kycData.legalName,
            idType: profile.kycData.idType,
            idNumber: profile.kycData.idNumber
              ? `••••${profile.kycData.idNumber.slice(-4)}`
              : undefined,
            idDocumentUrl: profile.kycData.idDocumentUrl,
            proofOfAddressUrl: profile.kycData.proofOfAddressUrl,
            bankDetails: profile.kycData.bankDetails
              ? {
                  bankCode: profile.kycData.bankDetails.bankCode,
                  bankName: profile.kycData.bankDetails.bankName,
                  accountNumber: profile.kycData.bankDetails.accountNumber
                    ? `••••${profile.kycData.bankDetails.accountNumber.slice(-4)}`
                    : undefined,
                  accountName: profile.kycData.bankDetails.accountName,
                  isResolved: profile.kycData.bankDetails.isResolved,
                }
              : undefined,
            submittedAt: profile.kycData.submittedAt,
            reviewedAt: profile.kycData.reviewedAt,
            rejectionReason: profile.kycData.rejectionReason,
            actionRequiredReason: profile.kycData.actionRequiredReason,
          }
        : undefined,
    }
  },

  /**
   * Submit KYC details with real Paystack account validation
   */
  async submitKyc(userId: string, input: SubmitKycInput) {
    let profile = await SellerProfile.findOne({ userId })
    if (!profile) {
      profile = await SellerProfile.create({
        userId,
        storeName: input.legalName,
        accountStatus: 'ACTIVE',
        kycStatus: 'NOT_STARTED',
        storeCreated: false,
      })
    }

    if (profile.kycStatus === 'VERIFIED') {
      throw new AppError('Seller KYC is already verified', 400)
    }

    // 1. Perform Real Bank Account Verification with Paystack if bank details provided
    let isResolved = false
    try {
      const resolved = await paystackService.resolveAccount(
        input.bankDetails.accountNumber,
        input.bankDetails.bankCode,
      )
      if (resolved && resolved.accountName) {
        isResolved = true
        // Optionally update account name if Paystack resolved it authoritative
        input.bankDetails.accountName = resolved.accountName
      }
    } catch (err) {
      logger.warn('Paystack bank resolution check non-fatal or failed', {
        err,
        accountNumber: input.bankDetails.accountNumber,
      })
      // If resolution fails due to bad account number, throw user-friendly error
      if (err instanceof AppError && err.statusCode === 400) {
        throw new AppError(`Bank verification failed: ${err.message}`, 400)
      }
    }

    // 2. Persist KYC submission
    profile.kycStatus = 'UNDER_REVIEW'
    profile.kycData = {
      businessType: input.businessType,
      legalName: input.legalName,
      idType: input.idType,
      idNumber: input.idNumber,
      idDocumentUrl: input.idDocumentUrl,
      proofOfAddressUrl: input.proofOfAddressUrl,
      bankDetails: {
        bankCode: input.bankDetails.bankCode,
        bankName: input.bankDetails.bankName,
        accountNumber: input.bankDetails.accountNumber,
        accountName: input.bankDetails.accountName,
        isResolved,
      },
      submittedAt: new Date(),
      rejectionReason: undefined,
      actionRequiredReason: undefined,
    }

    if (input.storeAddress) {
      profile.storeAddress = {
        ...profile.storeAddress,
        ...input.storeAddress,
      }
    }

    await profile.save()

    // 3. Notify seller of submission
    await notificationService
      .create({
        userId,
        type: 'system',
        title: 'KYC Submitted Successfully',
        message:
          'Your seller verification documents have been received and are currently under review.',
        link: '/seller/onboarding',
        data: { kycStatus: 'UNDER_REVIEW' },
      })
      .catch(() => {})

    emitToUser(userId, 'seller:kyc:updated', { kycStatus: 'UNDER_REVIEW' })

    logger.info('Seller KYC submitted', { userId, legalName: input.legalName, isResolved })
    return profile
  },

  /**
   * Create Store (Allowed only after KYC verification)
   */
  async createStore(userId: string, input: CreateStoreInput) {
    let profile = await SellerProfile.findOne({ userId })
    if (!profile) {
      profile = new SellerProfile({
        userId,
        storeName: input.storeName.trim(),
        kycStatus: 'UNSUBMITTED',
        isVerified: false,
      })
    }

    const isKycVerified = Boolean(profile.isVerified || profile.kycStatus === 'VERIFIED')

    // Generate unique slug
    let baseSlug = input.storeName
      .toLowerCase()
      .trim()
      .replace(/[^a-z0-9]+/g, '-')
      .replace(/^-+|-+$/g, '')

    if (!baseSlug) baseSlug = `store-${Date.now()}`

    let slug = baseSlug
    let counter = 1
    while (
      await SellerProfile.findOne({
        storeSlug: slug,
        userId: { $ne: new mongoose.Types.ObjectId(userId) },
      })
    ) {
      slug = `${baseSlug}-${counter++}`
    }

    profile.storeName = input.storeName.trim()
    profile.storeSlug = slug
    profile.storeDescription = input.storeDescription?.trim() || ''
    profile.storeCategory = input.storeCategory?.trim() || 'General'
    if (input.storeLogo) profile.storeLogo = input.storeLogo
    if (input.whatsappNumber) profile.whatsappNumber = input.whatsappNumber
    if (input.storeAddress) {
      profile.storeAddress = { ...profile.storeAddress, ...input.storeAddress }
    }
    profile.storeCreated = true

    await profile.save()

    if (isKycVerified) {
      // Ensure User role is seller when KYC is verified
      await User.findByIdAndUpdate(userId, { role: 'seller' })
    }

    await notificationService
      .create({
        userId,
        type: 'system',
        title: 'Store Created Successfully',
        message: isKycVerified
          ? `Your store "${profile.storeName}" is now active and ready for product listings!`
          : `Your store details for "${profile.storeName}" were saved and will be activated upon KYC verification.`,
        link: '/seller/dashboard',
        data: { storeSlug: profile.storeSlug },
      })
      .catch(() => {})

    emitToUser(userId, 'seller:store:created', {
      storeName: profile.storeName,
      storeSlug: profile.storeSlug,
    })

    logger.info('Seller store created', { userId, storeName: profile.storeName, storeSlug: slug })
    return profile
  },

  /**
   * Upload Store Logo Image
   */
  async uploadStoreLogo(userId: string, file: Express.Multer.File) {
    if (!isCloudinaryConfigured()) {
      throw new AppError(
        'Image upload requires Cloudinary configuration. Set CLOUDINARY_CLOUD_NAME, CLOUDINARY_API_KEY, and CLOUDINARY_API_SECRET in .env',
        503,
      )
    }

    let profile = await SellerProfile.findOne({ userId }).select('+storeLogoPublicId')
    if (!profile) {
      const user = await User.findById(userId)
      if (!user) throw new AppError('User not found', 404)
      profile = await SellerProfile.create({
        userId,
        storeName: `${user.firstName || 'Seller'}'s Store`,
        accountStatus: 'ACTIVE',
        kycStatus: 'NOT_STARTED',
        storeCreated: false,
      })
    }

    const { url, publicId } = await uploadImagePath(file.path, 'cartiva/stores')

    if (profile.storeLogoPublicId) {
      await deleteImage(profile.storeLogoPublicId).catch(() => null)
    }

    profile.storeLogo = url
    profile.storeLogoPublicId = publicId
    await profile.save()

    return { url, storeLogo: url }
  },

  /**
   * Upload KYC Document / Proof of Address (PDF or Image)
   */
  async uploadKycDocument(_userId: string, file: Express.Multer.File) {
    if (!isCloudinaryConfigured()) {
      throw new AppError(
        'Document upload requires Cloudinary configuration. Set CLOUDINARY_CLOUD_NAME, CLOUDINARY_API_KEY, and CLOUDINARY_API_SECRET in .env',
        503,
      )
    }

    const { url, publicId } = await uploadDocumentPath(file.path, 'cartiva/kyc')

    return {
      url,
      publicId,
      fileName: file.originalname,
      fileSize: file.size,
      mimeType: file.mimetype,
    }
  },

  /**
   * Admin: List pending or filtered KYC submissions
   */
  async listPendingKyc(
    options: { page?: number; limit?: number; status?: string; search?: string } | number = 1,
    maybeLimit = 20,
  ) {
    const page = typeof options === 'object' ? Math.max(1, options.page ?? 1) : Math.max(1, options)
    const limit =
      typeof options === 'object'
        ? Math.min(100, Math.max(1, options.limit ?? 20))
        : Math.min(100, Math.max(1, maybeLimit))
    const statusFilter = typeof options === 'object' ? options.status : undefined
    const search = typeof options === 'object' ? options.search : undefined

    const skip = (page - 1) * limit
    const filter: Record<string, any> = {}

    if (statusFilter && statusFilter !== 'ALL') {
      const statuses = statusFilter.split(',').map((s) => s.trim()) as KycStatus[]
      filter['kycStatus'] = { $in: statuses }
    } else if (!statusFilter) {
      filter['kycStatus'] = { $in: ['PENDING', 'UNDER_REVIEW'] as KycStatus[] }
    }

    if (search && search.trim()) {
      filter['$or'] = [
        { storeName: { $regex: search.trim(), $options: 'i' } },
        { 'kycData.legalName': { $regex: search.trim(), $options: 'i' } },
        { 'kycData.idNumber': { $regex: search.trim(), $options: 'i' } },
        { 'kycData.bankDetails.accountNumber': { $regex: search.trim(), $options: 'i' } },
      ]
    }

    const [profiles, total] = await Promise.all([
      SellerProfile.find(filter)
        .populate('userId', 'firstName lastName email phoneNumber profileImage createdAt')
        .sort({ 'kycData.submittedAt': -1, createdAt: -1 })
        .skip(skip)
        .limit(limit)
        .lean(),
      SellerProfile.countDocuments(filter),
    ])

    const totalPages = Math.ceil(total / limit)

    return {
      profiles,
      pagination: {
        page,
        limit,
        total,
        totalPages,
        hasNext: page < totalPages,
        hasPrev: page > 1,
      },
    }
  },

  /**
   * Admin: Review and Approve/Reject/Request Action on Seller KYC
   */
  async reviewKyc(adminId: string, sellerProfileIdOrUserId: string, input: AdminReviewKycInput) {
    let profile = await SellerProfile.findById(sellerProfileIdOrUserId)
    if (!profile) {
      profile = await SellerProfile.findOne({ userId: sellerProfileIdOrUserId })
    }
    if (!profile) throw new AppError('Seller profile not found', 404)

    let newStatus: KycStatus = 'UNDER_REVIEW'
    let notificationTitle = 'Seller KYC Update'
    let notificationMsg = ''

    if (input.action === 'APPROVE') {
      newStatus = 'VERIFIED'
      profile.isVerified = true
      notificationTitle = 'Seller KYC Approved!'
      notificationMsg =
        'Congratulations! Your seller KYC has been verified. You may now create your store.'
    } else if (input.action === 'REJECT') {
      newStatus = 'REJECTED'
      profile.isVerified = false
      notificationTitle = 'Seller KYC Rejected'
      notificationMsg = `Your seller verification was rejected: ${input.rejectionReason || 'Please contact support.'}`
    } else if (input.action === 'REQUEST_ACTION') {
      newStatus = 'REQUIRES_ACTION'
      notificationTitle = 'Seller KYC Action Required'
      notificationMsg = `Additional information is required for your verification: ${input.actionRequiredReason || 'Please check requirements.'}`
    }

    profile.kycStatus = newStatus
    if (!profile.kycData) profile.kycData = {}
    profile.kycData.reviewedAt = new Date()
    profile.kycData.reviewedBy = new mongoose.Types.ObjectId(adminId)
    if (input.rejectionReason) profile.kycData.rejectionReason = input.rejectionReason
    if (input.actionRequiredReason)
      profile.kycData.actionRequiredReason = input.actionRequiredReason

    await profile.save()

    const sellerUserId = profile.userId.toString()

    if (input.action === 'APPROVE') {
      await User.findByIdAndUpdate(sellerUserId, { role: 'seller' }).catch(() => {})
      await cacheDel(`seller:dashboard:${sellerUserId}`).catch(() => {})
    }

    await notificationService
      .create({
        userId: sellerUserId,
        type: 'system',
        title: notificationTitle,
        message: notificationMsg,
        link: input.action === 'APPROVE' ? '/seller/store/setup' : '/seller/kyc',
        data: { kycStatus: newStatus },
      })
      .catch(() => {})

    emitToUser(sellerUserId, 'seller:kyc:updated', {
      kycStatus: newStatus,
      isVerified: profile.isVerified,
      role: input.action === 'APPROVE' ? 'seller' : undefined,
    })

    logger.info('Seller KYC reviewed by admin', {
      adminId,
      sellerUserId,
      action: input.action,
      newStatus,
    })

    return profile
  },
}
