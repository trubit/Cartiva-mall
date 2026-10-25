import { useState } from 'react'
import Modal from 'react-bootstrap/Modal'
import Form from 'react-bootstrap/Form'
import Alert from 'react-bootstrap/Alert'
import {
  FiPackage,
  FiTruck,
  FiMapPin,
  FiPhone,
  FiCheckCircle,
  FiClock,
  FiDollarSign,
  FiInfo,
  FiUser,
} from 'react-icons/fi'
import { useSellerOrders, useUpdateOrderStatus } from '../../../hooks/useOrders.js'
import {
  OrderStatusBadge,
  PaymentStatusBadge,
} from '../../../components/order/OrderStatus/index.js'
import { formatDate } from '../../../../shared/helpers/index.js'
import { useCurrency } from '../../../hooks/useCurrency.js'
import { ORDER_STATUS } from '../../../../shared/constants/index.js'
import type { IOrder, OrderStatus } from '../../../../shared/types/index.js'

const SELLER_ALLOWED_STATUSES: OrderStatus[] = [
  ORDER_STATUS.PROCESSING,
  ORDER_STATUS.SHIPPED,
  ORDER_STATUS.OUT_FOR_DELIVERY,
  ORDER_STATUS.DELIVERED,
] as OrderStatus[]

const STATUS_LABELS: Record<string, string> = {
  pending: 'Pending',
  processing: 'Processing',
  shipped: 'Shipped',
  outForDelivery: 'Out for Delivery',
  delivered: 'Delivered',
  cancelled: 'Cancelled',
  returned: 'Returned',
}

interface StatusModalProps {
  order: IOrder
  show: boolean
  onHide: () => void
}

