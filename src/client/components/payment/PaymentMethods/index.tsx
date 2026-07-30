import { FiCreditCard } from 'react-icons/fi'

interface PaymentMethodsProps {
  amount: number
  currency: string
}

export default function PaymentMethods({ amount, currency }: PaymentMethodsProps) {
  const displayAmount = new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: currency.toUpperCase(),
  }).format(amount)

  return (
    <div className="payment-methods">
      <div className="payment-methods__header">
        <FiCreditCard size={18} className="payment-methods__icon" />
        <div>
          <p className="payment-methods__title">Payment Details</p>
          <p className="payment-methods__amount">
            You will be charged <strong>{displayAmount}</strong>
          </p>
        </div>
      </div>

      <div className="payment-methods__accepted">
        <span className="payment-methods__accepted-label">Accepted:</span>
        <div className="payment-methods__cards">
          {['Visa', 'Mastercard', 'Amex', 'Discover'].map((card) => (
            <span key={card} className="payment-methods__card-badge">
              {card}
            </span>
          ))}
        </div>
      </div>
    </div>
  )
}
