import { useState } from 'react'
import { useParams, Link, useNavigate } from 'react-router-dom'
import {
  FiArrowLeft,
  FiMapPin,
  FiRefreshCw,
  FiXCircle,
  FiNavigation,
  FiPackage,
  FiShoppingBag,
  FiPhone,
  FiClock,
  FiFileText,
  FiChevronRight,
} from 'react-icons/fi'
import { useOrder, useCancelOrder } from '../../../hooks/useOrders.js'
import {
  OrderStatusBadge,
  PaymentStatusBadge,
} from '../../../components/order/OrderStatus/index.js'
import OrderTimeline from '../../../components/order/OrderTimeline/index.js'
import TrackingInfo from '../../../components/order/TrackingInfo/index.js'
import OrderSummary from '../../../components/order/OrderSummary/index.js'
import ReturnRequestForm from '../../../components/order/ReturnRequestForm/index.js'
import ConfirmDialog from '../../../components/common/ConfirmDialog/index.js'
import { formatDate } from '../../../../shared/helpers/index.js'
import { useCurrency } from '../../../hooks/useCurrency.js'
import {
  CANCELLABLE_STATUSES,
  RETURNABLE_STATUSES,
  RETURN_WINDOW_DAYS,
} from '../../../../shared/constants/index.js'

const STATUS_ACCENT: Record<string, string> = {
  pending: '#FF9900',
  confirmed: '#007185',
  processing: '#0066c0',
  shipped: '#8956FF',
  outForDelivery: '#067D62',
  delivered: '#067D62',
  cancelled: '#CC0C39',
  returned: '#CC0C39',
  refunded: '#565959',
}

function isWithinReturnWindow(createdAt: string) {
  return (Date.now() - new Date(createdAt).getTime()) / 86_400_000 <= RETURN_WINDOW_DAYS
}

function OrderDetailSkeleton() {
  return (
    <div className="od-page">
      <div className="od-hero od-hero--loading">
        <div className="container">
          <div className="od-skeleton" style={{ height: 20, width: 80, marginBottom: 16 }} />
          <div className="od-skeleton" style={{ height: 36, width: 340, marginBottom: 8 }} />
          <div className="od-skeleton" style={{ height: 16, width: 160, marginBottom: 24 }} />
          <div style={{ display: 'flex', gap: 8 }}>
            <div className="od-skeleton" style={{ height: 28, width: 100 }} />
            <div className="od-skeleton" style={{ height: 28, width: 120 }} />
          </div>
        </div>
      </div>
      <div className="container od-body">
        <div className="od-grid">
          <div>
            {[180, 260, 160].map((h, i) => (
              <div
                key={i}
                className="od-skeleton"
                style={{ height: h, marginBottom: 16, borderRadius: 8 }}
              />
            ))}
          </div>
          <div>
            {[140, 180].map((h, i) => (
              <div
                key={i}
                className="od-skeleton"
                style={{ height: h, marginBottom: 16, borderRadius: 8 }}
              />
            ))}
          </div>
        </div>
      </div>
    </div>
  )
}

