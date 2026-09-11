import { Link } from 'react-router-dom'
import {
  AreaChart,
  Area,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  Cell,
  PieChart,
  Pie,
} from 'recharts'
import {
  FiUsers,
  FiPackage,
  FiShoppingBag,
  FiDollarSign,
  FiAlertCircle,
  FiArrowRight,
} from 'react-icons/fi'
import { useAdminStats } from '../../../hooks/useAdmin.js'
import { formatDate } from '../../../../shared/helpers/index.js'
import { useCurrency } from '../../../hooks/useCurrency.js'

interface RecentOrder {
  _id: string
  orderNumber: string
  orderStatus: string
  grandTotal: number
  currency?: string
  createdAt: string
  userId?: { firstName: string; lastName: string }
}

const ORDER_STATUS_COLORS: Record<string, string> = {
  pending: '#f59e0b',
  confirmed: '#3b82f6',
  processing: '#8b5cf6',
  shipped: '#06b6d4',
  delivered: '#10b981',
  cancelled: '#6b7280',
  refunded: '#ec4899',
}

export default function AdminDashboard() {
  const { data: res, isLoading, error } = useAdminStats()
  const { formatPrice } = useCurrency()
  const stats = res?.data

  if (isLoading)
    return (
      <div className="admin-loading">
        <span>Loading dashboard…</span>
      </div>
    )
  if (error || !stats) return <div className="admin-error">Failed to load dashboard stats.</div>

  const orderPieData = Object.entries(stats.orders)
    .filter(([key]) => key !== 'total' && stats.orders[key as keyof typeof stats.orders] > 0)
    .map(([key, value]) => ({ name: key, value, color: ORDER_STATUS_COLORS[key] ?? '#ccc' }))

  return (
    <>
      <div className="admin-page-header">
        <h1 className="admin-page-title">Dashboard</h1>
        <p className="admin-page-subtitle">Overview of your marketplace</p>
      </div>

      {/* Stat Cards */}
      <div className="admin-stats-grid">
        <div className="admin-stat-card">
          <div className="admin-stat-icon admin-stat-icon--users">
            <FiUsers />
          </div>
          <div className="admin-stat-body">
            <span className="admin-stat-value">{stats.users.total}</span>
            <span className="admin-stat-label">Total Users</span>
            <p className="admin-stat-sub">
              {stats.users.sellers} sellers · {stats.users.buyers} buyers
            </p>
          </div>
        </div>

        <div className="admin-stat-card">
          <div className="admin-stat-icon admin-stat-icon--products">
            <FiPackage />
          </div>
          <div className="admin-stat-body">
            <span className="admin-stat-value">{stats.products.total}</span>
            <span className="admin-stat-label">Total Products</span>
            <p className="admin-stat-sub">
              {stats.products.active} active · {stats.products.pending} pending
            </p>
          </div>
        </div>

        <div className="admin-stat-card">
          <div className="admin-stat-icon admin-stat-icon--orders">
            <FiShoppingBag />
          </div>
          <div className="admin-stat-body">
            <span className="admin-stat-value">{stats.orders.total}</span>
            <span className="admin-stat-label">Total Orders</span>
            <p className="admin-stat-sub">
              {stats.orders.delivered} delivered · {stats.orders.pending} pending
            </p>
          </div>
        </div>

        <div className="admin-stat-card">
          <div className="admin-stat-icon admin-stat-icon--revenue">
            <FiDollarSign />
          </div>
          <div className="admin-stat-body">
            <span className="admin-stat-value" title={formatPrice(stats.revenue.total)}>
              {formatPrice(stats.revenue.total)}
            </span>
            <span className="admin-stat-label">Total Revenue</span>
            <p className="admin-stat-sub">From paid orders</p>
          </div>
        </div>
      </div>

      {/* Alert: pending products */}
      {stats.products.pending > 0 && (
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: '.6rem',
            background: '#fef3c7',
            border: '1px solid #fde68a',
            borderRadius: 8,
            padding: '.75rem 1rem',
            marginBottom: '1.5rem',
            fontSize: '.82rem',
            color: '#92400e',
          }}
        >
          <FiAlertCircle />
          <span>
            <strong>{stats.products.pending}</strong> product{stats.products.pending > 1 ? 's' : ''}{' '}
            pending approval.
          </span>
          <Link
            to="/admin/products?status=pending"
            style={{
              marginLeft: 'auto',
              fontWeight: 600,
              color: '#d97706',
              display: 'flex',
              alignItems: 'center',
              gap: 4,
            }}
          >
            Review <FiArrowRight size={13} />
          </Link>
        </div>
      )}

      {/* Charts */}
      <div className="admin-charts-row">
        {/* Revenue area chart */}
        <div className="admin-chart-card">
          <p className="admin-chart-title">Revenue — Last 7 Days</p>
          {stats.revenueByDay.length === 0 ? (
            <div
              style={{ textAlign: 'center', padding: '2rem', color: '#9ca3af', fontSize: '.82rem' }}
            >
              No revenue data yet
            </div>
          ) : (
            <ResponsiveContainer width="100%" height={220}>
              <AreaChart
                data={stats.revenueByDay}
                margin={{ top: 4, right: 8, left: 0, bottom: 0 }}
              >
                <defs>
                  <linearGradient id="revenueGrad" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#FF9900" stopOpacity={0.25} />
                    <stop offset="95%" stopColor="#FF9900" stopOpacity={0} />
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
                <XAxis dataKey="_id" tick={{ fontSize: 10 }} tickFormatter={(v) => v.slice(5)} />
                <YAxis tick={{ fontSize: 10 }} tickFormatter={(v) => `$${v}`} width={55} />
                <Tooltip
                  formatter={(v) => [formatPrice(Number(v) || 0), 'Revenue']}
                  labelFormatter={(l) => `Date: ${l}`}
                />
                <Area
                  type="monotone"
                  dataKey="revenue"
                  stroke="#FF9900"
                  fill="url(#revenueGrad)"
                  strokeWidth={2}
                />
              </AreaChart>
            </ResponsiveContainer>
          )}
        </div>

        {/* Orders pie chart */}
        <div className="admin-chart-card">
          <p className="admin-chart-title">Orders by Status</p>
          {orderPieData.length === 0 ? (
            <div
              style={{ textAlign: 'center', padding: '2rem', color: '#9ca3af', fontSize: '.82rem' }}
            >
              No orders yet
            </div>
          ) : (
            <ResponsiveContainer width="100%" height={220}>
              <PieChart>
                <Pie
                  data={orderPieData}
                  dataKey="value"
                  nameKey="name"
                  cx="50%"
                  cy="50%"
                  outerRadius={75}
                  label={({ name, percent }) => `${name} ${((percent ?? 0) * 100).toFixed(0)}%`}
                  labelLine={false}
                  fontSize={10}
                >
                  {orderPieData.map((entry, i) => (
                    <Cell key={i} fill={entry.color} />
                  ))}
                </Pie>
                <Tooltip />
              </PieChart>
            </ResponsiveContainer>
          )}
        </div>
      </div>

      {/* Recent Orders table */}
      <div className="admin-table-card">
        <div className="admin-table-toolbar">
          <h3>Recent Orders</h3>
          <Link to="/admin/orders" className="admin-btn admin-btn--primary">
            View All
          </Link>
        </div>
        <div className="admin-table-wrap">
          <table className="admin-table">
            <thead>
              <tr>
                <th>Order #</th>
                <th>Customer</th>
                <th>Date</th>
                <th>Status</th>
                <th>Total</th>
              </tr>
            </thead>
            <tbody>
              {stats.recentOrders.length === 0 ? (
                <tr>
                  <td colSpan={5} className="admin-table__empty">
                    No orders yet
                  </td>
                </tr>
              ) : (
                (stats.recentOrders as unknown as RecentOrder[]).map((order) => (
                  <tr key={order._id} className="admin-recent-row">
                    <td style={{ fontWeight: 600 }}>#{order.orderNumber}</td>
                    <td>
                      {order.userId?.firstName} {order.userId?.lastName}
                    </td>
                    <td>{formatDate(order.createdAt)}</td>
                    <td>
                      <span className={`admin-pill admin-pill--${order.orderStatus}`}>
                        {order.orderStatus}
                      </span>
                    </td>
                    <td style={{ fontWeight: 600 }}>
                      {formatPrice(order.grandTotal, order.currency)}
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>
    </>
  )
}
