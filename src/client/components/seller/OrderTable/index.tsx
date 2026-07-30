import { FiPackage, FiRefreshCw } from 'react-icons/fi'
import { OrderStatusBadge, PaymentStatusBadge } from '../../order/OrderStatus/index.js'
import { formatCurrency, formatDate } from '../../../../shared/helpers/index.js'
import type { IOrder } from '../../../../shared/types/index.js'

interface OrderTableProps {
  orders: IOrder[]
  loading: boolean
  onUpdate?: (order: IOrder) => void
  compact?: boolean
}

export default function OrderTable({
  orders,
  loading,
  onUpdate,
  compact = false,
}: OrderTableProps) {
  if (loading) {
    return (
      <div className="d-flex flex-column gap-2">
        {[1, 2, 3].map((i) => (
          <div key={i} className="skeleton" style={{ height: 56, borderRadius: 10 }} />
        ))}
      </div>
    )
  }

  if (orders.length === 0) {
    return (
      <div className="sl-empty">
        <FiPackage size={32} style={{ marginBottom: 8, color: 'var(--pm-teal)', opacity: 0.5 }} />
        <p style={{ color: 'var(--color-neutral-500)', margin: 0, fontSize: '0.84rem' }}>
          No orders found.
        </p>
      </div>
    )
  }

  return (
    <div className="so-table-wrap sl-table-wrap">
      <table className="so-table">
        <thead>
          <tr>
            <th>Order #</th>
            <th>Date</th>
            {!compact && <th>Items</th>}
            <th>Total</th>
            <th>Status</th>
            {!compact && <th>Payment</th>}
            {onUpdate && <th>Action</th>}
          </tr>
        </thead>
        <tbody>
          {orders.map((o) => (
            <tr key={o._id}>
              <td>
                <span className="so-order-num">#{o.orderNumber}</span>
              </td>
              <td className="so-date">{formatDate(o.createdAt)}</td>
              {!compact && (
                <td className="so-items">
                  {o.items.length} item{o.items.length !== 1 ? 's' : ''}
                </td>
              )}
              <td>
                <span className="so-total">{formatCurrency(o.grandTotal)}</span>
              </td>
              <td>
                <OrderStatusBadge status={o.orderStatus} showIcon size="sm" />
              </td>
              {!compact && (
                <td>
                  <PaymentStatusBadge status={o.paymentStatus} size="sm" />
                </td>
              )}
              {onUpdate && (
                <td>
                  <button className="so-action-btn" onClick={() => onUpdate(o)}>
                    <FiRefreshCw size={11} /> Update
                  </button>
                </td>
              )}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  )
}
