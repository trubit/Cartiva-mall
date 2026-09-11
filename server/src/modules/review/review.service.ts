import mongoose from 'mongoose'
import {
  Review,
  Question,
  type IReviewDocument,
  type IQuestionDocument,
  type ReviewStatus,
} from './review.model.js'
import { SellerReputation } from './sellerReputation.model.js'
import { ReviewReport, type ReportReason } from './reviewReport.model.js'
import { Product } from '../product/product.model.js'
import { Order } from '../order/order.model.js'
import { AppError } from '../../middlewares/error.middleware.js'
import type { PaginationMeta } from '../../../../src/shared/types/api.types.js'

interface ReviewInput {
  rating: number
  title?: string
  body: string
  orderId?: string
}

// ─── Automated Content Moderation Safety Check ────────────────────────────────
const checkContentSafety = (title?: string, body?: string): ReviewStatus => {
  const text = `${title ?? ''} ${body ?? ''}`.toLowerCase()
  const spamPatterns = [/https?:\/\//, /www\./, /click here/i, /free money/i, /crypto/i]
  const isSpam = spamPatterns.some((pattern) => pattern.test(text))
  return isSpam ? 'FLAGGED' : 'PUBLISHED'
}

// ─── Verify Customer Purchase ────────────────────────────────────────────────
const checkVerifiedPurchase = async (productId: string, userId: string): Promise<boolean> => {
  const order = await Order.findOne({
    userId: new mongoose.Types.ObjectId(userId),
    'items.productId': new mongoose.Types.ObjectId(productId),
    orderStatus: { $in: ['confirmed', 'shipped', 'delivered'] },
  }).lean()
  return Boolean(order)
}

// ─── Recalculate seller reputation ────────────────────────────────────────────
export const recalculateSellerReputation = async (sellerId: string): Promise<void> => {
  if (!mongoose.isValidObjectId(sellerId)) return
  const sid = new mongoose.Types.ObjectId(sellerId)

  const stats = await Review.aggregate<{
    avgRating: number
    totalReviews: number
    verifiedCount: number
  }>([
    { $match: { sellerId: sid, status: 'PUBLISHED' } },
    {
      $group: {
        _id: null,
        avgRating: { $avg: '$rating' },
        totalReviews: { $sum: 1 },
        verifiedCount: { $sum: { $cond: ['$isVerified', 1, 0] } },
      },
    },
  ])

  const { avgRating = 0, totalReviews = 0, verifiedCount = 0 } = stats[0] ?? {}
  const trustScore = Math.min(100, Math.max(0, Math.round(avgRating * 20)))

  await SellerReputation.findOneAndUpdate(
    { sellerId: sid },
    {
      avgRating: Math.round(avgRating * 10) / 10,
      totalReviews,
      verifiedPurchasesCount: verifiedCount,
      trustScore,
      lastCalculatedAt: new Date(),
    },
    { upsert: true },
  )
}

// ─── Recalculate product rating after review change ──────────────────────────
const recalculateRatings = async (productId: string): Promise<void> => {
  const result = await Review.aggregate<{ avgRating: number; count: number }>([
    { $match: { productId: new mongoose.Types.ObjectId(productId), status: 'PUBLISHED' } },
    { $group: { _id: null, avgRating: { $avg: '$rating' }, count: { $sum: 1 } } },
  ])

  const { avgRating = 0, count = 0 } = result[0] ?? {}
  const product = await Product.findByIdAndUpdate(productId, {
    ratingsAverage: Math.round(avgRating * 10) / 10,
    ratingsCount: count,
  })

  if (product?.sellerId) {
    await recalculateSellerReputation(product.sellerId.toString())
  }
}

// ─── Add or update review ─────────────────────────────────────────────────────
export const addOrUpdateReview = async (
  productId: string,
  userId: string,
  data: ReviewInput,
): Promise<IReviewDocument> => {
  if (!mongoose.isValidObjectId(productId)) throw new AppError('Invalid product ID', 400)

  const product = await Product.findOne({
    _id: productId,
    status: { $in: ['PUBLISHED', 'active', 'APPROVED'] },
  })
  if (!product) throw new AppError('Product not found', 404)

  const isVerified = await checkVerifiedPurchase(productId, userId)
  const status = checkContentSafety(data.title, data.body)

  const review = await Review.findOneAndUpdate(
    {
      productId: new mongoose.Types.ObjectId(productId),
      userId: new mongoose.Types.ObjectId(userId),
    },
    {
      rating: data.rating,
      title: data.title,
      body: data.body,
      isVerified,
      status,
      productId: new mongoose.Types.ObjectId(productId),
      sellerId: product.sellerId,
      userId: new mongoose.Types.ObjectId(userId),
      ...(data.orderId && mongoose.isValidObjectId(data.orderId)
        ? { orderId: new mongoose.Types.ObjectId(data.orderId) }
        : {}),
    },
    { upsert: true, returnDocument: 'after', runValidators: true },
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

// ─── Helpful vote (toggle) ────────────────────────────────────────────────────
export const voteHelpful = async (
  reviewId: string,
  userId: string,
): Promise<{ helpfulCount: number; voted: boolean }> => {
  if (!mongoose.isValidObjectId(reviewId)) throw new AppError('Invalid review ID', 400)

  const review = await Review.findById(reviewId)
  if (!review) throw new AppError('Review not found', 404)

  const uid = new mongoose.Types.ObjectId(userId)
  const alreadyVoted = review.helpfulVotes.some((v) => v.equals(uid))

  if (alreadyVoted) {
    review.helpfulVotes = review.helpfulVotes.filter((v) => !v.equals(uid))
  } else {
    review.helpfulVotes.push(uid)
  }
  await review.save()

  return { helpfulCount: review.helpfulVotes.length, voted: !alreadyVoted }
}

// ─── Report review ────────────────────────────────────────────────────────────
export const reportReview = async (
  reviewId: string,
  userId: string,
  reason: ReportReason = 'spam',
  details?: string,
): Promise<void> => {
  if (!mongoose.isValidObjectId(reviewId)) throw new AppError('Invalid review ID', 400)

  const review = await Review.findById(reviewId)
  if (!review) throw new AppError('Review not found', 404)

  const uid = new mongoose.Types.ObjectId(userId)
  if (!review.reportedBy.some((r) => r.equals(uid))) {
    review.reportedBy.push(uid)
    if (review.reportedBy.length >= 3) {
      review.status = 'FLAGGED'
    }
    await review.save()
  }

  await ReviewReport.findOneAndUpdate(
    { reviewId: new mongoose.Types.ObjectId(reviewId), reporterId: uid },
    { reason, details, status: 'PENDING' },
    { upsert: true },
  )
}

// ─── Seller Reviews & Reputation ──────────────────────────────────────────────

export const getSellerReviews = async (sellerId: string, page = 1, limit = 10) => {
  if (!mongoose.isValidObjectId(sellerId)) throw new AppError('Invalid seller ID', 400)
  const skip = (page - 1) * limit
  const sid = new mongoose.Types.ObjectId(sellerId)

  const [reviews, total] = await Promise.all([
    Review.find({ sellerId: sid, status: 'PUBLISHED' })
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(limit)
      .populate('userId', 'firstName lastName username profileImage')
      .populate('productId', 'title thumbnail price')
      .lean(),
    Review.countDocuments({ sellerId: sid, status: 'PUBLISHED' }),
  ])

  return {
    reviews,
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

export const getSellerReputationScore = async (sellerId: string) => {
  if (!mongoose.isValidObjectId(sellerId)) throw new AppError('Invalid seller ID', 400)
  const sid = new mongoose.Types.ObjectId(sellerId)

  let reputation = await SellerReputation.findOne({ sellerId: sid }).lean()
  if (!reputation) {
    await recalculateSellerReputation(sellerId)
    reputation = await SellerReputation.findOne({ sellerId: sid }).lean()
  }
  return reputation
}

// ─── Admin Moderation APIs ───────────────────────────────────────────────────

export const getModerationQueue = async (status?: string, page = 1, limit = 20) => {
  const filter: Record<string, unknown> = status
    ? { status }
    : { status: { $in: ['PENDING', 'FLAGGED'] } }
  const skip = (page - 1) * limit

  const [reviews, total] = await Promise.all([
    Review.find(filter)
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(limit)
      .populate('userId', 'firstName lastName email')
      .populate('productId', 'title thumbnail')
      .lean(),
    Review.countDocuments(filter),
  ])

  return {
    reviews,
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

export const moderateReview = async (
  reviewId: string,
  status: ReviewStatus,
  moderatorNotes?: string,
) => {
  if (!mongoose.isValidObjectId(reviewId)) throw new AppError('Invalid review ID', 400)

  const review = await Review.findByIdAndUpdate(reviewId, { status }, { new: true })
  if (!review) throw new AppError('Review not found', 404)

  if (moderatorNotes) {
    await ReviewReport.updateMany(
      { reviewId: new mongoose.Types.ObjectId(reviewId) },
      { status: 'RESOLVED', moderatorNotes },
    )
  }

  await recalculateRatings(review.productId.toString())
  return review
}

// ─── Q&A: get questions for a product ────────────────────────────────────────
export const getQuestions = async (productId: string): Promise<IQuestionDocument[]> => {
  if (!mongoose.isValidObjectId(productId)) throw new AppError('Invalid product ID', 400)

  return Question.find({ productId: new mongoose.Types.ObjectId(productId) })
    .sort({ createdAt: -1 })
    .populate('userId', 'firstName lastName username profileImage')
    .populate('answers.userId', 'firstName lastName username profileImage')
    .lean() as unknown as IQuestionDocument[]
}

// ─── Q&A: ask a question ──────────────────────────────────────────────────────
export const addQuestion = async (
  productId: string,
  userId: string,
  question: string,
): Promise<IQuestionDocument> => {
  if (!mongoose.isValidObjectId(productId)) throw new AppError('Invalid product ID', 400)

  const product = await Product.findOne({
    _id: productId,
    status: { $in: ['PUBLISHED', 'active', 'APPROVED'] },
  })
  if (!product) throw new AppError('Product not found', 404)

  const q = await Question.create({
    productId: new mongoose.Types.ObjectId(productId),
    userId: new mongoose.Types.ObjectId(userId),
    question: question.trim(),
  })

  return q.populate('userId', 'firstName lastName username profileImage')
}

// ─── Q&A: answer a question ───────────────────────────────────────────────────
export const addAnswer = async (
  questionId: string,
  userId: string,
  answer: string,
): Promise<IQuestionDocument> => {
  if (!mongoose.isValidObjectId(questionId)) throw new AppError('Invalid question ID', 400)

  const q = await Question.findById(questionId)
  if (!q) throw new AppError('Question not found', 404)

  q.answers.push({
    _id: new mongoose.Types.ObjectId(),
    userId: new mongoose.Types.ObjectId(userId),
    answer: answer.trim(),
    likes: [],
    createdAt: new Date(),
  })
  await q.save()

  return q.populate([
    { path: 'userId', select: 'firstName lastName username profileImage' },
    { path: 'answers.userId', select: 'firstName lastName username profileImage' },
  ])
}
