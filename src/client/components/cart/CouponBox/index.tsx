import { useState } from 'react'
import { FiTag, FiX, FiCheck } from 'react-icons/fi'
import { useCurrency } from '../../../hooks/useCurrency.js'

interface CouponBoxProps {
  appliedCode?: string
  discount?: number
  onApply: (code: string) => void
  onRemove: () => void
  isLoading?: boolean
  error?: string
}

export default function CouponBox({
  appliedCode,
  discount = 0,
  onApply,
  onRemove,
  isLoading,
  error,
}: CouponBoxProps) {
  const { formatPrice } = useCurrency()
  const [inputCode, setInputCode] = useState('')

  const handleApply = () => {
    const trimmed = inputCode.trim().toUpperCase()
    if (trimmed) onApply(trimmed)
  }

  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter') handleApply()
  }

  if (appliedCode) {
    return (
      <div className="coupon-box coupon-box--applied">
        <FiCheck className="coupon-box__icon coupon-box__icon--success" size={16} />
        <div className="coupon-box__applied-info">
          <span className="coupon-box__code">{appliedCode}</span>
          <span className="coupon-box__discount">–{formatPrice(discount)} off</span>
        </div>
        <button className="coupon-box__remove-btn" onClick={onRemove} aria-label="Remove coupon">
          <FiX size={16} />
        </button>
      </div>
    )
  }

  return (
    <div className="coupon-box">
      <div className="coupon-box__input-row">
        <FiTag className="coupon-box__icon" size={16} />
        <input
          type="text"
          className={`coupon-box__input ${error ? 'coupon-box__input--error' : ''}`}
          placeholder="Enter coupon code"
          value={inputCode}
          onChange={(e) => setInputCode(e.target.value.toUpperCase())}
          onKeyDown={handleKeyDown}
          disabled={isLoading}
          maxLength={30}
        />
        <button
          className="btn btn-outline btn-sm coupon-box__apply-btn"
          onClick={handleApply}
          disabled={isLoading || !inputCode.trim()}
        >
          {isLoading ? 'Applying…' : 'Apply'}
        </button>
      </div>
      {error && <p className="coupon-box__error">{error}</p>}
    </div>
  )
}
