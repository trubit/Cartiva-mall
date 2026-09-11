import type { Request, Response, NextFunction } from 'express'
import {
  listOptimizationTargets,
  listOptimizationProposals,
  applyOptimizationProposal,
  rollbackOptimizationProposal,
  detectOptimizationOpportunities,
} from './optimization.service.js'
import { sendSuccess } from '../../utils/response.js'

export const getTargets = async (
  _req: Request,
  res: Response,
  next: NextFunction,
): Promise<void> => {
  try {
    const targets = await listOptimizationTargets()
    sendSuccess(res, targets, 'Optimization targets fetched')
  } catch (err) {
    next(err)
  }
}

export const getProposals = async (
  req: Request,
  res: Response,
  next: NextFunction,
): Promise<void> => {
  try {
    const status = req.query.status as string | undefined
    const page = parseInt((req.query.page as string) ?? '1', 10)
    const limit = parseInt((req.query.limit as string) ?? '20', 10)
    const result = await listOptimizationProposals(status, page, limit)
    sendSuccess(res, result.proposals, 'Optimization proposals fetched', 200, result.pagination)
  } catch (err) {
    next(err)
  }
}

export const triggerScan = async (
  _req: Request,
  res: Response,
  next: NextFunction,
): Promise<void> => {
  try {
    await detectOptimizationOpportunities()
    sendSuccess(res, null, 'Optimization scan triggered')
  } catch (err) {
    next(err)
  }
}

export const handleApplyProposal = async (
  req: Request,
  res: Response,
  next: NextFunction,
): Promise<void> => {
  try {
    const updated = await applyOptimizationProposal(req.params['id'] as string, req.user?.userId)
    sendSuccess(res, updated, 'Optimization proposal applied successfully')
  } catch (err) {
    next(err)
  }
}

export const handleRollbackProposal = async (
  req: Request,
  res: Response,
  next: NextFunction,
): Promise<void> => {
  try {
    const { reason } = req.body as { reason: string }
    const updated = await rollbackOptimizationProposal(
      req.params['id'] as string,
      reason || 'Operator triggered rollback',
      req.user?.userId,
    )
    sendSuccess(res, updated, 'Optimization proposal rolled back successfully')
  } catch (err) {
    next(err)
  }
}
