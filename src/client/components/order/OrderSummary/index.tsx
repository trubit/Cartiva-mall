import { formatCurrency } from '../../../../shared/helpers/index.js'
import type { IOrder } from '../../../../shared/types/index.js'

interface OrderSummaryProps {
  order: Pick<
    IOrder,
    'subtotal' | 'discountAmount' | 'shippingFee' | 'taxAmount' | 'grandTotal' | 'couponCode'
  >
  compact?: boolean
}

export default function OrderSummary({ order, compact = false }: OrderSummaryProps) {
  return (
    <div className={`order-summary${compact ? ' order-summary--compact' : ''}`}>
      {!compact && <h3 className="order-summary__title">Price Summary</h3>}

      <div className="order-summary__rows">
        <div className="order-summary__row">
          <span>Subtotal</span>
          <span>{formatCurrency(order.subtotal)}</span>
        </div>

        {order.discountAmount > 0 && (
          <div className="order-summary__row order-summary__row--discount">
            <span>Discount{order.couponCode ? ` (${order.couponCode})` : ''}</span>
            <span>–{formatCurrency(order.discountAmount)}</span>
          </div>
        )}

        <div className="order-summary__row">
          <span>Shipping</span>
          <span>
            {order.shippingFee === 0 ? (
              <span className="order-summary__free">FREE</span>
            ) : (
              formatCurrency(order.shippingFee)
            )}
          </span>
        </div>

        <div className="order-summary__row">
          <span>Tax</span>
          <span>{formatCurrency(order.taxAmount)}</span>
        </div>

        <div className="order-summary__row order-summary__row--total">
          <strong>Total</strong>
          <strong>{formatCurrency(order.grandTotal)}</strong>
        </div>
      </div>
    </div>
  )
}
