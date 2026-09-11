import type { Request, Response, NextFunction } from 'express'
import * as sellerService from './seller.service.js'
import * as productService from '../product/product.service.js'
import * as orderService from '../order/order.service.js'
import { sendSuccess, sendCreated } from '../../utils/response.js'
import { ROLES } from '../../../../src/shared/constants/index.js'
import type {
  OnboardSellerInput,
  UpdateSellerProfileInput,
  SellerAnalyticsQueryInput,
} from '../../../../src/shared/validators/seller.validators.js'

// ─── Profile ──────────────────────────────────────────────────────────────────
export const onboard = async (
  req: Request<object, object, OnboardSellerInput>,
  res: Response,
  next: NextFunction,
): Promise<void> => {
  try {
    const profile = await sellerService.onboardSeller(req.user!.userId, req.body)
    sendCreated(res, profile, 'Seller profile created')
  } catch (err) {
    next(err)
  }
}

export const getProfile = async (
  req: Request,
  res: Response,
  next: NextFunction,
): Promise<void> => {
  try {
    const profile = await sellerService.getSellerProfile(req.user!.userId)
    sendSuccess(res, profile)
  } catch (err) {
    next(err)
  }
}

export const updateProfile = async (
  req: Request<object, object, UpdateSellerProfileInput>,
  res: Response,
  next: NextFunction,
): Promise<void> => {
  try {
    const profile = await sellerService.updateSellerProfile(req.user!.userId, req.body)
    sendSuccess(res, profile, 'Seller profile updated')
  } catch (err) {
    next(err)
  }
}

// ─── Dashboard ────────────────────────────────────────────────────────────────
export const getDashboard = async (
  req: Request,
  res: Response,
  next: NextFunction,
): Promise<void> => {
  try {
    const data = await sellerService.getSellerDashboard(req.user!.userId)
    sendSuccess(res, data)
  } catch (err) {
    next(err)
  }
}

// ─── Analytics ────────────────────────────────────────────────────────────────
export const getAnalytics = async (
  req: Request<object, object, object, SellerAnalyticsQueryInput>,
  res: Response,
  next: NextFunction,
): Promise<void> => {
  try {
    const data = await sellerService.getSellerAnalytics(req.user!.userId, req.query.days)
    sendSuccess(res, data)
  } catch (err) {
    next(err)
  }
}

// ─── Earnings ─────────────────────────────────────────────────────────────────
export const getEarnings = async (
  req: Request,
  res: Response,
  next: NextFunction,
): Promise<void> => {
  try {
    const data = await sellerService.getSellerEarnings(req.user!.userId)
    sendSuccess(res, data)
  } catch (err) {
    next(err)
  }
}

// ─── Products ─────────────────────────────────────────────────────────────────
export const getProducts = async (
  req: Request,
  res: Response,
  next: NextFunction,
): Promise<void> => {
  try {
    const { page, limit, search, category, sort } = req.query as Record<string, string>
    const result = await productService.getSellerProducts(req.user!.userId, {
      page: Math.max(1, parseInt(page ?? '1', 10) || 1),
      limit: Math.min(100, Math.max(1, parseInt(limit ?? '20', 10) || 20)),
      search: search || undefined,
      category: (category as any) || undefined,
      sort: (sort as any) || undefined,
    })
    sendSuccess(res, result.products, 'Products retrieved', 200, result.pagination)
  } catch (err) {
    next(err)
  }
}

export const createProduct = async (
  req: Request,
  res: Response,
  next: NextFunction,
): Promise<void> => {
  try {
    const product = await productService.createProduct(req.user!.userId, req.body)
    sendCreated(res, product, 'Product created')
  } catch (err) {
    next(err)
  }
}

export const updateProduct = async (
  req: Request<{ id: string }>,
  res: Response,
  next: NextFunction,
): Promise<void> => {
  try {
    const isAdmin = req.user!.role === ROLES.ADMIN
    const product = await productService.updateProduct(
      req.params.id,
      req.user!.userId,
      req.body,
      isAdmin,
    )
    sendSuccess(res, product, 'Product updated')
  } catch (err) {
    next(err)
  }
}

