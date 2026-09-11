import { FiPackage } from 'react-icons/fi'
import { formatMoney } from '../../../../shared/utils/money.js'
import type { IOrder } from '../../../../shared/types/index.js'
import { getImageUrl } from '../../../utils/image.js'

interface OrderSummaryPanelProps {
  order?: IOrder | null
  amount?: number
  currency?: string
  orderNumber?: string
}

export default function OrderSummaryPanel({
  order,
  amount,
  currency = 'USD',
  orderNumber,
}: OrderSummaryPanelProps) {
  const orderCurrency = order?.currency || currency || 'USD'
  const grandTotal = order?.grandTotal ?? amount ?? 0
  const num = order?.orderNumber ?? orderNumber

  return (
    <aside className="order-summary-panel">
      <h3 className="order-summary-panel__title">
        <FiPackage size={18} /> Order Summary
      </h3>

      {num && (
        <p className="order-summary-panel__number">
          <span>Order #</span>
          <strong>{num}</strong>
        </p>
      )}

      {order && (
        <>
          <ul className="order-summary-panel__items">
            {order.items.map((item, i) => (
              <li key={`${item.productId}-${i}`} className="order-summary-panel__item">
                <div className="order-summary-panel__item-img-wrap">
                  {getImageUrl(item.image) ? (
                    <img
                      src={getImageUrl(item.image)}
                      alt={item.title}
                      className="order-summary-panel__item-img"
                    />
                  ) : (
                    <span className="order-summary-panel__item-placeholder">🛍️</span>
                  )}
                  <span className="order-summary-panel__item-qty">{item.quantity}</span>
                </div>
                <div className="order-summary-panel__item-info">
                  <span className="order-summary-panel__item-title">{item.title}</span>
                  <span className="order-summary-panel__item-sku">{item.sku}</span>
                </div>
                <span className="order-summary-panel__item-total">
                  {formatMoney(item.lineTotal, orderCurrency)}
                </span>
              </li>
            ))}
          </ul>

          <div className="order-summary-panel__divider" />

          <div className="order-summary-panel__lines">
            <div className="order-summary-panel__line">
              <span>Subtotal</span>
              <span>{formatMoney(order.subtotal, orderCurrency)}</span>
            </div>
            {order.discountAmount > 0 && (
              <div className="order-summary-panel__line order-summary-panel__line--discount">
                <span>Discount{order.couponCode ? ` (${order.couponCode})` : ''}</span>
                <span>–{formatMoney(order.discountAmount, orderCurrency)}</span>
              </div>
            )}
            <div className="order-summary-panel__line">
              <span>Shipping</span>
              <span>
                {order.shippingFee === 0 ? 'FREE' : formatMoney(order.shippingFee, orderCurrency)}
              </span>
            </div>
            <div className="order-summary-panel__line">
              <span>Tax</span>
              <span>{formatMoney(order.taxAmount, orderCurrency)}</span>
            </div>
          </div>

          <div className="order-summary-panel__divider" />
        </>
      )}

      <div className="order-summary-panel__total">
        <span>Total</span>
        <strong className="order-summary-panel__total-amount">
          {formatMoney(grandTotal, orderCurrency)}
        </strong>
      </div>
    </aside>
  )
}
