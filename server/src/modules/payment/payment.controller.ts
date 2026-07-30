import type { Request, Response, NextFunction } from 'express'
import * as paymentService from './payment.service.js'
import * as paystackService from './paystack.service.js'
import { sendSuccess, sendNoContent } from '../../utils/response.js'
import { AppError } from '../../middlewares/error.middleware.js'
import type { RefundInput } from '../../../../src/shared/validators/payment.validators.js'

export const getPaymentHistory = async (
  req: Request,
  res: Response,
  next: NextFunction,
): Promise<void> => {
  try {
    const page = req.query['page'] ? parseInt(req.query['page'] as string, 10) : undefined
    const limit = req.query['limit'] ? parseInt(req.query['limit'] as string, 10) : undefined
    const data = await paymentService.getPaymentHistory(req.user!.userId, { page, limit })
    sendSuccess(res, data, 'Payment history fetched')
  } catch (err) {
    next(err)
  }
}

export const refundPayment = async (
  req: Request,
  res: Response,
  next: NextFunction,
): Promise<void> => {
  try {
    const result = await paymentService.refundPayment(req.body as RefundInput, req.user!.userId)
    sendSuccess(res, result, 'Refund initiated successfully')
  } catch (err) {
    next(err)
  }
}

// ─── Providers ────────────────────────────────────────────────────────────────
export const getProviders = (_req: Request, res: Response, next: NextFunction): void => {
  try {
    sendSuccess(res, paystackService.getProviders(), 'Payment providers')
  } catch (err) {
    next(err)
  }
}

// ─── Paystack ─────────────────────────────────────────────────────────────────
export const paystackInitialize = async (
  req: Request,
  res: Response,
  next: NextFunction,
): Promise<void> => {
  try {
    const { orderId } = req.body as { orderId?: string }
    if (!orderId) {
      next(new AppError('orderId is required', 400))
      return
    }
    const email = req.user!.email
    const data = await paystackService.initializeTransaction(orderId, req.user!.userId, email)
    sendSuccess(res, data, 'Paystack transaction initialized')
  } catch (err) {
    next(err)
  }
}

export const paystackVerify = async (
  req: Request,
  res: Response,
  next: NextFunction,
): Promise<void> => {
  try {
    const { reference } = req.body as { reference?: string }
    if (!reference) {
      next(new AppError('reference is required', 400))
      return
    }
    const order = await paystackService.verifyTransaction(reference, req.user!.userId)
    sendSuccess(res, order, 'Payment verified')
  } catch (err) {
    next(err)
  }
}

export const paystackWebhook = async (
  req: Request,
  res: Response,
  next: NextFunction,
): Promise<void> => {
  try {
    const sig = req.headers['x-paystack-signature']
    if (!sig || typeof sig !== 'string') {
      next(new AppError('Missing Paystack signature', 400))
      return
    }
    await paystackService.handleWebhook(req.body as Buffer, sig)
    sendNoContent(res)
  } catch (err) {
    next(err)
  }
}