export const deleteProduct = async (
  req: Request<{ id: string }>,
  res: Response,
  next: NextFunction,
): Promise<void> => {
  try {
    const isAdmin = req.user!.role === ROLES.ADMIN
    await productService.deleteProduct(req.params.id, req.user!.userId, isAdmin)
    sendSuccess(res, null, 'Product deleted')
  } catch (err) {
    next(err)
  }
}

// ─── Orders ───────────────────────────────────────────────────────────────────
export const getOrders = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
  try {
    const { status, page, limit } = req.query as Record<string, string>
    const p = Math.max(1, parseInt(page ?? '1', 10) || 1)
    const l = Math.min(100, Math.max(1, parseInt(limit ?? '20', 10) || 20))
    const result = await orderService.getSellerOrders(req.user!.userId, {
      status: status || undefined,
      page: p,
      limit: l,
    })
    const totalPages = result.total > 0 ? Math.ceil(result.total / l) : 1
    sendSuccess(res, result.orders, 'Orders retrieved', 200, {
      total: result.total,
      page: p,
      limit: l,
      totalPages,
      hasNext: p < totalPages,
      hasPrev: p > 1,
    })
  } catch (err) {
    next(err)
  }
}

// ─── Payouts & Withdrawals ───────────────────────────────────────────────────
export const requestWithdrawal = async (
  req: Request,
  res: Response,
  next: NextFunction,
): Promise<void> => {
  try {
    const withdrawal = await sellerService.requestWithdrawal(req.user!.userId, req.body)
    sendCreated(res, withdrawal, 'Withdrawal request submitted successfully')
  } catch (err) {
    next(err)
  }
}

export const getWithdrawals = async (
  req: Request,
  res: Response,
  next: NextFunction,
): Promise<void> => {
  try {
    const { page, limit, status } = req.query as Record<string, string>
    const result = await sellerService.getSellerWithdrawals(req.user!.userId, {
      page: page ? parseInt(page, 10) : undefined,
      limit: limit ? parseInt(limit, 10) : undefined,
      status: status || undefined,
    })
    sendSuccess(res, result.withdrawals, 'Withdrawals retrieved', 200, result.pagination)
  } catch (err) {
    next(err)
  }
}

export const getPayoutAccounts = async (
  req: Request,
  res: Response,
  next: NextFunction,
): Promise<void> => {
  try {
    const accounts = await sellerService.getSellerPayoutAccounts(req.user!.userId)
    sendSuccess(res, accounts, 'Payout accounts retrieved')
  } catch (err) {
    next(err)
  }
}

export const addPayoutAccount = async (
  req: Request,
  res: Response,
  next: NextFunction,
): Promise<void> => {
  try {
    const account = await sellerService.addSellerPayoutAccount(req.user!.userId, req.body)
    sendCreated(res, account, 'Payout account added successfully')
  } catch (err) {
    next(err)
  }
}

export const deletePayoutAccount = async (
  req: Request<{ id: string }>,
  res: Response,
  next: NextFunction,
): Promise<void> => {
  try {
    await sellerService.deleteSellerPayoutAccount(req.user!.userId, req.params.id)
    sendSuccess(res, null, 'Payout account deleted')
  } catch (err) {
    next(err)
  }
}

export const getBanks = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
  try {
    const currency = (req.query.currency as string) || 'NGN'
    const banks = await sellerService.getAvailableBanks(currency)
    sendSuccess(res, banks, 'Available banks retrieved')
  } catch (err) {
    next(err)
  }
}

export const resolveAccount = async (
  req: Request,
  res: Response,
  next: NextFunction,
): Promise<void> => {
  try {
    const { accountNumber, bankCode } = req.body as { accountNumber?: string; bankCode?: string }
    if (!accountNumber || !bankCode) {
      res.status(400).json({ success: false, message: 'Account number and bank code are required' })
      return
    }
    const resolved = await sellerService.resolveBankAccount(accountNumber, bankCode)
    sendSuccess(res, resolved, 'Bank account resolved successfully')
  } catch (err) {
    next(err)
  }
}

