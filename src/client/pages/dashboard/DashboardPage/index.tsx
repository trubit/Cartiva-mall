import { Link } from 'react-router-dom'
import {
  FiShoppingBag,
  FiHeart,
  FiBell,
  FiDollarSign,
  FiClock,
  FiChevronRight,
} from 'react-icons/fi'
import { useDashboardSummary } from '../../../hooks/useDashboard.js'
import { useCurrency } from '../../../hooks/useCurrency.js'
import LoadingSpinner from '../../../components/ui/LoadingSpinner.js'

const formatDate = (iso: string) =>
  new Date(iso).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })

const ORDER_STATUS_CLASS: Record<string, string> = {
  pending: 'order-badge--pending',
  processing: 'order-badge--processing',
  shipped: 'order-badge--shipped',
  delivered: 'order-badge--delivered',
  cancelled: 'order-badge--cancelled',
  returned: 'order-badge--returned',
}

export default function DashboardPage() {
  const { data, isLoading } = useDashboardSummary()
  const { formatPrice: formatCurrency } = useCurrency()

  if (isLoading) return <LoadingSpinner />
  if (!data) return null

  const { user, orderStats, wishlistCount, unreadNotifications, recentOrders } = data

  return (
    <div>
      <div className="dashboard-page-header">
        <h1 className="dashboard-page-title">Welcome back, {user.firstName}!</h1>
        <p className="dashboard-page-subtitle">Here's what's happening with your account today.</p>
      </div>

      {/* Overview cards */}
      <div className="dashboard-overview-grid">
        <div className="dashboard-overview-card">
          <div className="dashboard-overview-card__header">
            <span className="dashboard-overview-card__label">Total Orders</span>
            <span className="dashboard-overview-card__icon dashboard-overview-card__icon--orange">
              <FiShoppingBag />
            </span>
          </div>
          <div className="dashboard-overview-card__value">{orderStats.total}</div>
          <div className="dashboard-overview-card__sub">
            {orderStats.delivered} delivered, {orderStats.pending} pending
          </div>
        </div>

        <div className="dashboard-overview-card">
          <div className="dashboard-overview-card__header">
            <span className="dashboard-overview-card__label">Total Spent</span>
            <span className="dashboard-overview-card__icon dashboard-overview-card__icon--green">
              <FiDollarSign />
            </span>
          </div>
          <div className="dashboard-overview-card__value">
            {formatCurrency(orderStats.totalSpent)}
          </div>
          <div className="dashboard-overview-card__sub">Across all paid orders</div>
        </div>

        <div className="dashboard-overview-card">
          <div className="dashboard-overview-card__header">
            <span className="dashboard-overview-card__label">Wishlist</span>
            <span className="dashboard-overview-card__icon dashboard-overview-card__icon--red">
              <FiHeart />
            </span>
          </div>
          <div className="dashboard-overview-card__value">{wishlistCount}</div>
          <div className="dashboard-overview-card__sub">
            <Link to="/dashboard/wishlist" style={{ color: 'inherit' }}>
              View saved items
            </Link>
          </div>
        </div>

        <div className="dashboard-overview-card">
          <div className="dashboard-overview-card__header">
            <span className="dashboard-overview-card__label">Notifications</span>
            <span className="dashboard-overview-card__icon dashboard-overview-card__icon--blue">
              <FiBell />
            </span>
          </div>
          <div className="dashboard-overview-card__value">{unreadNotifications}</div>
          <div className="dashboard-overview-card__sub">
            <Link to="/dashboard/notifications" style={{ color: 'inherit' }}>
              {unreadNotifications > 0 ? 'View unread' : 'All caught up'}
            </Link>
          </div>
        </div>
      </div>

      {/* Order Stats Breakdown */}
      <div className="dashboard-section">
        <div className="dashboard-section__header">
          <h2 className="dashboard-section__title">Order Status</h2>
          <Link to="/orders" className="dashboard-section__action">
            View all orders <FiChevronRight style={{ verticalAlign: 'middle' }} />
          </Link>
        </div>
        <div className="dashboard-section__body">
          <div className="dashboard-order-stats">
            {[
              { label: 'Processing', value: orderStats.processing },
              { label: 'Shipped', value: orderStats.shipped },
              { label: 'Delivered', value: orderStats.delivered },
              { label: 'Cancelled', value: orderStats.cancelled },
            ].map(({ label, value }) => (
              <div className="dashboard-order-stat" key={label}>
                <span className="dashboard-order-stat__value">{value}</span>
                <div className="dashboard-order-stat__label">{label}</div>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Recent Orders */}
      <div className="dashboard-section">
        <div className="dashboard-section__header">
          <h2 className="dashboard-section__title">
            <FiClock style={{ marginRight: 6, verticalAlign: 'middle' }} />
            Recent Orders
          </h2>
          <Link to="/orders" className="dashboard-section__action">
            See all
          </Link>
        </div>
        <div style={{ overflowX: 'auto' }}>
          {recentOrders.length === 0 ? (
            <div className="dashboard-empty">
              <FiShoppingBag className="dashboard-empty__icon" />
              <p className="dashboard-empty__title">No orders yet</p>
              <p className="dashboard-empty__text">Start shopping to see your orders here.</p>
              <Link to="/products" className="dashboard-btn dashboard-btn--primary">
                Browse Products
              </Link>
            </div>
          ) : (
            <table className="dashboard-orders-table">
              <thead>
                <tr>
                  <th>Order</th>
                  <th>Date</th>
                  <th>Items</th>
                  <th>Total</th>
                  <th>Status</th>
                </tr>
              </thead>
              <tbody>
                {recentOrders.map((order) => (
                  <tr key={order._id}>
                    <td>
                      <Link
                        to={`/orders/${order._id}`}
                        className="dashboard-orders-table__order-num"
                      >
                        #{order.orderNumber}
                      </Link>
                    </td>
                    <td>{formatDate(order.createdAt)}</td>
                    <td>{order.items?.length ?? 0}</td>
                    <td style={{ fontVariantNumeric: 'tabular-nums' }}>
                      {formatCurrency(order.grandTotal)}
                    </td>
                    <td>
                      <span
                        className={`order-badge ${ORDER_STATUS_CLASS[order.orderStatus] ?? 'order-badge--pending'}`}
                      >
                        {order.orderStatus}
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>
      </div>
    </div>
  )
}
