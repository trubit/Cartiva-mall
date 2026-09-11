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
  searchSuggestions,
  byCategory,
  listCategories,
  listBrands,
  getProduct,
  getBySlug,
  myProducts,
  create,
  update,
  remove,
  submitForReview,
  approve,
  reject,
  publish,
  suspend,
  archive,
  createCategoryHandler,
  createBrandHandler,
  createVariantHandler,
  listVariantsHandler,
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

import { searchProducts } from '../modules/search/search.controller.js'

const router = Router()

// ─── Public — named/static routes FIRST (before /:id catch-all) ───────────────
router.get('/search', searchLimiter, searchProducts)
router.get('/featured', featuredProducts)
router.get('/trending', trendingProducts)
router.get('/recommended', recommendedProducts)
router.get('/categories', listCategories)
router.get('/brands', listBrands)
router.get('/suggestions', searchLimiter, searchSuggestions)
router.get('/slug/:slug', getBySlug)
router.get('/seller/my-products', authenticate, authorize('seller', 'admin'), myProducts)

// ─── Category filter page ──────────────────────────────────────────────────────
// Frontend: GET /products/category/:category — uses byCategory handler (reads req.params.category)
router.get('/category/:category', searchLimiter, byCategory)

// ─── Root product list ────────────────────────────────────────────────────────
router.get('/', searchLimiter, validate(productFiltersSchema, 'query'), listProducts)

// ─── Single product + nested sub-routes ──────────────────────────────────────
router.get('/:id/variants', listVariantsHandler)
router.get('/:id/reviews', listReviews)
router.get('/:id/questions', listQuestions)
router.get('/:id/related', relatedProducts)
router.get('/:id', getProduct)

// ─── Categories & Brands Management (admin) ──────────────────────────────────
router.post('/categories', authenticate, authorize('admin'), createCategoryHandler)
router.post('/brands', authenticate, authorize('admin'), createBrandHandler)

// ─── Authenticated reviews & Q&A ─────────────────────────────────────────────
router.post('/:id/review', authenticate, validate(reviewSchema), addReview)
router.delete('/:id/reviews/:reviewId', authenticate, removeReview)
router.post('/:id/reviews/:reviewId/helpful', authenticate, helpfulVote)
router.post('/:id/reviews/:reviewId/report', authenticate, flagReview)
router.post('/:id/questions', authenticate, createQuestion)
router.post('/:id/questions/:questionId/answers', authenticate, createAnswer)

// ─── Image upload ─────────────────────────────────────────────────────────────
router.post(
  '/upload-images',
  authenticate,
  authorize('seller', 'admin'),
  uploadLimiter,
  uploadProductImages,
  uploadImages,
)

import { checkSellerRestriction } from '../middlewares/sellerRestriction.middleware.js'

// ─── Seller CRUD ──────────────────────────────────────────────────────────────
router.post(
  '/',
  authenticate,
  authorize('seller', 'admin'),
  checkSellerRestriction,
  validate(createProductSchema),
  create,
)
router.post(
  '/create',
  authenticate,
  authorize('seller', 'admin'),
  checkSellerRestriction,
  validate(createProductSchema),
  create,
)
router.patch(
  '/:id',
  authenticate,
  authorize('seller', 'admin'),
  checkSellerRestriction,
  validate(updateProductSchema),
  update,
)
router.put(
  '/update/:id',
  authenticate,
  authorize('seller', 'admin'),
  checkSellerRestriction,
  validate(updateProductSchema),
  update,
)
router.delete('/:id', authenticate, authorize('seller', 'admin'), checkSellerRestriction, remove)
router.delete(
  '/delete/:id',
  authenticate,
  authorize('seller', 'admin'),
  checkSellerRestriction,
  remove,
)

// ─── Variants ────────────────────────────────────────────────────────────────
router.post(
  '/:id/variants',
  authenticate,
  authorize('seller', 'admin'),
  checkSellerRestriction,
  createVariantHandler,
)

// ─── Product Lifecycle Transitions ───────────────────────────────────────────
router.post(
  '/:id/submit',
  authenticate,
  authorize('seller', 'admin'),
  checkSellerRestriction,
  submitForReview,
)
router.post(
  '/:id/publish',
  authenticate,
  authorize('seller', 'admin'),
  checkSellerRestriction,
  publish,
)
router.post('/:id/archive', authenticate, authorize('seller', 'admin'), archive)
router.post('/:id/approve', authenticate, authorize('admin'), approve)
router.post('/:id/reject', authenticate, authorize('admin'), reject)
router.post('/:id/suspend', authenticate, authorize('admin'), suspend)

// Legacy Admin Aliases
router.put('/approve/:id', authenticate, authorize('admin'), approve)

export default router
