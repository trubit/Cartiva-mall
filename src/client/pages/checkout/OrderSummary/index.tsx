import { useCheckoutStore } from '../../../store/checkoutStore.js'
import { useCreateOrder } from '../../../hooks/usePayment.js'
import OrderReview from '../../../components/checkout/OrderReview/index.js'

export default function OrderSummaryStep() {
  const { session, prevStep } = useCheckoutStore()
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
    createOrder({ checkoutSessionId: session._id })
  }

  return (
    <div className="checkout-step">
      <h2 className="checkout-step__title">Review Your Order</h2>
      <p className="checkout-step__subtitle">
        Please confirm all details before placing your order.
      </p>

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
