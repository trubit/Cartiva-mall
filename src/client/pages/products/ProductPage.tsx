import { useState, useEffect } from 'react'
import { useParams, Link } from 'react-router-dom'
import {
  FiShoppingCart,
  FiMinus,
  FiPlus,
  FiArrowLeft,
  FiThumbsUp,
  FiFlag,
  FiMessageCircle,
  FiChevronDown,
  FiChevronUp,
} from 'react-icons/fi'
import {
  useProduct,
  useProductReviews,
  useAddReview,
  useVoteHelpful,
  useReportReview,
  useQuestions,
  useAddQuestion,
  useAddAnswer,
} from '../../hooks/useProducts.js'
import { useAuthStore } from '../../store/authStore.js'
import { useCart } from '../../hooks/useCart.js'
import ImageGallery from '../../components/product/ImageGallery/index.js'
import RatingStars from '../../components/product/RatingStars/index.js'
import PriceTag from '../../components/product/PriceTag/index.js'
import ProductBadges from '../../components/product/Badge/index.js'
import RelatedProducts from '../../components/product/RelatedProducts/index.js'
import QuickViewModal from '../../components/product/QuickViewModal/index.js'
import { dashboardService } from '../../services/dashboardService.js'
import type { IQuestion } from '../../../shared/types/product.types.js'
import { useFrequentlyBoughtTogether, useTrackBehavior } from '../../hooks/useRecommendations.js'
import ProductCarousel from '../../components/product/ProductCarousel/index.js'

