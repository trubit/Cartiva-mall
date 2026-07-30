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
      category: category || undefined,
      sort: (sort as Parameters<typeof productService.getSellerProducts>[1]['sort']) || undefined,
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
    const product = await productService.createProduct(req.body, req.user!.userId)
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
      req.body,
      req.user!.userId,
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
