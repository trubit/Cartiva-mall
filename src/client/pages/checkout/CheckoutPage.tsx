import { useEffect } from 'react'
import { Navigate } from 'react-router-dom'
import { FiShoppingBag } from 'react-icons/fi'
import { useCheckoutSession } from '../../hooks/useCheckout.js'
import { useAuthStore } from '../../store/authStore.js'
import { useCheckoutStore } from '../../store/checkoutStore.js'
import { useCart } from '../../hooks/useCart.js'
import PaymentSummary from '../../components/checkout/PaymentSummary/index.js'
import AddressSelection from './AddressSelection/index.js'
import ShippingSelection from './ShippingSelection/index.js'
import OrderSummaryStep from './OrderSummary/index.js'

const STEPS = ['Address', 'Shipping', 'Review'] as const

export default function CheckoutPage() {
  const isAuthenticated = useAuthStore((s) => s.isAuthenticated)
  const { step } = useCheckoutStore()
  const { items } = useCart()
  const { isLoading, isError, error } = useCheckoutSession()

  // Scroll to top on step change
  useEffect(() => {
    window.scrollTo({ top: 0, behavior: 'smooth' })
  }, [step])

  // Must be logged in
  if (!isAuthenticated) return <Navigate to="/login?redirect=/checkout" replace />

  // Must have items
  if (!isLoading && items.length === 0) return <Navigate to="/cart" replace />

  const errMsg = (error as { response?: { data?: { message?: string } } })?.response?.data?.message

  return (
    <div className="checkout-page">
      <div className="container checkout-page__inner">
        {/* Page title */}
        <div className="checkout-page__header">
          <FiShoppingBag size={24} />
          <h1 className="checkout-page__title">Checkout</h1>
        </div>

        {/* Step progress */}
        <div className="checkout-progress" role="list">
          {STEPS.map((label, idx) => {
            const stepNum = (idx + 1) as 1 | 2 | 3
            const isActive = step === stepNum
            const isDone = step > stepNum
            return (
              <div
                key={label}
                className={`checkout-progress__step ${isActive ? 'checkout-progress__step--active' : ''} ${isDone ? 'checkout-progress__step--done' : ''}`}
                role="listitem"
              >
                <div className="checkout-progress__dot">{isDone ? '✓' : stepNum}</div>
                <span className="checkout-progress__label">{label}</span>
                {idx < STEPS.length - 1 && <div className="checkout-progress__line" />}
              </div>
            )
          })}
        </div>

        {/* Layout: main + sidebar */}
        <div className="checkout-page__layout">
          <main className="checkout-page__main">
            {isLoading && (
              <div className="checkout-page__loading">
                <div
                  className="skeleton"
                  style={{ height: 400, borderRadius: 'var(--radius-xl)' }}
                />
              </div>
            )}

            {isError && (
              <div className="checkout-page__error-banner">
                <p>{errMsg ?? 'Failed to load checkout. Your cart may be empty.'}</p>
                <a href="/cart" className="btn btn-outline btn-sm">
                  Return to Cart
                </a>
              </div>
            )}

            {!isLoading && !isError && (
              <>
                {step === 1 && <AddressSelection />}
                {step === 2 && <ShippingSelection />}
                {step === 3 && <OrderSummaryStep />}
              </>
            )}
          </main>

          <aside className="checkout-page__sidebar">
            <PaymentSummary showCoupon />
          </aside>
        </div>
      </div>
    </div>
  )
}
