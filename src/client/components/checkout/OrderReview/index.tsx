import { FiEdit2 } from 'react-icons/fi'
import AddressCard from '../AddressCard/index.js'
import ShippingCard from '../ShippingCard/index.js'
import { useCheckoutStore } from '../../../store/checkoutStore.js'
import { formatCurrency } from '../../../../shared/helpers/index.js'
import { getImageUrl } from '../../../utils/image.js'

interface OrderReviewProps {
  onPlaceOrder: () => void
  isSubmitting?: boolean
}

export default function OrderReview({ onPlaceOrder, isSubmitting }: OrderReviewProps) {
  const { session, shippingOptions, setStep } = useCheckoutStore()

  if (!session) return null

  const selectedOption = shippingOptions.find((o) => o.method === session.shippingMethod)

  return (
    <div className="order-review">
      {/* Shipping address */}
      <section className="order-review__section">
        <div className="order-review__section-hd">
          <h4 className="order-review__section-title">Shipping Address</h4>
          <button className="order-review__edit-btn" onClick={() => setStep(1)}>
            <FiEdit2 size={14} /> Edit
          </button>
        </div>
        {session.shippingAddress ? (
          <AddressCard address={session.shippingAddress} label="Shipping" compact />
        ) : (
          <p className="order-review__empty">No address set</p>
        )}
      </section>

      {/* Billing address */}
      {!session.sameAsShipping && session.billingAddress && (
        <section className="order-review__section">
          <div className="order-review__section-hd">
            <h4 className="order-review__section-title">Billing Address</h4>
            <button className="order-review__edit-btn" onClick={() => setStep(1)}>
              <FiEdit2 size={14} /> Edit
            </button>
          </div>
          <AddressCard address={session.billingAddress} label="Billing" compact />
        </section>
      )}

      {/* Shipping method */}
      <section className="order-review__section">
        <div className="order-review__section-hd">
          <h4 className="order-review__section-title">Shipping Method</h4>
          <button className="order-review__edit-btn" onClick={() => setStep(2)}>
            <FiEdit2 size={14} /> Edit
          </button>
        </div>
        {selectedOption && <ShippingCard option={selectedOption} selected onSelect={() => {}} />}
      </section>

      {/* Items */}
      <section className="order-review__section">
        <h4 className="order-review__section-title">Items ({session.items.length})</h4>
        <ul className="order-review__items">
          {session.items.map((item, i) => (
            <li key={`${item.productId}-${i}`} className="order-review__item">
              {item.image && (
                <img
                  src={getImageUrl(item.image)}
                  alt={item.title}
                  className="order-review__item-img"
                />
              )}
              <div className="order-review__item-info">
                <span className="order-review__item-title">{item.title}</span>
                <span className="order-review__item-meta">
                  Qty: {item.quantity} · {formatCurrency(item.itemPrice)} each
                </span>
              </div>
              <span className="order-review__item-total">{formatCurrency(item.lineTotal)}</span>
            </li>
          ))}
        </ul>
      </section>

      {/* Place Order */}
      <button
        className="btn btn-primary btn-lg order-review__place-btn"
        onClick={onPlaceOrder}
        disabled={isSubmitting}
      >
        {isSubmitting
          ? 'Placing Order…'
          : `Place Order · ${formatCurrency(session.pricing.grandTotal)}`}
      </button>

      <p className="order-review__terms">
        By placing your order you agree to our{' '}
        <a href="/terms" target="_blank" rel="noopener noreferrer">
          Terms of Service
        </a>{' '}
        and{' '}
        <a href="/privacy" target="_blank" rel="noopener noreferrer">
          Privacy Policy
        </a>
        .
      </p>
    </div>
  )
}