export default function OrderDetails() {
  const { id } = useParams<{ id: string }>()
  const isValidId = Boolean(id) && id !== ':id' && /^[0-9a-fA-F]{24}$/.test(id!)
  const navigate = useNavigate()
  const [showReturn, setShowReturn] = useState(false)
  const [showCancelModal, setShowCancelModal] = useState(false)

  const { data: order, isLoading, isError } = useOrder(id ?? '')
  const { mutate: cancelOrder, isPending: cancelling, error: cancelError } = useCancelOrder()
  const { formatPrice } = useCurrency()

  if (isLoading) return <OrderDetailSkeleton />

  if (!isValidId || isError || !order) {
    return (
      <div className="container od-error-wrap">
        <div className="od-error-card">
          <FiPackage size={48} className="od-error-icon" />
          <h2 className="od-error-title">
            {!isValidId ? 'Invalid Order Link' : 'Order not found'}
          </h2>
          <p className="od-error-text">
            {!isValidId
              ? 'The URL contains a placeholder route parameter (:id). Please select an order from your history below.'
              : "We couldn't load this order. It may have been removed or you may not have access."}
          </p>
          <Link to="/orders" className="od-btn od-btn--primary">
            <FiArrowLeft size={14} /> View Your Orders
          </Link>
        </div>
      </div>
    )
  }

  const accent = STATUS_ACCENT[order.orderStatus] ?? '#131921'
  const canCancel = (CANCELLABLE_STATUSES as readonly string[]).includes(order.orderStatus)
  const canReturn =
    (RETURNABLE_STATUSES as readonly string[]).includes(order.orderStatus) &&
    isWithinReturnWindow(order.createdAt) &&
    !order.returnRequest

  const handleCancelClick = () => {
    setShowCancelModal(true)
  }

  const handleConfirmCancel = () => {
    cancelOrder(
      { orderId: order._id },
      {
        onSuccess: () => {
          setShowCancelModal(false)
          navigate('/orders')
        },
        onError: () => {
          setShowCancelModal(false)
        },
      },
    )
  }

  return (
    <div className="od-page">
      {/* ══════════ HERO HEADER ══════════ */}
      <div className="od-hero" style={{ '--od-accent': accent } as React.CSSProperties}>
        <div className="od-hero__accent-bar" />
        <div className="container">
          {/* Back */}
          <button className="od-back" onClick={() => navigate(-1)}>
            <FiArrowLeft size={14} />
            Back to Orders
          </button>

          <div className="od-hero__inner">
            {/* Title block */}
            <div className="od-hero__info">
              <h1 className="od-hero__title">Order #{order.orderNumber}</h1>
              <p className="od-hero__date">
                <FiClock size={12} style={{ marginRight: 4, verticalAlign: 'middle' }} />
                Placed on {formatDate(order.createdAt, { dateStyle: 'long' })}
              </p>
              <div className="od-hero__badges">
                <OrderStatusBadge status={order.orderStatus} showIcon />
                <PaymentStatusBadge status={order.paymentStatus} />
              </div>
            </div>

            {/* Actions */}
            <div className="od-hero__actions">
              <Link to={`/orders/${order._id}/track`} className="od-btn od-btn--ghost">
                <FiNavigation size={13} /> Track Order
              </Link>
              {canReturn && (
                <button
                  className="od-btn od-btn--outline-warning"
                  onClick={() => setShowReturn(true)}
                >
                  <FiRefreshCw size={13} /> Return
                </button>
              )}
              {canCancel && (
                <button
                  className="od-btn od-btn--danger"
                  onClick={handleCancelClick}
                  disabled={cancelling}
                >
                  <FiXCircle size={13} />
                  {cancelling ? 'Cancelling…' : 'Cancel Order'}
                </button>
              )}
            </div>
          </div>

          {/* Cancel error */}
          {cancelError && (
            <div className="od-alert od-alert--error">
              {(cancelError as { response?: { data?: { message?: string } } })?.response?.data
                ?.message ??
                (cancelError as Error)?.message ??
                'Failed to cancel order'}
            </div>
          )}
        </div>
      </div>

      {/* ══════════ BODY ══════════ */}
      <div className="container od-body">
        <div className="od-grid">
          {/* ── Left column ─────────────────────────────────── */}
          <div className="od-col-main">
            {/* Timeline */}
            <div className="od-card">
              <div className="od-card__head">
                <span className="od-card__head-dot" style={{ background: accent }} />
                <h2 className="od-card__title">Shipment History</h2>
              </div>
              <OrderTimeline
                events={order.tracking?.events ?? []}
                orderStatus={order.orderStatus}
              />
            </div>

            {/* Items */}
            <div className="od-card">
              <div className="od-card__head">
                <span className="od-card__head-dot" style={{ background: accent }} />
                <h2 className="od-card__title">
                  <FiShoppingBag size={15} style={{ marginRight: 6 }} />
                  Items Ordered
                </h2>
                <span className="od-card__head-count">{order.items.length}</span>
              </div>

              <ul className="od-items">
                {order.items.map((item, i) => (
                  <li key={i} className="od-item">
                    <div className="od-item__img-wrap">
                      {item.image ? (
                        <img
                          src={item.image}
                          alt={item.title}
                          className="od-item__img"
                          onError={(e) => {
                            ;(e.target as HTMLImageElement).style.display = 'none'
                          }}
                        />
                      ) : (
                        <div className="od-item__img-placeholder">
                          <FiPackage size={20} />
                        </div>
                      )}
                    </div>

                    <div className="od-item__info">
                      <Link to={`/products/${item.productId}`} className="od-item__title">
                        {item.title}
                      </Link>
                      <div className="od-item__chips">
                        <span className="od-chip">SKU: {item.sku}</span>
                        {item.selectedSize && (
                          <span className="od-chip">Size: {item.selectedSize}</span>
                        )}
                        {item.selectedColor && (
                          <span className="od-chip od-chip--color">{item.selectedColor}</span>
                        )}
                      </div>
                    </div>

                    <div className="od-item__right">
                      <span className="od-item__qty">×{item.quantity}</span>
                      <span className="od-item__total">
                        {formatPrice(item.lineTotal, order.currency)}
                      </span>
                    </div>
                  </li>
                ))}
              </ul>
            </div>

            {/* Shipping Address */}
            <div className="od-card od-address-card">
              <div className="od-card__head">
                <span className="od-card__head-dot" style={{ background: accent }} />
                <h2 className="od-card__title">
                  <FiMapPin size={15} style={{ marginRight: 6 }} />
                  Shipping Address
                </h2>
              </div>
              <div className="od-address">
                <div className="od-address__name">{order.shippingAddress.fullName}</div>
                <div className="od-address__lines">
                  <span>{order.shippingAddress.street}</span>
                  <span>
                    {order.shippingAddress.city}, {order.shippingAddress.state}{' '}
                    {order.shippingAddress.postalCode}
                  </span>
                  <span>{order.shippingAddress.country}</span>
                </div>
                <div className="od-address__phone">
                  <FiPhone size={12} />
                  {order.shippingAddress.phone}
                </div>
              </div>
            </div>

            {/* Return Request */}
            {order.returnRequest && (
              <div className="od-card od-return-card">
                <div className="od-card__head">
                  <span className="od-card__head-dot" style={{ background: '#CC0C39' }} />
                  <h2 className="od-card__title">
                    <FiRefreshCw size={15} style={{ marginRight: 6 }} />
                    Return Request
                  </h2>
                  <span
                    className={`od-return-status od-return-status--${order.returnRequest.status}`}
                  >
                    {order.returnRequest.status}
                  </span>
                </div>
                <div className="od-return-grid">
                  <div className="od-return-row">
                    <span className="od-return-label">Reason</span>
                    <span className="od-return-value">
                      {order.returnRequest.reason.replace(/_/g, ' ')}
                    </span>
                  </div>
                  {order.returnRequest.description && (
                    <div className="od-return-row">
                      <span className="od-return-label">Details</span>
                      <span className="od-return-value">{order.returnRequest.description}</span>
                    </div>
                  )}
                  <div className="od-return-row">
                    <span className="od-return-label">Requested</span>
                    <span className="od-return-value">
                      {formatDate(order.returnRequest.requestedAt)}
                    </span>
                  </div>
                  {order.returnRequest.refundAmount && (
                    <div className="od-return-row">
                      <span className="od-return-label">Refund Amount</span>
                      <strong className="od-return-amount">
                        {formatPrice(order.returnRequest.refundAmount)}
                      </strong>
                    </div>
                  )}
                </div>
              </div>
            )}
          </div>

          {/* ── Right column ─────────────────────────────────── */}
          <div className="od-col-side">
            {/* Tracking Info */}
            {order.tracking && (
              <div className="od-card">
                <div className="od-card__head">
                  <span className="od-card__head-dot" style={{ background: accent }} />
                  <h2 className="od-card__title">Shipping & Tracking</h2>
                </div>
                <TrackingInfo tracking={order.tracking} shippingMethod={order.shippingMethod} />
              </div>
            )}

            {/* Price summary */}
            <div className="od-card od-summary-card">
              <div className="od-card__head">
                <span className="od-card__head-dot" style={{ background: accent }} />
                <h2 className="od-card__title">Order Summary</h2>
              </div>
              <OrderSummary order={order} />
              <div className="od-summary-cta">
                <Link to="/orders" className="od-summary-cta__link">
                  View all orders <FiChevronRight size={13} />
                </Link>
              </div>
            </div>

            {/* Notes */}
            {order.notes && (
              <div className="od-card">
                <div className="od-card__head">
                  <span className="od-card__head-dot" style={{ background: accent }} />
                  <h2 className="od-card__title">
                    <FiFileText size={15} style={{ marginRight: 6 }} />
                    Order Notes
                  </h2>
                </div>
                <p className="od-notes">{order.notes}</p>
              </div>
            )}
          </div>
        </div>
      </div>

      <ReturnRequestForm
        orderId={order._id}
        show={showReturn}
        onHide={() => setShowReturn(false)}
      />

      <ConfirmDialog
        open={showCancelModal}
        title="Cancel Order?"
        message={`Are you sure you want to cancel order #${order.orderNumber}? This action cannot be undone.`}
        confirmText="Cancel Order"
        cancelText="Keep Order"
        variant="danger"
        isLoading={cancelling}
        loadingText="Cancelling…"
        onConfirm={handleConfirmCancel}
        onClose={() => {
          if (!cancelling) setShowCancelModal(false)
        }}
      />
    </div>
  )
}
