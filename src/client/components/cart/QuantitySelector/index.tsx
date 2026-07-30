import { FiMinus, FiPlus } from 'react-icons/fi'

interface QuantitySelectorProps {
  quantity: number
  maxQuantity: number
  onDecrease: () => void
  onIncrease: () => void
  onChange?: (qty: number) => void
  disabled?: boolean
  size?: 'sm' | 'md' | 'lg'
}

export default function QuantitySelector({
  quantity,
  maxQuantity,
  onDecrease,
  onIncrease,
  onChange,
  disabled = false,
  size = 'md',
}: QuantitySelectorProps) {
  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const val = parseInt(e.target.value, 10)
    if (!isNaN(val) && val >= 1 && val <= maxQuantity) {
      onChange?.(val)
    }
  }

  return (
    <div className={`qty-selector qty-selector--${size}`} aria-label="Quantity selector">
      <button
        className="qty-selector__btn"
        onClick={onDecrease}
        disabled={disabled || quantity <= 1}
        aria-label="Decrease quantity"
      >
        <FiMinus size={size === 'sm' ? 12 : 14} />
      </button>

      <input
        type="number"
        className="qty-selector__input"
        value={quantity}
        min={1}
        max={maxQuantity}
        onChange={handleInputChange}
        disabled={disabled}
        aria-label="Quantity"
      />

      <button
        className="qty-selector__btn"
        onClick={onIncrease}
        disabled={disabled || quantity >= maxQuantity}
        aria-label="Increase quantity"
      >
        <FiPlus size={size === 'sm' ? 12 : 14} />
      </button>
    </div>
  )
}
