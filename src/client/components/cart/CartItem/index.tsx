import { Link } from 'react-router-dom'
import { FiTrash2 } from 'react-icons/fi'
import QuantitySelector from '../QuantitySelector/index.js'
import { useCurrency } from '../../../hooks/useCurrency.js'
import type { ICartDisplayItem } from '../../../../shared/types/cart.types.js'
import { getImageUrl } from '../../../utils/image.js'

interface CartItemProps {
  item: ICartDisplayItem
  onRemove: (productId: string) => void
  onUpdateQty: (productId: string, qty: number) => void
  isMutating?: boolean
}

export default function CartItem({ item, onRemove, onUpdateQty, isMutating }: CartItemProps) {
  const { formatPrice } = useCurrency()
  const { product, quantity, itemPrice, lineTotal, selectedVariant, selectedSize, selectedColor } =
    item
  const thumb = getImageUrl(product.images?.[0])

  return (
    <div className="cart-item">
      {/* Thumbnail */}
      <Link to={`/products/${product._id}`} className="cart-item__img-wrap">
        {thumb ? (
          <img src={thumb} alt={product.title} className="cart-item__img" loading="lazy" />
        ) : (
          <div className="cart-item__img--placeholder">🛍️</div>
        )}
      </Link>

      {/* Details */}
      <div className="cart-item__details">
        <Link to={`/products/${product._id}`} className="cart-item__title">
          {product.title}
        </Link>

        {/* Variants */}
        {(selectedVariant || selectedSize || selectedColor) && (
          <div className="cart-item__variants">
            {selectedVariant && <span className="cart-item__variant-tag">{selectedVariant}</span>}
            {selectedSize && <span className="cart-item__variant-tag">Size: {selectedSize}</span>}
            {selectedColor && (
              <span className="cart-item__variant-tag">Color: {selectedColor}</span>
            )}
          </div>
        )}

        <div className="cart-item__price-row">
          <span className="cart-item__unit-price">{formatPrice(itemPrice)} each</span>
          {product.discountPrice && product.price > itemPrice && (
            <span className="cart-item__original-price">{formatPrice(product.price)}</span>
          )}
        </div>

        {product.stockQuantity <= 5 && product.stockQuantity > 0 && (
          <span className="cart-item__low-stock">Only {product.stockQuantity} left!</span>
        )}
      </div>

      {/* Controls */}
      <div className="cart-item__controls">
        <QuantitySelector
          quantity={quantity}
          maxQuantity={product.stockQuantity}
          onDecrease={() => onUpdateQty(product._id, quantity - 1)}
          onIncrease={() => onUpdateQty(product._id, quantity + 1)}
          onChange={(qty) => onUpdateQty(product._id, qty)}
          disabled={isMutating}
          size="md"
        />

        <div className="cart-item__line-total">{formatPrice(lineTotal)}</div>

        <button
          className="cart-item__remove-btn"
          onClick={() => onRemove(product._id)}
          disabled={isMutating}
          aria-label={`Remove ${product.title} from cart`}
        >
          <FiTrash2 size={16} />
        </button>
      </div>
    </div>
  )
}
