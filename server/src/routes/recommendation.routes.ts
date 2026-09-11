import { Router } from 'express'
import { authenticate, optionalAuthenticate } from '../middlewares/auth.middleware.js'
import { trackLimiter } from '../middlewares/rateLimiter.middleware.js'
import {
  trackEvent,
  homeRecommendations,
  personalizedRecs,
  frequentlyBoughtTogether,
  bestSellers,
  newArrivals,
  similarProducts,
  relatedProducts,
  trendingProducts,
  popularProducts,
  recentlyViewed,
} from '../modules/recommendation/recommendation.controller.js'

const router = Router()

// ─── Public (optional auth for personalisation) ───────────────────────────────
router.get('/home', optionalAuthenticate, homeRecommendations)
router.get('/best-sellers', bestSellers)
router.get('/new-arrivals', newArrivals)
router.get('/trending', trendingProducts)
router.get('/popular', popularProducts)
router.get('/similar/:productId', similarProducts)
router.get('/related/:productId', relatedProducts)
router.get('/frequently-bought/:productId', frequentlyBoughtTogether)
router.get('/frequently-bought-together/:productId', frequentlyBoughtTogether)
router.get('/recently-viewed', optionalAuthenticate, recentlyViewed)

// ─── Tracking & Authenticated ──────────────────────────────────────────────────
router.get('/personalized', authenticate, personalizedRecs)
router.post('/behavior', authenticate, trackLimiter, trackEvent)

export default router
