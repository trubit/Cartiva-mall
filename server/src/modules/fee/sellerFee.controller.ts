import type { Request, Response } from 'express'
import * as sellerFeeService from './sellerFee.service.js'
import { sendSuccess } from '../../utils/response.js'
import { AppError } from '../../middlewares/error.middleware.js'

export const getMyFees = async (req: Request, res: Response) => {
  const userId = req.user?.userId || (req.user as any)?._id?.toString()
  const page = parseInt(req.query['page'] as string) || 1
  const limit = parseInt(req.query['limit'] as string) || 20
  const status = req.query['status'] as string | undefined

  const data = await sellerFeeService.getSellerFees(userId, { page, limit, status })
  sendSuccess(res, data, 'Seller fees retrieved successfully')
}

export const submitPayment = async (req: Request, res: Response) => {
  const userId = req.user?.userId || (req.user as any)?._id?.toString()
  const feeId = req.params['id'] as string
  const { paymentReference, paymentProofUrl } = req.body as {
    paymentReference?: string
    paymentProofUrl?: string
  }

  if (!paymentReference || !paymentReference.trim()) {
    throw new AppError('Payment reference is required', 400)
  }

  const fee = await sellerFeeService.submitFeePayment(userId, feeId, {
    paymentReference,
    paymentProofUrl,
  })

  sendSuccess(res, fee, 'Fee payment submitted successfully and pending verification')
}

export const adminVerifyPayment = async (req: Request, res: Response) => {
  const adminUserId = req.user?.userId || (req.user as any)?._id?.toString()
  const feeId = req.params['id'] as string
  const { approved, notes } = req.body as { approved: boolean; notes?: string }

  if (typeof approved !== 'boolean') {
    throw new AppError('Field "approved" (boolean) is required', 400)
  }

  const fee = await sellerFeeService.adminVerifyFeePayment(adminUserId, feeId, approved, notes)
  sendSuccess(
    res,
    fee,
    approved ? 'Fee payment verified and marked PAID' : 'Fee payment proof rejected',
  )
}

export const getAdminCommissions = async (req: Request, res: Response) => {
  const startDate = req.query['startDate'] as string | undefined
  const endDate = req.query['endDate'] as string | undefined
  const data = await sellerFeeService.getAdminCommissionStats({ startDate, endDate })
  sendSuccess(res, data, 'Admin commission analytics retrieved successfully')
}

export const runEnforcementWorker = async (_req: Request, res: Response) => {
  const result = await sellerFeeService.processFeeEnforcement()
  sendSuccess(res, result, 'Fee enforcement worker executed')
}

export const getCommissionPolicy = async (_req: Request, res: Response) => {
  const policy = await sellerFeeService.getCommissionPolicy()
  sendSuccess(res, policy, 'Marketplace commission policy retrieved successfully')
}

export const updateCommissionPolicy = async (req: Request, res: Response) => {
  const adminUserId = req.user?.userId || (req.user as any)?._id?.toString()
  const {
    baseSellerFee,
    baseCurrency,
    commissionType,
    percentageRate,
    currencyRates,
    baseUsdRate,
    reason,
  } = req.body as {
    baseSellerFee: number
    baseCurrency?: string
    commissionType?: any
    percentageRate?: number
    currencyRates?: Record<string, number>
    baseUsdRate?: number
    reason?: string
  }

  if (baseSellerFee === undefined || isNaN(Number(baseSellerFee))) {
    throw new AppError('Field "baseSellerFee" must be a valid number', 400)
  }

  const updated = await sellerFeeService.updateCommissionPolicy(adminUserId, {
    baseSellerFee: Number(baseSellerFee),
    baseCurrency,
    commissionType,
    percentageRate: percentageRate !== undefined ? Number(percentageRate) : undefined,
    currencyRates,
    baseUsdRate: baseUsdRate !== undefined ? Number(baseUsdRate) : undefined,
    reason,
  })

  sendSuccess(res, updated, 'Marketplace commission policy updated successfully')
}
