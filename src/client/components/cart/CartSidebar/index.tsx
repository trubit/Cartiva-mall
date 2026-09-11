import { useEffect, useRef } from 'react'
import { Link } from 'react-router-dom'
import { FiX, FiShoppingCart } from 'react-icons/fi'
import { useCart } from '../../../hooks/useCart.js'
import { useCurrency } from '../../../hooks/useCurrency.js'
import { getImageUrl } from '../../../utils/image.js'

interface CartSidebarProps {
  isOpen: boolean
  onClose: () => void
}

export default function CartSidebar({ isOpen, onClose }: CartSidebarProps) {
  const { items, totals, removeFromCart, updateQuantity, isMutating } = useCart()
  const { formatPrice } = useCurrency()
  const overlayRef = useRef<HTMLDivElement>(null)

  // Close on Escape
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose()
    }
    if (isOpen) document.addEventListener('keydown', onKey)
    return () => document.removeEventListener('keydown', onKey)
  }, [isOpen, onClose])

  // Lock body scroll
  useEffect(() => {
    document.body.style.overflow = isOpen ? 'hidden' : ''
    return () => {
      document.body.style.overflow = ''
    }
  }, [isOpen])

  return (
    <>
      {/* Backdrop */}
      <div
        ref={overlayRef}
        className={`cart-sidebar__backdrop ${isOpen ? 'cart-sidebar__backdrop--visible' : ''}`}
        onClick={onClose}
        aria-hidden="true"
      />

      {/* Drawer */}
      <aside
        className={`cart-sidebar ${isOpen ? 'cart-sidebar--open' : ''}`}
        aria-label="Shopping cart"
        role="dialog"
        aria-modal="true"
      >
        {/* Header */}
        <div className="cart-sidebar__header">
          <div className="cart-sidebar__title-wrap">
            <FiShoppingCart size={20} />
            <h3 className="cart-sidebar__title">My Cart</h3>
            {totals.totalItems > 0 && (
              <span className="cart-sidebar__count">{totals.totalItems}</span>
            )}
          </div>
          <button className="cart-sidebar__close-btn" onClick={onClose} aria-label="Close cart">
            <FiX size={20} />
          </button>
        </div>

        {/* Items */}
        <div className="cart-sidebar__body">
          {items.length === 0 ? (
            <div className="cart-sidebar__empty">
              <FiShoppingCart size={40} strokeWidth={1} />
              <p>Your cart is empty</p>
              <button className="btn btn-primary btn-sm" onClick={onClose}>
                Start Shopping
              </button>
            </div>
          ) : (
            <ul className="cart-sidebar__items">
              {items.map((item) => (
                <li
                  key={`${item.productId}-${item.selectedVariant ?? ''}`}
                  className="cart-sidebar__item"
                >
                  <Link
                    to={`/products/${item.productId}`}
                    onClick={onClose}
                    className="cart-sidebar__item-img-wrap"
                  >
                    {getImageUrl(item.product.images?.[0]) ? (
                      <img
                        src={getImageUrl(item.product.images[0])}
                        alt={item.product.title}
                        className="cart-sidebar__item-img"
                      />
                    ) : (
                      <div className="cart-sidebar__item-img-placeholder">🛍️</div>
                    )}
                  </Link>

                  <div className="cart-sidebar__item-info">
                    <Link
                      to={`/products/${item.productId}`}
                      onClick={onClose}
                      className="cart-sidebar__item-title"
                    >
                      {item.product.title}
                    </Link>
                    <div className="cart-sidebar__item-row">
                      <div className="cart-sidebar__item-qty-btns">
                        <button
                          onClick={() => updateQuantity(item.productId, item.quantity - 1)}
                          disabled={isMutating || item.quantity <= 1}
                          className="cart-sidebar__qty-btn"
                        >
                          −
                        </button>
                        <span className="cart-sidebar__qty-val">{item.quantity}</span>
                        <button
                          onClick={() => updateQuantity(item.productId, item.quantity + 1)}
                          disabled={isMutating || item.quantity >= item.product.stockQuantity}
                          className="cart-sidebar__qty-btn"
                        >
                          +
                        </button>
                      </div>
                      <span className="cart-sidebar__item-price">
                        {formatPrice(item.lineTotal)}
                      </span>
                    </div>
                  </div>

                  <button
                    className="cart-sidebar__item-remove"
                    onClick={() => removeFromCart(item.productId)}
                    disabled={isMutating}
                    aria-label="Remove item"
                  >
                    <FiX size={14} />
                  </button>
                </li>
              ))}
            </ul>
          )}
        </div>

        {/* Footer */}
        {items.length > 0 && (
          <div className="cart-sidebar__footer">
            <div className="cart-sidebar__subtotal">
              <span>Subtotal</span>
              <strong>{formatPrice(totals.subtotal)}</strong>
            </div>
            {!totals.isFreeShipping && (
              <p className="cart-sidebar__shipping-hint">
                Add {formatPrice(totals.remainingForFreeShipping)} more for free shipping
              </p>
            )}
            <Link to="/cart" className="btn btn-primary cart-sidebar__view-btn" onClick={onClose}>
              View Cart & Checkout
            </Link>
          </div>
        )}
      </aside>
    </>
  )
}
