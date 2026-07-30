import { FiEdit2, FiCheck, FiMapPin } from 'react-icons/fi'
import type { ICheckoutAddress } from '../../../../shared/types/checkout.types.js'

interface AddressCardProps {
  address: ICheckoutAddress
  label: string
  selected?: boolean
  onSelect?: () => void
  onEdit?: () => void
  compact?: boolean
}

export default function AddressCard({
  address,
  label,
  selected,
  onSelect,
  onEdit,
  compact,
}: AddressCardProps) {
  return (
    <div
      className={`address-card ${selected ? 'address-card--selected' : ''} ${compact ? 'address-card--compact' : ''}`}
      onClick={onSelect}
      role={onSelect ? 'button' : undefined}
      tabIndex={onSelect ? 0 : undefined}
      onKeyDown={(e) => {
        if (onSelect && (e.key === 'Enter' || e.key === ' ')) onSelect()
      }}
    >
      <div className="address-card__header">
        <div className="address-card__label-row">
          <FiMapPin size={14} className="address-card__pin" />
          <span className="address-card__label">{label}</span>
        </div>

        <div className="address-card__header-actions">
          {selected && (
            <span className="address-card__selected-badge">
              <FiCheck size={12} /> Selected
            </span>
          )}
          {onEdit && (
            <button
              className="address-card__edit-btn"
              onClick={(e) => {
                e.stopPropagation()
                onEdit()
              }}
              aria-label="Edit address"
            >
              <FiEdit2 size={14} />
            </button>
          )}
        </div>
      </div>

      <div className="address-card__body">
        <p className="address-card__name">{address.fullName}</p>
        <p className="address-card__line">{address.street}</p>
        <p className="address-card__line">
          {address.city}, {address.state} {address.postalCode}
        </p>
        <p className="address-card__line">{address.country}</p>
        <p className="address-card__phone">{address.phone}</p>
      </div>
    </div>
  )
}
