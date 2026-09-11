import { useCheckoutStore } from '../../../store/checkoutStore.js'
import { useCurrencyStore } from '../../../store/currencyStore.js'
import { useCreateOrder } from '../../../hooks/usePayment.js'
import OrderReview from '../../../components/checkout/OrderReview/index.js'
import { FiCreditCard, FiLock } from 'react-icons/fi'

export default function OrderSummaryStep() {
  const { session, prevStep } = useCheckoutStore()
  const currentCurrency = useCurrencyStore((s) => s.currentCurrency)
  const { mutate: createOrder, isPending, error } = useCreateOrder()

  if (!session?.shippingAddress) {
    return (
      <div className="checkout-step">
        <p className="checkout-step__error">Missing shipping details. Please go back.</p>
        <button className="btn btn-outline" onClick={prevStep}>
          ← Back
        </button>
      </div>
    )
  }

  const handlePlaceOrder = () => {
    if (!session._id) return
    createOrder({
      checkoutSessionId: session._id,
      paymentMethodType: 'paystack',
      currency: currentCurrency,
    })
  }

  return (
    <div className="checkout-step">
      <h2 className="checkout-step__title">Review & Confirm Order</h2>
      <p className="checkout-step__subtitle">
        Review your order items, shipping destination, and price breakdown before payment.
      </p>

      {/* Paystack Online Payment Banner */}
      <div
        style={{
          marginBottom: 24,
          padding: '16px 20px',
          background: 'var(--color-neutral-50)',
          borderRadius: 12,
          border: '1px solid var(--color-neutral-200)',
          display: 'flex',
          alignItems: 'center',
          gap: 14,
        }}
      >
        <div
          style={{
            width: 42,
            height: 42,
            borderRadius: 8,
            background: 'rgba(0, 113, 133, 0.1)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            color: '#007185',
            flexShrink: 0,
          }}
        >
          <FiCreditCard size={20} />
        </div>
        <div style={{ flex: 1 }}>
          <div
            style={{
              fontWeight: 700,
              fontSize: '0.92rem',
              color: 'var(--color-neutral-900)',
              display: 'flex',
              alignItems: 'center',
              gap: 6,
            }}
          >
            Paystack Secure Checkout <FiLock size={13} color="#16a34a" />
          </div>
          <div style={{ fontSize: '0.8rem', color: 'var(--color-neutral-600)' }}>
            Instant payment processing via Debit/Credit Cards, Bank Transfer, USSD, and Mobile
            Money.
          </div>
        </div>
      </div>

      {error && (
        <div className="checkout-step__error-banner">
          {(error as Error).message ?? 'Failed to place order. Please try again.'}
        </div>
      )}

      <OrderReview onPlaceOrder={handlePlaceOrder} isSubmitting={isPending} />

      <button className="btn btn-ghost checkout-step__back-link" onClick={prevStep}>
        ← Back to Shipping
      </button>
    </div>
  )
}
