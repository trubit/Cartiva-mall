import { Router } from 'express'
import { authenticate, authorize } from '../middlewares/auth.middleware.js'
import { validate } from '../middlewares/validate.middleware.js'
import { uploadProductImages } from '../middlewares/upload.middleware.js'
import { searchLimiter, uploadLimiter } from '../middlewares/rateLimiter.middleware.js'
import {
  createProductSchema,
  updateProductSchema,
  productFiltersSchema,
  reviewSchema,
} from '../../../src/shared/validators/product.validators.js'
import {
  listProducts,
  featuredProducts,
  trendingProducts,
  recommendedProducts,
  relatedProducts,
  listCategories,
  listBrands,
  searchSuggestions,
  getProduct,
  search,
  byCategory,
  myProducts,
  create,
  update,
  remove,
  approve,
  block,
  uploadImages,
} from '../modules/product/product.controller.js'
import {
  addReview,
  listReviews,
  removeReview,
  helpfulVote,
  flagReview,
  listQuestions,
  createQuestion,
  createAnswer,
} from '../modules/review/review.controller.js'

const router = Router()

// ─── Public ────────────────────────────────────────────────────────────────────
router.get('/', searchLimiter, validate(productFiltersSchema, 'query'), listProducts)
router.get('/featured', featuredProducts)
router.get('/trending', trendingProducts)
router.get('/recommended', recommendedProducts)
router.get('/categories', listCategories)
router.get('/brands', listBrands)
router.get('/suggestions', searchLimiter, searchSuggestions)
router.get('/search', searchLimiter, validate(productFiltersSchema, 'query'), search)
router.get(
  '/category/:category',
  searchLimiter,
  validate(productFiltersSchema, 'query'),
  byCategory,
)
router.get('/:id', getProduct)
router.get('/:id/reviews', listReviews)
router.get('/:id/related', relatedProducts)

// ─── Public reviews & Q&A ─────────────────────────────────────────────────────
router.get('/:id/questions', listQuestions)

// ─── Authenticated reviews & Q&A ──────────────────────────────────────────────
router.post('/:id/review', authenticate, validate(reviewSchema), addReview)
router.delete('/:id/reviews/:reviewId', authenticate, removeReview)
router.post('/:id/reviews/:reviewId/helpful', authenticate, helpfulVote)
router.post('/:id/reviews/:reviewId/report', authenticate, flagReview)
router.post('/:id/questions', authenticate, createQuestion)
router.post('/:id/questions/:questionId/answers', authenticate, createAnswer)

// ─── Seller ────────────────────────────────────────────────────────────────────
router.post(
  '/upload-images',
  authenticate,
  authorize('seller', 'admin'),
  uploadLimiter,
  uploadProductImages,
  uploadImages,
)
router.get('/seller/my-products', authenticate, authorize('seller', 'admin'), myProducts)
router.post(
  '/create',
  authenticate,
  authorize('seller', 'admin'),
  validate(createProductSchema),
  create,
)
router.put(
  '/update/:id',
  authenticate,
  authorize('seller', 'admin'),
  validate(updateProductSchema),
  update,
)
router.delete('/delete/:id', authenticate, authorize('seller', 'admin'), remove)

// ─── Admin ─────────────────────────────────────────────────────────────────────
router.put('/approve/:id', authenticate, authorize('admin'), approve)
router.put('/block/:id', authenticate, authorize('admin'), block)

export default router
