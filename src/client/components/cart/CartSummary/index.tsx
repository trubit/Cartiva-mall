import { Link } from 'react-router-dom'
import { FiShield, FiRefreshCw } from 'react-icons/fi'
import ShippingEstimator from '../ShippingEstimator/index.js'
import CouponBox from '../CouponBox/index.js'
import { useCurrency } from '../../../hooks/useCurrency.js'
import type { ICartTotals } from '../../../../shared/types/cart.types.js'

interface CartSummaryProps {
  totals: ICartTotals
  onCouponApply: (code: string) => void
  onCouponRemove: () => void
  appliedCoupon?: string
  couponLoading?: boolean
  couponError?: string
  onClearCart: () => void
  isCheckoutEnabled: boolean
}

export default function CartSummary({
  totals,
  onCouponApply,
  onCouponRemove,
  appliedCoupon,
  couponLoading,
  couponError,
  onClearCart,
  isCheckoutEnabled,
}: CartSummaryProps) {
  const { formatPrice } = useCurrency()
  return (
    <aside className="cart-summary">
      <h3 className="cart-summary__title">Order Summary</h3>

      {/* Shipping progress */}
      <ShippingEstimator totals={totals} />

      <div className="cart-summary__divider" />

      {/* Coupon */}
      <CouponBox
        appliedCode={appliedCoupon}
        discount={totals.discountAmount}
        onApply={onCouponApply}
        onRemove={onCouponRemove}
        isLoading={couponLoading}
        error={couponError}
      />

      <div className="cart-summary__divider" />

      {/* Line items */}
      <div className="cart-summary__lines">
        <div className="cart-summary__line">
          <span>
            Subtotal ({totals.totalItems} item{totals.totalItems !== 1 ? 's' : ''})
          </span>
          <span>{formatPrice(totals.subtotal)}</span>
        </div>

        {totals.discountAmount > 0 && (
          <div className="cart-summary__line cart-summary__line--discount">
            <span>Coupon discount</span>
            <span>–{formatPrice(totals.discountAmount)}</span>
          </div>
        )}

        <div className="cart-summary__line">
          <span>Shipping</span>
          <span className={totals.isFreeShipping ? 'cart-summary__free-label' : ''}>
            {totals.shippingCost === 0 ? 'FREE' : formatPrice(totals.shippingCost)}
          </span>
        </div>

        <div className="cart-summary__line">
          <span>Tax</span>
          <span>{formatPrice(totals.taxAmount)}</span>
        </div>
      </div>

      <div className="cart-summary__divider" />

      {/* Grand total */}
      <div className="cart-summary__grand-total">
        <span>Total</span>
        <span className="cart-summary__grand-amount">{formatPrice(totals.grandTotal)}</span>
      </div>

      {/* Checkout */}
      <Link
        to="/checkout"
        className={`btn btn-primary btn-lg cart-summary__checkout-btn ${!isCheckoutEnabled ? 'disabled' : ''}`}
        aria-disabled={!isCheckoutEnabled}
        onClick={(e) => {
          if (!isCheckoutEnabled) e.preventDefault()
        }}
      >
        Proceed to Checkout
      </Link>

      <Link to="/products" className="cart-summary__continue-link">
        ← Continue Shopping
      </Link>

      {/* Trust badges */}
      <div className="cart-summary__trust">
        <span className="cart-summary__trust-item">
          <FiShield size={14} /> Secure checkout
        </span>
        <span className="cart-summary__trust-item">
          <FiRefreshCw size={14} /> 30-day returns
        </span>
      </div>

      {totals.totalItems > 0 && (
        <button className="cart-summary__clear-btn" onClick={onClearCart}>
          Clear cart
        </button>
      )}
    </aside>
  )
}
