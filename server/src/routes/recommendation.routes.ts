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
} from '../modules/recommendation/recommendation.controller.js'

const router = Router()

// ─── Public (optional auth for personalisation) ───────────────────────────────
router.get('/home', optionalAuthenticate, homeRecommendations)
router.get('/best-sellers', bestSellers)
router.get('/new-arrivals', newArrivals)
router.get('/frequently-bought-together/:productId', frequentlyBoughtTogether)

// ─── Authenticated ────────────────────────────────────────────────────────────
router.get('/personalized', authenticate, personalizedRecs)
router.post('/behavior', authenticate, trackLimiter, trackEvent)

export default router
