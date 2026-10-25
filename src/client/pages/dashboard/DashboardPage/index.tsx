import { useState } from 'react'
import { Link } from 'react-router-dom'
import {
  FiShoppingBag,
  FiHeart,
  FiBell,
  FiDollarSign,
  FiClock,
  FiChevronRight,
  FiTruck,
  FiCheckCircle,
} from 'react-icons/fi'
import { useDashboardSummary } from '../../../hooks/useDashboard.js'
import { useOrders, useConfirmDelivery } from '../../../hooks/useOrders.js'
import { useCurrency } from '../../../hooks/useCurrency.js'
import LoadingSpinner from '../../../components/ui/LoadingSpinner.js'
import ConfirmDialog from '../../../components/common/ConfirmDialog/index.js'
import type { IOrder } from '../../../../shared/types/index.js'

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
  const { data: ordersData } = useOrders({ page: 1, limit: 20 })
  const { mutate: confirmDelivery, isPending: confirmingDelivery } = useConfirmDelivery()
  const { formatPrice: formatCurrency } = useCurrency()

  const [orderToConfirm, setOrderToConfirm] = useState<IOrder | null>(null)
  const [successMessage, setSuccessMessage] = useState<string | null>(null)

  if (isLoading) return <LoadingSpinner />
  if (!data) return null

  const { user, orderStats, wishlistCount, unreadNotifications, recentOrders } = data

  // Combine ordersData and recentOrders so that shipped orders awaiting doorstep delivery
  // are immediately displayed without race conditions or waiting for secondary queries.
  const allOrdersMap = new Map<string, IOrder>()
  for (const ord of (ordersData?.orders ?? []) as IOrder[]) {
    allOrdersMap.set(String(ord._id), ord)
  }
  for (const ord of (recentOrders ?? []) as unknown as IOrder[]) {
    if (!allOrdersMap.has(String(ord._id))) {
      allOrdersMap.set(String(ord._id), ord)
    }
  }

  const shippedAwaitingDelivery = Array.from(allOrdersMap.values()).filter(
    (ord: IOrder) =>
      !ord.deliveryConfirmedAt &&
      ['shipped', 'outForDelivery', 'delivered'].includes(ord.orderStatus),
  )

  const handleConfirmDelivery = () => {
    if (!orderToConfirm) return
    confirmDelivery(orderToConfirm._id, {
      onSuccess: () => {
        setSuccessMessage(
          'Delivery confirmed successfully. Thank you for shopping with Cartival Mall. The seller and Cartival Mall have been notified that your order has arrived.',
        )
        setOrderToConfirm(null)
      },
    })
  }

  return (
    <div>
      <div className="dashboard-page-header">
        <h1 className="dashboard-page-title">Welcome back, {user.firstName}!</h1>
        <p className="dashboard-page-subtitle">Here's what's happening with your account today.</p>
      </div>

      {/* Buyer Delivery Confirmation Success Banner */}
      {successMessage && (
        <div
          className="alert alert-success d-flex align-items-center gap-3 mb-4 p-3 rounded-3 shadow-sm border-0"
          style={{ background: '#ecfdf5', color: '#065f46', borderLeft: '4px solid #10b981' }}
        >
          <FiCheckCircle size={22} className="text-success flex-shrink-0" />
          <div className="fw-semibold">{successMessage}</div>
        </div>
      )}

      {/* ── Mandatory Buyer Delivery Alerts for Shipped Orders ── */}
      {shippedAwaitingDelivery.map((order: IOrder) => (
        <div
          key={order._id}
          className="card mb-4 border-0 shadow-sm rounded-3 overflow-hidden"
          style={{ background: '#f0fdf4', border: '1px solid #bbf7d0' }}
        >
          <div className="card-body p-4">
            <div className="d-flex flex-column flex-lg-row align-items-lg-center justify-content-between gap-3">
              <div className="d-flex align-items-start gap-3">
                <div
                  className="rounded-circle d-flex align-items-center justify-content-center flex-shrink-0"
                  style={{ width: 44, height: 44, background: '#dcfce7', color: '#16a34a' }}
                >
                  <FiTruck size={22} />
                </div>
                <div>
                  <div className="d-flex align-items-center gap-2 mb-1">
                    <h5 className="fw-bold mb-0" style={{ color: '#14532d' }}>
                      Has Your Order Arrived?
                    </h5>
                    <span
                      className="badge bg-success text-white px-2 py-1"
                      style={{ fontSize: '0.75rem' }}
                    >
                      Order #{order.orderNumber}
                    </span>
                  </div>
                  <p className="mb-1 text-muted" style={{ fontSize: '0.9rem', maxWidth: 700 }}>
                    Your order has been marked as shipped by the seller. Please confirm delivery
                    only after the product has physically arrived at your doorstep. Once you confirm
                    successful delivery, the seller and Cartival Mall will be notified, and your
                    order status will be updated.
                  </p>
                  <div className="small text-secondary">
                    <span>{order.items?.length ?? 1} item(s)</span>
                    {order.tracking?.carrier && (
                      <span className="ms-2">
                        • Carrier: <strong>{order.tracking.carrier}</strong>
                      </span>
                    )}
                    {order.tracking?.trackingNumber && (
                      <span className="ms-2">
                        • Tracking #: <code>{order.tracking.trackingNumber}</code>
                      </span>
                    )}
                  </div>
                </div>
              </div>
              <div className="d-flex align-items-center gap-2">
                <button
                  className="btn btn-success fw-bold px-3 py-2 text-nowrap d-flex align-items-center gap-2 shadow-sm"
                  onClick={() => setOrderToConfirm(order)}
                  disabled={confirmingDelivery}
                  style={{
                    background: '#16a34a',
                    borderColor: '#16a34a',
                    borderRadius: 8,
                    fontSize: '0.9rem',
                  }}
                >
                  <FiCheckCircle size={16} />
                  <span>Successfully Delivered to My Doorstep</span>
                </button>
                <Link
                  to={`/orders/${order._id}`}
                  className="btn btn-outline-success text-nowrap px-3 py-2"
                  style={{ borderRadius: 8, fontSize: '0.88rem' }}
                >
                  Details
                </Link>
              </div>
            </div>
          </div>
        </div>
      ))}

      {/* Confirmation Dialog with Exact Safeguards */}
      <ConfirmDialog
        open={Boolean(orderToConfirm)}
        title="Confirm Successful Delivery"
        message="Have you physically received this product at your doorstep? Please confirm only if the order has arrived."
        confirmText="Yes, Confirm Delivery"
        cancelText="No, Not Yet"
        variant="primary"
        isLoading={confirmingDelivery}
        loadingText="Confirming Delivery…"
        onConfirm={handleConfirmDelivery}
        onClose={() => {
          if (!confirmingDelivery) setOrderToConfirm(null)
        }}
      />

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
            {formatCurrency(orderStats.totalSpent, 'USD')}
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
                      {formatCurrency(order.grandTotal, order.currency || 'USD')}
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
