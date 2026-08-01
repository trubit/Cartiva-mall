import type { Request, Response, NextFunction } from 'express'
import { returnsService } from './returns.service.js'
import { sendSuccess, sendCreated } from '../../utils/response.js'
import type { ReturnType } from './return.model.js'
import type { DisputeType, DisputeResolution } from './dispute.model.js'
import type { ReturnReason } from '../../../../src/shared/constants/index.js'

const intQ = (v: unknown, d: number) => {
  const s = Array.isArray(v) ? (v[0] as string) : (v as string | undefined)
  const n = parseInt(s ?? '', 10)
  return isNaN(n) ? d : n
}

// ─── Returns ─────────────────────────────────────────────────────────────────

export const submitReturn = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
  try {
    const { orderId, type, reason, description, items } = req.body as {
      orderId: string
      type: ReturnType
      reason: ReturnReason
      description?: string
      items: { sku: string; quantity: number; reason: ReturnReason }[]
    }
    const data = await returnsService.submitReturn(req.user!.userId, { orderId, type, reason, description, items })
    sendCreated(res, data, 'Return request submitted')
  } catch (err) {
    next(err)
  }
}

export const listReturns = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
  try {
    const data = await returnsService.listReturns(
      req.user!.userId,
      req.user!.role,
      intQ(req.query.page, 1),
      intQ(req.query.limit, 10),
    )
    sendSuccess(res, data, 'Returns')
  } catch (err) {
    next(err)
  }
}

export const getReturn = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
  try {
    const data = await returnsService.getReturn(req.params['id'] as string, req.user!.userId, req.user!.role)
    sendSuccess(res, data, 'Return')
  } catch (err) {
    next(err)
  }
}

export const updateReturnStatus = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
  try {
    const { status, refundAmount, adminNotes, sellerResponse } = req.body as {
      status: Parameters<typeof returnsService.updateReturnStatus>[1]
      refundAmount?: number
      adminNotes?: string
      sellerResponse?: string
    }
    const data = await returnsService.updateReturnStatus(
      req.params['id'] as string,
      status,
      req.user!.userId,
      { refundAmount, adminNotes, sellerResponse },
    )
    sendSuccess(res, data, 'Return updated')
  } catch (err) {
    next(err)
  }
}

// ─── Disputes ─────────────────────────────────────────────────────────────────

export const openDispute = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
  try {
    const { orderId, returnId, type, description, respondentId } = req.body as {
      orderId: string
      returnId?: string
      type: DisputeType
      description: string
      respondentId: string
    }
    const data = await returnsService.openDispute(req.user!.userId, { orderId, returnId, type, description, respondentId })
    sendCreated(res, data, 'Dispute opened')
  } catch (err) {
    next(err)
  }
}

export const listDisputes = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
  try {
    const data = await returnsService.listDisputes(
      req.user!.userId,
      req.user!.role,
      intQ(req.query.page, 1),
      intQ(req.query.limit, 10),
    )
    sendSuccess(res, data, 'Disputes')
  } catch (err) {
    next(err)
  }
}

export const addDisputeMessage = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
  try {
    const { content } = req.body as { content: string }
    const data = await returnsService.addDisputeMessage(
      req.params['id'] as string,
      req.user!.userId,
      req.user!.role,
      content,
    )
    sendSuccess(res, data, 'Message added')
  } catch (err) {
    next(err)
  }
}

export const resolveDispute = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
  try {
    const { resolution, notes } = req.body as { resolution: DisputeResolution; notes: string }
    const data = await returnsService.resolveDispute(req.params['id'] as string, resolution, notes)
    sendSuccess(res, data, 'Dispute resolved')
  } catch (err) {
    next(err)
  }
}
