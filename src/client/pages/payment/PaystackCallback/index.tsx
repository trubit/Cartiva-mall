import { useEffect, useRef } from 'react'
import { useSearchParams, useNavigate } from 'react-router-dom'
import { useQueryClient } from '@tanstack/react-query'
import { paymentService } from '../../../services/paymentService.js'
import { ORDER_KEY } from '../../../hooks/useOrders.js'
import { useCartStore } from '../../../store/cartStore.js'
import { usePaymentStore } from '../../../store/paymentStore.js'

export default function PaystackCallback() {
  const [params] = useSearchParams()
  const navigate = useNavigate()
  const qc = useQueryClient()
  const calledRef = useRef(false)

  useEffect(() => {
    if (calledRef.current) return
    calledRef.current = true

    const reference = params.get('reference') ?? params.get('trxref')
    const orderId = params.get('orderId')

    if (!reference) {
      navigate('/payment/failed', { replace: true })
      return
    }

    paymentService
      .paystackVerify(reference, orderId ?? undefined)
      .then((data: any) => {
        const verifiedOrderId = data?._id || data?.orderId || orderId
        if (verifiedOrderId) {
          qc.setQueryData([...ORDER_KEY, verifiedOrderId], data)
          qc.invalidateQueries({ queryKey: [...ORDER_KEY, verifiedOrderId] })
        }
        qc.invalidateQueries({ queryKey: ORDER_KEY })
        qc.invalidateQueries({ queryKey: ['cart'] })
        useCartStore.getState().clearServerCart()
        useCartStore.getState().clearGuestCart()
        usePaymentStore.getState().setOrder(data)
        usePaymentStore.getState().setStep('success')

        navigate(
          verifiedOrderId ? `/payment/success?orderId=${verifiedOrderId}` : '/payment/success',
          {
            replace: true,
          },
        )
      })
      .catch(() => navigate('/payment/failed', { replace: true }))
  }, [params, navigate, qc])

  return (
    <div
      style={{
        minHeight: '60vh',
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
        gap: '1rem',
      }}
    >
      <div className="payment-page__spinner" style={{ width: 40, height: 40, borderWidth: 4 }} />
      <p style={{ color: '#6b7280', fontSize: '.9rem' }}>Verifying your payment…</p>
    </div>
  )
}
