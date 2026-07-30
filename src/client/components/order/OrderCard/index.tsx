import { useState } from 'react'
import { Link } from 'react-router-dom'
import { getImageUrl } from '../../../utils/image.js'
import {
  FiPackage,
  FiNavigation,
  FiRefreshCw,
  FiXCircle,
  FiEye,
  FiStar,
  FiCalendar,
  FiHash,
} from 'react-icons/fi'
import { formatCurrency, formatDate } from '../../../../shared/helpers/index.js'
import {
  CANCELLABLE_STATUSES,
  RETURNABLE_STATUSES,
  RETURN_WINDOW_DAYS,
} from '../../../../shared/constants/index.js'
import { OrderStatusBadge, PaymentStatusBadge } from '../OrderStatus/index.js'
import { useCancelOrder } from '../../../hooks/useOrders.js'
import ReturnRequestForm from '../ReturnRequestForm/index.js'
import type { IOrder } from '../../../../shared/types/index.js'

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

export default function OrderCard({ order }: { order: IOrder }) {
  const [showReturn, setShowReturn] = useState(false)
  const { mutate: cancelOrder, isPending: cancelling } = useCancelOrder()

  const accent = STATUS_ACCENT[order.orderStatus] ?? '#232F3E'
  const canCancel = (CANCELLABLE_STATUSES as readonly string[]).includes(order.orderStatus)
  const canReturn =
    (RETURNABLE_STATUSES as readonly string[]).includes(order.orderStatus) &&
    isWithinReturnWindow(order.createdAt) &&
    !order.returnRequest
  const canTrack = !['pending', 'confirmed'].includes(order.orderStatus)
  const canReview = order.orderStatus === 'delivered'

  const thumbs = order.items.slice(0, 4)
  const extraCount = order.items.length - thumbs.length

  const handleCancel = () => {
    if (!window.confirm('Are you sure you want to cancel this order?')) return
    cancelOrder({ orderId: order._id })
  }

  return (
    <>
      <article className="oc-card" style={{ '--oc-accent': accent } as React.CSSProperties}>
        {/* Status accent rail */}
        <div className="oc-rail" />

        {/* ── Header ── */}
        <div className="oc-header">
          <div className="oc-header__meta">
            <span className="oc-order-num">
              <FiHash size={11} className="oc-order-num__icon" />
              {order.orderNumber}
            </span>
            <span className="oc-date">
              <FiCalendar size={11} />
              {formatDate(order.createdAt)}
            </span>
          </div>
          <div className="oc-header__badges">
            <OrderStatusBadge status={order.orderStatus} showIcon />
            <PaymentStatusBadge status={order.paymentStatus} />
          </div>
        </div>

        {/* ── Product Preview ── */}
        <div className="oc-preview">
          {/* Thumbnail strip */}
          <div className="oc-thumbs">
            {thumbs.map((item, i) => (
              <div className="oc-thumb" key={i}>
                {getImageUrl(item.image) ? (
                  <img
                    src={getImageUrl(item.image)}
                    alt={item.title}
                    className="oc-thumb__img"
                    loading="lazy"
                    onError={(e) => {
                      ;(e.target as HTMLImageElement).style.display = 'none'
                    }}
                  />
                ) : (
                  <div className="oc-thumb__placeholder">
                    <FiPackage size={18} />
                  </div>
                )}
              </div>
            ))}
            {extraCount > 0 && <div className="oc-thumb oc-thumb--more">+{extraCount}</div>}
          </div>

          {/* Item summary */}
          <div className="oc-preview__info">
            <p className="oc-preview__title">
              {order.items[0]?.title}
              {order.items.length > 1 && (
                <span className="oc-preview__count">
                  &nbsp;+{order.items.length - 1} more item{order.items.length > 2 ? 's' : ''}
                </span>
              )}
            </p>
            {(order.items[0]?.selectedSize || order.items[0]?.selectedColor) && (
              <div className="oc-preview__chips">
                {order.items[0].selectedSize && (
                  <span className="oc-chip">Size: {order.items[0].selectedSize}</span>
                )}
                {order.items[0].selectedColor && (
                  <span className="oc-chip">Color: {order.items[0].selectedColor}</span>
                )}
              </div>
            )}
          </div>

          {/* Total */}
          <div className="oc-total">
            <span className="oc-total__label">Total</span>
            <span className="oc-total__value">{formatCurrency(order.grandTotal)}</span>
          </div>
        </div>

        {/* ── Actions ── */}
        <div className="oc-footer">
          <Link to={`/orders/${order._id}`} className="oc-action oc-action--primary">
            <FiEye size={13} /> View Details
          </Link>

          {canTrack && (
            <Link to={`/orders/${order._id}/track`} className="oc-action oc-action--ghost">
              <FiNavigation size={13} /> Track
            </Link>
          )}

          {canReview && (
            <Link
              to={`/products/${order.items[0]?.productId}?review=1`}
              className="oc-action oc-action--success"
            >
              <FiStar size={13} /> Review
            </Link>
          )}

          {canReturn && (
            <button className="oc-action oc-action--warning" onClick={() => setShowReturn(true)}>
              <FiRefreshCw size={13} /> Return
            </button>
          )}

          {canCancel && (
            <button
              className="oc-action oc-action--danger"
              onClick={handleCancel}
              disabled={cancelling}
            >
              <FiXCircle size={13} />
              {cancelling ? 'Cancelling…' : 'Cancel'}
            </button>
          )}
        </div>
      </article>

      <ReturnRequestForm
        orderId={order._id}
        show={showReturn}
        onHide={() => setShowReturn(false)}
      />
    </>
  )
}
