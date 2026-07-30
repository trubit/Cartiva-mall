import { useState } from 'react'
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  Cell,
} from 'recharts'
import { FiDownload } from 'react-icons/fi'
import { useAdminReports } from '../../../hooks/useAdmin.js'
import { formatCurrency, formatDate } from '../../../../shared/helpers/index.js'

type Period = 'week' | 'month' | 'quarter' | 'year'
const PERIODS: { val: Period; label: string }[] = [
  { val: 'week', label: '7 Days' },
  { val: 'month', label: '30 Days' },
  { val: 'quarter', label: '90 Days' },
  { val: 'year', label: '12 Months' },
]

const COLORS = [
  '#FF9900',
  '#3b82f6',
  '#10b981',
  '#8b5cf6',
  '#f59e0b',
  '#ec4899',
  '#06b6d4',
  '#6b7280',
]

export default function AdminReports() {
  const [period, setPeriod] = useState<Period>('month')

  const { data: res, isLoading, error } = useAdminReports(period)
  const report = res?.data

  const handleExport = () => {
    if (!report) return
    const blob = new Blob([JSON.stringify(report, null, 2)], { type: 'application/json' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = `cartiva-report-${period}-${new Date().toISOString().slice(0, 10)}.json`
    a.click()
    URL.revokeObjectURL(url)
  }

  return (
    <>
      <div
        className="admin-page-header"
        style={{
          display: 'flex',
          alignItems: 'flex-end',
          justifyContent: 'space-between',
          flexWrap: 'wrap',
          gap: '1rem',
        }}
      >
        <div>
          <h1 className="admin-page-title">Reports</h1>
          <p className="admin-page-subtitle">
            Aggregated marketplace data from {report ? formatDate(report.since) : '…'} to now
          </p>
        </div>
        <div style={{ display: 'flex', gap: '.5rem', flexWrap: 'wrap', alignItems: 'center' }}>
          {PERIODS.map((p) => (
            <button
              key={p.val}
              className={`admin-btn ${period === p.val ? 'admin-btn--primary' : 'admin-btn--deactivate'}`}
              onClick={() => setPeriod(p.val)}
            >
              {p.label}
            </button>
          ))}
          <button
            className="admin-btn admin-btn--activate"
            onClick={handleExport}
            disabled={!report}
          >
            <FiDownload size={12} /> Export JSON
          </button>
        </div>
      </div>

      {isLoading ? (
        <div className="admin-loading">Generating report…</div>
      ) : error || !report ? (
        <div className="admin-error">Failed to load report.</div>
      ) : (
        <>
          {/* Revenue summary */}
          <div className="admin-stats-grid">
            <div className="admin-stat-card">
              <div className="admin-stat-icon admin-stat-icon--revenue" />
              <div className="admin-stat-body">
                <span className="admin-stat-value">{formatCurrency(report.revenue.total)}</span>
                <span className="admin-stat-label">Total Revenue</span>
                <p className="admin-stat-sub">{report.revenue.count} paid orders</p>
              </div>
            </div>

            <div className="admin-stat-card">
              <div className="admin-stat-icon admin-stat-icon--orders" />
              <div className="admin-stat-body">
                <span className="admin-stat-value">{formatCurrency(report.revenue.avgValue)}</span>
                <span className="admin-stat-label">Avg Order Value</span>
                <p className="admin-stat-sub">
                  Min {formatCurrency(report.revenue.minValue)} · Max{' '}
                  {formatCurrency(report.revenue.maxValue)}
                </p>
              </div>
            </div>

            <div className="admin-stat-card">
              <div className="admin-stat-icon admin-stat-icon--users" />
              <div className="admin-stat-body">
                <span className="admin-stat-value">
                  {Object.values(report.newUsers).reduce((a, b) => a + b, 0)}
                </span>
                <span className="admin-stat-label">New Users</span>
                <p className="admin-stat-sub">
                  {report.newUsers['seller'] ?? 0} sellers · {report.newUsers['user'] ?? 0} buyers
                </p>
              </div>
            </div>

            <div className="admin-stat-card">
              <div className="admin-stat-icon admin-stat-icon--products" />
              <div className="admin-stat-body">
                <span className="admin-stat-value">{report.orders['delivered'] ?? 0}</span>
                <span className="admin-stat-label">Orders Delivered</span>
                <p className="admin-stat-sub">
                  {report.orders['cancelled'] ?? 0} cancelled · {report.orders['refunded'] ?? 0}{' '}
                  refunded
                </p>
              </div>
            </div>
          </div>

          {/* Category breakdown */}
          <div className="admin-chart-card" style={{ marginBottom: '1.25rem' }}>
            <p className="admin-chart-title">Revenue by Category</p>
            {report.categories.length === 0 ? (
              <div
                style={{
                  textAlign: 'center',
                  padding: '2rem',
                  color: '#9ca3af',
                  fontSize: '.82rem',
                }}
              >
                No category data
              </div>
            ) : (
              <ResponsiveContainer width="100%" height={220}>
                <BarChart
                  data={report.categories}
                  margin={{ top: 4, right: 8, left: 0, bottom: 0 }}
                >
                  <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
                  <XAxis dataKey="_id" tick={{ fontSize: 9 }} />
                  <YAxis
                    tick={{ fontSize: 9 }}
                    tickFormatter={(v) => `$${(v / 1000).toFixed(0)}k`}
                  />
                  <Tooltip formatter={(v) => [formatCurrency(Number(v) || 0), 'Revenue']} />
                  <Bar dataKey="revenue" radius={[4, 4, 0, 0]}>
                    {report.categories.map((_: unknown, i: number) => (
                      <Cell key={i} fill={COLORS[i % COLORS.length]} />
                    ))}
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            )}
          </div>

          {/* Order status + Top sellers */}
          <div className="admin-charts-row">
            {/* Orders by status */}
            <div className="admin-table-card" style={{ marginBottom: 0 }}>
              <div className="admin-table-toolbar">
                <h3>Orders by Status</h3>
              </div>
              <div className="admin-table-wrap">
                <table className="admin-table">
                  <thead>
                    <tr>
                      <th>Status</th>
                      <th>Count</th>
                    </tr>
                  </thead>
                  <tbody>
                    {Object.entries(report.orders).length === 0 ? (
                      <tr>
                        <td colSpan={2} className="admin-table__empty">
                          No orders
                        </td>
                      </tr>
                    ) : (
                      Object.entries(report.orders).map(([status, count]) => (
                        <tr key={status}>
                          <td>
                            <span className={`admin-pill admin-pill--${status}`}>{status}</span>
                          </td>
                          <td style={{ fontWeight: 600 }}>{count as number}</td>
                        </tr>
                      ))
                    )}
                  </tbody>
                </table>
              </div>
            </div>

            {/* Top sellers */}
            <div className="admin-table-card" style={{ marginBottom: 0 }}>
              <div className="admin-table-toolbar">
                <h3>Top Sellers</h3>
              </div>
              <div className="admin-table-wrap">
                <table className="admin-table">
                  <thead>
                    <tr>
                      <th>Store</th>
                      <th>Verified</th>
                      <th>Orders</th>
                    </tr>
                  </thead>
                  <tbody>
                    {report.topSellers.length === 0 ? (
                      <tr>
                        <td colSpan={3} className="admin-table__empty">
                          No data
                        </td>
                      </tr>
                    ) : (
                      report.topSellers.map((s, i) => (
                        <tr key={i}>
                          <td style={{ fontWeight: 600, fontSize: '.8rem' }}>{s.storeName}</td>
                          <td>
                            <span
                              className={`admin-pill ${s.isVerified ? 'admin-pill--active' : 'admin-pill--pending'}`}
                            >
                              {s.isVerified ? 'Yes' : 'No'}
                            </span>
                          </td>
                          <td style={{ fontWeight: 600 }}>{s.orderCount}</td>
                        </tr>
                      ))
                    )}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        </>
      )}
    </>
  )
}
