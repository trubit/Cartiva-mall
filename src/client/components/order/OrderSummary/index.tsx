import { useCurrency } from '../../../hooks/useCurrency.js'
import type { IOrder } from '../../../../shared/types/index.js'

interface OrderSummaryProps {
  order: Pick<
    IOrder,
    'subtotal' | 'discountAmount' | 'shippingFee' | 'taxAmount' | 'grandTotal' | 'couponCode'
  > & { currency?: string }
  compact?: boolean
}

export default function OrderSummary({ order, compact = false }: OrderSummaryProps) {
  const { formatPrice } = useCurrency()
  const currency = order.currency || 'USD'

  return (
    <div className={`order-summary${compact ? ' order-summary--compact' : ''}`}>
      {!compact && <h3 className="order-summary__title">Price Summary</h3>}

      <div className="order-summary__rows">
        <div className="order-summary__row">
          <span>Subtotal</span>
          <span>{formatPrice(order.subtotal, currency)}</span>
        </div>

        {order.discountAmount > 0 && (
          <div className="order-summary__row order-summary__row--discount">
            <span>Discount{order.couponCode ? ` (${order.couponCode})` : ''}</span>
            <span>–{formatPrice(order.discountAmount, currency)}</span>
          </div>
        )}

        <div className="order-summary__row">
          <span>Shipping</span>
          <span>
            {order.shippingFee === 0 ? (
              <span className="order-summary__free">FREE</span>
            ) : (
              formatPrice(order.shippingFee, currency)
            )}
          </span>
        </div>

        <div className="order-summary__row">
          <span>Tax</span>
          <span>{formatPrice(order.taxAmount, currency)}</span>
        </div>

        <div className="order-summary__row order-summary__row--total">
          <strong>Total</strong>
          <strong>{formatPrice(order.grandTotal, currency)}</strong>
        </div>
      </div>
    </div>
  )
}
