import React, { useState } from 'react'
import { FiSearch, FiEye, FiX, FiDollarSign, FiShoppingBag, FiUser, FiMapPin } from 'react-icons/fi'
import { useAdminOrders, useAdminUpdateOrderStatus } from '../../../hooks/useAdmin.js'
import { formatDate } from '../../../../shared/helpers/index.js'
import { useCurrency } from '../../../hooks/useCurrency.js'
import type { IOrder, OrderStatus } from '../../../../shared/types/order.types.js'
import { ORDER_STATUS, PAYMENT_STATUS } from '../../../../shared/constants/index.js'

const ORDER_STATUSES = Object.values(ORDER_STATUS) as OrderStatus[]

type PopulatedOrder = IOrder & {
  userId?: { firstName: string; lastName: string; email: string }
}

export default function AdminOrders() {
  const { formatPrice, currentCurrency } = useCurrency()
  const [statusFilter, setStatusFilter] = useState('')
  const [paymentFilter, setPaymentFilter] = useState('')
  const [searchInput, setSearchInput] = useState('')
  const [search, setSearch] = useState('')
  const [page, setPage] = useState(1)
  const [selectedOrder, setSelectedOrder] = useState<PopulatedOrder | null>(null)

  const params: Record<string, string> = { page: String(page), limit: '20' }
  if (statusFilter) params.status = statusFilter
  if (paymentFilter) params.paymentStatus = paymentFilter
  if (search) params.search = search

  const { data, isLoading } = useAdminOrders(params)
  const updateStatus = useAdminUpdateOrderStatus()

  const orders = (data?.data ?? []) as PopulatedOrder[]
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
        <p className="admin-page-subtitle">
          View, audit financial calculations, and update status for all marketplace orders
        </p>
      </div>

      <div className="admin-table-card">
        <div className="admin-table-toolbar">
          <h3>All Orders {pagination && `(${pagination.total})`}</h3>

          <form onSubmit={handleSearch} className="admin-search">
            <FiSearch size={13} color="#9ca3af" />
            <input
              placeholder="Search order number or buyer…"
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
                  <th>Calculated Total</th>
                  <th>Payment</th>
                  <th>Order Status</th>
                  <th>Date</th>
                  <th>Breakdown</th>
                  <th>Update Status</th>
                </tr>
              </thead>
              <tbody>
                {orders.length === 0 ? (
                  <tr>
                    <td colSpan={9} className="admin-table__empty">
                      No orders found matching filters
                    </td>
                  </tr>
                ) : (
                  orders.map((order) => {
                    const orderCurr = order.currency || 'USD'
                    const isDiffCurrency = orderCurr !== currentCurrency

                    return (
                      <tr key={order._id}>
                        <td style={{ fontWeight: 600 }}>
                          <button
                            type="button"
                            onClick={() => setSelectedOrder(order)}
                            style={{
                              background: 'transparent',
                              border: 'none',
                              color: 'var(--color-primary, #ff9900)',
                              cursor: 'pointer',
                              fontWeight: 700,
                              padding: 0,
                              textDecoration: 'underline',
                              fontSize: '.85rem',
                            }}
                            title="Click to view calculation breakdown"
                          >
                            #{order.orderNumber}
                          </button>
                        </td>
                        <td>
                          <div style={{ fontSize: '.8rem', fontWeight: 600 }}>
                            {order.userId?.firstName} {order.userId?.lastName}
                          </div>
                          <div style={{ fontSize: '.7rem', color: '#6b7280' }}>
                            {order.userId?.email}
                          </div>
                        </td>
                        <td style={{ fontSize: '.8rem' }}>
                          {order.items?.length ?? 0} item
                          {(order.items?.length ?? 0) !== 1 ? 's' : ''}
                        </td>
                        <td>
                          <div style={{ fontWeight: 700, fontSize: '.85rem' }}>
                            {formatPrice(order.grandTotal, orderCurr)}
                          </div>
                          {isDiffCurrency && (
                            <div
                              style={{
                                fontSize: '.68rem',
                                color: 'var(--color-neutral-500, #6b7280)',
                                fontWeight: 500,
                                marginTop: '1px',
                              }}
                              title={`Charged currency: ${orderCurr}`}
                            >
                              ({orderCurr}{' '}
                              {Number(order.grandTotal).toLocaleString(undefined, {
                                minimumFractionDigits: 2,
                                maximumFractionDigits: 2,
                              })}
                              )
                            </div>
                          )}
                        </td>
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
                        <td style={{ fontSize: '.72rem', color: '#6b7280', whiteSpace: 'nowrap' }}>
                          {formatDate(order.createdAt)}
                        </td>
                        <td>
                          <button
                            type="button"
                            className="admin-btn admin-btn--activate"
                            onClick={() => setSelectedOrder(order)}
                            style={{ padding: '.25rem .5rem', fontSize: '.72rem' }}
                            title="View financial breakdown"
                          >
                            <FiEye size={12} /> Audit
                          </button>
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
                    )
                  })
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
                  <React.Fragment key={p}>
                    {i > 0 && (arr[i - 1] as number) < p - 1 && (
                      <span key={`e${i}`} style={{ padding: '0 4px' }}>
                        …
                      </span>
                    )}
                    <button
                      className={`admin-pagination__btn${p === page ? ' admin-pagination__btn--active' : ''}`}
                      onClick={() => setPage(p)}
                    >
                      {p}
                    </button>
                  </React.Fragment>
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

      {/* ─── Financial Calculation & Breakdown Modal ─── */}
      {selectedOrder && (
        <div
          style={{
            position: 'fixed',
            inset: 0,
            background: 'rgba(0, 0, 0, 0.65)',
            backdropFilter: 'blur(2px)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            zIndex: 1050,
            padding: '1rem',
          }}
          onClick={() => setSelectedOrder(null)}
        >
          <div
            className="admin-table-card"
            style={{
              width: '100%',
              maxWidth: 720,
              maxHeight: '90vh',
              overflowY: 'auto',
              margin: 0,
              background: 'var(--color-white, #1c2128)',
              border: '1px solid var(--color-neutral-200, #30363d)',
              boxShadow:
                '0 20px 25px -5px rgba(0, 0, 0, 0.5), 0 10px 10px -5px rgba(0, 0, 0, 0.04)',
            }}
            onClick={(e) => e.stopPropagation()}
          >
            {/* Modal Header */}
            <div
              style={{
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
                padding: '1.25rem 1.5rem',
                borderBottom: '1px solid var(--color-neutral-200, #30363d)',
              }}
            >
              <div style={{ display: 'flex', alignItems: 'center', gap: '.6rem' }}>
                <FiShoppingBag color="#ff9900" size={20} />
                <div>
                  <h3
                    style={{
                      margin: 0,
                      fontSize: '1.1rem',
                      fontWeight: 700,
                      color: 'var(--color-brand-text, #e6edf3)',
                    }}
                  >
                    Order #{selectedOrder.orderNumber}
                  </h3>
                  <div
                    style={{
                      fontSize: '.75rem',
                      color: 'var(--color-neutral-500, #8b949e)',
                      marginTop: '2px',
                    }}
                  >
                    Placed on {formatDate(selectedOrder.createdAt)}
                  </div>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setSelectedOrder(null)}
                style={{
                  background: 'transparent',
                  border: 'none',
                  color: 'var(--color-neutral-500, #8b949e)',
                  cursor: 'pointer',
                  fontSize: '1.25rem',
                  padding: '.25rem',
                  display: 'flex',
                  alignItems: 'center',
                }}
              >
                <FiX />
              </button>
            </div>

            {/* Modal Body */}
            <div
              style={{
                padding: '1.5rem',
                display: 'flex',
                flexDirection: 'column',
                gap: '1.25rem',
              }}
            >
              {/* Top summary row */}
              <div
                style={{
                  display: 'grid',
                  gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))',
                  gap: '.75rem',
                  background: 'var(--color-neutral-50, #161b22)',
                  padding: '1rem',
                  borderRadius: 8,
                  border: '1px solid var(--color-neutral-200, #30363d)',
                }}
              >
                <div>
                  <span
                    style={{
                      fontSize: '.7rem',
                      color: 'var(--color-neutral-500, #8b949e)',
                      display: 'block',
                    }}
                  >
                    Order Status
                  </span>
                  <span
                    className={`admin-pill admin-pill--${selectedOrder.orderStatus}`}
                    style={{ marginTop: '.25rem' }}
                  >
                    {selectedOrder.orderStatus}
                  </span>
                </div>
                <div>
                  <span
                    style={{
                      fontSize: '.7rem',
                      color: 'var(--color-neutral-500, #8b949e)',
                      display: 'block',
                    }}
                  >
                    Payment Status
                  </span>
                  <span
                    className={`admin-pill admin-pill--${selectedOrder.paymentStatus}`}
                    style={{ marginTop: '.25rem' }}
                  >
                    {selectedOrder.paymentStatus}
                  </span>
                </div>
                <div>
                  <span
                    style={{
                      fontSize: '.7rem',
                      color: 'var(--color-neutral-500, #8b949e)',
                      display: 'block',
                    }}
                  >
                    Transaction Currency
                  </span>
                  <strong style={{ fontSize: '.85rem', color: '#ff9900' }}>
                    {selectedOrder.currency || 'USD'}
                  </strong>
                </div>
                <div>
                  <span
                    style={{
                      fontSize: '.7rem',
                      color: 'var(--color-neutral-500, #8b949e)',
                      display: 'block',
                    }}
                  >
                    Exchange Rate Used
                  </span>
                  <span style={{ fontSize: '.8rem', color: 'var(--color-brand-text, #e6edf3)' }}>
                    {selectedOrder.exchangeRateUsed
                      ? `1 USD = ${selectedOrder.exchangeRateUsed}`
                      : 'Base / 1.00'}
                  </span>
                </div>
              </div>

              {/* Items Table */}
              <div>
                <h4
                  style={{
                    fontSize: '.85rem',
                    fontWeight: 700,
                    margin: '0 0 .5rem 0',
                    color: 'var(--color-brand-text, #e6edf3)',
                  }}
                >
                  Purchased Items ({selectedOrder.items?.length ?? 0})
                </h4>
                <div
                  style={{
                    border: '1px solid var(--color-neutral-200, #30363d)',
                    borderRadius: 6,
                    overflow: 'hidden',
                  }}
                >
                  <table className="admin-table" style={{ margin: 0 }}>
                    <thead>
                      <tr>
                        <th>Product</th>
                        <th>SKU</th>
                        <th>Qty</th>
                        <th>Unit Price</th>
                        <th>Line Total</th>
                      </tr>
                    </thead>
                    <tbody>
                      {selectedOrder.items?.map((it, idx) => (
                        <tr key={idx}>
                          <td style={{ fontWeight: 600 }}>{it.title}</td>
                          <td style={{ fontSize: '.75rem', fontFamily: 'monospace' }}>
                            {it.sku || '—'}
                          </td>
                          <td>{it.quantity}</td>
                          <td>{formatPrice(it.itemPrice, selectedOrder.currency || 'USD')}</td>
                          <td style={{ fontWeight: 600 }}>
                            {formatPrice(it.lineTotal, selectedOrder.currency || 'USD')}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>

              {/* Mathematical Financial Breakdown Card */}
              <div
                style={{
                  background: 'var(--color-neutral-50, #161b22)',
                  border: '1px solid var(--color-neutral-200, #30363d)',
                  borderRadius: 8,
                  padding: '1.25rem',
                }}
              >
                <div
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: '.4rem',
                    marginBottom: '.75rem',
                    fontSize: '.85rem',
                    fontWeight: 700,
                    color: 'var(--color-brand-text, #e6edf3)',
                  }}
                >
                  <FiDollarSign color="#ff9900" /> Complete Financial Calculation Audit
                </div>

                <div
                  style={{
                    display: 'flex',
                    flexDirection: 'column',
                    gap: '.4rem',
                    fontSize: '.82rem',
                  }}
                >
                  <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                    <span style={{ color: 'var(--color-neutral-500, #8b949e)' }}>
                      Cart Subtotal:
                    </span>
                    <strong>
                      {formatPrice(selectedOrder.subtotal, selectedOrder.currency || 'USD')}
                    </strong>
                  </div>

                  {selectedOrder.discountAmount > 0 && (
                    <div
                      style={{ display: 'flex', justifyContent: 'space-between', color: '#10b981' }}
                    >
                      <span>
                        Discount (Coupon{' '}
                        {selectedOrder.couponCode ? `"${selectedOrder.couponCode}"` : ''}):
                      </span>
                      <strong>
                        -{' '}
                        {formatPrice(selectedOrder.discountAmount, selectedOrder.currency || 'USD')}
                      </strong>
                    </div>
                  )}

                  <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                    <span style={{ color: 'var(--color-neutral-500, #8b949e)' }}>
                      Shipping Fee ({selectedOrder.shippingMethod || 'standard'}):
                    </span>
                    <span>
                      + {formatPrice(selectedOrder.shippingFee, selectedOrder.currency || 'USD')}
                    </span>
                  </div>

                  <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                    <span style={{ color: 'var(--color-neutral-500, #8b949e)' }}>Tax Amount:</span>
                    <span>
                      + {formatPrice(selectedOrder.taxAmount, selectedOrder.currency || 'USD')}
                    </span>
                  </div>

                  <div
                    style={{
                      display: 'flex',
                      justifyContent: 'space-between',
                      alignItems: 'center',
                      borderTop: '1px solid var(--color-neutral-200, #30363d)',
                      paddingTop: '.6rem',
                      marginTop: '.2rem',
                    }}
                  >
                    <div>
                      <strong
                        style={{ fontSize: '1rem', color: 'var(--color-brand-text, #e6edf3)' }}
                      >
                        Grand Total:
                      </strong>
                      <div
                        style={{ fontSize: '.7rem', color: 'var(--color-neutral-500, #8b949e)' }}
                      >
                        Charged in {selectedOrder.currency || 'USD'}
                      </div>
                    </div>
                    <div style={{ textAlign: 'right' }}>
                      <span style={{ fontSize: '1.2rem', fontWeight: 800, color: '#ff9900' }}>
                        {formatPrice(selectedOrder.grandTotal, selectedOrder.currency || 'USD')}
                      </span>
                      {(selectedOrder.currency || 'USD') !== currentCurrency && (
                        <div
                          style={{ fontSize: '.72rem', color: 'var(--color-neutral-500, #8b949e)' }}
                        >
                          Original: {selectedOrder.currency}{' '}
                          {Number(selectedOrder.grandTotal).toFixed(2)}
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              </div>

              {/* Customer & Shipping info */}
              <div
                style={{
                  display: 'grid',
                  gridTemplateColumns: '1fr 1fr',
                  gap: '1rem',
                  fontSize: '.8rem',
                }}
              >
                <div>
                  <div
                    style={{
                      display: 'flex',
                      alignItems: 'center',
                      gap: '.35rem',
                      fontWeight: 600,
                      color: 'var(--color-brand-text, #e6edf3)',
                      marginBottom: '.25rem',
                    }}
                  >
                    <FiUser size={13} color="#ff9900" /> Customer
                  </div>
                  <div>
                    {selectedOrder.userId?.firstName} {selectedOrder.userId?.lastName}
                  </div>
                  <div style={{ color: '#6b7280' }}>{selectedOrder.userId?.email}</div>
                </div>

                <div>
                  <div
                    style={{
                      display: 'flex',
                      alignItems: 'center',
                      gap: '.35rem',
                      fontWeight: 600,
                      color: 'var(--color-brand-text, #e6edf3)',
                      marginBottom: '.25rem',
                    }}
                  >
                    <FiMapPin size={13} color="#ff9900" /> Shipping Destination
                  </div>
                  <div>{selectedOrder.shippingAddress?.fullName}</div>
                  <div style={{ color: '#6b7280' }}>
                    {[
                      selectedOrder.shippingAddress?.street,
                      selectedOrder.shippingAddress?.city,
                      selectedOrder.shippingAddress?.state,
                      selectedOrder.shippingAddress?.country,
                    ]
                      .filter(Boolean)
                      .join(', ')}
                  </div>
                  {selectedOrder.shippingAddress?.phone && (
                    <div style={{ color: '#6b7280' }}>
                      Tel: {selectedOrder.shippingAddress.phone}
                    </div>
                  )}
                </div>
              </div>
            </div>

            {/* Modal Footer */}
            <div
              style={{
                display: 'flex',
                justifyContent: 'flex-end',
                padding: '1rem 1.5rem',
                borderTop: '1px solid var(--color-neutral-200, #30363d)',
              }}
            >
              <button
                type="button"
                className="admin-btn admin-btn--deactivate"
                onClick={() => setSelectedOrder(null)}
              >
                Close Breakdown
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  )
}
