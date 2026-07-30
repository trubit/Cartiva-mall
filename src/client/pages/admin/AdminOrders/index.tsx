import { useState } from 'react'
import { FiSearch } from 'react-icons/fi'
import { useAdminOrders, useAdminUpdateOrderStatus } from '../../../hooks/useAdmin.js'
import { formatCurrency, formatDate } from '../../../../shared/helpers/index.js'
import type { IOrder, OrderStatus } from '../../../../shared/types/order.types.js'
import { ORDER_STATUS, PAYMENT_STATUS } from '../../../../shared/constants/index.js'

const ORDER_STATUSES = Object.values(ORDER_STATUS) as OrderStatus[]

export default function AdminOrders() {
  const [statusFilter, setStatusFilter] = useState('')
  const [paymentFilter, setPaymentFilter] = useState('')
  const [searchInput, setSearchInput] = useState('')
  const [search, setSearch] = useState('')
  const [page, setPage] = useState(1)

  const params: Record<string, string> = { page: String(page), limit: '20' }
  if (statusFilter) params.status = statusFilter
  if (paymentFilter) params.paymentStatus = paymentFilter
  if (search) params.search = search

  const { data, isLoading } = useAdminOrders(params)
  const updateStatus = useAdminUpdateOrderStatus()

  const orders = data?.data ?? []
  const pagination = data?.pagination

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault()
    setSearch(searchInput)
    setPage(1)
  }

  return (
    <>
      <div className="admin-page-header">
        <h1 className="admin-page-title">Orders</h1>
        <p className="admin-page-subtitle">View and update all customer orders</p>
      </div>

      <div className="admin-table-card">
        <div className="admin-table-toolbar">
          <h3>All Orders {pagination && `(${pagination.total})`}</h3>

          <form onSubmit={handleSearch} className="admin-search">
            <FiSearch size={13} color="#9ca3af" />
            <input
              placeholder="Search order number…"
              value={searchInput}
              onChange={(e) => setSearchInput(e.target.value)}
            />
          </form>

          <select
            className="admin-select"
            value={statusFilter}
            onChange={(e) => {
              setStatusFilter(e.target.value)
              setPage(1)
            }}
          >
            <option value="">All Order Status</option>
            {ORDER_STATUSES.map((s) => (
              <option key={s} value={s}>
                {s}
              </option>
            ))}
          </select>

          <select
            className="admin-select"
            value={paymentFilter}
            onChange={(e) => {
              setPaymentFilter(e.target.value)
              setPage(1)
            }}
          >
            <option value="">All Payment Status</option>
            {Object.values(PAYMENT_STATUS).map((s) => (
              <option key={s} value={s}>
                {s}
              </option>
            ))}
          </select>
        </div>

        {isLoading ? (
          <div className="admin-loading">Loading orders…</div>
        ) : (
          <div className="admin-table-wrap">
            <table className="admin-table">
              <thead>
                <tr>
                  <th>Order #</th>
                  <th>Customer</th>
                  <th>Items</th>
                  <th>Total</th>
                  <th>Payment</th>
                  <th>Order Status</th>
                  <th>Date</th>
                  <th>Update Status</th>
                </tr>
              </thead>
              <tbody>
                {orders.length === 0 ? (
                  <tr>
                    <td colSpan={8} className="admin-table__empty">
                      No orders found
                    </td>
                  </tr>
                ) : (
                  (
                    orders as Array<
                      IOrder & { userId?: { firstName: string; lastName: string; email: string } }
                    >
                  ).map((order) => (
                    <tr key={order._id}>
                      <td style={{ fontWeight: 600 }}>#{order.orderNumber}</td>
                      <td>
                        <div style={{ fontSize: '.8rem', fontWeight: 600 }}>
                          {order.userId?.firstName} {order.userId?.lastName}
                        </div>
                        <div style={{ fontSize: '.7rem', color: '#6b7280' }}>
                          {order.userId?.email}
                        </div>
                      </td>
                      <td style={{ fontSize: '.8rem' }}>
                        {order.items?.length ?? 0} item{(order.items?.length ?? 0) !== 1 ? 's' : ''}
                      </td>
                      <td style={{ fontWeight: 700 }}>{formatCurrency(order.grandTotal)}</td>
                      <td>
                        <span className={`admin-pill admin-pill--${order.paymentStatus}`}>
                          {order.paymentStatus}
                        </span>
                      </td>
                      <td>
                        <span className={`admin-pill admin-pill--${order.orderStatus}`}>
                          {order.orderStatus}
                        </span>
                      </td>
                      <td style={{ fontSize: '.72rem', color: '#6b7280' }}>
                        {formatDate(order.createdAt)}
                      </td>
                      <td>
                        <select
                          className="admin-status-select"
                          value={order.orderStatus}
                          onChange={(e) =>
                            updateStatus.mutate({
                              id: order._id,
                              orderStatus: e.target.value as OrderStatus,
                            })
                          }
                          disabled={updateStatus.isPending}
                        >
                          {ORDER_STATUSES.map((s) => (
                            <option key={s} value={s}>
                              {s}
                            </option>
                          ))}
                        </select>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        )}

        {pagination && pagination.totalPages > 1 && (
          <div className="admin-pagination">
            <span>
              Showing {(page - 1) * 20 + 1}–{Math.min(page * 20, pagination.total)} of{' '}
              {pagination.total}
            </span>
            <div className="admin-pagination__btns">
              <button
                className="admin-pagination__btn"
                onClick={() => setPage((p) => p - 1)}
                disabled={!pagination.hasPrev}
              >
                ‹
              </button>
              {Array.from({ length: pagination.totalPages }, (_, i) => i + 1)
                .filter((p) => p === 1 || p === pagination.totalPages || Math.abs(p - page) <= 1)
                .map((p, i, arr) => (
                  <>
                    {i > 0 && (arr[i - 1] as number) < p - 1 && (
                      <span key={`e${i}`} style={{ padding: '0 4px' }}>
                        …
                      </span>
                    )}
                    <button
                      key={p}
                      className={`admin-pagination__btn${p === page ? ' admin-pagination__btn--active' : ''}`}
                      onClick={() => setPage(p)}
                    >
                      {p}
                    </button>
                  </>
                ))}
              <button
                className="admin-pagination__btn"
                onClick={() => setPage((p) => p + 1)}
                disabled={!pagination.hasNext}
              >
                ›
              </button>
            </div>
          </div>
        )}
      </div>
    </>
  )
}
