import { FiShield, FiLock } from 'react-icons/fi'
import PriceBreakdown from '../PriceBreakdown/index.js'
import CheckoutCouponBox from '../CouponBox/index.js'
import { useCheckoutStore } from '../../../store/checkoutStore.js'
import { getImageUrl } from '../../../utils/image.js'

interface PaymentSummaryProps {
  showCoupon?: boolean
}

export default function PaymentSummary({ showCoupon = true }: PaymentSummaryProps) {
  const { session, step } = useCheckoutStore()

  if (!session) {
    return (
      <aside className="payment-summary">
        <div className="skeleton" style={{ height: 300, borderRadius: 'var(--radius-xl)' }} />
      </aside>
    )
  }

  return (
    <aside className="payment-summary">
      <h3 className="payment-summary__title">Order Summary</h3>

      {/* Item thumbnails */}
      <ul className="payment-summary__items">
        {session.items.map((item, idx) => (
          <li key={`${item.productId}-${idx}`} className="payment-summary__item">
            <div className="payment-summary__item-img-wrap">
              {item.image ? (
                <img
                  src={getImageUrl(item.image)}
                  alt={item.title}
                  className="payment-summary__item-img"
                />
              ) : (
                <div className="payment-summary__item-img-placeholder">🛍️</div>
              )}
              <span className="payment-summary__item-qty">{item.quantity}</span>
            </div>
            <div className="payment-summary__item-info">
              <span className="payment-summary__item-title">{item.title}</span>
              <span className="payment-summary__item-sku">{item.sku}</span>
            </div>
            <span className="payment-summary__item-total">${item.lineTotal.toFixed(2)}</span>
          </li>
        ))}
      </ul>

      <div className="payment-summary__divider" />

      {/* Coupon (only on step 3 / review) */}
      {showCoupon && step === 3 && (
        <>
          <CheckoutCouponBox />
          <div className="payment-summary__divider" />
        </>
      )}

      {/* Price breakdown */}
      <PriceBreakdown
        pricing={session.pricing}
        shippingMethod={session.shippingMethod}
        couponCode={session.couponCode}
        compact
      />

      <div className="payment-summary__divider" />

      {/* Trust signals */}
      <div className="payment-summary__trust">
        <span className="payment-summary__trust-item">
          <FiLock size={13} /> SSL Secured
        </span>
        <span className="payment-summary__trust-item">
          <FiShield size={13} /> Buyer Protected
        </span>
      </div>
    </aside>
  )
}