function ReviewSection({ productId }: { productId: string }) {
  const { data } = useProductReviews(productId)
  const { mutate, isPending } = useAddReview(productId)
  const { mutate: vote } = useVoteHelpful(productId)
  const { mutate: report } = useReportReview(productId)
  const isAuthenticated = useAuthStore((s) => s.isAuthenticated)
  const user = useAuthStore((s) => s.user)
  const reviews = data?.data ?? []
  const [rating, setRating] = useState(5)
  const [title, setTitle] = useState('')
  const [body, setBody] = useState('')
  const [submitted, setSubmitted] = useState(false)
  const [starFilter, setStarFilter] = useState<number | null>(null)
  const [reported, setReported] = useState<Set<string>>(new Set())

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    mutate(
      { rating, title, body },
      {
        onSuccess: () => {
          setSubmitted(true)
          setTitle('')
          setBody('')
        },
      },
    )
  }

  const handleReport = (reviewId: string) => {
    if (reported.has(reviewId)) return
    report(reviewId, {
      onSuccess: () => setReported((prev) => new Set(prev).add(reviewId)),
    })
  }

  const avg = reviews.length ? reviews.reduce((s, r) => s + r.rating, 0) / reviews.length : 0

  const ratingDist = [5, 4, 3, 2, 1].map((star) => {
    const count = reviews.filter((r) => r.rating === star).length
    return { star, count, pct: reviews.length ? (count / reviews.length) * 100 : 0 }
  })

  const visible = starFilter ? reviews.filter((r) => r.rating === starFilter) : reviews

  return (
    <div style={{ marginTop: '3rem' }}>
      <h3 style={{ fontWeight: 700, marginBottom: '1.5rem' }}>Customer Reviews</h3>

      {reviews.length > 0 && (
        <div className="review-summary">
          <div style={{ textAlign: 'center', minWidth: 80 }}>
            <div className="review-summary__avg">{avg.toFixed(1)}</div>
            <RatingStars value={avg} size="md" />
            <div
              style={{
                fontSize: 'var(--text-xs)',
                color: 'var(--color-neutral-500)',
                marginTop: 4,
              }}
            >
              {reviews.length} review{reviews.length !== 1 ? 's' : ''}
            </div>
          </div>
          <div className="review-summary__bars">
            {ratingDist.map(({ star, count, pct }) => (
              <button
                key={star}
                className="review-bar"
                onClick={() => setStarFilter(starFilter === star ? null : star)}
                style={{
                  background: starFilter === star ? 'var(--color-brand-light)' : 'none',
                  border: 'none',
                  cursor: 'pointer',
                  width: '100%',
                  textAlign: 'left',
                  borderRadius: 'var(--radius-sm)',
                  padding: '2px 4px',
                }}
              >
                <RatingStars value={star} max={1} size="sm" />
                <span>{star}</span>
                <div className="review-bar__track">
                  <div className="review-bar__fill" style={{ width: `${pct}%` }} />
                </div>
                <span>{count}</span>
              </button>
            ))}
          </div>
        </div>
      )}

      {starFilter && (
        <div style={{ marginBottom: '0.75rem', display: 'flex', alignItems: 'center', gap: 8 }}>
          <span style={{ fontSize: 'var(--text-sm)', color: 'var(--color-neutral-500)' }}>
            Showing {starFilter}-star reviews ({visible.length})
          </span>
          <button
            onClick={() => setStarFilter(null)}
            style={{
              background: 'none',
              border: 'none',
              color: 'var(--color-brand-accent)',
              cursor: 'pointer',
              fontSize: 'var(--text-xs)',
              fontWeight: 600,
            }}
          >
            Clear filter
          </button>
        </div>
      )}

      <div>
        {visible.map((r) => {
          const rUser = typeof r.userId === 'object' ? r.userId : null
          const name = rUser ? `${rUser.firstName} ${rUser.lastName}` : 'Customer'
          const myId = user?._id ?? ''
          const iVoted = r.helpfulVotes?.includes(myId)

          return (
            <div key={r._id} className="review-card">
              <div className="review-card__header">
                <div className="review-card__avatar">{name[0].toUpperCase()}</div>
                <div>
                  <div className="review-card__author">{name}</div>
                  <div className="review-card__date">
                    {new Date(r.createdAt).toLocaleDateString()}
                  </div>
                </div>
                <div style={{ marginLeft: 'auto' }}>
                  <RatingStars value={r.rating} size="sm" />
                </div>
              </div>
              {r.isVerified && (
                <div
                  style={{
                    fontSize: 'var(--text-xs)',
                    color: 'var(--color-success)',
                    marginBottom: 4,
                  }}
                >
                  ✓ Verified Purchase
                </div>
              )}
              {r.title && <div className="review-card__title">{r.title}</div>}
              <div className="review-card__body">{r.body}</div>

              {r.sellerReply && (
                <div
                  style={{
                    marginTop: 8,
                    padding: '0.625rem 0.875rem',
                    background: 'var(--color-neutral-50)',
                    borderLeft: '3px solid var(--color-brand-accent)',
                    borderRadius: '0 var(--radius-md) var(--radius-md) 0',
                    fontSize: 'var(--text-sm)',
                  }}
                >
                  <span style={{ fontWeight: 600, marginRight: 6 }}>Seller reply:</span>
                  {r.sellerReply}
                </div>
              )}

              <div style={{ display: 'flex', gap: 12, marginTop: 10, alignItems: 'center' }}>
                <span style={{ fontSize: 'var(--text-xs)', color: 'var(--color-neutral-400)' }}>
                  Helpful?
                </span>
                <button
                  onClick={() => isAuthenticated && vote(r._id)}
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: 4,
                    background: iVoted ? 'var(--color-brand-light)' : 'none',
                    border: '1px solid var(--color-neutral-200)',
                    borderRadius: 'var(--radius-md)',
                    padding: '3px 8px',
                    fontSize: 'var(--text-xs)',
                    cursor: isAuthenticated ? 'pointer' : 'default',
                    color: iVoted ? 'var(--color-brand-accent)' : 'var(--color-neutral-500)',
                    fontWeight: iVoted ? 600 : 400,
                  }}
                  title={isAuthenticated ? undefined : 'Sign in to vote'}
                >
                  <FiThumbsUp size={11} />
                  {r.helpfulVotes?.length ?? 0}
                </button>
                {isAuthenticated && !reported.has(r._id) && (
                  <button
                    onClick={() => handleReport(r._id)}
                    style={{
                      display: 'flex',
                      alignItems: 'center',
                      gap: 3,
                      background: 'none',
                      border: 'none',
                      padding: '3px 6px',
                      fontSize: 'var(--text-xs)',
                      cursor: 'pointer',
                      color: 'var(--color-neutral-400)',
                    }}
                    title="Report this review"
                  >
                    <FiFlag size={11} /> Report
                  </button>
                )}
                {reported.has(r._id) && (
                  <span style={{ fontSize: 'var(--text-xs)', color: 'var(--color-neutral-400)' }}>
                    Reported
                  </span>
                )}
              </div>
            </div>
          )
        })}
        {visible.length === 0 && (
          <p style={{ color: 'var(--color-neutral-500)', fontSize: 'var(--text-sm)' }}>
            {starFilter
              ? `No ${starFilter}-star reviews yet.`
              : 'No reviews yet. Be the first to review this product!'}
          </p>
        )}
      </div>

      {isAuthenticated && !submitted && (
        <div
          style={{
            marginTop: '2rem',
            padding: '1.5rem',
            background: 'var(--color-neutral-50)',
            borderRadius: 'var(--radius-xl)',
            border: '1px solid var(--color-neutral-200)',
          }}
        >
          <h4 style={{ fontWeight: 700, marginBottom: '1rem' }}>Write a Review</h4>
          <form
            onSubmit={handleSubmit}
            style={{ display: 'flex', flexDirection: 'column', gap: '0.875rem' }}
          >
            <div>
              <label
                style={{
                  fontSize: 'var(--text-sm)',
                  fontWeight: 600,
                  display: 'block',
                  marginBottom: 6,
                }}
              >
                Rating
              </label>
              <div style={{ display: 'flex', gap: 4 }}>
                {[1, 2, 3, 4, 5].map((n) => (
                  <button
                    key={n}
                    type="button"
                    onClick={() => setRating(n)}
                    style={{
                      background: 'none',
                      border: 'none',
                      cursor: 'pointer',
                      fontSize: '1.5rem',
                      color: n <= rating ? 'var(--star-filled)' : 'var(--star-empty)',
                      padding: 2,
                    }}
                  >
                    ★
                  </button>
                ))}
              </div>
            </div>
            <div>
              <label
                style={{
                  fontSize: 'var(--text-sm)',
                  fontWeight: 600,
                  display: 'block',
                  marginBottom: 6,
                }}
              >
                Title{' '}
                <span style={{ fontWeight: 400, color: 'var(--color-neutral-400)' }}>
                  (optional)
                </span>
              </label>
              <input
                type="text"
                className="form-control"
                placeholder="Summarize your experience"
                value={title}
                maxLength={120}
                onChange={(e) => setTitle(e.target.value)}
              />
            </div>
            <div>
              <label
                style={{
                  fontSize: 'var(--text-sm)',
                  fontWeight: 600,
                  display: 'block',
                  marginBottom: 6,
                }}
              >
                Review
              </label>
              <textarea
                className="form-control"
                rows={4}
                placeholder="Tell others about your experience…"
                value={body}
                minLength={10}
                maxLength={2000}
                onChange={(e) => setBody(e.target.value)}
                required
              />
            </div>
            <button
              type="submit"
              className="product-detail__add-btn"
              disabled={isPending || body.length < 10}
              style={{ width: 'fit-content' }}
            >
              {isPending ? 'Submitting…' : 'Submit Review'}
            </button>
          </form>
        </div>
      )}

      {submitted && (
        <div
          style={{
            marginTop: '1.5rem',
            padding: '1rem',
            background: 'var(--color-success-50)',
            borderRadius: 'var(--radius-lg)',
            color: 'var(--color-success)',
          }}
        >
          ✓ Thank you for your review!
        </div>
      )}

      {!isAuthenticated && (
        <p
          style={{
            marginTop: '1.5rem',
            fontSize: 'var(--text-sm)',
            color: 'var(--color-neutral-500)',
          }}
        >
          <Link to="/login" style={{ color: 'var(--color-brand-accent)', fontWeight: 600 }}>
            Sign in
          </Link>{' '}
          to write a review.
        </p>
      )}
    </div>
  )
}

