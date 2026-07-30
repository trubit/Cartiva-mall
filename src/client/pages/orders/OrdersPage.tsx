import { useState } from 'react'
import { Link } from 'react-router-dom'
import { FiShoppingBag, FiPackage } from 'react-icons/fi'
import { useMyOrders } from '../../hooks/useOrders.js'
import OrderCard from '../../components/order/OrderCard/index.js'
import { ORDER_STATUS } from '../../../shared/constants/index.js'

const FILTER_TABS = [
  { label: 'All Orders', value: '' },
  { label: 'Pending', value: ORDER_STATUS.PENDING },
  { label: 'Processing', value: ORDER_STATUS.PROCESSING },
  { label: 'Shipped', value: ORDER_STATUS.SHIPPED },
  { label: 'Delivered', value: ORDER_STATUS.DELIVERED },
  { label: 'Cancelled', value: ORDER_STATUS.CANCELLED },
]

export default function OrdersPage() {
  const [statusFilter, setStatusFilter] = useState('')
  const [page, setPage] = useState(1)

  const { data, isLoading, isError } = useMyOrders({
    status: statusFilter || undefined,
    page,
    limit: 10,
  })

  const orders = data?.orders ?? []
  const totalPages = data?.pagination?.totalPages ?? 1

  return (
    <div className="orp-page">
      {/* ══ HERO ══ */}
      <div className="orp-hero">
        <div className="container">
          <div className="orp-hero__inner">
            <div>
              <h1 className="orp-hero__title">My Orders</h1>
              <p className="orp-hero__sub">Track and manage all your purchases</p>
            </div>
            <div className="orp-hero__icon-wrap">
              <FiShoppingBag size={28} />
            </div>
          </div>

          {/* Filter tabs */}
          <div className="orp-filters" role="tablist">
            {FILTER_TABS.map(({ label, value }) => (
              <button
                key={value}
                role="tab"
                aria-selected={statusFilter === value}
                className={`orp-filter-tab${statusFilter === value ? ' orp-filter-tab--active' : ''}`}
                onClick={() => {
                  setStatusFilter(value)
                  setPage(1)
                }}
              >
                {label}
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* ══ BODY ══ */}
      <div className="container orp-body">
        {/* Loading */}
        {isLoading && (
          <div className="orp-list">
            {[1, 2, 3].map((i) => (
              <div key={i} className="orp-skeleton-card">
                <div className="orp-skeleton orp-skeleton--header" />
                <div className="orp-skeleton orp-skeleton--body" />
                <div className="orp-skeleton orp-skeleton--footer" />
              </div>
            ))}
          </div>
        )}

        {/* Error */}
        {isError && (
          <div className="orp-error">
            <FiPackage size={32} className="orp-error__icon" />
            <p>Failed to load orders. Please try again.</p>
          </div>
        )}

        {/* Empty */}
        {!isLoading && !isError && orders.length === 0 && (
          <div className="orp-empty">
            <div className="orp-empty__icon-ring">
              <FiShoppingBag size={48} />
            </div>
            <h2 className="orp-empty__title">No orders found</h2>
            <p className="orp-empty__text">
              {statusFilter
                ? `No orders with status "${statusFilter}". Try a different filter.`
                : "You haven't placed any orders yet. Start shopping!"}
            </p>
            <Link to="/products" className="orp-btn orp-btn--primary">
              Browse Products
            </Link>
          </div>
        )}

        {/* List */}
        {!isLoading && orders.length > 0 && (
          <>
            <div className="orp-list">
              {orders.map((order) => (
                <OrderCard key={order._id} order={order} />
              ))}
            </div>

            {/* Pagination */}
            {totalPages > 1 && (
              <div className="orp-pagination">
                <button
                  className="orp-page-btn"
                  onClick={() => setPage((p) => p - 1)}
                  disabled={page <= 1}
                  aria-label="Previous page"
                >
                  ‹
                </button>
                {Array.from({ length: totalPages }, (_, i) => i + 1).map((p) => (
                  <button
                    key={p}
                    className={`orp-page-btn${p === page ? ' orp-page-btn--active' : ''}`}
                    onClick={() => setPage(p)}
                    aria-current={p === page ? 'page' : undefined}
                  >
                    {p}
                  </button>
                ))}
                <button
                  className="orp-page-btn"
                  onClick={() => setPage((p) => p + 1)}
                  disabled={page >= totalPages}
                  aria-label="Next page"
                >
                  ›
                </button>
              </div>
            )}
          </>
        )}
      </div>
    </div>
  )
}
