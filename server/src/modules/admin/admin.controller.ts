import type { Request, Response, NextFunction } from 'express'
import * as adminService from './admin.service.js'
import { sendSuccess } from '../../utils/response.js'
import { AppError } from '../../middlewares/error.middleware.js'
import type { UserRole } from '../../../../src/shared/types/auth.types.js'
import { ROLES } from '../../../../src/shared/constants/index.js'

const paginationMeta = (result: {
  page: number
  limit: number
  total: number
  totalPages: number
}) => ({
  page: result.page,
  limit: result.limit,
  total: result.total,
  totalPages: result.totalPages,
  hasNext: result.page < result.totalPages,
  hasPrev: result.page > 1,
})

const ip = (req: Request) => (req.ip ?? '').replace('::ffff:', '')

// ─── Dashboard ─────────────────────────────────────────────────────────────────
export const getStats = async (_req: Request, res: Response, next: NextFunction): Promise<void> => {
  try {
    const stats = await adminService.getStats()
    sendSuccess(res, stats, 'Dashboard stats')
  } catch (err) {
    next(err)
  }
}

// ─── Users ─────────────────────────────────────────────────────────────────────
export const listUsers = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
  try {
    const { search, role, status, page = '1', limit = '20' } = req.query as Record<string, string>
    const result = await adminService.listUsers({
      search,
      role,
      status,
      page: Math.max(1, parseInt(page, 10) || 1),
      limit: Math.min(100, Math.max(1, parseInt(limit, 10) || 20)),
    })
    sendSuccess(res, result.users, 'Users', 200, paginationMeta(result))
  } catch (err) {
    next(err)
  }
}

export const toggleUserActive = async (
  req: Request,
  res: Response,
  next: NextFunction,
): Promise<void> => {
  try {
    const user = await adminService.toggleUserActive(
      req.params['id'] as string,
      req.user!.userId,
      ip(req),
    )
    sendSuccess(res, user, user.isActive ? 'User activated' : 'User deactivated')
  } catch (err) {
    next(err)
  }
}

export const changeUserRole = async (
  req: Request,
  res: Response,
  next: NextFunction,
): Promise<void> => {
  try {
    const { role } = req.body as { role: UserRole }
    if (!(Object.values(ROLES) as string[]).includes(role)) {
      return next(new AppError('Invalid role', 400))
    }
    const user = await adminService.changeUserRole(
      req.params['id'] as string,
      role,
      req.user!.userId,
      ip(req),
    )
    sendSuccess(res, user, 'Role updated')
  } catch (err) {
    next(err)
  }
}

export const deleteUser = async (
  req: Request,
  res: Response,
  next: NextFunction,
): Promise<void> => {
  try {
    await adminService.deleteUser(req.params['id'] as string, req.user!.userId, ip(req))
    sendSuccess(res, null, 'User deleted')
  } catch (err) {
    next(err)
  }
}

// ─── Sellers ───────────────────────────────────────────────────────────────────
export const listSellers = async (
  req: Request,
  res: Response,
  next: NextFunction,
): Promise<void> => {
  try {
    const { search, verified, page = '1', limit = '20' } = req.query as Record<string, string>
    const result = await adminService.listSellers({
      search,
      verified,
      page: Math.max(1, parseInt(page, 10) || 1),
      limit: Math.min(100, Math.max(1, parseInt(limit, 10) || 20)),
    })
    sendSuccess(res, result.sellers, 'Sellers', 200, paginationMeta(result))
  } catch (err) {
    next(err)
  }
}

export const verifySeller = async (
  req: Request,
  res: Response,
  next: NextFunction,
): Promise<void> => {
  try {
    const seller = await adminService.verifySeller(
      req.params['id'] as string,
      req.user!.userId,
      ip(req),
    )
    sendSuccess(res, seller, seller.isVerified ? 'Seller verified' : 'Seller unverified')
  } catch (err) {
    next(err)
  }
}

// ─── Products ──────────────────────────────────────────────────────────────────
export const listAllProducts = async (
  req: Request,
  res: Response,
  next: NextFunction,
): Promise<void> => {
  try {
    const { status, search, page = '1', limit = '20' } = req.query as Record<string, string>
    const result = await adminService.listAllProducts({
      status,
      search,
      page: Math.max(1, parseInt(page, 10) || 1),
      limit: Math.min(100, Math.max(1, parseInt(limit, 10) || 20)),
    })
    sendSuccess(res, result.products, 'Products', 200, paginationMeta(result))
  } catch (err) {
    next(err)
  }
}

