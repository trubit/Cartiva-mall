import { Router } from 'express'
import { authenticate, authorize } from '../middlewares/auth.middleware.js'
import {
  addReview,
  listReviews,
  removeReview,
  helpfulVote,
  flagReview,
  sellerReviews,
  sellerReputationScore,
  moderationQueue,
  handleModerateReview,
} from '../modules/review/review.controller.js'

const router = Router()

// ─── Public Review Endpoints ──────────────────────────────────────────────────
router.get('/product/:id', listReviews)
router.get('/seller/:sellerId', sellerReviews)
router.get('/reputation/:sellerId', sellerReputationScore)

// ─── Authenticated Customer Endpoints ─────────────────────────────────────────
router.post('/product/:id', authenticate, addReview)
router.put('/:reviewId', authenticate, addReview)
router.delete('/:reviewId', authenticate, removeReview)
router.post('/:reviewId/vote', authenticate, helpfulVote)
router.post('/:reviewId/report', authenticate, flagReview)

// ─── Admin Moderation Endpoints ───────────────────────────────────────────────
router.get('/admin/moderation', authenticate, authorize('admin'), moderationQueue)
router.patch('/admin/moderation/:id', authenticate, authorize('admin'), handleModerateReview)

export default router
