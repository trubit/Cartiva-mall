import { useState } from 'react'
import { useParams, Link } from 'react-router-dom'
import { getImageUrl } from '../../../utils/image.js'
import Alert from 'react-bootstrap/Alert'
import Button from 'react-bootstrap/Button'
import { FiArrowLeft } from 'react-icons/fi'
import { useOrder } from '../../../hooks/useOrders.js'
import { OrderStatusBadge } from '../../../components/order/OrderStatus/index.js'
import ReturnRequestForm from '../../../components/order/ReturnRequestForm/index.js'
import { formatDate, formatCurrency } from '../../../../shared/helpers/index.js'
import {
  RETURNABLE_STATUSES,
  RETURN_WINDOW_DAYS,
  RETURN_REASON_LABELS,
} from '../../../../shared/constants/index.js'

function isWithinReturnWindow(createdAt: string) {
  return (Date.now() - new Date(createdAt).getTime()) / 86_400_000 <= RETURN_WINDOW_DAYS
}

export default function ReturnOrder() {
  const { id } = useParams<{ id: string }>()
  const [showModal, setShowModal] = useState(false)

  const { data: order, isLoading, isError } = useOrder(id ?? '')

  if (isLoading) {
    return (
      <div className="container section">
        <div className="skeleton" style={{ height: 200 }} />
      </div>
    )
  }

  if (isError || !order) {
    return (
      <div className="container section">
        <Alert variant="danger">Order not found.</Alert>
        <Link to="/orders" className="btn btn-outline-secondary btn-sm mt-2">
          <FiArrowLeft size={14} className="me-1" /> Back to Orders
        </Link>
      </div>
    )
  }

  const canReturn =
    (RETURNABLE_STATUSES as readonly string[]).includes(order.orderStatus) &&
    isWithinReturnWindow(order.createdAt)

  const alreadyRequested = Boolean(order.returnRequest)

  return (
    <div className="container section return-order">
      <div className="return-order__header">
        <Link to={`/orders/${order._id}`} className="btn btn-link p-0 return-order__back">
          <FiArrowLeft size={14} className="me-1" /> Order Details
        </Link>
        <h1 className="return-order__title">Return Request</h1>
        <p className="return-order__subtitle">
          Order #{order.orderNumber} · {formatDate(order.createdAt)}
        </p>
      </div>

      <div className="return-order__content">
        {/* Order snapshot */}
        <div className="return-order__card">
          <div className="return-order__order-header">
            <OrderStatusBadge status={order.orderStatus} showIcon />
            <strong>{formatCurrency(order.grandTotal)}</strong>
          </div>
          <ul className="return-order__items">
            {order.items.map((item, i) => (
              <li key={i} className="return-order__item">
                {item.image && (
                  <img
                    src={getImageUrl(item.image)}
                    alt={item.title}
                    className="return-order__item-img"
                  />
                )}
                <div className="return-order__item-info">
                  <span className="return-order__item-title">{item.title}</span>
                  <span className="return-order__item-meta">
                    ×{item.quantity} · {formatCurrency(item.lineTotal)}
                    {item.selectedSize && ` · Size: ${item.selectedSize}`}
                    {item.selectedColor && ` · Color: ${item.selectedColor}`}
                  </span>
                </div>
              </li>
            ))}
          </ul>
        </div>

        {/* Return status (already submitted) */}
        {alreadyRequested && order.returnRequest && (
          <div className="return-order__card">
            <h3 className="return-order__section-title">Return Request Status</h3>
            <div className="return-order__status-grid">
              <div className="return-order__status-row">
                <span>Status</span>
                <span
                  className={`badge badge-${
                    order.returnRequest.status === 'approved'
                      ? 'success'
                      : order.returnRequest.status === 'rejected'
                        ? 'danger'
                        : 'warning'
                  }`}
                >
                  {order.returnRequest.status}
                </span>
              </div>
              <div className="return-order__status-row">
                <span>Reason</span>
                <span>{RETURN_REASON_LABELS[order.returnRequest.reason]}</span>
              </div>
              {order.returnRequest.description && (
                <div className="return-order__status-row">
                  <span>Details</span>
                  <span>{order.returnRequest.description}</span>
                </div>
              )}
              <div className="return-order__status-row">
                <span>Submitted</span>
                <span>{formatDate(order.returnRequest.requestedAt)}</span>
              </div>
              {order.returnRequest.refundAmount !== undefined && (
                <div className="return-order__status-row">
                  <span>Refund</span>
                  <strong>{formatCurrency(order.returnRequest.refundAmount)}</strong>
                </div>
              )}
            </div>
            <Alert variant="info" className="mt-3 mb-0">
              Our team reviews return requests within 1–2 business days. We'll notify you by email.
            </Alert>
          </div>
        )}

        {/* Not eligible */}
        {!alreadyRequested && !canReturn && (
          <Alert variant="warning">
            {!(RETURNABLE_STATUSES as readonly string[]).includes(order.orderStatus)
              ? `Returns are only available for delivered orders. Current status: "${order.orderStatus}".`
              : `The ${RETURN_WINDOW_DAYS}-day return window for this order has passed.`}
          </Alert>
        )}

        {/* Eligible — show button to open modal */}
        {!alreadyRequested && canReturn && (
          <div className="return-order__card">
            <h3 className="return-order__section-title">Submit Return Request</h3>
            <p className="text-muted mb-3" style={{ fontSize: 'var(--text-sm)' }}>
              You have {RETURN_WINDOW_DAYS} days from delivery to request a return. Our team reviews
              each request within 1–2 business days.
            </p>
            <Button variant="danger" onClick={() => setShowModal(true)}>
              Start Return Request
            </Button>
          </div>
        )}
      </div>

      {/* Return form modal — rendered here so it can open on this page */}
      <ReturnRequestForm orderId={order._id} show={showModal} onHide={() => setShowModal(false)} />
    </div>
  )
}
