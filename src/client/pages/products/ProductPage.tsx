import { useState } from 'react'
import { useParams, Link } from 'react-router-dom'
import { FiShoppingCart, FiMinus, FiPlus, FiArrowLeft } from 'react-icons/fi'
import { useProduct, useProductReviews, useAddReview } from '../../hooks/useProducts.js'
import { useAuthStore } from '../../store/authStore.js'
import { useCart } from '../../hooks/useCart.js'
import ImageGallery from '../../components/product/ImageGallery/index.js'
import RatingStars from '../../components/product/RatingStars/index.js'
import PriceTag from '../../components/product/PriceTag/index.js'
import ProductBadges from '../../components/product/Badge/index.js'

function ReviewSection({ productId }: { productId: string }) {
  const { data } = useProductReviews(productId)
  const { mutate, isPending } = useAddReview(productId)
  const isAuthenticated = useAuthStore((s) => s.isAuthenticated)
  const reviews = data?.data ?? []
  const [rating, setRating] = useState(5)
  const [title, setTitle] = useState('')
  const [body, setBody] = useState('')
  const [submitted, setSubmitted] = useState(false)

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

  const avg = reviews.length ? reviews.reduce((s, r) => s + r.rating, 0) / reviews.length : 0

  const ratingDist = [5, 4, 3, 2, 1].map((star) => {
    const count = reviews.filter((r) => r.rating === star).length
    return { star, count, pct: reviews.length ? (count / reviews.length) * 100 : 0 }
  })

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
              <div key={star} className="review-bar">
                <RatingStars value={star} max={1} size="sm" />
                <span>{star}</span>
                <div className="review-bar__track">
                  <div className="review-bar__fill" style={{ width: `${pct}%` }} />
                </div>
                <span>{count}</span>
              </div>
            ))}
          </div>
        </div>
      )}

      <div>
        {reviews.map((r) => {
          const user = typeof r.userId === 'object' ? r.userId : null
          const name = user ? `${user.firstName} ${user.lastName}` : 'Customer'
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
              {r.title && <div className="review-card__title">{r.title}</div>}
              <div className="review-card__body">{r.body}</div>
            </div>
          )
        })}
        {reviews.length === 0 && (
          <p style={{ color: 'var(--color-neutral-500)', fontSize: 'var(--text-sm)' }}>
            No reviews yet. Be the first to review this product!
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

export default function ProductPage() {
  const { id } = useParams<{ id: string }>()
  const { data: product, isLoading, isError } = useProduct(id ?? '')
  const { addToCart } = useCart()
  const [qty, setQty] = useState(1)

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

          {product.sellerId && typeof product.sellerId === 'object' && (
            <div
              style={{
                marginTop: '1.25rem',
                padding: '0.875rem 1rem',
                background: 'var(--color-neutral-50)',
                borderRadius: 'var(--radius-lg)',
                border: '1px solid var(--color-neutral-200)',
                fontSize: 'var(--text-sm)',
                color: 'var(--color-neutral-600)',
              }}
            >
              Sold by{' '}
              <span style={{ fontWeight: 700, color: 'var(--color-brand-text)' }}>
                {product.sellerId.firstName} {product.sellerId.lastName}
              </span>
            </div>
          )}
        </div>
      </div>

      <ReviewSection productId={product._id} />

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