// ─── Orders ────────────────────────────────────────────────────────────────────
export const listAllOrders = async (
  req: Request,
  res: Response,
  next: NextFunction,
): Promise<void> => {
  try {
    const {
      status,
      paymentStatus,
      search,
      page = '1',
      limit = '20',
    } = req.query as Record<string, string>
    const result = await adminService.listAllOrders({
      status,
      paymentStatus,
      search,
      page: Math.max(1, parseInt(page, 10) || 1),
      limit: Math.min(100, Math.max(1, parseInt(limit, 10) || 20)),
    })
    sendSuccess(res, result.orders, 'Orders', 200, paginationMeta(result))
  } catch (err) {
    next(err)
  }
}

export const updateOrderStatus = async (
  req: Request,
  res: Response,
  next: NextFunction,
): Promise<void> => {
  try {
    const { orderStatus, tracking } = req.body as {
      orderStatus: string
      tracking?: {
        trackingNumber?: string
        carrier?: string
        trackingUrl?: string
        estimatedDeliveryDate?: string
        location?: string
        note?: string
      }
    }
    if (!orderStatus) return next(new AppError('orderStatus is required', 400))
    const order = await adminService.updateOrderStatus(
      req.params['id'] as string,
      orderStatus,
      req.user!.userId,
      tracking,
      ip(req),
    )
    sendSuccess(res, order, 'Order status updated')
  } catch (err) {
    next(err)
  }
}

// ─── Payments ──────────────────────────────────────────────────────────────────
export const listPayments = async (
  req: Request,
  res: Response,
  next: NextFunction,
): Promise<void> => {
  try {
    const { status, page = '1', limit = '20' } = req.query as Record<string, string>
    const result = await adminService.listPayments({
      status,
      page: Math.max(1, parseInt(page, 10) || 1),
      limit: Math.min(100, Math.max(1, parseInt(limit, 10) || 20)),
    })
    sendSuccess(res, result.payments, 'Payments', 200, paginationMeta(result))
  } catch (err) {
    next(err)
  }
}

// ─── Analytics ─────────────────────────────────────────────────────────────────
export const getAnalytics = async (
  req: Request,
  res: Response,
  next: NextFunction,
): Promise<void> => {
  try {
    const days = Math.min(
      365,
      Math.max(7, parseInt((req.query['days'] as string) ?? '30', 10) || 30),
    )
    const data = await adminService.getPlatformAnalytics(days)
    sendSuccess(res, data, 'Analytics')
  } catch (err) {
    next(err)
  }
}

// ─── Fraud alerts ──────────────────────────────────────────────────────────────
export const getFraudAlerts = async (
  _req: Request,
  res: Response,
  next: NextFunction,
): Promise<void> => {
  try {
    const data = await adminService.getFraudAlerts()
    sendSuccess(res, data, 'Fraud alerts')
  } catch (err) {
    next(err)
  }
}

// ─── Reports ───────────────────────────────────────────────────────────────────
export const getReports = async (
  req: Request,
  res: Response,
  next: NextFunction,
): Promise<void> => {
  try {
    const period = (req.query['period'] as 'week' | 'month' | 'quarter' | 'year') ?? 'month'
    const allowed: Array<typeof period> = ['week', 'month', 'quarter', 'year']
    if (!allowed.includes(period)) return next(new AppError('Invalid period', 400))
    const data = await adminService.getReports(period)
    sendSuccess(res, data, 'Reports')
  } catch (err) {
    next(err)
  }
}

// ─── Audit logs ────────────────────────────────────────────────────────────────
export const getAuditLogs = async (
  req: Request,
  res: Response,
  next: NextFunction,
): Promise<void> => {
  try {
    const { action, page = '1', limit = '20' } = req.query as Record<string, string>
    const result = await adminService.getAuditLogs({
      action,
      page: Math.max(1, parseInt(page, 10) || 1),
      limit: Math.min(100, Math.max(1, parseInt(limit, 10) || 20)),
    })
    sendSuccess(res, result.logs, 'Audit logs', 200, paginationMeta(result))
  } catch (err) {
    next(err)
  }
}
