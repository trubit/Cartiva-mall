import { useEffect } from 'react'
import { useParams, Navigate, useNavigate } from 'react-router-dom'
import { FiArrowLeft } from 'react-icons/fi'
import PaystackPayment from '../../../components/payment/PaystackPayment/index.js'
import OrderSummaryPanel from '../../../components/payment/OrderSummaryPanel/index.js'
import { usePaymentStore } from '../../../store/paymentStore.js'
import { useOrder } from '../../../hooks/usePayment.js'

export default function PaymentPage() {
  const { orderId } = useParams<{ orderId: string }>()
  const navigate = useNavigate()
  const { amount, currency, order, setOrder } = usePaymentStore()

  const { data: fetchedOrder, isLoading } = useOrder(orderId ?? '')

  useEffect(() => {
    if (fetchedOrder) setOrder(fetchedOrder)
  }, [fetchedOrder, setOrder])

  if (!orderId) return <Navigate to="/checkout" replace />

  const displayAmount = fetchedOrder?.grandTotal ?? amount ?? 0

  return (
    <div className="payment-page">
      <div className="container payment-page__inner">
        <div className="payment-page__header">
          <button className="btn btn-ghost payment-page__back" onClick={() => navigate(-1)}>
            <FiArrowLeft size={16} /> Back
          </button>
          <h1 className="payment-page__title">Secure Payment</h1>
        </div>

        <div className="payment-page__layout">
          <main className="payment-page__main">
            {isLoading ? (
              <div className="payment-page__processing">
                <div className="payment-page__spinner" />
                <p>Loading payment details…</p>
              </div>
            ) : (
              <PaystackPayment orderId={orderId} amount={displayAmount} />
            )}
          </main>

          <OrderSummaryPanel
            order={fetchedOrder ?? order ?? undefined}
            amount={displayAmount}
            currency={currency}
            orderNumber={
              fetchedOrder?.orderNumber ?? usePaymentStore.getState().orderNumber ?? undefined
            }
          />
        </div>
      </div>
    </div>
  )
}
