import { useState } from 'react'
import { FiTag, FiX, FiCheck } from 'react-icons/fi'
import { useApplyCoupon, useRemoveCoupon } from '../../../hooks/useCheckout.js'
import { useCheckoutStore } from '../../../store/checkoutStore.js'
import { useCurrency } from '../../../hooks/useCurrency.js'

export default function CheckoutCouponBox() {
  const { formatPrice } = useCurrency()
  const session = useCheckoutStore((s) => s.session)
  const couponError = useCheckoutStore((s) => s.couponError)
  const applyCoupon = useApplyCoupon()
  const removeCoupon = useRemoveCoupon()
  const [inputCode, setInputCode] = useState('')

  const appliedCode = session?.couponCode
  const discountAmount = session?.pricing.discountAmount ?? 0

  const handleApply = () => {
    const trimmed = inputCode.trim().toUpperCase()
    if (trimmed) applyCoupon.mutate({ code: trimmed })
  }

  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter') handleApply()
  }

  if (appliedCode) {
    return (
      <div className="checkout-coupon checkout-coupon--applied">
        <FiCheck className="checkout-coupon__icon checkout-coupon__icon--success" size={16} />
        <div className="checkout-coupon__applied-info">
          <span className="checkout-coupon__code">{appliedCode}</span>
          <span className="checkout-coupon__saving">–{formatPrice(discountAmount)} off</span>
        </div>
        <button
          className="checkout-coupon__remove"
          onClick={() => removeCoupon.mutate()}
          disabled={removeCoupon.isPending}
          aria-label="Remove coupon"
        >
          <FiX size={16} />
        </button>
      </div>
    )
  }

  return (
    <div className="checkout-coupon">
      <div className="checkout-coupon__row">
        <FiTag size={16} className="checkout-coupon__icon" />
        <input
          type="text"
          className={`checkout-coupon__input ${couponError ? 'checkout-coupon__input--error' : ''}`}
          placeholder="Coupon code"
          value={inputCode}
          onChange={(e) => setInputCode(e.target.value.toUpperCase())}
          onKeyDown={handleKeyDown}
          disabled={applyCoupon.isPending}
          maxLength={30}
        />
        <button
          className="btn btn-outline btn-sm"
          onClick={handleApply}
          disabled={applyCoupon.isPending || !inputCode.trim()}
        >
          {applyCoupon.isPending ? '…' : 'Apply'}
        </button>
      </div>
      {couponError && <p className="checkout-coupon__error">{couponError}</p>}
    </div>
  )
}
