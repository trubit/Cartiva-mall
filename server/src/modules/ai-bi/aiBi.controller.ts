import type { Request, Response, NextFunction } from 'express'
import {
  queryAnalytics,
  getInsights,
  updateInsightStatus,
  submitInsightFeedback,
} from './aiBi.service.js'
import { sendSuccess, sendCreated } from '../../utils/response.js'

export const handleAnalyticsQuery = async (
  req: Request,
  res: Response,
  next: NextFunction,
): Promise<void> => {
  try {
    const { query } = req.body as { query: string }
    const result = await queryAnalytics(query)
    sendSuccess(res, result, 'Analytics query processed')
  } catch (err) {
    next(err)
  }
}

export const listInsights = async (
  req: Request,
  res: Response,
  next: NextFunction,
): Promise<void> => {
  try {
    const scope = req.query.scope as string | undefined
    const status = req.query.status as string | undefined
    const page = parseInt((req.query.page as string) ?? '1', 10)
    const limit = parseInt((req.query.limit as string) ?? '20', 10)
    const result = await getInsights(scope as never, status as never, page, limit)
    sendSuccess(res, result.insights, 'Insights fetched', 200, result.pagination)
  } catch (err) {
    next(err)
  }
}

export const handleUpdateInsightStatus = async (
  req: Request,
  res: Response,
  next: NextFunction,
): Promise<void> => {
  try {
    const { status } = req.body as { status: string }
    const updated = await updateInsightStatus(
      req.params['id'] as string,
      status as never,
      req.user?.userId,
    )
    sendSuccess(res, updated, 'Insight status updated')
  } catch (err) {
    next(err)
  }
}

export const handleInsightFeedback = async (
  req: Request,
  res: Response,
  next: NextFunction,
): Promise<void> => {
  try {
    const { helpful, notes } = req.body as { helpful: boolean; notes?: string }
    const feedback = await submitInsightFeedback(
      req.params['id'] as string,
      req.user!.userId,
      helpful,
      notes,
    )
    sendCreated(res, feedback, 'Feedback recorded')
  } catch (err) {
    next(err)
  }
}