function QASection({ productId }: { productId: string }) {
  const { data: questions = [] } = useQuestions(productId)
  const { mutate: askQuestion, isPending: isAsking } = useAddQuestion(productId)
  const { mutate: answerQ, isPending: isAnswering } = useAddAnswer(productId)
  const isAuthenticated = useAuthStore((s) => s.isAuthenticated)

  const [newQ, setNewQ] = useState('')
  const [openAnswers, setOpenAnswers] = useState<Set<string>>(new Set())
  const [answerText, setAnswerText] = useState<Record<string, string>>({})

  const toggleAnswers = (qId: string) => {
    setOpenAnswers((prev) => {
      const next = new Set(prev)
      if (next.has(qId)) {
        next.delete(qId)
      } else {
        next.add(qId)
      }
      return next
    })
  }

  const handleAsk = (e: React.FormEvent) => {
    e.preventDefault()
    if (newQ.trim().length < 10) return
    askQuestion(newQ, { onSuccess: () => setNewQ('') })
  }

  const handleAnswer = (qId: string) => {
    const text = answerText[qId] ?? ''
    if (text.trim().length < 2) return
    answerQ(
      { questionId: qId, answer: text },
      { onSuccess: () => setAnswerText((p) => ({ ...p, [qId]: '' })) },
    )
  }

  return (
    <div style={{ marginTop: '3rem' }}>
      <h3
        style={{
          fontWeight: 700,
          marginBottom: '1.5rem',
          display: 'flex',
          alignItems: 'center',
          gap: 8,
        }}
      >
        <FiMessageCircle size={18} /> Questions & Answers
        <span
          style={{ fontSize: 'var(--text-sm)', fontWeight: 400, color: 'var(--color-neutral-400)' }}
        >
          ({questions.length})
        </span>
      </h3>

      {(questions as IQuestion[]).map((q) => {
        const qUser = typeof q.userId === 'object' ? q.userId : null
        const qName = qUser ? `${qUser.firstName} ${qUser.lastName}` : 'Customer'
        const open = openAnswers.has(q._id)

        return (
          <div
            key={q._id}
            style={{
              borderBottom: '1px solid var(--color-neutral-100)',
              paddingBottom: '1rem',
              marginBottom: '1rem',
            }}
          >
            <div style={{ display: 'flex', gap: 8, alignItems: 'flex-start' }}>
              <span
                style={{
                  fontWeight: 700,
                  fontSize: 'var(--text-sm)',
                  color: 'var(--color-brand-accent)',
                  minWidth: 16,
                }}
              >
                Q
              </span>
              <div style={{ flex: 1 }}>
                <div style={{ fontWeight: 600, fontSize: 'var(--text-sm)', lineHeight: 1.5 }}>
                  {q.question}
                </div>
                <div
                  style={{
                    fontSize: 'var(--text-xs)',
                    color: 'var(--color-neutral-400)',
                    marginTop: 2,
                  }}
                >
                  {qName} · {new Date(q.createdAt).toLocaleDateString()}
                </div>

                <button
                  onClick={() => toggleAnswers(q._id)}
                  style={{
                    background: 'none',
                    border: 'none',
                    cursor: 'pointer',
                    fontSize: 'var(--text-xs)',
                    color: 'var(--color-brand-accent)',
                    fontWeight: 600,
                    marginTop: 6,
                    display: 'flex',
                    alignItems: 'center',
                    gap: 4,
                    padding: 0,
                  }}
                >
                  {q.answers.length} answer{q.answers.length !== 1 ? 's' : ''}
                  {open ? <FiChevronUp size={12} /> : <FiChevronDown size={12} />}
                </button>

                {open && (
                  <div style={{ marginTop: 8 }}>
                    {q.answers.map((a) => {
                      const aUser = typeof a.userId === 'object' ? a.userId : null
                      const aName = aUser ? `${aUser.firstName} ${aUser.lastName}` : 'Community'
                      return (
                        <div
                          key={a._id}
                          style={{
                            display: 'flex',
                            gap: 8,
                            marginBottom: 8,
                            paddingLeft: 8,
                            borderLeft: '2px solid var(--color-neutral-200)',
                          }}
                        >
                          <span
                            style={{
                              fontWeight: 700,
                              fontSize: 'var(--text-sm)',
                              color: 'var(--color-neutral-500)',
                              minWidth: 16,
                            }}
                          >
                            A
                          </span>
                          <div>
                            <div style={{ fontSize: 'var(--text-sm)', lineHeight: 1.5 }}>
                              {a.answer}
                            </div>
                            <div
                              style={{
                                fontSize: 'var(--text-xs)',
                                color: 'var(--color-neutral-400)',
                                marginTop: 2,
                              }}
                            >
                              {aName} · {new Date(a.createdAt).toLocaleDateString()}
                            </div>
                          </div>
                        </div>
                      )
                    })}

                    {q.answers.length === 0 && (
                      <p
                        style={{
                          fontSize: 'var(--text-sm)',
                          color: 'var(--color-neutral-400)',
                          marginBottom: 8,
                        }}
                      >
                        No answers yet.
                      </p>
                    )}

                    {isAuthenticated && (
                      <div style={{ display: 'flex', gap: 8, marginTop: 4 }}>
                        <input
                          type="text"
                          className="form-control"
                          placeholder="Write an answer…"
                          value={answerText[q._id] ?? ''}
                          onChange={(e) =>
                            setAnswerText((p) => ({ ...p, [q._id]: e.target.value }))
                          }
                          style={{ flex: 1, fontSize: 'var(--text-sm)' }}
                        />
                        <button
                          onClick={() => handleAnswer(q._id)}
                          disabled={isAnswering || (answerText[q._id] ?? '').trim().length < 2}
                          className="btn btn-primary"
                          style={{ fontSize: 'var(--text-xs)', whiteSpace: 'nowrap' }}
                        >
                          Post
                        </button>
                      </div>
                    )}
                  </div>
                )}
              </div>
            </div>
          </div>
        )
      })}

      {questions.length === 0 && (
        <p
          style={{
            color: 'var(--color-neutral-500)',
            fontSize: 'var(--text-sm)',
            marginBottom: '1rem',
          }}
        >
          No questions yet. Ask the first one!
        </p>
      )}

      {isAuthenticated ? (
        <form
          onSubmit={handleAsk}
          style={{
            marginTop: '1rem',
            padding: '1.25rem',
            background: 'var(--color-neutral-50)',
            borderRadius: 'var(--radius-xl)',
            border: '1px solid var(--color-neutral-200)',
          }}
        >
          <label
            style={{
              fontWeight: 600,
              fontSize: 'var(--text-sm)',
              display: 'block',
              marginBottom: 8,
            }}
          >
            Ask a Question
          </label>
          <div style={{ display: 'flex', gap: 8 }}>
            <input
              type="text"
              className="form-control"
              placeholder="Type your question (min 10 characters)…"
              value={newQ}
              minLength={10}
              maxLength={500}
              onChange={(e) => setNewQ(e.target.value)}
              style={{ flex: 1 }}
            />
            <button
              type="submit"
              className="btn btn-primary"
              disabled={isAsking || newQ.trim().length < 10}
              style={{ whiteSpace: 'nowrap' }}
            >
              {isAsking ? 'Posting…' : 'Ask'}
            </button>
          </div>
        </form>
      ) : (
        <p
          style={{
            fontSize: 'var(--text-sm)',
            color: 'var(--color-neutral-500)',
            marginTop: '0.75rem',
          }}
        >
          <Link to="/login" style={{ color: 'var(--color-brand-accent)', fontWeight: 600 }}>
            Sign in
          </Link>{' '}
          to ask or answer questions.
        </p>
      )}
    </div>
  )
}

