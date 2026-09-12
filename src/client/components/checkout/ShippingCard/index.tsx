import { useMemo } from 'react'
import { FiTruck, FiZap, FiStar, FiCheck, FiShield } from 'react-icons/fi'
import { useCurrency } from '../../../hooks/useCurrency.js'
import { usePublicShippingConfig } from '../../../hooks/useShipping.js'
import type { IShippingOption, ShippingMethod } from '../../../../shared/types/checkout.types.js'

const METHOD_ICONS: Record<ShippingMethod, React.ReactNode> = {
  standard: <FiTruck size={22} />,
  express: <FiZap size={22} />,
  sameDay: <FiStar size={22} />,
}

interface ShippingCardProps {
  option: IShippingOption
  selected: boolean
  onSelect: () => void
  disabled?: boolean
}

export default function ShippingCard({ option, selected, onSelect, disabled }: ShippingCardProps) {
  const { formatPrice, currentCurrency } = useCurrency()
  const { data: shippingConfig } = usePublicShippingConfig()

  const formattedCost = useMemo(() => {
    if (shippingConfig?.rates && typeof shippingConfig.rates === 'object') {
      const fixedRate = (shippingConfig.rates as Record<string, number>)[currentCurrency]
      if (typeof fixedRate === 'number' && !isNaN(fixedRate) && fixedRate >= 0) {
        return fixedRate === 0 ? 'FREE' : formatPrice(fixedRate, currentCurrency)
      }
    }
    if (option.cost === 0) return 'FREE'
    if (option.currency) {
      return formatPrice(option.cost, option.currency)
    }
    return formatPrice(option.cost)
  }, [shippingConfig, currentCurrency, option.cost, option.currency, formatPrice])

  return (
    <div
      className={`shipping-card ${selected ? 'shipping-card--selected' : ''} ${disabled ? 'shipping-card--disabled' : ''}`}
      onClick={!disabled ? onSelect : undefined}
      role="radio"
      aria-checked={selected}
      tabIndex={disabled ? -1 : 0}
      onKeyDown={(e) => {
        if (!disabled && (e.key === 'Enter' || e.key === ' ')) onSelect()
      }}
    >
      <div className="shipping-card__radio">
        <div className={`shipping-card__dot ${selected ? 'shipping-card__dot--active' : ''}`}>
          {selected && <FiCheck size={12} />}
        </div>
      </div>

      <div className="shipping-card__icon">
        {METHOD_ICONS[option.method] || <FiTruck size={22} />}
      </div>

      <div className="shipping-card__info">
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px', flexWrap: 'wrap' }}>
          <span className="shipping-card__label">{option.label}</span>
          <span
            style={{
              display: 'inline-flex',
              alignItems: 'center',
              gap: '4px',
              fontSize: '11px',
              padding: '2px 8px',
              borderRadius: '9999px',
              background: 'rgba(255, 153, 0, 0.15)',
              color: 'var(--color-primary, #FF9900)',
              fontWeight: 600,
            }}
          >
            <FiShield size={11} /> Verified Carrier
          </span>
        </div>
        <span className="shipping-card__desc">{option.description}</span>
        <span className="shipping-card__eta">{option.estimatedDays}</span>
      </div>

      <div className="shipping-card__cost">
        <span className="shipping-card__price">{formattedCost}</span>
      </div>
    </div>
  )
}