export const getLedger = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
  try {
    const { page, limit } = req.query as Record<string, string>
    const result = await sellerService.getSellerLedger(req.user!.userId, {
      page: page ? parseInt(page, 10) : undefined,
      limit: limit ? parseInt(limit, 10) : undefined,
    })
    sendSuccess(res, result.entries, 'Seller ledger retrieved', 200, result.pagination)
  } catch (err) {
    next(err)
  }
}

// ─── KYC & Store Onboarding ──────────────────────────────────────────────────
export const getKycStatus = async (
  req: Request,
  res: Response,
  next: NextFunction,
): Promise<void> => {
  try {
    const { sellerKycService } = await import('./sellerKyc.service.js')
    const status = await sellerKycService.getMyKycStatus(req.user!.userId)
    sendSuccess(res, status, 'Seller KYC status retrieved')
  } catch (err) {
    next(err)
  }
}

export const submitKyc = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
  try {
    const { sellerKycService } = await import('./sellerKyc.service.js')
    const profile = await sellerKycService.submitKyc(req.user!.userId, req.body)
    sendSuccess(res, profile, 'KYC submitted successfully and is now under review')
  } catch (err) {
    next(err)
  }
}

export const createStore = async (
  req: Request,
  res: Response,
  next: NextFunction,
): Promise<void> => {
  try {
    const { sellerKycService } = await import('./sellerKyc.service.js')
    const profile = await sellerKycService.createStore(req.user!.userId, req.body)
    sendSuccess(res, profile, 'Store created successfully')
  } catch (err) {
    next(err)
  }
}

export const uploadStoreLogo = async (
  req: Request,
  res: Response,
  next: NextFunction,
): Promise<void> => {
  try {
    if (!req.file) {
      const { AppError } = await import('../../middlewares/error.middleware.js')
      throw new AppError('Please provide an image file', 400)
    }
    const { sellerKycService } = await import('./sellerKyc.service.js')
    const result = await sellerKycService.uploadStoreLogo(req.user!.userId, req.file)
    sendSuccess(res, result, 'Store logo uploaded successfully')
  } catch (err) {
    next(err)
  }
}

export const uploadKycDocument = async (
  req: Request,
  res: Response,
  next: NextFunction,
): Promise<void> => {
  try {
    if (!req.file) {
      const { AppError } = await import('../../middlewares/error.middleware.js')
      throw new AppError('Please provide a document or image file', 400)
    }
    const { sellerKycService } = await import('./sellerKyc.service.js')
    const result = await sellerKycService.uploadKycDocument(req.user!.userId, req.file)
    sendSuccess(res, result, 'Document uploaded successfully')
  } catch (err) {
    next(err)
  }
}

export const adminListPendingKyc = async (
  req: Request,
  res: Response,
  next: NextFunction,
): Promise<void> => {
  try {
    const { sellerKycService } = await import('./sellerKyc.service.js')
    const page = parseInt(req.query['page'] as string, 10) || 1
    const limit = parseInt(req.query['limit'] as string, 10) || 20
    const status = req.query['status'] as string | undefined
    const search = req.query['search'] as string | undefined
    const result = await sellerKycService.listPendingKyc({ page, limit, status, search })
    sendSuccess(res, result.profiles, 'KYC applications retrieved', 200, result.pagination)
  } catch (err) {
    next(err)
  }
}

export const adminReviewKyc = async (
  req: Request,
  res: Response,
  next: NextFunction,
): Promise<void> => {
  try {
    const { sellerKycService } = await import('./sellerKyc.service.js')
    const profile = await sellerKycService.reviewKyc(
      req.user!.userId,
      req.params['sellerId'] as string,
      req.body,
    )
    sendSuccess(res, profile, `Seller KYC status updated to ${profile.kycStatus}`)
  } catch (err) {
    next(err)
  }
}
