import { useEffect } from 'react'
import { useNavigate } from 'react-router-dom'

// Stripe redirect handler — Stripe has been removed.
// Redirect any accidental visitors back to checkout.
export default function PaymentComplete() {
  const navigate = useNavigate()

  useEffect(() => {
    navigate('/checkout', { replace: true })
  }, [navigate])

  return (
    <div className="payment-complete">
      <div className="payment-complete__spinner" />
      <p>Redirecting…</p>
    </div>
  )
}
