import mongoose from 'mongoose'
import { Review, type IReviewDocument } from './review.model.js'
import { Product } from '../product/product.model.js'
import { AppError } from '../../middlewares/error.middleware.js'
import type { PaginationMeta } from '../../../../src/shared/types/api.types.js'

interface ReviewInput {
  rating: number
  title?: string
  body: string
}

// ─── Recalculate product rating after review change ──────────────────────────
const recalculateRatings = async (productId: string): Promise<void> => {
  const result = await Review.aggregate<{ avgRating: number; count: number }>([
    { $match: { productId: new mongoose.Types.ObjectId(productId) } },
    { $group: { _id: null, avgRating: { $avg: '$rating' }, count: { $sum: 1 } } },
  ])

  const { avgRating = 0, count = 0 } = result[0] ?? {}
  await Product.findByIdAndUpdate(productId, {
    ratingsAverage: Math.round(avgRating * 10) / 10,
    ratingsCount: count,
  })
}

// ─── Add or update review ─────────────────────────────────────────────────────
export const addOrUpdateReview = async (
  productId: string,
  userId: string,
  data: ReviewInput,
): Promise<IReviewDocument> => {
  if (!mongoose.isValidObjectId(productId)) throw new AppError('Invalid product ID', 400)

  const product = await Product.findOne({ _id: productId, status: 'active', isActive: true })
  if (!product) throw new AppError('Product not found', 404)

  const review = await Review.findOneAndUpdate(
    {
      productId: new mongoose.Types.ObjectId(productId),
      userId: new mongoose.Types.ObjectId(userId),
    },
    {
      rating: data.rating,
      title: data.title,
      body: data.body,
      productId: new mongoose.Types.ObjectId(productId),
      userId: new mongoose.Types.ObjectId(userId),
    },
    { upsert: true, new: true, runValidators: true },
  )

  await recalculateRatings(productId)
  return review.populate('userId', 'firstName lastName username profileImage')
}

// ─── Get reviews for product ──────────────────────────────────────────────────
export const getProductReviews = async (
  productId: string,
  page = 1,
  limit = 10,
): Promise<{ reviews: IReviewDocument[]; pagination: PaginationMeta }> => {
  if (!mongoose.isValidObjectId(productId)) throw new AppError('Invalid product ID', 400)

  const skip = (page - 1) * limit

  const [reviews, total] = await Promise.all([
    Review.find({ productId: new mongoose.Types.ObjectId(productId) })
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(limit)
      .populate('userId', 'firstName lastName username profileImage')
      .lean(),
    Review.countDocuments({ productId: new mongoose.Types.ObjectId(productId) }),
  ])

  return {
    reviews: reviews as unknown as IReviewDocument[],
    pagination: {
      page,
      limit,
      total,
      totalPages: Math.ceil(total / limit),
      hasNext: page * limit < total,
      hasPrev: page > 1,
    },
  }
}

// ─── Delete review ────────────────────────────────────────────────────────────
export const deleteReview = async (
  reviewId: string,
  userId: string,
  isAdmin = false,
): Promise<void> => {
  if (!mongoose.isValidObjectId(reviewId)) throw new AppError('Invalid review ID', 400)

  const filter = isAdmin
    ? { _id: reviewId }
    : { _id: reviewId, userId: new mongoose.Types.ObjectId(userId) }
  const review = await Review.findOneAndDelete(filter)
  if (!review) throw new AppError('Review not found or access denied', 404)

  await recalculateRatings(review.productId.toString())
}
