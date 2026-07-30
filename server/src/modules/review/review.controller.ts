import type { Request, Response, NextFunction } from 'express'
import { addOrUpdateReview, getProductReviews, deleteReview } from './review.service.js'
import { sendSuccess, sendCreated, sendNoContent } from '../../utils/response.js'
import { ROLES } from '../../../../src/shared/constants/index.js'

export const addReview = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
  try {
    const review = await addOrUpdateReview(req.params['id'] as string, req.user!.userId, req.body)
    sendCreated(res, review, 'Review submitted')
  } catch (err) {
    next(err)
  }
}

export const listReviews = async (
  req: Request,
  res: Response,
  next: NextFunction,
): Promise<void> => {
  try {
    const page = parseInt((req.query.page as string) ?? '1', 10)
    const limit = parseInt((req.query.limit as string) ?? '10', 10)
    const result = await getProductReviews(req.params['id'] as string, page, limit)
    sendSuccess(res, result.reviews, 'Reviews fetched', 200, result.pagination)
  } catch (err) {
    next(err)
  }
}

export const removeReview = async (
  req: Request,
  res: Response,
  next: NextFunction,
): Promise<void> => {
  try {
    const isAdmin = req.user!.role === ROLES.ADMIN
    await deleteReview(req.params['reviewId'] as string, req.user!.userId, isAdmin)
    sendNoContent(res)
  } catch (err) {
    next(err)
  }
}
