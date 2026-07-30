interface PriceTagProps {
  price: number
  discountPrice?: number
  size?: 'sm' | 'md' | 'lg'
  showSave?: boolean
  currency?: string
}

const fmt = (n: number, currency = '$') =>
  `${currency}${n.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`

export default function PriceTag({
  price,
  discountPrice,
  size = 'md',
  showSave = false,
  currency = '$',
}: PriceTagProps) {
  const hasSale = discountPrice !== undefined && discountPrice < price
  const saveAmt = hasSale ? price - discountPrice : 0
  const savePct = hasSale ? Math.round((saveAmt / price) * 100) : 0

  const fontSizes = { sm: '0.9rem', md: '1.1rem', lg: '1.5rem' }
  const origSizes = { sm: '0.75rem', md: '0.85rem', lg: '1rem' }

  return (
    <span className="price-tag">
      <span
        className={`price-tag__current${hasSale ? ' price-tag__current--sale' : ''}`}
        style={{ fontSize: fontSizes[size] }}
      >
        {fmt(hasSale ? discountPrice : price, currency)}
      </span>

      {hasSale && (
        <span className="price-tag__original" style={{ fontSize: origSizes[size] }}>
          {fmt(price, currency)}
        </span>
      )}

      {hasSale && showSave && <span className="price-tag__save">Save {savePct}%</span>}
    </span>
  )
}
