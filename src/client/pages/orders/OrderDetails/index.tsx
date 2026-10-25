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
  FiCheckCircle,
  FiTruck,
} from 'react-icons/fi'
import { useOrder, useCancelOrder, useConfirmDelivery } from '../../../hooks/useOrders.js'
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
  const [showConfirmDeliveryModal, setShowConfirmDeliveryModal] = useState(false)
  const [deliverySuccessMessage, setDeliverySuccessMessage] = useState<string | null>(null)

  const { data: order, isLoading, isError } = useOrder(id ?? '')
  const { mutate: cancelOrder, isPending: cancelling, error: cancelError } = useCancelOrder()
  const {
    mutate: confirmDelivery,
    isPending: confirmingDelivery,
    error: confirmDeliveryError,
  } = useConfirmDelivery()
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
  const canConfirmDelivery =
    !order.deliveryConfirmedAt &&
    ['shipped', 'outForDelivery', 'delivered'].includes(order.orderStatus)

  const handleCancelClick = () => {
    setShowCancelModal(true)
  }

  const handleConfirmDelivery = () => {
    confirmDelivery(order._id, {
      onSuccess: () => {
        setDeliverySuccessMessage(
          'Delivery confirmed successfully. Thank you for shopping with Cartival Mall. The seller and Cartival Mall have been notified that your order has arrived.',
        )
        setShowConfirmDeliveryModal(false)
      },
    })
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
              {order.deliveryConfirmedAt && (
                <div
                  className="d-inline-flex align-items-center gap-1 px-3 py-2 rounded border bg-success-subtle text-success fw-semibold"
                  style={{ fontSize: '0.84rem' }}
                >
                  <FiCheckCircle size={14} />
                  <span>Delivery Confirmed on {formatDate(order.deliveryConfirmedAt)}</span>
                </div>
              )}
              {canConfirmDelivery && (
                <button
                  className="od-btn od-btn--primary"
                  onClick={() => setShowConfirmDeliveryModal(true)}
                  disabled={confirmingDelivery}
                  style={{
                    background: '#16a34a',
                    borderColor: '#16a34a',
                    display: 'inline-flex',
                    alignItems: 'center',
                    gap: 6,
                    fontWeight: 600,
                  }}
                >
                  <FiCheckCircle size={14} />
                  <span>Successfully Delivered to My Doorstep</span>
                </button>
              )}
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

          {/* Action errors */}
          {(cancelError || confirmDeliveryError) && (
            <div className="od-alert od-alert--error mt-2">
              {(cancelError as { response?: { data?: { message?: string } } })?.response?.data
                ?.message ??
                (cancelError as Error)?.message ??
                (confirmDeliveryError as { response?: { data?: { message?: string } } })?.response
                  ?.data?.message ??
                (confirmDeliveryError as Error)?.message ??
                'Action failed'}
            </div>
          )}
        </div>
      </div>

      {/* ══════════ BODY ══════════ */}
      <div className="container od-body">
        {/* Buyer Delivery Success Message */}
        {deliverySuccessMessage && (
          <div
            className="alert alert-success d-flex align-items-center gap-3 mb-4 p-3 rounded-3 shadow-sm"
            style={{ background: '#ecfdf5', color: '#065f46', border: '1px solid #a7f3d0' }}
          >
            <FiCheckCircle size={22} className="text-success flex-shrink-0" />
            <div className="fw-semibold">{deliverySuccessMessage}</div>
          </div>
        )}

        {/* Mandatory Buyer Delivery Alert when Order is Shipped */}
        {canConfirmDelivery && (
          <div
            className="card mb-4 border-0 shadow-sm rounded-3 overflow-hidden"
            style={{ background: '#f0fdf4', border: '1px solid #bbf7d0' }}
          >
            <div className="card-body p-4">
              <div className="d-flex flex-column flex-lg-row align-items-lg-center justify-content-between gap-3">
                <div className="d-flex align-items-start gap-3">
                  <div
                    className="rounded-circle d-flex align-items-center justify-content-center flex-shrink-0"
                    style={{ width: 44, height: 44, background: '#dcfce7', color: '#16a34a' }}
                  >
                    <FiTruck size={22} />
                  </div>
                  <div>
                    <h5 className="fw-bold mb-1" style={{ color: '#14532d' }}>
                      Has Your Order Arrived?
                    </h5>
                    <p className="mb-0 text-muted" style={{ fontSize: '0.92rem', maxWidth: 720 }}>
                      Your order has been marked as shipped by the seller. Please confirm delivery
                      only after the product has physically arrived at your doorstep. Once you
                      confirm successful delivery, the seller and Cartival Mall will be notified,
                      and your order status will be updated.
                    </p>
                  </div>
                </div>
                <button
                  className="btn btn-success fw-bold px-4 py-2 text-nowrap d-flex align-items-center gap-2 shadow-sm"
                  onClick={() => setShowConfirmDeliveryModal(true)}
                  disabled={confirmingDelivery}
                  style={{ background: '#16a34a', borderColor: '#16a34a', borderRadius: 8 }}
                >
                  <FiCheckCircle size={16} />
                  <span>Successfully Delivered to My Doorstep</span>
                </button>
              </div>
            </div>
          </div>
        )}

        {/* Verified Delivery Status when already confirmed */}
        {order.deliveryConfirmedAt && (
          <div
            className="card mb-4 border-0 shadow-sm rounded-3 overflow-hidden"
            style={{ background: '#f8fafc', border: '1px solid #e2e8f0' }}
          >
            <div className="card-body p-3 d-flex align-items-center justify-content-between flex-wrap gap-2">
              <div className="d-flex align-items-center gap-2 text-success fw-semibold">
                <FiCheckCircle size={18} />
                <span>
                  Delivery Confirmed — Received at Your Doorstep on{' '}
                  {formatDate(order.deliveryConfirmedAt)}
                </span>
              </div>
              <span className="badge bg-success-subtle text-success border border-success-subtle px-3 py-2 rounded-pill">
                Doorstep Receipt Verified
              </span>
            </div>
          </div>
        )}

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

      <ConfirmDialog
        open={showConfirmDeliveryModal}
        title="Confirm Successful Delivery"
        message="Have you physically received this product at your doorstep? Please confirm only if the order has arrived."
        confirmText="Yes, Confirm Delivery"
        cancelText="No, Not Yet"
        variant="primary"
        isLoading={confirmingDelivery}
        loadingText="Confirming Delivery…"
        onConfirm={handleConfirmDelivery}
        onClose={() => {
          if (!confirmingDelivery) setShowConfirmDeliveryModal(false)
        }}
      />
    </div>
  )
}
