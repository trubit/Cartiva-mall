import type { Request, Response, NextFunction } from 'express'
import * as checkoutService from './checkout.service.js'
import { sendSuccess } from '../../utils/response.js'
import type {
  UpdateCheckoutInput,
  SelectShippingInput,
  ApplyCouponInput,
} from '../../../../src/shared/validators/checkout.validators.js'

export const getCheckout = async (
  req: Request,
  res: Response,
  next: NextFunction,
): Promise<void> => {
  try {
    const session = await checkoutService.getOrCreateCheckout(req.user!.userId)
    const shippingOptions = checkoutService.getShippingOptions()
    sendSuccess(res, { session, shippingOptions })
  } catch (err) {
    next(err)
  }
}

export const updateCheckout = async (
  req: Request,
  res: Response,
  next: NextFunction,
): Promise<void> => {
  try {
    const session = await checkoutService.updateCheckout(
      req.user!.userId,
      req.body as UpdateCheckoutInput,
    )
    sendSuccess(res, session, 'Address saved')
  } catch (err) {
    next(err)
  }
}

export const selectShipping = async (
  req: Request,
  res: Response,
  next: NextFunction,
): Promise<void> => {
  try {
    const session = await checkoutService.selectShipping(
      req.user!.userId,
      req.body as SelectShippingInput,
    )
    sendSuccess(res, session, 'Shipping method updated')
  } catch (err) {
    next(err)
  }
}

export const applyCoupon = async (
  req: Request,
  res: Response,
  next: NextFunction,
): Promise<void> => {
  try {
    const session = await checkoutService.applyCoupon(
      req.user!.userId,
      req.body as ApplyCouponInput,
    )
    sendSuccess(res, session, 'Coupon applied')
  } catch (err) {
    next(err)
  }
}

export const removeCoupon = async (
  req: Request,
  res: Response,
  next: NextFunction,
): Promise<void> => {
  try {
    const session = await checkoutService.removeCoupon(req.user!.userId)
    sendSuccess(res, session, 'Coupon removed')
  } catch (err) {
    next(err)
  }
}
