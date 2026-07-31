import { useEffect } from 'react'
import { Link } from 'react-router-dom'
import { FiX, FiShoppingCart, FiExternalLink } from 'react-icons/fi'
import RatingStars from '../RatingStars/index.js'
import PriceTag from '../PriceTag/index.js'
import ProductBadges from '../Badge/index.js'
import { useCart } from '../../../hooks/useCart.js'
import type { IProduct } from '../../../../shared/types/product.types.js'
import { getImageUrl } from '../../../utils/image.js'

interface QuickViewModalProps {
  product: IProduct
  onClose: () => void
}

export default function QuickViewModal({ product, onClose }: QuickViewModalProps) {
  const { addToCart } = useCart()
  const inStock = product.stockQuantity > 0

  useEffect(() => {
    document.body.style.overflow = 'hidden'
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose()
    }
    window.addEventListener('keydown', onKey)
    return () => {
      document.body.style.overflow = ''
      window.removeEventListener('keydown', onKey)
    }
  }, [onClose])

  return (
    <div className="quick-view-backdrop" onClick={onClose}>
      <div
        className="quick-view-modal"
        onClick={(e) => e.stopPropagation()}
        role="dialog"
        aria-modal
        aria-label={product.title}
      >
        <button className="quick-view-modal__close" onClick={onClose} aria-label="Close">
          <FiX size={16} />
        </button>

        {/* Image */}
        {getImageUrl(product.images[0]) ? (
          <img
            src={getImageUrl(product.images[0])}
            alt={product.title}
            className="quick-view-modal__img"
          />
        ) : (
          <div
            className="quick-view-modal__img"
            style={{
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              background: 'var(--color-neutral-100)',
              fontSize: '5rem',
            }}
          >
            🛍️
          </div>
        )}

        {/* Content */}
        <div className="quick-view-modal__content">
          <ProductBadges product={product} />

          <div className="quick-view-modal__category">{product.category}</div>
          <h2 className="quick-view-modal__title">{product.title}</h2>

          {product.ratingsCount > 0 && (
            <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
              <RatingStars value={product.ratingsAverage} size="sm" />
              <span style={{ fontSize: 'var(--text-xs)', color: 'var(--color-neutral-500)' }}>
                ({product.ratingsCount} reviews)
              </span>
            </div>
          )}

          <PriceTag
            price={product.price}
            discountPrice={product.discountPrice}
            size="lg"
            showSave
          />

          <p className="quick-view-modal__description">{product.description}</p>

          <p
            className={`quick-view-modal__stock quick-view-modal__stock--${inStock ? 'in' : 'out'}`}
          >
            {inStock ? `✓ ${product.stockQuantity} in stock` : '✗ Out of stock'}
          </p>

          <div style={{ display: 'flex', gap: '0.625rem', marginTop: 'auto' }}>
            <button
              className="product-detail__add-btn"
              onClick={() => {
                addToCart(product, 1)
                onClose()
              }}
              disabled={!inStock}
              style={{ flex: 1 }}
            >
              <FiShoppingCart size={16} />
              {inStock ? 'Add to Cart' : 'Out of Stock'}
            </button>

            <Link
              to={`/products/${product._id}`}
              onClick={onClose}
              style={{
                padding: '0.75rem',
                border: '1px solid var(--color-neutral-300)',
                borderRadius: 'var(--radius-lg)',
                display: 'flex',
                alignItems: 'center',
                color: 'var(--color-neutral-600)',
              }}
              title="View full details"
            >
              <FiExternalLink size={16} />
            </Link>
          </div>
        </div>
      </div>
    </div>
  )
}
