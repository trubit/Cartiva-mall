import { useCurrency } from '../../../hooks/useCurrency.js'
import { usePublicShippingConfig } from '../../../hooks/useShipping.js'
import { Money, formatMoney } from '../../../../shared/utils/money.js'
import type { ICheckoutPricing, ShippingMethod } from '../../../../shared/types/checkout.types.js'

const SHIPPING_LABELS: Record<ShippingMethod, string> = {
  standard: 'Standard Doorstep Delivery',
  express: 'Express Delivery',
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
  const { data: shippingConfig } = usePublicShippingConfig()
  const shippingLabel = SHIPPING_LABELS[shippingMethod] || 'Standard Shipping'

  let dynamicShippingFee: number | undefined
  if (shippingConfig?.rates && typeof shippingConfig.rates === 'object') {
    const fixed = (shippingConfig.rates as Record<string, number>)[currentCurrency]
    if (typeof fixed === 'number' && !isNaN(fixed) && fixed >= 0) {
      dynamicShippingFee = fixed
    }
  } else if (shippingConfig?.fixedRates && typeof shippingConfig.fixedRates === 'object') {
    const fixed = (shippingConfig.fixedRates as Record<string, number>)[currentCurrency]
    if (typeof fixed === 'number' && !isNaN(fixed) && fixed >= 0) {
      dynamicShippingFee = fixed
    }
  }

  const effectiveShipping =
    dynamicShippingFee !== undefined ? dynamicShippingFee : convertAmount(pricing.shippingFee)

  const subtotalConv = convertAmount(pricing.subtotal)
  const discountConv = convertAmount(pricing.discountAmount)
  const taxConv = convertAmount(pricing.taxAmount)
  const calculatedTotal = Money.from(subtotalConv)
    .subtract(discountConv)
    .add(effectiveShipping)
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
        <span className={effectiveShipping === 0 ? 'price-breakdown__free' : ''}>
          {effectiveShipping === 0 ? 'FREE' : formatMoney(effectiveShipping, currentCurrency)}
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
