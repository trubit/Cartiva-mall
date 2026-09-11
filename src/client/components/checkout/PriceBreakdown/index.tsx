import { useCurrency } from '../../../hooks/useCurrency.js'
import { Money, formatMoney } from '../../../../shared/utils/money.js'
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
  const { convertAmount, currentCurrency } = useCurrency()
  const shippingLabel = SHIPPING_LABELS[shippingMethod]

  const subtotalConv = convertAmount(pricing.subtotal)
  const discountConv = convertAmount(pricing.discountAmount)
  const shippingConv = convertAmount(pricing.shippingFee)
  const taxConv = convertAmount(pricing.taxAmount)
  const calculatedTotal = Money.from(subtotalConv)
    .subtract(discountConv)
    .add(shippingConv)
    .add(taxConv)
    .round(currentCurrency)

  return (
    <div className={`price-breakdown ${compact ? 'price-breakdown--compact' : ''}`}>
      <div className="price-breakdown__line">
        <span>Subtotal</span>
        <span>{formatMoney(subtotalConv, currentCurrency)}</span>
      </div>

      {pricing.discountAmount > 0 && (
        <div className="price-breakdown__line price-breakdown__line--discount">
          <span>Coupon{couponCode ? ` (${couponCode})` : ''} discount</span>
          <span>–{formatMoney(discountConv, currentCurrency)}</span>
        </div>
      )}

      <div className="price-breakdown__line">
        <span>{shippingLabel}</span>
        <span className={pricing.shippingFee === 0 ? 'price-breakdown__free' : ''}>
          {pricing.shippingFee === 0 ? 'FREE' : formatMoney(shippingConv, currentCurrency)}
        </span>
      </div>

      <div className="price-breakdown__line">
        <span>Tax</span>
        <span>{formatMoney(taxConv, currentCurrency)}</span>
      </div>

      <div className="price-breakdown__divider" />

      <div className="price-breakdown__total">
        <span>Total</span>
        <span className="price-breakdown__total-amount">
          {formatMoney(calculatedTotal, currentCurrency)}
        </span>
      </div>
    </div>
  )
}
