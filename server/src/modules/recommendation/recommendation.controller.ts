import type { Request, Response, NextFunction } from 'express'
import { sendSuccess } from '../../utils/response.js'
import {
  trackBehavior,
  getPersonalizedRecommendations,
  getFrequentlyBoughtTogether,
  getBestSellers,
  getNewArrivals,
  getHomeRecommendations,
  getSimilarProducts,
  getRelatedProducts,
  getTrendingProducts,
  getPopularProducts,
  getRecentlyViewed,
} from './recommendation.service.js'

// ─── Behaviour tracking ───────────────────────────────────────────────────────

export const trackEvent = async (
  req: Request,
  res: Response,
  next: NextFunction,
): Promise<void> => {
  try {
    const userId = req.user!.userId
    const { eventType, productId, category, query, metadata } = req.body as {
      eventType: string
      productId?: string
      category?: string
      query?: string
      metadata?: Record<string, unknown>
    }

    // Fire-and-forget — don't block the response
    void trackBehavior(userId, eventType as never, { productId, category, query, metadata })

    sendSuccess(res, null, 'Tracked')
  } catch (err) {
    next(err)
  }
}

// ─── Recommendation endpoints ─────────────────────────────────────────────────

export const homeRecommendations = async (
  req: Request,
  res: Response,
  next: NextFunction,
): Promise<void> => {
  try {
    const userId = req.user?.userId
    const data = await getHomeRecommendations(userId)
    sendSuccess(res, data, 'Home recommendations fetched')
  } catch (err) {
    next(err)
  }
}

export const personalizedRecs = async (
  req: Request,
  res: Response,
  next: NextFunction,
): Promise<void> => {
  try {
    const userId = req.user!.userId
    const rawLimit = Array.isArray(req.query.limit) ? req.query.limit[0] : req.query.limit
    const limit = Math.min(parseInt(String(rawLimit ?? '12'), 10), 48)
    const products = await getPersonalizedRecommendations(userId, limit)
    sendSuccess(res, products, 'Personalized recommendations fetched')
  } catch (err) {
    next(err)
  }
}

export const frequentlyBoughtTogether = async (
  req: Request,
  res: Response,
  next: NextFunction,
): Promise<void> => {
  try {
    const productId = req.params['productId'] as string
    const rawLimit = Array.isArray(req.query.limit) ? req.query.limit[0] : req.query.limit
    const limit = Math.min(parseInt(String(rawLimit ?? '8'), 10), 24)
    const products = await getFrequentlyBoughtTogether(productId, limit)
    sendSuccess(res, products, 'Frequently bought together fetched')
  } catch (err) {
    next(err)
  }
}

export const bestSellers = async (
  req: Request,
  res: Response,
  next: NextFunction,
): Promise<void> => {
  try {
    const rawLimit = Array.isArray(req.query.limit) ? req.query.limit[0] : req.query.limit
    const rawCat = Array.isArray(req.query.category) ? req.query.category[0] : req.query.category
    const limit = Math.min(parseInt(String(rawLimit ?? '12'), 10), 48)
    const category = rawCat ? String(rawCat) : undefined
    const products = await getBestSellers(limit, category)
    sendSuccess(res, products, 'Best sellers fetched')
  } catch (err) {
    next(err)
  }
}

export const newArrivals = async (
  req: Request,
  res: Response,
  next: NextFunction,
): Promise<void> => {
  try {
    const rawLimit = Array.isArray(req.query.limit) ? req.query.limit[0] : req.query.limit
    const limit = Math.min(parseInt(String(rawLimit ?? '12'), 10), 48)
    const products = await getNewArrivals(limit)
    sendSuccess(res, products, 'New arrivals fetched')
  } catch (err) {
    next(err)
  }
}

export const similarProducts = async (
  req: Request,
  res: Response,
  next: NextFunction,
): Promise<void> => {
  try {
    const productId = req.params['productId'] as string
    const rawLimit = Array.isArray(req.query.limit) ? req.query.limit[0] : req.query.limit
    const limit = Math.min(parseInt(String(rawLimit ?? '8'), 10), 24)
    const products = await getSimilarProducts(productId, limit)
    sendSuccess(res, products, 'Similar products fetched')
  } catch (err) {
    next(err)
  }
}

export const relatedProducts = async (
  req: Request,
  res: Response,
  next: NextFunction,
): Promise<void> => {
  try {
    const productId = req.params['productId'] as string
    const rawLimit = Array.isArray(req.query.limit) ? req.query.limit[0] : req.query.limit
    const limit = Math.min(parseInt(String(rawLimit ?? '8'), 10), 24)
    const products = await getRelatedProducts(productId, limit)
    sendSuccess(res, products, 'Related products fetched')
  } catch (err) {
    next(err)
  }
}

export const trendingProducts = async (
  req: Request,
  res: Response,
  next: NextFunction,
): Promise<void> => {
  try {
    const rawLimit = Array.isArray(req.query.limit) ? req.query.limit[0] : req.query.limit
    const limit = Math.min(parseInt(String(rawLimit ?? '12'), 10), 48)
    const products = await getTrendingProducts(limit)
    sendSuccess(res, products, 'Trending products fetched')
  } catch (err) {
    next(err)
  }
}

export const popularProducts = async (
  req: Request,
  res: Response,
  next: NextFunction,
): Promise<void> => {
  try {
    const rawLimit = Array.isArray(req.query.limit) ? req.query.limit[0] : req.query.limit
    const limit = Math.min(parseInt(String(rawLimit ?? '12'), 10), 48)
    const products = await getPopularProducts(limit)
    sendSuccess(res, products, 'Popular products fetched')
  } catch (err) {
    next(err)
  }
}

export const recentlyViewed = async (
  req: Request,
  res: Response,
  next: NextFunction,
): Promise<void> => {
  try {
    const userId = req.user?.userId
    const sessionId =
      (req.headers['x-anonymous-session-id'] as string) || (req.query.sessionId as string)
    const identifier = userId || sessionId
    if (!identifier) {
      sendSuccess(res, [], 'No viewing history')
      return
    }
    const rawLimit = Array.isArray(req.query.limit) ? req.query.limit[0] : req.query.limit
    const limit = Math.min(parseInt(String(rawLimit ?? '12'), 10), 48)
    const products = await getRecentlyViewed(identifier, limit)
    sendSuccess(res, products, 'Recently viewed products fetched')
  } catch (err) {
    next(err)
  }
}
