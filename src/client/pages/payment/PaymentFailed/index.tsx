import { useSearchParams, Link, useNavigate } from 'react-router-dom'
import { FiXCircle, FiRefreshCw, FiShoppingCart, FiHeadphones } from 'react-icons/fi'
import { usePaymentStore } from '../../../store/paymentStore.js'
import { SUPPORT_EMAIL } from '../../../../shared/constants/index.js'

export default function PaymentFailed() {
  const [params] = useSearchParams()
  const orderId = params.get('orderId') ?? ''
  const navigate = useNavigate()
  const { errorMessage, reset } = usePaymentStore()

  const handleRetry = () => {
    if (orderId) {
      usePaymentStore.getState().setStep('form')
      navigate(`/payment/${orderId}`, { replace: true })
    } else {
      reset()
      navigate('/checkout', { replace: true })
    }
  }

  return (
    <div className="payment-result payment-result--failed">
      <div className="container payment-result__inner">
        <div className="payment-result__card">
          {/* Icon */}
          <div className="payment-result__icon-wrap payment-result__icon-wrap--failed">
            <FiXCircle size={56} />
          </div>

          <h1 className="payment-result__title">Payment Failed</h1>
          <p className="payment-result__subtitle">
            {errorMessage ??
              'Your payment could not be processed. Please try again or use a different payment method.'}
          </p>

          {/* Common reasons */}
          <div className="payment-result__reasons">
            <p className="payment-result__reasons-title">This can happen due to:</p>
            <ul className="payment-result__reasons-list">
              <li>Insufficient funds</li>
              <li>Card declined by your bank</li>
              <li>Incorrect card details</li>
              <li>3D Secure authentication cancelled</li>
            </ul>
          </div>

          {/* Actions */}
          <div className="payment-result__actions">
            <button className="btn btn-primary btn-lg" onClick={handleRetry}>
              <FiRefreshCw size={16} />
              Try Again
            </button>
            <Link to="/cart" className="btn btn-outline">
              <FiShoppingCart size={16} />
              Return to Cart
            </Link>
          </div>

          <div className="payment-result__support">
            <FiHeadphones size={14} />
            <span>
              Need help? <a href={`mailto:${SUPPORT_EMAIL}`}>Contact Support</a>
            </span>
          </div>
        </div>
      </div>
    </div>
  )
}
