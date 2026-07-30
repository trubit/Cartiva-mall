import { FiTruck } from 'react-icons/fi'
import { formatCurrency } from '../../../../shared/helpers/index.js'
import type { ICartTotals } from '../../../../shared/types/cart.types.js'

interface ShippingEstimatorProps {
  totals: ICartTotals
}

export default function ShippingEstimator({ totals }: ShippingEstimatorProps) {
  const progress = Math.min(100, (totals.subtotal / totals.freeShippingThreshold) * 100)

  return (
    <div className="shipping-estimator">
      <div className="shipping-estimator__header">
        <FiTruck size={18} />
        <span className="shipping-estimator__title">Shipping</span>
      </div>

      {totals.isFreeShipping ? (
        <div className="shipping-estimator__free">
          <span className="shipping-estimator__badge shipping-estimator__badge--free">FREE</span>
          <span>You qualify for free shipping!</span>
        </div>
      ) : (
        <div className="shipping-estimator__progress-wrap">
          <p className="shipping-estimator__hint">
            Add <strong>{formatCurrency(totals.remainingForFreeShipping)}</strong> more for free
            shipping
          </p>
          <div
            className="shipping-estimator__bar"
            role="progressbar"
            aria-valuenow={progress}
            aria-valuemin={0}
            aria-valuemax={100}
          >
            <div className="shipping-estimator__bar-fill" style={{ width: `${progress}%` }} />
          </div>
          <div className="shipping-estimator__cost-row">
            <span>Flat rate shipping</span>
            <strong>{formatCurrency(totals.shippingCost)}</strong>
          </div>
        </div>
      )}
    </div>
  )
}
