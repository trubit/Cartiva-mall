import { Link } from 'react-router-dom'
import {
  FiMapPin,
  FiPackage,
  FiArrowRight,
  FiClock,
  FiCheckCircle,
  FiXCircle,
  FiTruck,
  FiShoppingBag,
  FiDollarSign,
  FiCalendar,
} from 'react-icons/fi'
import { useProfile } from '../../../hooks/useProfile.js'
import { useMyOrders } from '../../../hooks/usePayment.js'
import ProfileCard from '../../../components/profile/ProfileCard/index.js'
import { formatCurrency, formatDate } from '../../../../shared/helpers/index.js'
import type { OrderStatus, OrderPaymentStatus } from '../../../../shared/types/index.js'

const ORDER_STATUS_ICON: Record<OrderStatus, React.ReactNode> = {
  pending: <FiClock size={14} />,
  confirmed: <FiCheckCircle size={14} />,
  processing: <FiClock size={14} />,
  shipped: <FiTruck size={14} />,
  outForDelivery: <FiTruck size={14} />,
  delivered: <FiCheckCircle size={14} />,
  cancelled: <FiXCircle size={14} />,
  returned: <FiXCircle size={14} />,
  refunded: <FiXCircle size={14} />,
}

const ORDER_STATUS_CLS: Record<OrderStatus, string> = {
  pending: 'order-status--pending',
  confirmed: 'order-status--confirmed',
  processing: 'order-status--processing',
  shipped: 'order-status--shipped',
  outForDelivery: 'order-status--shipped',
  delivered: 'order-status--delivered',
  cancelled: 'order-status--cancelled',
  returned: 'order-status--cancelled',
  refunded: 'order-status--cancelled',
}

const PAYMENT_CLS: Record<OrderPaymentStatus, string> = {
  pending: 'payment-badge--pending',
  paid: 'payment-badge--paid',
  failed: 'payment-badge--failed',
  refunded: 'payment-badge--refunded',
}

export default function ProfilePage() {
  const { data: user, isLoading: profileLoading, error } = useProfile()
  const { data: ordersData, isLoading: ordersLoading } = useMyOrders()

  const orders = ordersData?.orders ?? []
  const recentOrders = orders.slice(0, 3)

  if (profileLoading)
    return (
      <div>
        <div className="profile-skeleton mb-3" style={{ height: 180, borderRadius: 12 }} />
        <div className="profile-skeleton" style={{ height: 120, borderRadius: 12 }} />
      </div>
    )

  if (error || !user)
    return (
      <div className="profile-alert profile-alert--error">
        Failed to load profile. Please refresh the page.
      </div>
    )

  const totalOrders = ordersData?.pagination?.total ?? orders.length
  const totalSpent = orders
    .filter((o) => o.paymentStatus === 'paid')
    .reduce((sum, o) => sum + o.grandTotal, 0)
  const memberSince = formatDate(user.createdAt, { year: 'numeric', month: 'long' })

  return (
    <>
      {/* Stats bar */}
      <div className="profile-stats">
        <div className="profile-stat">
          <div className="profile-stat__icon profile-stat__icon--orders">
            <FiShoppingBag size={20} />
          </div>
          <div className="profile-stat__body">
            <span className="profile-stat__value">{totalOrders}</span>
            <span className="profile-stat__label">Total Orders</span>
          </div>
        </div>
        <div className="profile-stat">
          <div className="profile-stat__icon profile-stat__icon--spent">
            <FiDollarSign size={20} />
          </div>
          <div className="profile-stat__body">
            <span className="profile-stat__value">{formatCurrency(totalSpent)}</span>
            <span className="profile-stat__label">Total Spent</span>
          </div>
        </div>
        <div className="profile-stat">
          <div className="profile-stat__icon profile-stat__icon--since">
            <FiCalendar size={20} />
          </div>
          <div className="profile-stat__body">
            <span className="profile-stat__value">{memberSince}</span>
            <span className="profile-stat__label">Member Since</span>
          </div>
        </div>
      </div>

      <ProfileCard user={user} />

      {/* Recent Orders */}
      <div className="profile-card">
        <div
          className="profile-card-header"
          style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}
        >
          <h2 className="profile-section-title">
            <FiPackage /> Recent Orders
          </h2>
          <Link to="/orders" className="profile-view-all">
            View all <FiArrowRight size={13} />
          </Link>
        </div>

        {ordersLoading && (
          <div className="profile-orders-loading">
            {[1, 2].map((i) => (
              <div key={i} className="profile-skeleton" style={{ height: 72, borderRadius: 10 }} />
            ))}
          </div>
        )}

        {!ordersLoading && recentOrders.length === 0 && (
          <div className="profile-orders-empty">
            <FiPackage size={32} style={{ color: 'var(--color-neutral-300)' }} />
            <p>No orders yet.</p>
            <Link to="/products" className="btn btn-primary" style={{ marginTop: 4 }}>
              Start Shopping
            </Link>
          </div>
        )}

        {!ordersLoading && recentOrders.length > 0 && (
          <ul className="profile-orders-list">
            {recentOrders.map((order) => (
              <li key={order._id} className="profile-order-row">
                {/* Thumbnail stack */}
                <div className="profile-order-thumbs">
                  {order.items.slice(0, 2).map((item, i) =>
                    item.image ? (
                      <img
                        key={i}
                        src={item.image}
                        alt={item.title}
                        className="profile-order-thumb"
                      />
                    ) : (
                      <span
                        key={i}
                        className="profile-order-thumb profile-order-thumb--placeholder"
                      >
                        🛍️
                      </span>
                    ),
                  )}
                  {order.items.length > 2 && (
                    <span className="profile-order-thumb-extra">+{order.items.length - 2}</span>
                  )}
                </div>

                {/* Info */}
                <div className="profile-order-info">
                  <span className="profile-order-number">#{order.orderNumber}</span>
                  <span className="profile-order-date">{formatDate(order.createdAt)}</span>
                </div>

                {/* Status */}
                <div className={`profile-order-status ${ORDER_STATUS_CLS[order.orderStatus]}`}>
                  {ORDER_STATUS_ICON[order.orderStatus]}
                  {order.orderStatus}
                </div>

                {/* Payment */}
                <span className={`profile-payment-badge ${PAYMENT_CLS[order.paymentStatus]}`}>
                  {order.paymentStatus}
                </span>

                {/* Total */}
                <span className="profile-order-total">{formatCurrency(order.grandTotal)}</span>
              </li>
            ))}
          </ul>
        )}
      </div>

      {/* Delivery Address */}
      <div className="profile-card">
        <div className="profile-card-header">
          <h2 className="profile-section-title">
            <FiMapPin /> Delivery Address
          </h2>
        </div>
        {user.address?.street ? (
          <div className="address-display">
            {user.address.street}
            <br />
            {user.address.city}
            {user.address.state ? `, ${user.address.state}` : ''}
            <br />
            {user.address.country} {user.address.postalCode}
          </div>
        ) : (
          <div className="address-empty">
            No address saved yet.{' '}
            <Link to="/profile/address" style={{ color: '#FF9900' }}>
              Add one →
            </Link>
          </div>
        )}
      </div>
    </>
  )
}
