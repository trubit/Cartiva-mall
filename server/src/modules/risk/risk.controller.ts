import type { Request, Response, NextFunction } from 'express'
import {
  evaluateRisk,
  listRiskCases,
  getRiskCaseById,
  updateRiskCase,
  submitCustomerAppeal,
  type SubjectType,
} from './risk.service.js'
import { sendSuccess, sendCreated } from '../../utils/response.js'

export const assessRisk = async (
  req: Request,
  res: Response,
  next: NextFunction,
): Promise<void> => {
  try {
    const { subjectType, subjectId, signals } = req.body as {
      subjectType: SubjectType
      subjectId: string
      signals?: Record<string, unknown>
    }
    const result = await evaluateRisk(subjectType, subjectId, signals as never)
    sendSuccess(res, result, 'Risk assessed successfully')
  } catch (err) {
    next(err)
  }
}

export const getCases = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
  try {
    const status = req.query.status as string | undefined
    const riskLevel = req.query.riskLevel as string | undefined
    const page = parseInt((req.query.page as string) ?? '1', 10)
    const limit = parseInt((req.query.limit as string) ?? '20', 10)
    const result = await listRiskCases(status, riskLevel, page, limit)
    sendSuccess(res, result.cases, 'Risk cases fetched', 200, result.pagination)
  } catch (err) {
    next(err)
  }
}

export const getCaseDetail = async (
  req: Request,
  res: Response,
  next: NextFunction,
): Promise<void> => {
  try {
    const riskCase = await getRiskCaseById(req.params['caseId'] as string)
    sendSuccess(res, riskCase, 'Risk case details fetched')
  } catch (err) {
    next(err)
  }
}

export const handleUpdateCase = async (
  req: Request,
  res: Response,
  next: NextFunction,
): Promise<void> => {
  try {
    const { status, resolution, moderatorNotes } = req.body as {
      status: string
      resolution?: string
      moderatorNotes?: string
    }
    const updated = await updateRiskCase(
      req.params['caseId'] as string,
      status as never,
      resolution as never,
      moderatorNotes,
      req.user?.userId,
    )
    sendSuccess(res, updated, 'Risk case updated successfully')
  } catch (err) {
    next(err)
  }
}

export const handleCustomerAppeal = async (
  req: Request,
  res: Response,
  next: NextFunction,
): Promise<void> => {
  try {
    const { caseId, appealNotes } = req.body as { caseId: string; appealNotes: string }
    const updated = await submitCustomerAppeal(caseId, req.user!.userId, appealNotes)
    sendCreated(res, updated, 'Appeal submitted successfully')
  } catch (err) {
    next(err)
  }
}
