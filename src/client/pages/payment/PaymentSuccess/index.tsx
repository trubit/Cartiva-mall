import { useSearchParams, Link } from 'react-router-dom'
import { FiCheckCircle, FiPackage, FiArrowRight, FiShoppingBag, FiTruck } from 'react-icons/fi'
import { useOrder } from '../../../hooks/usePayment.js'
import { formatCurrency, formatDate } from '../../../../shared/helpers/index.js'

export default function PaymentSuccess() {
  const [params] = useSearchParams()
  const orderId = params.get('orderId') ?? ''

  const { data: order, isLoading } = useOrder(orderId)

  const orderDetailId = orderId || (order?._id as string | undefined) || ''
  const paymentPaid = order?.paymentStatus === 'paid'
  const orderConfirmed =
    order?.orderStatus === 'confirmed' ||
    order?.orderStatus === 'processing' ||
    order?.orderStatus === 'shipped' ||
    order?.orderStatus === 'delivered'

  return (
    <div className="payment-result payment-result--success">
      <div className="container payment-result__inner">
        <div className="payment-result__card">
          <div className="payment-result__icon-wrap payment-result__icon-wrap--success">
            <FiCheckCircle size={56} />
          </div>

          <h1 className="payment-result__title">Payment Successful!</h1>
          <p className="payment-result__subtitle">
            Your order has been confirmed. We'll send you a confirmation email shortly.
          </p>

          {/* Status chips */}
          <div
            style={{
              display: 'flex',
              gap: 8,
              justifyContent: 'center',
              marginBottom: '1.5rem',
              flexWrap: 'wrap',
            }}
          >
            {isLoading ? (
              <>
                <div className="skeleton" style={{ width: 110, height: 32, borderRadius: 999 }} />
                <div className="skeleton" style={{ width: 130, height: 32, borderRadius: 999 }} />
              </>
            ) : (
              <>
                <span
                  style={{
                    display: 'inline-flex',
                    alignItems: 'center',
                    gap: 6,
                    padding: '0.3rem 0.9rem',
                    borderRadius: 999,
                    fontSize: '0.8rem',
                    fontWeight: 700,
                    background: paymentPaid ? 'rgba(34,197,94,0.12)' : 'rgba(217,119,6,0.12)',
                    border: `1px solid ${paymentPaid ? 'rgba(34,197,94,0.35)' : 'rgba(217,119,6,0.35)'}`,
                    color: paymentPaid ? '#16a34a' : '#92400e',
                  }}
                >
                  <FiCheckCircle size={13} />
                  {paymentPaid ? 'Payment Paid' : 'Payment Pending'}
                </span>
                <span
                  style={{
                    display: 'inline-flex',
                    alignItems: 'center',
                    gap: 6,
                    padding: '0.3rem 0.9rem',
                    borderRadius: 999,
                    fontSize: '0.8rem',
                    fontWeight: 700,
                    background: orderConfirmed ? 'rgba(0,168,196,0.12)' : 'rgba(217,119,6,0.12)',
                    border: `1px solid ${orderConfirmed ? 'rgba(0,168,196,0.35)' : 'rgba(217,119,6,0.35)'}`,
                    color: orderConfirmed ? '#0e7490' : '#92400e',
                  }}
                >
                  <FiTruck size={13} />
                  {orderConfirmed ? 'Order Confirmed' : 'Order Processing'}
                </span>
              </>
            )}
          </div>

          {/* Order summary card */}
          {isLoading && (
            <div
              className="skeleton"
              style={{ height: 140, borderRadius: 'var(--radius-xl)', marginBottom: '1.5rem' }}
            />
          )}

          {!isLoading && order && (
            <div className="payment-result__order-card">
              <div className="payment-result__order-row">
                <span>Order Number</span>
                <strong className="payment-result__order-number">#{order.orderNumber}</strong>
              </div>
              <div className="payment-result__order-row">
                <span>Date</span>
                <span>{formatDate(order.createdAt)}</span>
              </div>
              <div className="payment-result__order-row">
                <span>Items</span>
                <span>
                  {order.items.length} item{order.items.length !== 1 ? 's' : ''}
                </span>
              </div>
              <div className="payment-result__order-row">
                <span>Total Paid</span>
                <strong style={{ color: '#16a34a' }}>{formatCurrency(order.grandTotal)}</strong>
              </div>
              <div className="payment-result__order-row">
                <span>Shipping To</span>
                <span>
                  {order.shippingAddress.city},{' '}
                  {order.shippingAddress.state && `${order.shippingAddress.state}, `}
                  {order.shippingAddress.country}
                </span>
              </div>
            </div>
          )}

          <div className="payment-result__actions">
            <Link to={`/orders/${orderDetailId}`} className="btn btn-primary btn-lg">
              <FiPackage size={16} />
              View My Order
            </Link>
            <Link to="/products" className="btn btn-outline">
              <FiShoppingBag size={16} />
              Continue Shopping
            </Link>
          </div>

          <p className="payment-result__note">
            <FiArrowRight size={12} />
            Your order will be dispatched within 1–2 business days.
          </p>
        </div>
      </div>
    </div>
  )
}
