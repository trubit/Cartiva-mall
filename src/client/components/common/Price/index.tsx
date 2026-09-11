import React, { useEffect } from 'react'
import { useCurrency } from '../../../hooks/useCurrency.js'
import { DEFAULT_BASE_CURRENCY } from '../../../../shared/constants/currencies.js'
import { formatMoney } from '../../../../shared/utils/money.js'

interface PriceProps {
  amount: number
  fromCurrency?: string
  showOriginal?: boolean
  className?: string
  style?: React.CSSProperties
  originalClassName?: string
}

export const Price: React.FC<PriceProps> = ({
  amount,
  fromCurrency = DEFAULT_BASE_CURRENCY,
  showOriginal = false,
  className,
  style,
  originalClassName,
}) => {
  const { currentCurrency, formatPrice, fetchRates } = useCurrency()

  useEffect(() => {
    fetchRates()
  }, [fetchRates])

  const formattedDisplay = formatPrice(amount, fromCurrency)
  const isConverted = currentCurrency.toUpperCase() !== fromCurrency.toUpperCase()
  const originalFormatted = formatMoney(amount, fromCurrency)

  return (
    <span
      className={`cartiva-price ${className || ''}`}
      style={{ display: 'inline-flex', alignItems: 'baseline', gap: 6, ...style }}
    >
      <span className="cartiva-price__display" style={{ fontWeight: 'inherit', color: 'inherit' }}>
        {formattedDisplay}
      </span>
      {showOriginal && isConverted && (
        <span
          className={`cartiva-price__original ${originalClassName || ''}`}
          style={{
            fontSize: '0.8em',
            opacity: 0.7,
            fontWeight: 'normal',
            textDecoration: 'none',
          }}
          title={`Original price: ${originalFormatted} ${fromCurrency}`}
        >
          (≈ {originalFormatted})
        </span>
      )}
    </span>
  )
}

export default Price
