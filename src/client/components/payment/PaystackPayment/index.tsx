import { useEffect, useRef, useState } from 'react'
import { FiAlertCircle, FiCreditCard } from 'react-icons/fi'
import { usePaystackInitialize, usePaystackVerify } from '../../../hooks/usePayment.js'
import { usePaymentStore } from '../../../store/paymentStore.js'
import { useAuthStore } from '../../../store/authStore.js'
import type { PaystackInitResponse } from '../../../services/paymentService.js'

declare global {
  interface Window {
    PaystackPop: new () => {
      newTransaction: (opts: PaystackTransactionOptions) => void
    }
  }
}

interface PaystackTransactionOptions {
  key: string
  email: string
  amount: number
  currency?: string
  ref?: string
  metadata?: Record<string, unknown>
  onSuccess: (t: { reference: string }) => void
  onCancel: () => void
}

interface Props {
  orderId: string
  amount: number
}

const PAYSTACK_INLINE_URL = 'https://js.paystack.co/v2/inline.js'

function loadPaystackScript(): Promise<void> {
  return new Promise((resolve, reject) => {
    if (document.querySelector(`script[src="${PAYSTACK_INLINE_URL}"]`)) {
      if (window.PaystackPop) resolve()
      else
        document
          .querySelector(`script[src="${PAYSTACK_INLINE_URL}"]`)!
          .addEventListener('load', () => resolve())
      return
    }
    const s = document.createElement('script')
    s.src = PAYSTACK_INLINE_URL
    s.async = true
    s.onload = () => resolve()
    s.onerror = () => reject(new Error('Failed to load Paystack script'))
    document.head.appendChild(s)
  })
}

export default function PaystackPayment({ orderId, amount }: Props) {
  const user = useAuthStore((s) => s.user)
  const step = usePaymentStore((s) => s.step)
  const errorMessage = usePaymentStore((s) => s.errorMessage)
  const setStep = usePaymentStore((s) => s.setStep)
  const setError = usePaymentStore((s) => s.setError)

  const initialize = usePaystackInitialize()
  const verify = usePaystackVerify()

  const [scriptReady, setScriptReady] = useState(false)
  const [currency, setCurrency] = useState('NGN')
  const paystackDataRef = useRef<PaystackInitResponse | null>(null)

  useEffect(() => {
    loadPaystackScript()
      .then(() => setScriptReady(true))
      .catch((err: Error) => setError(err.message))
  }, [setError])

  const openPopup = (data: PaystackInitResponse) => {
    if (!window.PaystackPop) {
      setError('Paystack script not loaded. Please refresh and try again.')
      setStep('form')
      return
    }

    const popup = new window.PaystackPop()
    popup.newTransaction({
      key: data.publicKey,
      email: user?.email ?? '',
      amount: data.amount,
      currency: data.currency,
      ref: data.reference,
      metadata: { orderId, custom_fields: [] },
      onSuccess: (tx) => {
        verify.mutate(tx.reference)
      },
      onCancel: () => {
        setStep('form')
        setError('Payment was cancelled. You can try again.')
      },
    })
  }

  const handlePay = async () => {
    if (!user?.email) {
      setError('No email on account — please update your profile.')
      return
    }

    const data = await initialize.mutateAsync({ orderId, email: user.email })
    paystackDataRef.current = data
    setCurrency(data.currency ?? 'NGN')
    setStep('form')
    openPopup(data)
  }

  const METHODS = ['Card', 'Bank Transfer', 'USSD', 'Mobile Money', 'QR Code']

  return (
    <div className="paystack-panel">
      <div className="paystack-panel__header">
        <img
          src="https://website-v3-assets.s3.amazonaws.com/assets/img/hero/Paystack-mark-white-twitter.png"
          alt="Paystack"
          className="paystack-panel__logo"
          onError={(e) => {
            ;(e.target as HTMLImageElement).style.display = 'none'
          }}
        />
        <span className="paystack-panel__title">Pay with Paystack</span>
      </div>

      <div className="paystack-panel__methods">
        {METHODS.map((m) => (
          <span key={m} className="paystack-panel__method-badge">
            {m}
          </span>
        ))}
      </div>

      <p className="paystack-panel__note">
        Secure payments for Nigeria, Ghana, Kenya, South Africa and more. You'll be redirected to a
        secure Paystack checkout popup.
      </p>

      {errorMessage && step === 'form' && (
        <div className="paystack-panel__error">
          <FiAlertCircle size={14} />
          <span>{errorMessage}</span>
        </div>
      )}

      {step === 'processing' ? (
        <div className="paystack-panel__processing">
          <div className="payment-page__spinner" />
          <p>Processing payment…</p>
        </div>
      ) : (
        <button
          className="paystack-panel__btn"
          onClick={handlePay}
          disabled={!scriptReady || initialize.isPending || verify.isPending}
        >
          <FiCreditCard size={16} />
          Pay{' '}
          {new Intl.NumberFormat(undefined, {
            style: 'currency',
            currency,
          }).format(amount)}
        </button>
      )}

      <p className="paystack-panel__secured">🔒 Secured by Paystack · PCI DSS Level 1 certified</p>
    </div>
  )
}
