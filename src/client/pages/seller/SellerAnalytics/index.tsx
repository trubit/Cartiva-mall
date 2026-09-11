import { useState } from 'react'
import { FiDollarSign, FiShoppingBag, FiTrendingUp, FiAlertCircle } from 'react-icons/fi'
import { useSellerAnalytics } from '../../../hooks/useSeller.js'
import { useCurrency } from '../../../hooks/useCurrency.js'
import SellerStatsCard from '../../../components/seller/SellerStatsCard/index.js'
import { RevenueAreaChart, OrderStatusPie } from '../../../components/seller/RevenueChart/index.js'

const PERIODS: { label: string; days: number }[] = [
  { label: '7 days', days: 7 },
  { label: '30 days', days: 30 },
  { label: '90 days', days: 90 },
]

const PLACEHOLDER =
  "data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='40' height='40' viewBox='0 0 40 40'%3E%3Crect width='40' height='40' fill='%23f1f5f9'/%3E%3Cpath d='M12 26l4-5 4 4 5-6 5 7H12z' fill='%2394a3b8'/%3E%3Ccircle cx='16' cy='15' r='2' fill='%2394a3b8'/%3E%3C/svg%3E"

export default function SellerAnalytics() {
  const [days, setDays] = useState(30)
  const { data, isLoading, isError } = useSellerAnalytics(days)
  const { formatPrice: formatCurrency } = useCurrency()

  return (
    <div className="container section sl-page">
      <div className="sl-page-header">
        <div>
          <h1 className="sl-page-title">Analytics</h1>
          <p className="sl-page-subtitle">Deep dive into your store performance</p>
        </div>
        {/* Period selector */}
        <div style={{ display: 'flex', gap: 6 }}>
          {PERIODS.map((p) => (
            <button
              key={p.days}
              onClick={() => setDays(p.days)}
              style={{
                padding: '6px 14px',
                borderRadius: 8,
                fontSize: 'var(--text-sm)',
                fontWeight: 600,
                border: '1px solid',
                background: days === p.days ? '#007185' : 'transparent',
                color: days === p.days ? '#fff' : '#007185',
                borderColor: '#007185',
                cursor: 'pointer',
              }}
            >
              {p.label}
            </button>
          ))}
        </div>
      </div>

      {isError && (
        <div className="sl-alert sl-alert--error">
          <FiAlertCircle /> Failed to load analytics data.
        </div>
      )}

      {/* Summary stats */}
      <div className="sl-stats-grid">
        <SellerStatsCard
          icon={<FiDollarSign size={22} />}
          label="Total Revenue"
          value={isLoading ? '—' : formatCurrency(data?.totalRevenue ?? 0)}
          sub={`Last ${days} days`}
          accent="teal"
          loading={isLoading}
        />
        <SellerStatsCard
          icon={<FiShoppingBag size={22} />}
          label="Total Orders"
          value={isLoading ? '—' : (data?.totalOrders ?? 0)}
          sub={`Last ${days} days`}
          accent="orange"
          loading={isLoading}
        />
        <SellerStatsCard
          icon={<FiTrendingUp size={22} />}
          label="Avg. Order Value"
          value={isLoading ? '—' : formatCurrency(data?.avgOrderValue ?? 0)}
          sub="Per paid order"
          accent="green"
          loading={isLoading}
        />
        <SellerStatsCard
          icon={<FiTrendingUp size={22} />}
          label="Orders / Day"
          value={isLoading ? '—' : days > 0 ? ((data?.totalOrders ?? 0) / days).toFixed(1) : '0'}
          sub={`Over ${days} days`}
          accent="purple"
          loading={isLoading}
        />
      </div>

      {/* Charts */}
      <div className="sl-charts-row">
        <div className="sl-chart-card">
          <div className="sl-chart-card__header">
            <p className="sl-chart-card__title">Revenue — Last {days} Days</p>
          </div>
          <RevenueAreaChart data={data?.revenueByDay ?? []} loading={isLoading} height={240} />
        </div>
        <div className="sl-chart-card">
          <div className="sl-chart-card__header">
            <p className="sl-chart-card__title">Orders by Status</p>
          </div>
          <OrderStatusPie
            data={data?.orderStatusBreakdown ?? []}
            loading={isLoading}
            height={240}
          />
        </div>
      </div>

      {/* Top Products */}
      <div className="sl-table-card">
        <div className="sl-table-card__header">
          <h3>Top Products by Revenue</h3>
        </div>
        {isLoading ? (
          <div className="d-flex flex-column gap-2">
            {[1, 2, 3, 4, 5].map((i) => (
              <div key={i} className="skeleton" style={{ height: 60, borderRadius: 8 }} />
            ))}
          </div>
        ) : (data?.topProducts.length ?? 0) === 0 ? (
          <div className="sl-empty" style={{ padding: '2rem 0' }}>
            <p style={{ color: 'var(--color-neutral-500)', margin: 0 }}>
              No sales data for this period.
            </p>
          </div>
        ) : (
          <table className="seller-table">
            <thead>
              <tr>
                <th>#</th>
                <th>Product</th>
                <th>Units Sold</th>
                <th>Revenue</th>
                <th>Avg. Price</th>
              </tr>
            </thead>
            <tbody>
              {data!.topProducts.map((p, i) => (
                <tr key={p._id}>
                  <td style={{ fontWeight: 700, color: 'var(--color-neutral-400)', width: 40 }}>
                    {i + 1}
                  </td>
                  <td>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                      <img
                        src={p.image ?? PLACEHOLDER}
                        alt={p.title}
                        style={{
                          width: 36,
                          height: 36,
                          borderRadius: 6,
                          objectFit: 'cover',
                          flexShrink: 0,
                        }}
                        onError={(e) => {
                          ;(e.target as HTMLImageElement).src = PLACEHOLDER
                        }}
                      />
                      <span style={{ fontWeight: 600, fontSize: 'var(--text-sm)' }}>{p.title}</span>
                    </div>
                  </td>
                  <td style={{ fontWeight: 600 }}>{p.totalSold}</td>
                  <td style={{ fontWeight: 700, color: '#007185' }}>
                    {formatCurrency(p.totalRevenue)}
                  </td>
                  <td style={{ color: 'var(--color-neutral-500)', fontSize: 'var(--text-sm)' }}>
                    {p.totalSold > 0 ? formatCurrency(p.totalRevenue / p.totalSold) : '—'}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>
    </div>
  )
}
