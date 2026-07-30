import { FiTruck, FiZap, FiStar, FiCheck } from 'react-icons/fi'
import { formatCurrency } from '../../../../shared/helpers/index.js'
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

      <div className="shipping-card__icon">{METHOD_ICONS[option.method]}</div>

      <div className="shipping-card__info">
        <span className="shipping-card__label">{option.label}</span>
        <span className="shipping-card__desc">{option.description}</span>
        <span className="shipping-card__eta">{option.estimatedDays}</span>
      </div>

      <div className="shipping-card__cost">
        {option.cost === 0 ? (
          <span className="shipping-card__free">FREE</span>
        ) : (
          <span className="shipping-card__price">{formatCurrency(option.cost)}</span>
        )}
      </div>
    </div>
  )
}
