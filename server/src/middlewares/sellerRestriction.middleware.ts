import mongoose from 'mongoose'
import type { Request, Response, NextFunction } from 'express'
import { SellerProfile } from '../modules/seller/seller.model.js'
import { User } from '../modules/user/user.model.js'
import { AppError } from './error.middleware.js'

/**
 * Middleware that verifies the seller account is ACTIVE.
 * Rejects API requests from RESTRICTED, BLOCKED, or SUSPENDED sellers with 403 Forbidden.
 */
export const checkSellerRestriction = async (req: Request, _res: Response, next: NextFunction) => {
  if (!req.user) return next(new AppError('Authentication required', 401))

  // Allow admins and super-admins through
  if (['admin', 'super-admin'].includes(req.user.role)) return next()

  const userId = req.user.userId
  if (!userId || !mongoose.isValidObjectId(userId)) return next()

  const [user, profile] = await Promise.all([
    User.findById(userId).select('accountStatus restrictionReason').lean(),
    SellerProfile.findOne({ userId })
      .select('accountStatus restrictionReason kycStatus isVerified storeCreated storeSlug')
      .lean(),
  ])

  const accountStatus = profile?.accountStatus || user?.accountStatus || 'ACTIVE'
  const reason =
    profile?.restrictionReason || user?.restrictionReason || 'Account is currently restricted'

  if (accountStatus !== 'ACTIVE') {
    return next(
      new AppError(
        `Seller Account Restricted: ${reason}. Please visit /seller/fees to resolve outstanding fees and restore full account access.`,
        403,
      ),
    )
  }

  // Mandatory KYC Selling Gate: Seller must be VERIFIED
  const kycStatus = profile?.kycStatus || 'NOT_STARTED'
  if (kycStatus !== 'VERIFIED') {
    return next(
      new AppError(
        `Seller KYC Required: Your account has not completed KYC verification (Current status: ${kycStatus}). Please complete verification at /seller/onboarding before listing or managing products.`,
        403,
      ),
    )
  }

  // Mandatory Store Creation Gate: Seller must have completed store creation
  if (!profile?.storeCreated && !profile?.storeSlug) {
    return next(
      new AppError(
        'Store Required: You must complete your seller store setup before listing or publishing products. Please visit /seller/onboarding.',
        403,
      ),
    )
  }

  next()
}