export default function ProductPage() {
  const { id } = useParams<{ id: string }>()
  const { data: product, isLoading, isError } = useProduct(id ?? '')
  const { addToCart } = useCart()
  const isAuthenticated = useAuthStore((s) => s.isAuthenticated)
  const [qty, setQty] = useState(1)
  const { data: fbt = [] } = useFrequentlyBoughtTogether(id ?? '', 8)
  const { mutate: trackBehavior } = useTrackBehavior()
  const [fbtQuickView, setFbtQuickView] = useState<
    import('../../../shared/types/product.types.js').IProduct | null
  >(null)

  // Track recently viewed + view behaviour event (fire-and-forget)
  useEffect(() => {
    if (product?._id) {
      if (isAuthenticated) {
        dashboardService.trackRecentlyViewed(product._id).catch(() => {})
        trackBehavior({
          eventType: 'view',
          productId: product._id,
          category: product.category,
        })
      }
    }
  }, [product?._id, product?.category, isAuthenticated, trackBehavior])

  if (isLoading) {
    return (
      <div className="container section">
        <div className="product-detail">
          <div
            style={{
              aspectRatio: '1/1',
              background: 'var(--color-neutral-100)',
              borderRadius: 'var(--radius-xl)',
            }}
            className="skeleton-img"
          />
          <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
            {[60, 40, 80, 50, 90].map((w, i) => (
              <div
                key={i}
                className="skeleton-line"
                style={{ width: `${w}%`, height: i === 0 ? 28 : 16 }}
              />
            ))}
          </div>
        </div>
      </div>
    )
  }

  if (isError || !product) {
    return (
      <div className="container section" style={{ textAlign: 'center', padding: '5rem 2rem' }}>
        <div style={{ fontSize: '3rem' }}>😕</div>
        <h2>Product not found</h2>
        <Link to="/products" style={{ color: 'var(--color-brand-accent)' }}>
          ← Browse products
        </Link>
      </div>
    )
  }

  const inStock = product.stockQuantity > 0
  const lowStock = inStock && product.stockQuantity <= 5
  const safeQty = Math.min(qty, product.stockQuantity)

  return (
    <div className="container section">
      <nav
        style={{
          marginBottom: '1.5rem',
          fontSize: 'var(--text-sm)',
          color: 'var(--color-neutral-500)',
        }}
      >
        <Link to="/" style={{ color: 'inherit' }}>
          Home
        </Link>{' '}
        /{' '}
        <Link to="/products" style={{ color: 'inherit' }}>
          Products
        </Link>{' '}
        /{' '}
        <Link to={`/category/${encodeURIComponent(product.category)}`} style={{ color: 'inherit' }}>
          {product.category}
        </Link>{' '}
        / <span style={{ color: 'var(--color-brand-text)' }}>{product.title}</span>
      </nav>

      <div className="product-detail">
        <ImageGallery images={product.images} title={product.title} />

        <div>
          <ProductBadges product={product} />
          {product.brand && (
            <div className="product-detail__brand" style={{ marginTop: 8 }}>
              {product.brand}
            </div>
          )}
          <h1 className="product-detail__title">{product.title}</h1>

          <div className="product-detail__rating-row">
            <RatingStars value={product.ratingsAverage} size="md" showValue />
            <span style={{ fontSize: 'var(--text-sm)', color: 'var(--color-neutral-500)' }}>
              ({product.ratingsCount} review{product.ratingsCount !== 1 ? 's' : ''})
            </span>
          </div>

          <div className="product-detail__price-row">
            <PriceTag
              price={product.price}
              discountPrice={product.discountPrice}
              size="lg"
              showSave
              showOriginalConversionNotice
            />
            <span
              className={`product-detail__stock product-detail__stock--${!inStock ? 'out' : lowStock ? 'low' : 'in'}`}
            >
              {!inStock
                ? 'Out of Stock'
                : lowStock
                  ? `Only ${product.stockQuantity} left!`
                  : 'In Stock'}
            </span>
          </div>

          <p
            style={{
              color: 'var(--color-neutral-600)',
              lineHeight: 1.7,
              fontSize: 'var(--text-sm)',
              margin: '1rem 0 1.25rem',
            }}
          >
            {product.description}
          </p>

          {inStock && (
            <div
              style={{ display: 'flex', gap: '1rem', alignItems: 'center', marginBottom: '1rem' }}
            >
              <div className="product-detail__qty">
                <button
                  className="product-detail__qty-btn"
                  onClick={() => setQty((q) => Math.max(1, q - 1))}
                  disabled={qty <= 1}
                >
                  <FiMinus size={14} />
                </button>
                <span className="product-detail__qty-val">{safeQty}</span>
                <button
                  className="product-detail__qty-btn"
                  onClick={() => setQty((q) => Math.min(product.stockQuantity, q + 1))}
                  disabled={qty >= product.stockQuantity}
                >
                  <FiPlus size={14} />
                </button>
              </div>
              <button
                className="product-detail__add-btn"
                onClick={() => addToCart(product, safeQty)}
                style={{ flex: 1 }}
              >
                <FiShoppingCart size={18} /> Add to Cart
              </button>
            </div>
          )}

          {!inStock && (
            <button
              className="product-detail__add-btn"
              disabled
              style={{ width: '100%', marginBottom: '1rem' }}
            >
              Out of Stock
            </button>
          )}

          {product.tags.length > 0 && (
            <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap', marginTop: '0.75rem' }}>
              {product.tags.map((tag) => (
                <span
                  key={tag}
                  style={{
                    padding: '0.2rem 0.625rem',
                    background: 'var(--color-neutral-100)',
                    borderRadius: 'var(--radius-full)',
                    fontSize: 'var(--text-xs)',
                    color: 'var(--color-neutral-600)',
                    border: '1px solid var(--color-neutral-200)',
                  }}
                >
                  #{tag}
                </span>
              ))}
            </div>
          )}

          {(product.sellerInfo || (product.sellerId && typeof product.sellerId === 'object')) && (
            <div
              style={{
                marginTop: '1.25rem',
                padding: '1.25rem',
                background: 'var(--color-neutral-50)',
                borderRadius: 'var(--radius-xl)',
                border: '1px solid var(--color-neutral-200)',
                fontSize: 'var(--text-sm)',
              }}
            >
              <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                <div
                  style={{
                    width: 44,
                    height: 44,
                    borderRadius: '50%',
                    background: 'var(--color-neutral-200)',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    fontWeight: 700,
                    fontSize: '1rem',
                    color: 'var(--color-neutral-700)',
                    overflow: 'hidden',
                  }}
                >
                  {product.sellerInfo?.storeLogo ? (
                    <img
                      src={product.sellerInfo.storeLogo}
                      alt="Seller Logo"
                      style={{ width: '100%', height: '100%', objectFit: 'cover' }}
                    />
                  ) : (
                    (
                      product.sellerInfo?.storeName?.[0] ||
                      (typeof product.sellerId === 'object'
                        ? product.sellerId.firstName?.[0]
                        : 'S') ||
                      'S'
                    ).toUpperCase()
                  )}
                </div>
                <div>
                  <div
                    style={{
                      fontWeight: 700,
                      fontSize: '0.95rem',
                      color: 'var(--color-brand-text)',
                      display: 'flex',
                      alignItems: 'center',
                      gap: 6,
                    }}
                  >
                    {product.sellerInfo?.storeName ||
                      (typeof product.sellerId === 'object'
                        ? `${product.sellerId.firstName || ''} ${product.sellerId.lastName || ''}`.trim()
                        : 'Seller')}
                    {product.sellerInfo?.isVerified && (
                      <span
                        style={{
                          fontSize: '0.7rem',
                          padding: '1px 6px',
                          borderRadius: 4,
                          background: 'rgba(34, 197, 94, 0.15)',
                          color: '#22c55e',
                          fontWeight: 700,
                        }}
                      >
                        Verified
                      </span>
                    )}
                  </div>
                  {product.sellerInfo?.publicLocation && (
                    <div
                      style={{
                        fontSize: '0.8rem',
                        color: 'var(--color-neutral-500)',
                        marginTop: 2,
                      }}
                    >
                      📍 {product.sellerInfo.publicLocation}
                    </div>
                  )}
                </div>
              </div>
            </div>
          )}
        </div>
      </div>

      <ReviewSection productId={product._id} />
      <QASection productId={product._id} />

      {fbt.length > 0 && (
        <section style={{ marginTop: '2.5rem' }}>
          <div className="section-hd" style={{ marginBottom: '1rem' }}>
            <div>
              <div className="section-hd__label" style={{ color: '#b45309' }}>
                Customers Also Bought
              </div>
              <h2 className="section-hd__title" style={{ fontSize: 'var(--text-xl)' }}>
                Frequently Bought Together
              </h2>
            </div>
          </div>
          <ProductCarousel products={fbt} onQuickView={setFbtQuickView} />
          {fbtQuickView && (
            <QuickViewModal product={fbtQuickView} onClose={() => setFbtQuickView(null)} />
          )}
        </section>
      )}

      <RelatedProducts productId={product._id} category={product.category} />

      <div style={{ marginTop: '2rem' }}>
        <Link
          to="/products"
          style={{
            display: 'inline-flex',
            alignItems: 'center',
            gap: 6,
            color: 'var(--color-brand-accent)',
            fontWeight: 600,
            fontSize: 'var(--text-sm)',
            textDecoration: 'none',
          }}
        >
          <FiArrowLeft size={14} /> Back to Products
        </Link>
      </div>
    </div>
  )
}
