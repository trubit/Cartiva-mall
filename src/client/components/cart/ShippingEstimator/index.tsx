import { FiTruck, FiShield } from 'react-icons/fi'
import { useCurrency } from '../../../hooks/useCurrency.js'
import { usePublicShippingConfig } from '../../../hooks/useShipping.js'
import type { ICartTotals } from '../../../../shared/types/cart.types.js'

interface ShippingEstimatorProps {
  totals: ICartTotals
}

export default function ShippingEstimator({ totals }: ShippingEstimatorProps) {
  const { currentCurrency, formatPrice } = useCurrency()
  const { data: config, isLoading } = usePublicShippingConfig()

  // Dynamic admin-configured rate for active currency
  let dynamicRate: number | undefined
  if (config?.rates && typeof config.rates === 'object') {
    dynamicRate = (config.rates as Record<string, number>)[currentCurrency]
  } else if (config?.fixedRates && typeof config.fixedRates === 'object') {
    dynamicRate = (config.fixedRates as Record<string, number>)[currentCurrency]
  }

  const effectiveFee =
    typeof dynamicRate === 'number'
      ? dynamicRate
      : totals.shippingCost > 0
        ? totals.shippingCost
        : undefined

  return (
    <div className="shipping-estimator">
      <div className="shipping-estimator__header">
        <FiTruck size={18} />
        <span className="shipping-estimator__title">Authoritative Doorstep Delivery</span>
      </div>

      <div style={{ marginTop: '8px' }}>
        <div className="shipping-estimator__cost-row">
          <span>Standard Delivery ({currentCurrency})</span>
          <strong style={{ color: 'var(--color-primary, #FF9900)', fontSize: '15px' }}>
            {isLoading
              ? 'Calculating…'
              : effectiveFee !== undefined
                ? formatPrice(effectiveFee, currentCurrency)
                : 'Calculated at checkout'}
          </strong>
        </div>

        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: '6px',
            marginTop: '8px',
            fontSize: '12px',
            color: 'var(--color-neutral-400, #9ca3af)',
          }}
        >
          <FiShield size={13} style={{ color: '#10b981', flexShrink: 0 }} />
          <span>Full transit insurance & live tracking included</span>
        </div>
      </div>
    </div>
  )
}
