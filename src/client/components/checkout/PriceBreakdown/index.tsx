import { formatCurrency } from '../../../../shared/helpers/index.js'
import type { ICheckoutPricing, ShippingMethod } from '../../../../shared/types/checkout.types.js'

const SHIPPING_LABELS: Record<ShippingMethod, string> = {
  standard: 'Standard Shipping',
  express: 'Express Shipping',
  sameDay: 'Same Day Delivery',
}

interface PriceBreakdownProps {
  pricing: ICheckoutPricing
  shippingMethod: ShippingMethod
  couponCode?: string
  compact?: boolean
}

export default function PriceBreakdown({
  pricing,
  shippingMethod,
  couponCode,
  compact,
}: PriceBreakdownProps) {
  const shippingLabel = SHIPPING_LABELS[shippingMethod]

  return (
    <div className={`price-breakdown ${compact ? 'price-breakdown--compact' : ''}`}>
      <div className="price-breakdown__line">
        <span>Subtotal</span>
        <span>{formatCurrency(pricing.subtotal)}</span>
      </div>

      {pricing.discountAmount > 0 && (
        <div className="price-breakdown__line price-breakdown__line--discount">
          <span>Coupon{couponCode ? ` (${couponCode})` : ''} discount</span>
          <span>–{formatCurrency(pricing.discountAmount)}</span>
        </div>
      )}

      <div className="price-breakdown__line">
        <span>{shippingLabel}</span>
        <span className={pricing.shippingFee === 0 ? 'price-breakdown__free' : ''}>
          {pricing.shippingFee === 0 ? 'FREE' : formatCurrency(pricing.shippingFee)}
        </span>
      </div>

      <div className="price-breakdown__line">
        <span>Tax (8%)</span>
        <span>{formatCurrency(pricing.taxAmount)}</span>
      </div>

      <div className="price-breakdown__divider" />

      <div className="price-breakdown__total">
        <span>Total</span>
        <span className="price-breakdown__total-amount">{formatCurrency(pricing.grandTotal)}</span>
      </div>
    </div>
  )
}
