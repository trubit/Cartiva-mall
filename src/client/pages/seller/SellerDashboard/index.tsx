import { useState } from 'react'
import { Link } from 'react-router-dom'
import {
  FiDollarSign,
  FiShoppingBag,
  FiPackage,
  FiTrendingUp,
  FiAlertCircle,
  FiPlus,
  FiArrowRight,
} from 'react-icons/fi'
import { useSellerDashboard } from '../../../hooks/useSeller.js'
import SellerStatsCard from '../../../components/seller/SellerStatsCard/index.js'
import { RevenueAreaChart, OrderStatusPie } from '../../../components/seller/RevenueChart/index.js'
import AddProductModal from '../../../components/seller/AddProductModal/index.js'
import { formatCurrency, formatDate } from '../../../../shared/helpers/index.js'
import type { ISellerRecentOrder } from '../../../../shared/types/index.js'

const PLACEHOLDER = 'https://placehold.co/40x40/eee/999?text=P'

export default function SellerDashboard() {
  const { data, isLoading, isError } = useSellerDashboard()
  const [showAddProduct, setShowAddProduct] = useState(false)

  const stats = data?.stats
  const recentOrders = (data?.recentOrders ?? []) as unknown as ISellerRecentOrder[]

  return (
    <div className="container section sl-page">
      {/* Header */}
      <div className="sl-page-header">
        <div>
          <h1 className="sl-page-title">Seller Dashboard</h1>
          <p className="sl-page-subtitle">Your store overview</p>
        </div>
        <button className="sl-btn sl-btn--primary" onClick={() => setShowAddProduct(true)}>
          <FiPlus size={15} /> Add Product
        </button>
      </div>

      {isError && (
        <div className="sl-alert sl-alert--error">
          <FiAlertCircle /> Failed to load dashboard data.
        </div>
      )}

      {/* Stats grid */}
      <div className="sl-stats-grid">
        <SellerStatsCard
          icon={<FiDollarSign size={22} />}
          label="Total Revenue"
          value={isLoading ? '—' : formatCurrency(stats?.totalRevenue ?? 0)}
          sub={
            isLoading ? undefined : `This month: ${formatCurrency(stats?.thisMonthRevenue ?? 0)}`
          }
          accent="teal"
          loading={isLoading}
        />
        <SellerStatsCard
          icon={<FiShoppingBag size={22} />}
          label="Total Orders"
          value={isLoading ? '—' : (stats?.totalOrders ?? 0)}
          sub={isLoading ? undefined : `${stats?.pendingOrders ?? 0} pending`}
          accent="orange"
          loading={isLoading}
        />
        <SellerStatsCard
          icon={<FiPackage size={22} />}
          label="Active Products"
          value={isLoading ? '—' : (stats?.activeProducts ?? 0)}
          sub={isLoading ? undefined : `${data?.products.pending ?? 0} pending approval`}
          accent="green"
          loading={isLoading}
        />
        <SellerStatsCard
          icon={<FiTrendingUp size={22} />}
          label="Total Products"
          value={isLoading ? '—' : (stats?.totalProducts ?? 0)}
          sub={isLoading ? undefined : `${data?.products.blocked ?? 0} blocked`}
          accent="purple"
          loading={isLoading}
        />
      </div>

      {/* Pending products alert */}
      {!isLoading && (data?.products.pending ?? 0) > 0 && (
        <div className="sl-alert sl-alert--warn">
          <FiAlertCircle size={16} />
          <span>
            <strong>{data!.products.pending}</strong> product{data!.products.pending > 1 ? 's' : ''}{' '}
            awaiting admin approval.
          </span>
          <Link
            to="/seller/products"
            style={{
              marginLeft: 'auto',
              fontWeight: 600,
              color: '#b45309',
              display: 'flex',
              alignItems: 'center',
              gap: 4,
            }}
          >
            View <FiArrowRight size={13} />
          </Link>
        </div>
      )}

      {/* Charts row */}
      <div className="sl-charts-row">
        <div className="sl-chart-card">
          <div className="sl-chart-card__header">
            <p className="sl-chart-card__title">Revenue — Last 30 Days</p>
          </div>
          <RevenueAreaChart data={data?.revenueByDay ?? []} loading={isLoading} height={220} />
        </div>

        <div className="sl-chart-card">
          <div className="sl-chart-card__header">
            <p className="sl-chart-card__title">Orders by Status</p>
          </div>
          <OrderStatusPie
            data={data?.orderStatusBreakdown ?? []}
            loading={isLoading}
            height={220}
          />
        </div>
      </div>

      {/* Bottom row: top products + recent orders */}
      <div className="sl-bottom-row">
        {/* Top products */}
        <div className="sl-table-card">
          <div className="sl-table-card__header">
            <h3>Top Products</h3>
            <Link to="/seller/products" className="sl-link">
              View all <FiArrowRight size={12} />
            </Link>
          </div>
          {isLoading ? (
            <div className="d-flex flex-column gap-2">
              {[1, 2, 3].map((i) => (
                <div key={i} className="skeleton" style={{ height: 52, borderRadius: 8 }} />
              ))}
            </div>
          ) : (data?.topProducts.length ?? 0) === 0 ? (
            <div className="sl-empty" style={{ padding: '2rem 0' }}>
              <FiPackage size={32} style={{ color: 'var(--color-neutral-400)', marginBottom: 8 }} />
              <p
                style={{ color: 'var(--color-neutral-500)', margin: 0, fontSize: 'var(--text-sm)' }}
              >
                No sales data yet
              </p>
            </div>
          ) : (
            <div className="sl-top-products">
              {data!.topProducts.map((p, i) => (
                <div key={p._id} className="sl-top-product-row">
                  <span className="sl-top-product-rank">#{i + 1}</span>
                  <img
                    src={p.image ?? PLACEHOLDER}
                    alt={p.title}
                    style={{ width: 40, height: 40, borderRadius: 8, objectFit: 'cover' }}
                    onError={(e) => {
                      ;(e.target as HTMLImageElement).src = PLACEHOLDER
                    }}
                  />
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <p
                      style={{
                        fontWeight: 600,
                        fontSize: 'var(--text-sm)',
                        margin: 0,
                        overflow: 'hidden',
                        textOverflow: 'ellipsis',
                        whiteSpace: 'nowrap',
                      }}
                    >
                      {p.title}
                    </p>
                    <p
                      style={{
                        fontSize: 'var(--text-xs)',
                        color: 'var(--color-neutral-500)',
                        margin: 0,
                      }}
                    >
                      {p.totalSold} sold
                    </p>
                  </div>
                  <span style={{ fontWeight: 700, fontSize: 'var(--text-sm)', color: '#007185' }}>
                    {formatCurrency(p.totalRevenue)}
                  </span>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Recent orders */}
        <div className="sl-table-card">
          <div className="sl-table-card__header">
            <h3>Recent Orders</h3>
            <Link to="/seller/orders" className="sl-link">
              View all <FiArrowRight size={12} />
            </Link>
          </div>
          {isLoading ? (
            <div className="d-flex flex-column gap-2">
              {[1, 2, 3].map((i) => (
                <div key={i} className="skeleton" style={{ height: 52, borderRadius: 8 }} />
              ))}
            </div>
          ) : recentOrders.length === 0 ? (
            <div className="sl-empty" style={{ padding: '2rem 0' }}>
              <FiShoppingBag
                size={32}
                style={{ color: 'var(--color-neutral-400)', marginBottom: 8 }}
              />
              <p
                style={{ color: 'var(--color-neutral-500)', margin: 0, fontSize: 'var(--text-sm)' }}
              >
                No orders yet
              </p>
            </div>
          ) : (
            <table className="seller-table">
              <thead>
                <tr>
                  <th>Order</th>
                  <th>Date</th>
                  <th>Total</th>
                  <th>Status</th>
                </tr>
              </thead>
              <tbody>
                {recentOrders.map((o) => (
                  <tr key={o._id}>
                    <td style={{ fontWeight: 600, fontSize: 'var(--text-sm)' }}>
                      #{o.orderNumber}
                    </td>
                    <td style={{ fontSize: 'var(--text-sm)', color: 'var(--color-neutral-500)' }}>
                      {formatDate(o.createdAt)}
                    </td>
                    <td style={{ fontWeight: 700 }}>{formatCurrency(o.grandTotal)}</td>
                    <td>
                      <span
                        className={`status-pill status-pill--${o.orderStatus === 'delivered' ? 'active' : o.orderStatus === 'cancelled' ? 'blocked' : 'pending'}`}
                      >
                        {o.orderStatus}
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>
      </div>

      <AddProductModal show={showAddProduct} onHide={() => setShowAddProduct(false)} />
    </div>
  )
}
