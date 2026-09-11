import { Link } from 'react-router-dom'
import { useMyVendorDetail, useVendorAnalytics } from '../../../hooks/useVendors.js'
import { useCurrency } from '../../../hooks/useCurrency.js'

export default function CommissionDashboard() {
  const { data: vendorData, isLoading: vendorLoading } = useMyVendorDetail()
  const vendorId = vendorData?.vendor ? String(vendorData.vendor._id) : ''
  const { data: analytics, isLoading: analyticsLoading } = useVendorAnalytics(vendorId)
  const { formatPrice } = useCurrency()

  const isLoading = vendorLoading || (!!vendorId && analyticsLoading)

  const summary = analytics?.summary ?? { totalRevenue: 0, totalEarnings: 0, totalOrders: 0 }
  const recent = (analytics?.recentCommissions ?? []) as Array<{
    _id: string
    saleAmount: number
    sellerEarning: number
    commissionAmount: number
    status: string
    createdAt: string
  }>

  const statusPill = (status: string) => {
    if (status === 'paid') return 'status-pill status-pill--active'
    if (status === 'calculated') return 'status-pill status-pill--pending'
    return 'status-pill'
  }

  if (isLoading) {
    return (
      <div className="container section sl-page">
        <div className="sl-page-header">
          <h1 className="sl-page-title">Commission Dashboard</h1>
        </div>
        <div className="sl-stats-grid">
          {[1, 2, 3].map((i) => (
            <div key={i} className="skeleton" style={{ height: 88, borderRadius: 12 }} />
          ))}
        </div>
      </div>
    )
  }

  if (!vendorId) {
    return (
      <div className="container section sl-page">
        <div className="sl-page-header">
          <h1 className="sl-page-title">Commission Dashboard</h1>
        </div>
        <div className="sl-empty">
          <p>No vendor profile found.</p>
          <Link to="/seller/register" className="sl-btn sl-btn--primary" style={{ marginTop: 12 }}>
            Register as a Vendor
          </Link>
        </div>
      </div>
    )
  }

  return (
    <div className="container section sl-page">
      <div className="sl-page-header">
        <div>
          <h1 className="sl-page-title">Commission Dashboard</h1>
          <p className="sl-page-subtitle">Your earnings and commission history</p>
        </div>
      </div>

      <div className="sl-stats-grid">
        {[
          { label: 'Total Revenue', value: formatPrice(summary.totalRevenue) },
          { label: 'Total Earnings', value: formatPrice(summary.totalEarnings) },
          { label: 'Total Orders', value: String(summary.totalOrders) },
        ].map((stat) => (
          <div key={stat.label} className="sl-stat-card">
            <div className="sl-stat-card__body">
              <span className="sl-stat-card__value">{stat.value}</span>
              <span className="sl-stat-card__label">{stat.label}</span>
            </div>
          </div>
        ))}
      </div>

      <div className="sl-table-card">
        <div className="sl-table-card__header">
          <h3>Recent Commissions (Last 30 Days)</h3>
        </div>
        {recent.length === 0 ? (
          <div className="sl-empty">
            <p>No commissions yet.</p>
          </div>
        ) : (
          <div className="sl-table-wrap">
            <table className="seller-table">
              <thead>
                <tr>
                  <th>Date</th>
                  <th>Sale Amount</th>
                  <th>Commission</th>
                  <th>Your Earning</th>
                  <th>Status</th>
                </tr>
              </thead>
              <tbody>
                {recent.map((c) => (
                  <tr key={c._id}>
                    <td>{new Date(c.createdAt).toLocaleDateString()}</td>
                    <td>{formatPrice(c.saleAmount)}</td>
                    <td style={{ color: '#e53e3e' }}>-{formatPrice(c.commissionAmount)}</td>
                    <td style={{ color: '#22863a', fontWeight: 600 }}>
                      {formatPrice(c.sellerEarning)}
                    </td>
                    <td>
                      <span className={statusPill(c.status)}>{c.status}</span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  )
}
