import { Link } from 'react-router-dom'
import { FiShoppingCart, FiEye } from 'react-icons/fi'
import RatingStars from '../RatingStars/index.js'
import PriceTag from '../PriceTag/index.js'
import ProductBadges from '../Badge/index.js'
import { useCart } from '../../../hooks/useCart.js'
import type { IProduct } from '../../../../shared/types/product.types.js'
import { getImageUrl } from '../../../utils/image.js'

interface ProductCardProps {
  product: IProduct
  onQuickView?: (product: IProduct) => void
}

export default function ProductCard({ product, onQuickView }: ProductCardProps) {
  const { addToCart } = useCart()
  const inStock = product.stockQuantity > 0

  const handleAddToCart = (e: React.MouseEvent) => {
    e.preventDefault()
    e.stopPropagation()
    if (inStock) addToCart(product, 1)
  }

  const handleQuickView = (e: React.MouseEvent) => {
    e.preventDefault()
    e.stopPropagation()
    onQuickView?.(product)
  }

  return (
    <article className="product-card">
      {/* Image */}
      <div className="product-card__img-wrap">
        <ProductBadges product={product} />

        {getImageUrl(product.images[0]) ? (
          <img
            src={getImageUrl(product.images[0])}
            alt={product.title}
            className="product-card__img"
            loading="lazy"
          />
        ) : (
          <div className="product-card__img--placeholder">
            <span>🛍️</span>
          </div>
        )}

        <button
          className="product-card__quick-view"
          onClick={handleQuickView}
          aria-label="Quick view"
        >
          <FiEye size={14} style={{ marginRight: 5 }} />
          Quick View
        </button>
      </div>

      {/* Body */}
      <div className="product-card__body">
        <div className="product-card__meta">
          <span>{product.category}</span>
          {product.brand && (
            <>
              <span className="product-card__meta-sep">·</span>
              <span>{product.brand}</span>
            </>
          )}
        </div>

        <Link to={`/products/${product._id}`} className="product-card__title">
          {product.title}
        </Link>

        {product.ratingsCount > 0 && (
          <div className="product-card__rating">
            <RatingStars value={product.ratingsAverage} size="sm" />
            <span className="product-card__rating-count">({product.ratingsCount})</span>
          </div>
        )}

        <div className="product-card__price-wrap" style={{ marginTop: 'auto' }}>
          <PriceTag price={product.price} discountPrice={product.discountPrice} size="sm" />
        </div>

        <div className="product-card__actions">
          <button className="product-card__add-btn" onClick={handleAddToCart} disabled={!inStock}>
            <FiShoppingCart size={14} />
            {inStock ? 'Add to Cart' : 'Out of Stock'}
          </button>
        </div>
      </div>
    </article>
  )
}
