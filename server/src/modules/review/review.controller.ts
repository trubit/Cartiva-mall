import type { Request, Response, NextFunction } from 'express'
import {
  addOrUpdateReview,
  getProductReviews,
  deleteReview,
  voteHelpful,
  reportReview,
  getQuestions,
  addQuestion,
  addAnswer,
} from './review.service.js'
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

export const helpfulVote = async (
  req: Request,
  res: Response,
  next: NextFunction,
): Promise<void> => {
  try {
    const result = await voteHelpful(req.params['reviewId'] as string, req.user!.userId)
    sendSuccess(res, result, 'Vote recorded')
  } catch (err) {
    next(err)
  }
}

export const flagReview = async (
  req: Request,
  res: Response,
  next: NextFunction,
): Promise<void> => {
  try {
    await reportReview(req.params['reviewId'] as string, req.user!.userId)
    sendSuccess(res, null, 'Review reported')
  } catch (err) {
    next(err)
  }
}

export const listQuestions = async (
  req: Request,
  res: Response,
  next: NextFunction,
): Promise<void> => {
  try {
    const questions = await getQuestions(req.params['id'] as string)
    sendSuccess(res, questions, 'Questions fetched')
  } catch (err) {
    next(err)
  }
}

export const createQuestion = async (
  req: Request,
  res: Response,
  next: NextFunction,
): Promise<void> => {
  try {
    const q = await addQuestion(req.params['id'] as string, req.user!.userId, req.body.question as string)
    sendCreated(res, q, 'Question submitted')
  } catch (err) {
    next(err)
  }
}

export const createAnswer = async (
  req: Request,
  res: Response,
  next: NextFunction,
): Promise<void> => {
  try {
    const q = await addAnswer(req.params['questionId'] as string, req.user!.userId, req.body.answer as string)
    sendCreated(res, q, 'Answer submitted')
  } catch (err) {
    next(err)
  }
}
