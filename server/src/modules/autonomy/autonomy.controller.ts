import type { Request, Response, NextFunction } from 'express'
import {
  recordBusinessSignal,
  createProposal,
  simulateDecision,
  approveProposal,
  rejectProposal,
  executeDecisionAction,
  rollbackDecisionAction,
  toggleKillSwitch,
  getOrCreatePolicy,
  listSignals,
  listProposals,
  listOutcomes,
} from './autonomy.service.js'
import { sendSuccess, sendCreated } from '../../utils/response.js'

export const getPolicy = async (
  _req: Request,
  res: Response,
  next: NextFunction,
): Promise<void> => {
  try {
    sendSuccess(res, await getOrCreatePolicy(), 'Autonomy policy fetched')
  } catch (err) {
    next(err)
  }
}

export const updatePolicyKillSwitch = async (
  req: Request,
  res: Response,
  next: NextFunction,
): Promise<void> => {
  try {
    const { global, domain, enabled } = req.body as {
      global?: boolean
      domain?:
        | 'pricingAutonomy'
        | 'marketingAutonomy'
        | 'inventoryAutonomy'
        | 'recommendationAutonomy'
        | 'notificationAutonomy'
      enabled?: boolean
    }
    const policy = await toggleKillSwitch({
      global,
      domain,
      enabled,
      updatedBy: req.user?.userId,
    })
    sendSuccess(res, policy, 'Kill switch policy updated')
  } catch (err) {
    next(err)
  }
}

export const getSignals = async (
  req: Request,
  res: Response,
  next: NextFunction,
): Promise<void> => {
  try {
    const limit = parseInt((req.query.limit as string) ?? '20', 10)
    const severity = req.query.severity as string | undefined
    sendSuccess(res, await listSignals({ limit, severity }), 'Business signals fetched')
  } catch (err) {
    next(err)
  }
}

export const createSignal = async (
  req: Request,
  res: Response,
  next: NextFunction,
): Promise<void> => {
  try {
    sendCreated(res, await recordBusinessSignal(req.body), 'Business signal recorded')
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
    const riskLevel = req.query.riskLevel as string | undefined
    sendSuccess(res, await listProposals({ status, riskLevel }), 'Decision proposals fetched')
  } catch (err) {
    next(err)
  }
}

export const postProposal = async (
  req: Request,
  res: Response,
  next: NextFunction,
): Promise<void> => {
  try {
    sendCreated(res, await createProposal(req.body), 'Decision proposal created')
  } catch (err) {
    next(err)
  }
}

export const simulateProposal = async (
  req: Request,
  res: Response,
  next: NextFunction,
): Promise<void> => {
  try {
    sendSuccess(
      res,
      await simulateDecision(req.params['id'] as string),
      'Decision simulation complete',
    )
  } catch (err) {
    next(err)
  }
}

export const approveDecision = async (
  req: Request,
  res: Response,
  next: NextFunction,
): Promise<void> => {
  try {
    const { notes } = req.body as { notes?: string }
    sendSuccess(
      res,
      await approveProposal(req.params['id'] as string, req.user!.userId, notes),
      'Decision approved',
    )
  } catch (err) {
    next(err)
  }
}

export const rejectDecision = async (
  req: Request,
  res: Response,
  next: NextFunction,
): Promise<void> => {
  try {
    const { reason } = req.body as { reason: string }
    sendSuccess(
      res,
      await rejectProposal(req.params['id'] as string, req.user!.userId, reason),
      'Decision rejected',
    )
  } catch (err) {
    next(err)
  }
}

export const executeDecision = async (
  req: Request,
  res: Response,
  next: NextFunction,
): Promise<void> => {
  try {
    sendSuccess(
      res,
      await executeDecisionAction(req.params['id'] as string, req.user!.userId),
      'Decision action executed',
    )
  } catch (err) {
    next(err)
  }
}

export const rollbackDecision = async (
  req: Request,
  res: Response,
  next: NextFunction,
): Promise<void> => {
  try {
    sendSuccess(
      res,
      await rollbackDecisionAction(req.params['id'] as string, req.user!.userId),
      'Decision action rolled back',
    )
  } catch (err) {
    next(err)
  }
}

export const getOutcomes = async (
  _req: Request,
  res: Response,
  next: NextFunction,
): Promise<void> => {
  try {
    sendSuccess(res, await listOutcomes(), 'Decision outcomes fetched')
  } catch (err) {
    next(err)
  }
}
