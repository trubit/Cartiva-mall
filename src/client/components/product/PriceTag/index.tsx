import { useCurrency } from '../../../hooks/useCurrency.js'
import { DEFAULT_BASE_CURRENCY } from '../../../../shared/constants/currencies.js'
import { formatMoney } from '../../../../shared/utils/money.js'

interface PriceTagProps {
  price: number
  discountPrice?: number
  size?: 'sm' | 'md' | 'lg'
  showSave?: boolean
  currency?: string
  showOriginalConversionNotice?: boolean
}

export default function PriceTag({
  price,
  discountPrice,
  size = 'md',
  showSave = false,
  currency = DEFAULT_BASE_CURRENCY,
  showOriginalConversionNotice = false,
}: PriceTagProps) {
  const { currentCurrency, formatPrice } = useCurrency()

  const hasSale = discountPrice !== undefined && discountPrice < price
  const activeAmount = hasSale ? discountPrice : price
  const saveAmt = hasSale ? price - discountPrice : 0
  const savePct = hasSale ? Math.round((saveAmt / price) * 100) : 0

  const fontSizes = { sm: '0.9rem', md: '1.1rem', lg: '1.5rem' }
  const origSizes = { sm: '0.75rem', md: '0.85rem', lg: '1rem' }

  const formattedCurrent = formatPrice(activeAmount, currency)
  const formattedOrig = formatPrice(price, currency)
  const isConverted = currentCurrency.toUpperCase() !== currency.toUpperCase()

  return (
    <span
      className="price-tag"
      style={{ display: 'inline-flex', alignItems: 'baseline', flexWrap: 'wrap', gap: 6 }}
    >
      <span
        className={`price-tag__current${hasSale ? ' price-tag__current--sale' : ''}`}
        style={{ fontSize: fontSizes[size], fontWeight: 700 }}
      >
        {formattedCurrent}
      </span>

      {hasSale && (
        <span
          className="price-tag__original"
          style={{ fontSize: origSizes[size], textDecoration: 'line-through', opacity: 0.6 }}
        >
          {formattedOrig}
        </span>
      )}

      {hasSale && showSave && <span className="price-tag__save">Save {savePct}%</span>}

      {showOriginalConversionNotice && isConverted && (
        <span
          style={{
            fontSize: '0.75rem',
            color: 'var(--color-muted, #6b7280)',
            width: '100%',
            marginTop: 2,
          }}
        >
          Orig: {formatMoney(activeAmount, currency)}
        </span>
      )}
    </span>
  )
}
