import { useState } from 'react'
import Modal from 'react-bootstrap/Modal'
import Form from 'react-bootstrap/Form'
import Alert from 'react-bootstrap/Alert'
import { FiPackage, FiTruck, FiRefreshCw } from 'react-icons/fi'
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
  const [trackingNumber, setTrackingNumber] = useState(order.tracking?.trackingNumber ?? '')
  const [carrier, setCarrier] = useState(order.tracking?.carrier ?? '')
  const [note, setNote] = useState('')

  const { mutate: updateStatus, isPending, error } = useUpdateOrderStatus()

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    updateStatus(
      {
        orderId: order._id,
        orderStatus: newStatus,
        tracking: {
          trackingNumber: trackingNumber || undefined,
          carrier: carrier || undefined,
          note: note || undefined,
        },
      },
      { onSuccess: onHide },
    )
  }

  return (
    <Modal show={show} onHide={onHide} centered className="pm-modal">
      <Modal.Header closeButton>
        <Modal.Title>
          <span className="pm-modal__title-icon" aria-hidden="true">
            <FiTruck size={13} />
          </span>
          Update Order #{order.orderNumber}
        </Modal.Title>
      </Modal.Header>

      <Modal.Body>
        {error && (
          <div className="pm-alert pm-alert--error" role="alert">
            {(error as Error).message}
          </div>
        )}
        <Form id="seller-status-form" onSubmit={handleSubmit}>
          <div className="pm-section">
            <p className="pm-section-label">Fulfillment Status</p>
            <Form.Group className="mb-3" controlId="status-select">
              <Form.Label>New Status</Form.Label>
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
            </Form.Group>
          </div>

          <div className="pm-section">
            <p className="pm-section-label">Tracking Info</p>
            <Form.Group className="mb-3" controlId="carrier-input">
              <Form.Label>
                Carrier{' '}
                <span
                  style={{
                    color: 'var(--pm-modal-text-muted)',
                    fontWeight: 400,
                    textTransform: 'none',
                  }}
                >
                  (optional)
                </span>
              </Form.Label>
              <Form.Control
                placeholder="e.g. UPS, FedEx, USPS"
                value={carrier}
                onChange={(e) => setCarrier(e.target.value)}
              />
            </Form.Group>
            <Form.Group className="mb-3" controlId="tracking-input">
              <Form.Label>
                Tracking Number{' '}
                <span
                  style={{
                    color: 'var(--pm-modal-text-muted)',
                    fontWeight: 400,
                    textTransform: 'none',
                  }}
                >
                  (optional)
                </span>
              </Form.Label>
              <Form.Control
                placeholder="e.g. 1Z999AA1012345678"
                value={trackingNumber}
                onChange={(e) => setTrackingNumber(e.target.value)}
                style={{ fontFamily: 'monospace', letterSpacing: '0.04em' }}
              />
            </Form.Group>
            <Form.Group controlId="note-input">
              <Form.Label>
                Note{' '}
                <span
                  style={{
                    color: 'var(--pm-modal-text-muted)',
                    fontWeight: 400,
                    textTransform: 'none',
                  }}
                >
                  (optional)
                </span>
              </Form.Label>
              <Form.Control
                as="textarea"
                rows={2}
                placeholder="e.g. Package picked up from warehouse"
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
            'Update Status'
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
          <h1 className="seller-orders__title">Order Management</h1>
          <p className="seller-orders__subtitle">Manage and fulfil orders for your products</p>
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
          <table className="so-table">
            <thead>
              <tr>
                <th>Order</th>
                <th>Date</th>
                <th>Items</th>
                <th>Total</th>
                <th>Status</th>
                <th>Payment</th>
                <th>Action</th>
              </tr>
            </thead>
            <tbody>
              {orders.map((order) => (
                <tr key={order._id}>
                  <td>
                    <span className="so-order-num">#{order.orderNumber}</span>
                  </td>
                  <td className="so-date">{formatDate(order.createdAt)}</td>
                  <td className="so-items">
                    {order.items.length} item{order.items.length !== 1 ? 's' : ''}
                  </td>
                  <td>
                    <span className="so-total">
                      {formatPrice(order.grandTotal, order.currency)}
                    </span>
                  </td>
                  <td>
                    <OrderStatusBadge status={order.orderStatus} showIcon size="sm" />
                  </td>
                  <td>
                    <PaymentStatusBadge status={order.paymentStatus} size="sm" />
                  </td>
                  <td>
                    <button
                      className="so-action-btn"
                      onClick={() => setEditingOrder(order)}
                      title="Update order status"
                    >
                      <FiRefreshCw size={11} /> Update
                    </button>
                  </td>
                </tr>
              ))}
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
