import type { Request, Response, NextFunction } from 'express'
import * as dashboardService from './dashboard.service.js'
import { sendSuccess } from '../../utils/response.js'
import { PAGINATION } from '../../../../src/shared/constants/index.js'
import type {
  AddWishlistInput,
  ChangePasswordInput,
  DashboardSettingsInput,
} from '../../../../src/shared/validators/dashboard.validators.js'

const parsePage = (v: unknown) => Math.max(1, parseInt(String(v || '1'), 10))
const parseLimit = (v: unknown) =>
  Math.min(
    PAGINATION.MAX_LIMIT,
    Math.max(1, parseInt(String(v || String(PAGINATION.DEFAULT_LIMIT)), 10)),
  )

// ─── Summary ──────────────────────────────────────────────────────────────────
export const getSummary = async (
  req: Request,
  res: Response,
  next: NextFunction,
): Promise<void> => {
  try {
    const data = await dashboardService.getDashboardSummary(req.user!.userId)
    sendSuccess(res, data, 'Dashboard summary fetched')
  } catch (err) {
    next(err)
  }
}

// ─── Wishlist ─────────────────────────────────────────────────────────────────
export const getWishlist = async (
  req: Request,
  res: Response,
  next: NextFunction,
): Promise<void> => {
  try {
    const data = await dashboardService.getWishlist(req.user!.userId)
    sendSuccess(res, data, 'Wishlist fetched')
  } catch (err) {
    next(err)
  }
}

export const addToWishlist = async (
  req: Request,
  res: Response,
  next: NextFunction,
): Promise<void> => {
  try {
    const { productId } = req.body as AddWishlistInput
    const data = await dashboardService.addToWishlist(req.user!.userId, productId)
    sendSuccess(res, data, 'Added to wishlist')
  } catch (err) {
    next(err)
  }
}

export const removeFromWishlist = async (
  req: Request,
  res: Response,
  next: NextFunction,
): Promise<void> => {
  try {
    await dashboardService.removeFromWishlist(req.user!.userId, String(req.params['productId']))
    sendSuccess(res, null, 'Removed from wishlist')
  } catch (err) {
    next(err)
  }
}

export const checkWishlist = async (
  req: Request,
  res: Response,
  next: NextFunction,
): Promise<void> => {
  try {
    const inWishlist = await dashboardService.checkWishlist(
      req.user!.userId,
      String(req.params['productId']),
    )
    sendSuccess(res, { inWishlist }, 'Wishlist status checked')
  } catch (err) {
    next(err)
  }
}

// ─── Notifications ────────────────────────────────────────────────────────────
export const getNotifications = async (
  req: Request,
  res: Response,
  next: NextFunction,
): Promise<void> => {
  try {
    const page = parsePage(req.query['page'])
    const limit = parseLimit(req.query['limit'])
    const data = await dashboardService.getNotifications(req.user!.userId, page, limit)
    sendSuccess(res, data, 'Notifications fetched', 200, {
      page,
      limit,
      total: data.total,
      totalPages: Math.ceil(data.total / limit),
      hasNext: page < Math.ceil(data.total / limit),
      hasPrev: page > 1,
    })
  } catch (err) {
    next(err)
  }
}

export const getUnreadCount = async (
  req: Request,
  res: Response,
  next: NextFunction,
): Promise<void> => {
  try {
    const count = await dashboardService.getUnreadNotificationCount(req.user!.userId)
    sendSuccess(res, { count }, 'Unread count fetched')
  } catch (err) {
    next(err)
  }
}

export const markRead = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
  try {
    const notification = await dashboardService.markNotificationRead(
      req.user!.userId,
      String(req.params['id']),
    )
    sendSuccess(res, notification, 'Notification marked as read')
  } catch (err) {
    next(err)
  }
}

export const markAllRead = async (
  req: Request,
  res: Response,
  next: NextFunction,
): Promise<void> => {
  try {
    await dashboardService.markAllNotificationsRead(req.user!.userId)
    sendSuccess(res, null, 'All notifications marked as read')
  } catch (err) {
    next(err)
  }
}

// ─── Payments ────────────────────────────────────────────────────────────────
export const getPaymentHistory = async (
  req: Request,
  res: Response,
  next: NextFunction,
): Promise<void> => {
  try {
    const page = parsePage(req.query['page'])
    const limit = parseLimit(req.query['limit'])
    const data = await dashboardService.getPaymentHistory(req.user!.userId, page, limit)
    sendSuccess(res, data, 'Payment history fetched', 200, {
      page,
      limit,
      total: data.total,
      totalPages: Math.ceil(data.total / limit),
      hasNext: page < Math.ceil(data.total / limit),
      hasPrev: page > 1,
    })
  } catch (err) {
    next(err)
  }
}

// ─── Recently Viewed ──────────────────────────────────────────────────────────
export const getRecentlyViewed = async (
  req: Request,
  res: Response,
  next: NextFunction,
): Promise<void> => {
  try {
    const products = await dashboardService.getRecentProducts(req.user!.userId)
    sendSuccess(res, products, 'Recently viewed fetched')
  } catch (err) {
    next(err)
  }
}

export const trackRecentlyViewed = async (
  req: Request,
  res: Response,
  next: NextFunction,
): Promise<void> => {
  try {
    await dashboardService.trackRecentProduct(req.user!.userId, req.body.productId as string)
    sendSuccess(res, null, 'Product tracked')
  } catch (err) {
    next(err)
  }
}

// ─── Account Settings ─────────────────────────────────────────────────────────
export const updateSettings = async (
  req: Request,
  res: Response,
  next: NextFunction,
): Promise<void> => {
  try {
    const user = await dashboardService.updateSettings(
      req.user!.userId,
      req.body as DashboardSettingsInput,
    )
    sendSuccess(res, user, 'Settings updated')
  } catch (err) {
    next(err)
  }
}

// ─── Security ────────────────────────────────────────────────────────────────
export const changePassword = async (
  req: Request,
  res: Response,
  next: NextFunction,
): Promise<void> => {
  try {
    await dashboardService.changePassword(req.user!.userId, req.body as ChangePasswordInput)
    sendSuccess(res, null, 'Password changed successfully')
  } catch (err) {
    next(err)
  }
}