function StatusUpdateModal({ order, show, onHide }: StatusModalProps) {
  const [newStatus, setNewStatus] = useState<OrderStatus>(order.orderStatus as OrderStatus)
  const [trackingNumber, setTrackingNumber] = useState(
    order.sellerBreakdown?.trackingNumber ?? order.tracking?.trackingNumber ?? '',
  )
  const [carrier, setCarrier] = useState(
    order.sellerBreakdown?.carrier ?? order.tracking?.carrier ?? '',
  )
  const [note, setNote] = useState('')

  const { mutate: updateStatus, isPending, error } = useUpdateOrderStatus()
  const { formatPrice } = useCurrency()

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    updateStatus(
      {
        orderId: order._id,
        orderStatus: newStatus,
        tracking: {
          trackingNumber: trackingNumber.trim() || undefined,
          carrier: carrier.trim() || undefined,
          note: note.trim() || undefined,
        },
      },
      { onSuccess: onHide },
    )
  }

  // Extract seller breakdown or fall back to order amounts
  const sellerSubtotal = order.sellerBreakdown?.sellerProductSubtotal ?? order.subtotal
  const sellerShipping = order.sellerBreakdown?.sellerShippingFee ?? order.shippingFee
  const sellerCommission =
    order.sellerBreakdown?.sellerCommission ?? (order.platformCommission || 0)
  const sellerNet =
    order.sellerBreakdown?.sellerNetAmount ?? order.sellerEarnings ?? order.grandTotal

  return (
    <Modal show={show} onHide={onHide} centered size="lg" className="pm-modal">
      <Modal.Header closeButton>
        <Modal.Title className="d-flex align-items-center gap-2">
          <span className="pm-modal__title-icon" aria-hidden="true">
            <FiTruck size={15} />
          </span>
          <span>Fulfill & Update Order #{order.orderNumber}</span>
        </Modal.Title>
      </Modal.Header>

      <Modal.Body>
        {error && (
          <div className="pm-alert pm-alert--error mb-3" role="alert">
            {(error as Error).message}
          </div>
        )}

        {/* ── Seller Independent Shipping Notice ── */}
        <div
          className="p-3 mb-3 rounded border"
          style={{
            background: 'rgba(235, 126, 37, 0.08)',
            borderColor: 'rgba(235, 126, 37, 0.25)',
          }}
        >
          <div className="d-flex align-items-start gap-2">
            <FiInfo size={18} style={{ color: '#eb7e25', flexShrink: 0, marginTop: 2 }} />
            <div style={{ fontSize: '0.85rem', lineHeight: 1.45 }}>
              <strong>Seller-Independent Shipping Policy:</strong> As an independent seller, you are
              responsible for packaging and dispatching this order directly to the customer. The
              customer-paid shipping fee is allocated to you and included in your net payout
              calculation.
            </div>
          </div>
        </div>

        {/* ── Customer Delivery Details ── */}
        <div className="pm-card mb-3">
          <div className="p-3">
            <h6 className="pm-card__title fw-bold d-flex align-items-center gap-2 mb-2">
              <FiMapPin size={15} style={{ color: 'var(--pm-teal, #00c3e6)' }} />
              Customer Delivery Address
            </h6>
            <div className="row g-2" style={{ fontSize: '0.88rem' }}>
              <div className="col-md-6">
                <div className="pm-text-muted small">Recipient Name</div>
                <div className="fw-semibold pm-text-main">
                  <FiUser size={12} className="me-1 pm-text-muted" />
                  {order.shippingAddress?.fullName || 'Valued Customer'}
                </div>
              </div>
              <div className="col-md-6">
                <div className="pm-text-muted small">Phone Contact</div>
                <div className="fw-semibold pm-text-main">
                  <FiPhone size={12} className="me-1 pm-text-muted" />
                  {order.shippingAddress?.phone || 'N/A'}
                </div>
              </div>
              <div className="col-12">
                <div className="pm-text-muted small">Shipping Destination</div>
                <div className="pm-text-main" style={{ lineHeight: 1.5 }}>
                  {order.shippingAddress?.street && <span>{order.shippingAddress.street}, </span>}
                  {order.shippingAddress?.city && <span>{order.shippingAddress.city}, </span>}
                  {order.shippingAddress?.state && <span>{order.shippingAddress.state} </span>}
                  {order.shippingAddress?.postalCode && (
                    <span>({order.shippingAddress.postalCode}), </span>
                  )}
                  {order.shippingAddress?.country && <span>{order.shippingAddress.country}</span>}
                </div>
                {(order.shippingAddress as Record<string, any>)?.deliveryInstructions && (
                  <div
                    className="mt-2 p-2 rounded small"
                    style={{
                      background: 'rgba(0, 195, 230, 0.08)',
                      border: '1px solid rgba(0, 195, 230, 0.2)',
                      color: 'var(--pm-teal, #00c3e6)',
                    }}
                  >
                    <strong>Instructions:</strong>{' '}
                    {(order.shippingAddress as Record<string, any>).deliveryInstructions}
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>

        {/* ── Items to Package & Ship ── */}
        <div className="pm-card mb-3">
          <div className="p-3">
            <h6 className="pm-card__title fw-bold d-flex align-items-center gap-2 mb-2">
              <FiPackage size={15} style={{ color: 'var(--pm-gold, #d4a853)' }} />
              Your Products to Pack ({order.items.length})
            </h6>
            <div className="d-flex flex-column gap-2">
              {order.items.map((it, idx) => (
                <div
                  key={idx}
                  className="py-2 d-flex justify-content-between align-items-center"
                  style={{
                    borderBottom:
                      idx < order.items.length - 1
                        ? '1px solid var(--pm-modal-section-sep)'
                        : 'none',
                  }}
                >
                  <div className="d-flex align-items-center gap-2">
                    {it.image && (
                      <img
                        src={it.image}
                        alt=""
                        style={{
                          width: 40,
                          height: 40,
                          objectFit: 'cover',
                          borderRadius: 6,
                          border: '1px solid var(--pm-modal-border)',
                        }}
                      />
                    )}
                    <div>
                      <div className="fw-semibold pm-text-main" style={{ fontSize: '0.88rem' }}>
                        {it.title}
                      </div>
                      <div className="pm-text-muted small">
                        SKU: {it.sku} • Qty: {it.quantity}
                        {it.selectedSize && ` • Size: ${it.selectedSize}`}
                        {it.selectedColor && ` • Color: ${it.selectedColor}`}
                      </div>
                    </div>
                  </div>
                  <div className="fw-bold pm-text-main" style={{ fontSize: '0.9rem' }}>
                    {formatPrice(it.lineTotal, order.currency)}
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* ── Payout Breakdown for this Order ── */}
        <div className="pm-card mb-3">
          <div className="p-3">
            <h6 className="pm-card__title fw-bold d-flex align-items-center gap-2 mb-2">
              <FiDollarSign size={15} style={{ color: '#10b981' }} />
              Seller Payout Calculation
            </h6>
            <div className="d-flex flex-column gap-1" style={{ fontSize: '0.88rem' }}>
              <div className="d-flex justify-content-between">
                <span className="pm-text-muted">Product Subtotal</span>
                <span className="fw-semibold pm-text-main">
                  {formatPrice(sellerSubtotal, order.currency)}
                </span>
              </div>
              <div
                className="d-flex justify-content-between fw-medium"
                style={{ color: '#10b981' }}
              >
                <span>Customer Shipping Fee — Included in Seller Payout</span>
                <span>+{formatPrice(sellerShipping, order.currency)}</span>
              </div>
              <div className="d-flex justify-content-between" style={{ color: '#ef4444' }}>
                <span>Platform Commission</span>
                <span>−{formatPrice(sellerCommission, order.currency)}</span>
              </div>
              <hr
                className="my-1"
                style={{ borderColor: 'var(--pm-modal-section-sep)', opacity: 0.25 }}
              />
              <div className="d-flex justify-content-between fw-bold">
                <span className="pm-text-main">Net Seller Earnings</span>
                <span style={{ color: 'var(--pm-teal, #00c3e6)' }}>
                  {formatPrice(sellerNet, order.currency)}
                </span>
              </div>
              <div className="mt-2 small pm-text-muted">
                {order.deliveryConfirmedAt ? (
                  <span className="d-flex align-items-center gap-1" style={{ color: '#10b981' }}>
                    <FiCheckCircle size={13} />
                    Delivery confirmed by customer on {formatDate(order.deliveryConfirmedAt)}
                  </span>
                ) : (
                  <span className="d-flex align-items-center gap-1 pm-text-muted">
                    <FiClock size={13} />
                    Delivery status: {order.orderStatus}. Funds settle according to platform policy.
                  </span>
                )}
              </div>
            </div>
          </div>
        </div>

        {/* ── Fulfillment Controls Form ── */}
        <Form id="seller-status-form" onSubmit={handleSubmit}>
          <div className="pm-section">
            <p className="pm-section-label fw-bold mb-2">Update Shipment & Fulfillment</p>
            <Form.Group className="mb-3" controlId="status-select">
              <Form.Label className="small fw-semibold">Fulfillment Status</Form.Label>
              <Form.Select
                value={newStatus}
                onChange={(e) => setNewStatus(e.target.value as OrderStatus)}
              >
                {SELLER_ALLOWED_STATUSES.map((s) => (
                  <option key={s} value={s}>
                    {STATUS_LABELS[s] ?? s}
                  </option>
                ))}
              </Form.Select>
              <Form.Text className="text-muted small">
                Updating this status notifies the customer and Cartival Mall in real-time.
              </Form.Text>
            </Form.Group>
          </div>

          <div className="pm-section">
            <p className="pm-section-label fw-bold mb-2">Delivery Tracking Details</p>
            <div className="row g-2">
              <div className="col-md-6">
                <Form.Group className="mb-3" controlId="carrier-input">
                  <Form.Label className="small fw-semibold">Delivery Courier / Carrier</Form.Label>
                  <Form.Control
                    placeholder="e.g. GIG Logistics, DHL, Dispatch Rider"
                    value={carrier}
                    onChange={(e) => setCarrier(e.target.value)}
                  />
                </Form.Group>
              </div>
              <div className="col-md-6">
                <Form.Group className="mb-3" controlId="tracking-input">
                  <Form.Label className="small fw-semibold">Tracking Number / Waybill</Form.Label>
                  <Form.Control
                    placeholder="e.g. TRK-99281928"
                    value={trackingNumber}
                    onChange={(e) => setTrackingNumber(e.target.value)}
                    style={{ fontFamily: 'monospace', letterSpacing: '0.04em' }}
                  />
                </Form.Group>
              </div>
            </div>

            <Form.Group controlId="note-input">
              <Form.Label className="small fw-semibold">
                Delivery Note / Dispatch Instructions{' '}
                <span className="text-muted fw-normal">(optional)</span>
              </Form.Label>
              <Form.Control
                as="textarea"
                rows={2}
                placeholder="e.g. Package handed over to courier for transit"
                value={note}
                onChange={(e) => setNote(e.target.value)}
              />
            </Form.Group>
          </div>
        </Form>
      </Modal.Body>

      <Modal.Footer>
        <button
          type="button"
          className="pm-btn pm-btn--cancel"
          onClick={onHide}
          disabled={isPending}
        >
          Cancel
        </button>
        <button
          type="submit"
          form="seller-status-form"
          className="pm-btn pm-btn--submit"
          disabled={isPending}
        >
          {isPending ? (
            <>
              <span className="pm-spinner" /> Saving…
            </>
          ) : (
            'Update Shipment & Status'
          )}
        </button>
      </Modal.Footer>
    </Modal>
  )
}

export default function SellerOrders() {
  const [page, setPage] = useState(1)
  const [statusFilter, setStatusFilter] = useState<string | undefined>(undefined)
  const [editingOrder, setEditingOrder] = useState<IOrder | null>(null)

  const { data, isLoading, isError } = useSellerOrders({ status: statusFilter, page, limit: 20 })
  const { formatPrice } = useCurrency()
  const orders = data?.orders ?? []
  const total = data?.pagination?.total ?? orders.length
  const totalPages = data?.pagination?.totalPages ?? 1

  const allStatuses = Object.values(ORDER_STATUS)

  return (
    <div className="container section seller-orders">
      {/* ── Header ──────────────────────────────────────────── */}
      <div className="seller-orders__header">
        <div>
          <h1 className="seller-orders__title">Order Management & Fulfillment</h1>
          <p className="seller-orders__subtitle">
            Ship products directly to customers and track your earnings including customer shipping
            fees
          </p>
        </div>
      </div>

      {/* ── Persistent Seller Shipping Alert Banner ── */}
      <div
        className="p-3 mb-4 rounded-3 border d-flex align-items-start gap-3"
        style={{
          background: 'rgba(235, 126, 37, 0.08)',
          borderColor: 'rgba(235, 126, 37, 0.28)',
          borderLeft: '4px solid #f97316',
        }}
      >
        <div
          className="rounded-circle d-flex align-items-center justify-content-center flex-shrink-0"
          style={{
            width: 36,
            height: 36,
            background: 'rgba(249, 115, 22, 0.15)',
            color: '#ea580c',
          }}
        >
          <FiTruck size={20} />
        </div>
        <div>
          <div className="fw-bold" style={{ color: '#f97316', fontSize: '0.98rem' }}>
            New Order — Shipping Required
          </div>
          <div className="so-text-muted mt-1" style={{ fontSize: '0.86rem', lineHeight: 1.55 }}>
            You have received a new order on Cartival Mall. As an independent seller, you are
            responsible for preparing and shipping this product directly to the customer. The
            shipping fee paid by the customer for this order will be included in your payout
            calculation, subject to payment verification, applicable deductions, refunds, and
            settlement rules. Please arrange delivery and keep the order status updated. This alert
            will remain visible until the buyer confirms successful delivery.
          </div>
        </div>
      </div>

      {/* ── Filter bar ──────────────────────────────────────── */}
      <div className="so-filter-bar">
        <button
          className={`so-filter-btn${!statusFilter ? ' so-filter-btn--active' : ''}`}
          onClick={() => {
            setStatusFilter(undefined)
            setPage(1)
          }}
        >
          All
        </button>
        {allStatuses.map((s) => (
          <button
            key={s}
            className={`so-filter-btn${statusFilter === s ? ' so-filter-btn--active' : ''}`}
            onClick={() => {
              setStatusFilter(s)
              setPage(1)
            }}
          >
            {STATUS_LABELS[s] ?? s}
          </button>
        ))}
        <span className="so-count">
          {total} order{total !== 1 ? 's' : ''}
        </span>
      </div>

      {/* ── Loading skeletons ────────────────────────────────── */}
      {isLoading && (
        <div className="d-flex flex-column gap-2">
          {[1, 2, 3].map((i) => (
            <div key={i} className="skeleton" style={{ height: 64, borderRadius: 10 }} />
          ))}
        </div>
      )}

      {isError && <Alert variant="danger">Failed to load orders. Please try again.</Alert>}

      {/* ── Empty state ──────────────────────────────────────── */}
      {!isLoading && !isError && orders.length === 0 && (
        <div className="seller-orders__empty">
          <FiPackage
            size={44}
            style={{ color: 'var(--pm-teal)', opacity: 0.45, marginBottom: 12 }}
          />
          <p style={{ fontWeight: 600, marginBottom: 4 }}>No orders found</p>
          <p style={{ fontSize: '0.84rem', opacity: 0.55, margin: 0 }}>
            {statusFilter
              ? 'Try a different status filter.'
              : 'Orders for your products will appear here.'}
          </p>
        </div>
      )}

      {/* ── Orders table ────────────────────────────────────── */}
      {!isLoading && orders.length > 0 && (
        <div className="so-table-wrap seller-orders__table-wrap">
          <table className="so-table table align-middle">
            <thead>
              <tr>
                <th>Order</th>
                <th>Destination</th>
                <th>Items</th>
                <th>Payout Breakdown</th>
                <th>Fulfillment</th>
                <th>Payment</th>
                <th>Action</th>
              </tr>
            </thead>
            <tbody>
              {orders.map((order) => {
                const subtotal = order.sellerBreakdown?.sellerProductSubtotal ?? order.subtotal
                const shipping = order.sellerBreakdown?.sellerShippingFee ?? order.shippingFee
                const commission =
                  order.sellerBreakdown?.sellerCommission ?? (order.platformCommission || 0)
                const netPayout =
                  order.sellerBreakdown?.sellerNetAmount ?? order.sellerEarnings ?? order.grandTotal

                return (
                  <tr key={order._id}>
                    <td>
                      <div className="fw-bold so-order-num">#{order.orderNumber}</div>
                      <div className="so-date small">{formatDate(order.createdAt)}</div>
                    </td>
                    <td>
                      <div className="fw-semibold so-text-main" style={{ fontSize: '0.88rem' }}>
                        {order.shippingAddress?.fullName || 'Customer'}
                      </div>
                      <div className="so-text-muted small">
                        {order.shippingAddress?.city ? `${order.shippingAddress.city}, ` : ''}
                        {order.shippingAddress?.state || ''}
                      </div>
                      {order.shippingAddress?.phone && (
                        <div className="so-text-muted small">
                          <FiPhone size={10} className="me-1" />
                          {order.shippingAddress.phone}
                        </div>
                      )}
                    </td>
                    <td className="so-items">
                      <div className="fw-semibold so-text-main">
                        {order.items.length} item{order.items.length !== 1 ? 's' : ''}
                      </div>
                      <div className="so-text-muted small text-truncate" style={{ maxWidth: 160 }}>
                        {order.items.map((i) => i.title).join(', ')}
                      </div>
                    </td>
                    <td>
                      <div className="d-flex flex-column gap-0" style={{ fontSize: '0.84rem' }}>
                        <div>
                          <span className="so-text-muted">Products:</span>{' '}
                          <span className="so-text-main fw-medium">
                            {formatPrice(subtotal, order.currency)}
                          </span>
                        </div>
                        <div className="text-success fw-medium">
                          <span>Shipping:</span> +{formatPrice(shipping, order.currency)}
                        </div>
                        {commission > 0 && (
                          <div className="so-text-muted" style={{ fontSize: '0.78rem' }}>
                            <span>Commission:</span> -{formatPrice(commission, order.currency)}
                          </div>
                        )}
                        <div className="fw-bold mt-1" style={{ color: 'var(--pm-teal, #00c3e6)' }}>
                          Net Payout: {formatPrice(netPayout, order.currency)}
                        </div>
                      </div>
                    </td>
                    <td>
                      <OrderStatusBadge status={order.orderStatus} showIcon size="sm" />
                      {order.deliveryConfirmedAt ? (
                        <div className="mt-1 small text-success fw-medium d-flex align-items-center gap-1">
                          <FiCheckCircle size={11} /> Confirmed
                        </div>
                      ) : ['shipped', 'outForDelivery', 'delivered'].includes(order.orderStatus) ? (
                        <div className="mt-1 small so-text-muted d-flex align-items-center gap-1">
                          <FiClock size={11} /> Awaiting Confirm
                        </div>
                      ) : null}
                    </td>
                    <td>
                      <PaymentStatusBadge status={order.paymentStatus} size="sm" />
                    </td>
                    <td>
                      <button
                        className="so-action-btn"
                        onClick={() => setEditingOrder(order)}
                        title="View delivery details and update status"
                      >
                        <FiTruck size={12} /> Fulfill
                      </button>
                    </td>
                  </tr>
                )
              })}
            </tbody>
          </table>
        </div>
      )}

      {/* ── Pagination ───────────────────────────────────────── */}
      {totalPages > 1 && (
        <nav className="pagination mt-3">
          <button
            className="pagination__btn"
            onClick={() => setPage((p) => p - 1)}
            disabled={page <= 1}
          >
            ‹
          </button>
          {Array.from({ length: totalPages }, (_, i) => i + 1).map((p) => (
            <button
              key={p}
              className={`pagination__btn${p === page ? ' pagination__btn--active' : ''}`}
              onClick={() => setPage(p)}
            >
              {p}
            </button>
          ))}
          <button
            className="pagination__btn"
            onClick={() => setPage((p) => p + 1)}
            disabled={page >= totalPages}
          >
            ›
          </button>
        </nav>
      )}

      {/* ── Status update modal ──────────────────────────────── */}
      {editingOrder && (
        <StatusUpdateModal order={editingOrder} show={true} onHide={() => setEditingOrder(null)} />
      )}
    </div>
  )
}
