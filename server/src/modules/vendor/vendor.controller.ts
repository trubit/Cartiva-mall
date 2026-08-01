import type { Request, Response, NextFunction } from 'express'
import { vendorService } from './vendor.service.js'
import { sendSuccess, sendCreated } from '../../utils/response.js'
import type { SubscriptionPlan } from './vendorSubscription.model.js'

const intQ = (v: unknown, d: number) => {
  const s = Array.isArray(v) ? (v[0] as string) : (v as string | undefined)
  const n = parseInt(s ?? '', 10)
  return isNaN(n) ? d : n
}

export const getMySubscription = async (
  req: Request,
  res: Response,
  next: NextFunction,
): Promise<void> => {
  try {
    const data = await vendorService.getSubscription(req.user!.userId)
    sendSuccess(res, data, 'Subscription')
  } catch (err) {
    next(err)
  }
}

export const subscribe = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
  try {
    const { plan } = req.body as { plan: SubscriptionPlan }
    const data = await vendorService.subscribePlan(req.user!.userId, plan)
    sendCreated(res, data, 'Subscription activated')
  } catch (err) {
    next(err)
  }
}

export const cancelSubscription = async (
  req: Request,
  res: Response,
  next: NextFunction,
): Promise<void> => {
  try {
    const data = await vendorService.cancelSubscription(req.user!.userId)
    sendSuccess(res, data, 'Subscription cancelled')
  } catch (err) {
    next(err)
  }
}

export const getMyCommissions = async (
  req: Request,
  res: Response,
  next: NextFunction,
): Promise<void> => {
  try {
    const data = await vendorService.getCommissions(
      req.user!.userId,
      req.user!.role,
      intQ(req.query.page, 1),
      intQ(req.query.limit, 20),
    )
    sendSuccess(res, data, 'Commissions')
  } catch (err) {
    next(err)
  }
}

export const getMyStats = async (
  req: Request,
  res: Response,
  next: NextFunction,
): Promise<void> => {
  try {
    const data = await vendorService.getVendorStats(req.user!.userId)
    sendSuccess(res, data, 'Vendor stats')
  } catch (err) {
    next(err)
  }
}

// Admin
export const listVendors = async (
  req: Request,
  res: Response,
  next: NextFunction,
): Promise<void> => {
  try {
    const rawStatus = Array.isArray(req.query.status)
      ? (req.query.status[0] as string)
      : (req.query.status as string | undefined)
    const data = await vendorService.listVendors(
      intQ(req.query.page, 1),
      intQ(req.query.limit, 20),
      rawStatus,
    )
    sendSuccess(res, data, 'Vendors')
  } catch (err) {
    next(err)
  }
}

export const suspendVendor = async (
  req: Request,
  res: Response,
  next: NextFunction,
): Promise<void> => {
  try {
    const data = await vendorService.suspendVendor(
      req.params['sellerId'] as string,
      req.user!.userId,
    )
    sendSuccess(res, data, 'Vendor suspended')
  } catch (err) {
    next(err)
  }
}

export const reinstateVendor = async (
  req: Request,
  res: Response,
  next: NextFunction,
): Promise<void> => {
  try {
    const data = await vendorService.reinstateVendor(req.params['sellerId'] as string)
    sendSuccess(res, data, 'Vendor reinstated')
  } catch (err) {
    next(err)
  }
}

export const getVendorCommissions = async (
  req: Request,
  res: Response,
  next: NextFunction,
): Promise<void> => {
  try {
    const data = await vendorService.getCommissions(
      req.params['sellerId'] as string,
      'admin',
      intQ(req.query.page, 1),
      intQ(req.query.limit, 20),
    )
    sendSuccess(res, data, 'Vendor commissions')
  } catch (err) {
    next(err)
  }
}
