import { useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import {
  FiDollarSign,
  FiShoppingBag,
  FiPackage,
  FiTrendingUp,
  FiAlertCircle,
  FiPlus,
  FiArrowRight,
  FiShield,
  FiCheckCircle,
  FiClock,
  FiTruck,
} from 'react-icons/fi'
import { useSellerDashboard } from '../../../hooks/useSeller.js'
import { useSellerKycStatus } from '../../../hooks/useSellerKyc.js'
import { useSellerOrders } from '../../../hooks/useOrders.js'
import { useCurrency } from '../../../hooks/useCurrency.js'
import SellerStatsCard from '../../../components/seller/SellerStatsCard/index.js'
import { RevenueAreaChart, OrderStatusPie } from '../../../components/seller/RevenueChart/index.js'
import AddProductModal from '../../../components/seller/AddProductModal/index.js'
import { formatDate } from '../../../../shared/helpers/index.js'
import type { ISellerRecentOrder } from '../../../../shared/types/index.js'

const PLACEHOLDER =
  "data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='40' height='40' viewBox='0 0 40 40'%3E%3Crect width='40' height='40' fill='%23f1f5f9'/%3E%3Cpath d='M12 26l4-5 4 4 5-6 5 7H12z' fill='%2394a3b8'/%3E%3Ccircle cx='16' cy='15' r='2' fill='%2394a3b8'/%3E%3C/svg%3E"

export default function SellerDashboard() {
  const navigate = useNavigate()
  const { data, isLoading, isError, refetch: refetchDashboard } = useSellerDashboard()
  const { data: kycData, refetch: refetchKyc } = useSellerKycStatus()
  const { data: sellerOrdersData } = useSellerOrders({ page: 1, limit: 50 })
  const { formatPrice: formatCurrency } = useCurrency()
  const [showAddProduct, setShowAddProduct] = useState(false)

  const stats = data?.stats
  const recentOrders = (data?.recentOrders ?? []) as unknown as ISellerRecentOrder[]

  const activeShippingAlerts = (sellerOrdersData?.orders ?? []).filter((order) => {
    const isPaid = order.paymentStatus === 'paid'
    const notDelivered =
      !order.deliveryConfirmedAt &&
      order.sellerBreakdown?.sellerFulfillmentStatus !== 'delivered_confirmed'
    const isActionable = ['confirmed', 'processing', 'shipped', 'outForDelivery'].includes(
      order.orderStatus,
    )
    return isPaid && notDelivered && isActionable
  })

  const isVerified = Boolean(kycData?.isVerified || kycData?.kycStatus === 'VERIFIED')
  const storeCreated = kycData?.storeCreated || false
  const kycStatus = isVerified ? 'VERIFIED' : kycData?.kycStatus || 'NOT_STARTED'

  return (
    <div className="container section sl-page">
      {/* KYC & Store Verification Banner */}
      {!isVerified && kycStatus !== 'VERIFIED' && (
        <div
          style={{
            background: '#fffbeb',
            border: '1px solid #fde68a',
            borderRadius: 12,
            padding: '16px 20px',
            marginBottom: '1.5rem',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            flexWrap: 'wrap',
            gap: 12,
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
            {kycStatus === 'UNDER_REVIEW' || kycStatus === 'PENDING' ? (
              <FiClock size={24} color="#d97706" />
            ) : (
              <FiShield size={24} color="#d97706" />
            )}
            <div>
              <h4 style={{ margin: 0, fontSize: '0.95rem', fontWeight: 700, color: '#92400e' }}>
                {kycStatus === 'UNDER_REVIEW' || kycStatus === 'PENDING'
                  ? 'Seller KYC Under Review'
                  : 'Seller KYC Verification Required'}
              </h4>
              <p style={{ margin: '2px 0 0', fontSize: '0.82rem', color: '#b45309' }}>
                {kycStatus === 'UNDER_REVIEW' || kycStatus === 'PENDING'
                  ? 'Your identity documents are being reviewed. Product publishing will unlock upon approval.'
                  : 'You must complete KYC identity & bank verification before listing or publishing products.'}
              </p>
            </div>
          </div>
          <Link
            to="/seller/kyc"
            style={{
              display: 'inline-flex',
              alignItems: 'center',
              gap: 6,
              background: '#d97706',
              color: '#fff',
              padding: '8px 16px',
              borderRadius: 6,
              textDecoration: 'none',
              fontWeight: 600,
              fontSize: '0.85rem',
            }}
          >
            {kycStatus === 'UNDER_REVIEW' || kycStatus === 'PENDING'
              ? 'View Status'
              : 'Complete Verification'}{' '}
            <FiArrowRight size={14} />
          </Link>
        </div>
      )}

      {isVerified && !storeCreated && (
        <div
          style={{
            background: '#eff6ff',
            border: '1px solid #bfdbfe',
            borderRadius: 12,
            padding: '16px 20px',
            marginBottom: '1.5rem',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            flexWrap: 'wrap',
            gap: 12,
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
            <FiShoppingBag size={24} color="#2563eb" />
            <div>
              <h4 style={{ margin: 0, fontSize: '0.95rem', fontWeight: 700, color: '#1e40af' }}>
                Store Setup Required
              </h4>
              <p style={{ margin: '2px 0 0', fontSize: '0.82rem', color: '#1d4ed8' }}>
                Your KYC is approved! Complete your store profile to start listing products on
                Cartival Mall.
              </p>
            </div>
          </div>
          <Link
            to="/seller/store/setup"
            style={{
              display: 'inline-flex',
              alignItems: 'center',
              gap: 6,
              background: '#2563eb',
              color: '#fff',
              padding: '8px 16px',
              borderRadius: 6,
              textDecoration: 'none',
              fontWeight: 600,
              fontSize: '0.85rem',
            }}
          >
            Set Up Store <FiArrowRight size={14} />
          </Link>
        </div>
      )}

      {/* Header */}
      <div className="sl-page-header">
        <div>
          <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
            <h1 className="sl-page-title">Seller Dashboard</h1>
            {isVerified && storeCreated && (
              <span
                style={{
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: 4,
                  background: '#ecfdf5',
                  color: '#059669',
                  border: '1px solid #a7f3d0',
                  padding: '4px 10px',
                  borderRadius: 999,
                  fontSize: '0.75rem',
                  fontWeight: 700,
                }}
              >
                <FiCheckCircle size={13} /> Verified Seller
              </span>
            )}
          </div>
          <p className="sl-page-subtitle">Your store overview</p>
        </div>
        <div style={{ display: 'flex', gap: 10 }}>
          <Link
            to="/seller/fees"
            className="sl-btn sl-btn--outline"
            style={{
              display: 'inline-flex',
              alignItems: 'center',
              gap: 6,
              padding: '8px 14px',
              borderRadius: 6,
              border: '1px solid var(--color-neutral-300)',
              textDecoration: 'none',
              color: 'inherit',
              fontWeight: 600,
              fontSize: '0.85rem',
            }}
          >
            <FiDollarSign size={15} /> Seller Fees
          </Link>
          <button
            className="sl-btn sl-btn--primary"
            onClick={() => {
              if (!isVerified || kycStatus !== 'VERIFIED') {
                navigate('/seller/kyc')
              } else if (!storeCreated) {
                navigate('/seller/store/setup')
              } else {
                setShowAddProduct(true)
              }
            }}
          >
            <FiPlus size={15} /> Add Product
          </button>
        </div>
      </div>

      {isError && (
        <div
          className="sl-alert sl-alert--error"
          style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            flexWrap: 'wrap',
            gap: 10,
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            <FiAlertCircle /> Unable to load your seller dashboard.
          </div>
          <button
            type="button"
            className="sl-btn sl-btn--outline"
            style={{
              padding: '4px 12px',
              fontSize: '0.8rem',
              background: '#fff',
              cursor: 'pointer',
            }}
            onClick={() => {
              refetchDashboard()
              refetchKyc()
            }}
          >
            Retry
          </button>
        </div>
      )}

      {/* ── Persistent Seller Shipping Alerts (Awaiting Buyer Doorstep Confirmation) ── */}
      {activeShippingAlerts.length > 0 && (
        <div className="mb-4">
          <div
            className="card border-0 shadow-sm rounded-3 overflow-hidden"
            style={{
              background: '#fffbf5',
              border: '1px solid #fed7aa',
              borderLeft: '5px solid #f97316',
            }}
          >
            <div className="card-body p-4">
              <div className="d-flex align-items-center justify-content-between flex-wrap gap-2 mb-3">
                <div className="d-flex align-items-center gap-2">
                  <div
                    className="rounded-circle d-flex align-items-center justify-content-center"
                    style={{ width: 38, height: 38, background: '#ffedd5', color: '#ea580c' }}
                  >
                    <FiTruck size={20} />
                  </div>
                  <div>
                    <h5 className="fw-bold mb-0" style={{ color: '#9a3412', fontSize: '1.05rem' }}>
                      New Order — Shipping Required
                    </h5>
                    <div
                      className="badge bg-warning text-dark mt-1"
                      style={{ fontSize: '0.75rem' }}
                    >
                      {activeShippingAlerts.length} order
                      {activeShippingAlerts.length !== 1 ? 's' : ''} awaiting delivery confirmation
                    </div>
                  </div>
                </div>
                <Link
                  to="/seller/orders"
                  className="btn btn-sm btn-outline-warning text-dark fw-semibold d-inline-flex align-items-center gap-1"
                >
                  Manage All Orders <FiArrowRight size={13} />
                </Link>
              </div>

              <p className="text-secondary mb-3" style={{ fontSize: '0.9rem', lineHeight: 1.55 }}>
                You have received a new order on Cartival Mall. As an independent seller, you are
                responsible for preparing and shipping this product directly to the customer. The
                shipping fee paid by the customer for this order will be included in your payout
                calculation, subject to payment verification, applicable deductions, refunds, and
                settlement rules. Please arrange delivery and keep the order status updated. This
                alert will remain visible until the buyer confirms successful delivery.
              </p>

              <div className="d-flex flex-column gap-2">
                {activeShippingAlerts.slice(0, 5).map((ord) => {
                  const subtotal = ord.sellerBreakdown?.sellerProductSubtotal ?? ord.subtotal
                  const shipping = ord.sellerBreakdown?.sellerShippingFee ?? ord.shippingFee
                  const net =
                    ord.sellerBreakdown?.sellerNetAmount ?? ord.sellerEarnings ?? ord.grandTotal

                  return (
                    <div
                      key={ord._id}
                      className="d-flex flex-column flex-md-row align-items-md-center justify-content-between p-3 rounded-2 bg-white border gap-2"
                      style={{ fontSize: '0.86rem' }}
                    >
                      <div>
                        <div className="d-flex align-items-center gap-2">
                          <span className="fw-bold text-dark">Order #{ord.orderNumber}</span>
                          <span className="badge bg-light text-secondary border">
                            {ord.orderStatus === 'shipped'
                              ? 'Shipped — Awaiting Buyer Doorstep Confirmation'
                              : 'Ready to Pack & Ship'}
                          </span>
                        </div>
                        <div className="text-muted small mt-1">
                          Destination:{' '}
                          {ord.shippingAddress?.city ? `${ord.shippingAddress.city}, ` : ''}
                          {ord.shippingAddress?.state || ''}
                          {' • '}
                          {ord.items.length} item(s)
                        </div>
                      </div>
                      <div className="d-flex align-items-center gap-3">
                        <div className="text-end">
                          <div className="text-muted small">
                            Products: {formatCurrency(subtotal, ord.currency)}
                          </div>
                          <div className="text-success fw-semibold">
                            Shipping Fee: +{formatCurrency(shipping, ord.currency)}
                          </div>
                          <div className="fw-bold text-primary small">
                            Net Payout: {formatCurrency(net, ord.currency)}
                          </div>
                        </div>
                        <Link
                          to="/seller/orders"
                          className="btn btn-sm btn-warning text-dark fw-bold px-3 py-1"
                        >
                          Fulfill Order
                        </Link>
                      </div>
                    </div>
                  )
                })}
              </div>
            </div>
          </div>
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
