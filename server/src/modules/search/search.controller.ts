import type { Request, Response, NextFunction } from 'express'
import { searchService } from './search.service.js'
import { sendSuccess, sendCreated } from '../../utils/response.js'

export const searchProducts = async (
  req: Request,
  res: Response,
  next: NextFunction,
): Promise<void> => {
  try {
    const params = {
      q: req.query.q as string,
      category: req.query.category as string,
      brand: req.query.brand as string,
      sellerId: req.query.sellerId as string,
      minPrice: req.query.minPrice ? parseFloat(req.query.minPrice as string) : undefined,
      maxPrice: req.query.maxPrice ? parseFloat(req.query.maxPrice as string) : undefined,
      minRating: req.query.minRating ? parseFloat(req.query.minRating as string) : undefined,
      inStockOnly: req.query.inStockOnly === 'true',
      sort: req.query.sort as
        | 'relevance'
        | 'price_asc'
        | 'price_desc'
        | 'newest'
        | 'rating'
        | 'popular',
      page: req.query.page ? parseInt(req.query.page as string, 10) : 1,
      limit: req.query.limit ? parseInt(req.query.limit as string, 10) : 20,
    }

    const result = await searchService.search(params)
    sendSuccess(res, result.items, 'Search results fetched', 200, {
      page: result.page,
      limit: result.limit,
      total: result.total,
      totalPages: result.totalPages,
      hasNext: result.hasNext,
      hasPrev: result.hasPrev,
    })
  } catch (err) {
    next(err)
  }
}

export const getSuggestions = async (
  req: Request,
  res: Response,
  next: NextFunction,
): Promise<void> => {
  try {
    const q = (req.query.q as string) ?? ''
    const suggestions = await searchService.getSuggestions(q)
    sendSuccess(res, suggestions, 'Search suggestions fetched')
  } catch (err) {
    next(err)
  }
}

export const getAnalytics = async (
  _req: Request,
  res: Response,
  next: NextFunction,
): Promise<void> => {
  try {
    const analytics = await searchService.getAnalytics()
    sendSuccess(res, analytics, 'Search analytics fetched')
  } catch (err) {
    next(err)
  }
}

export const rebuildIndex = async (
  req: Request,
  res: Response,
  next: NextFunction,
): Promise<void> => {
  try {
    const result = await searchService.rebuildIndex(req.user!.userId)
    sendCreated(res, result, 'Search index rebuilt')
  } catch (err) {
    next(err)
  }
}
