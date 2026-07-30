import { useState } from 'react'
import { Link } from 'react-router-dom'
import { FiCreditCard } from 'react-icons/fi'
import { usePaymentHistory } from '../../../hooks/useDashboard.js'
import LoadingSpinner from '../../../components/ui/LoadingSpinner.js'

const formatCurrency = (n: number) =>
  new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD' }).format(n)

const formatDate = (iso: string) =>
  new Date(iso).toLocaleDateString('en-US', {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
  })

const PAGE_LIMIT = 20

export default function PaymentHistoryPage() {
  const [page, setPage] = useState(1)
  const { data, isLoading } = usePaymentHistory({ page, limit: PAGE_LIMIT })

  const payments = data?.data.payments ?? []
  const total = data?.data.total ?? 0
  const totalPages = Math.ceil(total / PAGE_LIMIT)

  if (isLoading) return <LoadingSpinner />

  return (
    <div>
      <div className="dashboard-page-header">
        <h1 className="dashboard-page-title">
          <FiCreditCard style={{ marginRight: 8, verticalAlign: 'middle' }} />
          Payment History
        </h1>
        <p className="dashboard-page-subtitle">{total} transactions</p>
      </div>

      <div className="dashboard-section">
        {payments.length === 0 ? (
          <div className="dashboard-empty">
            <FiCreditCard className="dashboard-empty__icon" />
            <p className="dashboard-empty__title">No payments yet</p>
            <p className="dashboard-empty__text">
              Your payment history will appear here once you make a purchase.
            </p>
            <Link to="/products" className="dashboard-btn dashboard-btn--primary">
              Start Shopping
            </Link>
          </div>
        ) : (
          <div style={{ overflowX: 'auto' }}>
            <table className="dashboard-orders-table">
              <thead>
                <tr>
                  <th>Date</th>
                  <th>Order</th>
                  <th>Method</th>
                  <th>Amount</th>
                  <th>Status</th>
                </tr>
              </thead>
              <tbody>
                {payments.map((p) => {
                  const order = p.orderId as unknown as { _id: string; orderNumber: string } | null
                  return (
                    <tr key={p._id}>
                      <td>{formatDate(p.createdAt)}</td>
                      <td>
                        {order ? (
                          <Link
                            to={`/orders/${order._id}`}
                            className="dashboard-orders-table__order-num"
                          >
                            #{order.orderNumber}
                          </Link>
                        ) : (
                          '—'
                        )}
                      </td>
                      <td style={{ textTransform: 'capitalize' }}>{p.paymentMethod}</td>
                      <td style={{ fontVariantNumeric: 'tabular-nums' }}>
                        {formatCurrency(p.amount / 100)}
                      </td>
                      <td>
                        <span className={`payment-status-badge payment-status-badge--${p.status}`}>
                          {p.status}
                        </span>
                      </td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {totalPages > 1 && (
        <div className="dashboard-pagination">
          <button
            className="dashboard-pagination__btn"
            onClick={() => setPage((p) => p - 1)}
            disabled={page <= 1}
            aria-label="Previous page"
          >
            ‹
          </button>
          <span className="dashboard-pagination__info">
            {page} / {totalPages}
          </span>
          <button
            className="dashboard-pagination__btn"
            onClick={() => setPage((p) => p + 1)}
            disabled={page >= totalPages}
            aria-label="Next page"
          >
            ›
          </button>
        </div>
      )}
    </div>
  )
}
