import { useEffect, useRef } from 'react'
import { useSearchParams, useNavigate } from 'react-router-dom'
import { paymentService } from '../../../services/paymentService.js'

export default function PaystackCallback() {
  const [params] = useSearchParams()
  const navigate = useNavigate()
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
      .paystackVerify(reference)
      .then(() =>
        navigate(orderId ? `/payment/success?orderId=${orderId}` : '/payment/success', {
          replace: true,
        }),
      )
      .catch(() => navigate('/payment/failed', { replace: true }))
  }, [params, navigate])

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
