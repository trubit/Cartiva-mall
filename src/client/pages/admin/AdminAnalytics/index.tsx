import { useState } from 'react'
import {
  AreaChart,
  Area,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  BarChart,
  Bar,
  PieChart,
  Pie,
  Cell,
  Legend,
} from 'recharts'
import { FiTrendingUp, FiTrendingDown } from 'react-icons/fi'
import { useAdminAnalytics } from '../../../hooks/useAdmin.js'
import { formatCurrency } from '../../../../shared/helpers/index.js'

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

const DAY_OPTIONS = [7, 14, 30, 60, 90]

export default function AdminAnalytics() {
  const [days, setDays] = useState(30)

  const { data: res, isLoading, error } = useAdminAnalytics(days)
  const analytics = res?.data

  if (isLoading) return <div className="admin-loading">Loading analytics…</div>
  if (error || !analytics) return <div className="admin-error">Failed to load analytics.</div>

  const {
    summary,
    revenueByDay,
    categoryBreakdown,
    topSellers,
    topProducts,
    userGrowth,
    orderFulfillment,
  } = analytics

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
          <h1 className="admin-page-title">Analytics</h1>
          <p className="admin-page-subtitle">Platform-wide performance insights</p>
        </div>
        <div style={{ display: 'flex', gap: '.4rem' }}>
          {DAY_OPTIONS.map((d) => (
            <button
              key={d}
              className={`admin-btn ${days === d ? 'admin-btn--primary' : 'admin-btn--deactivate'}`}
              onClick={() => setDays(d)}
            >
              {d}d
            </button>
          ))}
        </div>
      </div>

      {/* Summary cards */}
      <div className="admin-stats-grid" style={{ marginBottom: '1.5rem' }}>
        <div className="admin-stat-card">
          <div className="admin-stat-icon admin-stat-icon--revenue" />
          <div className="admin-stat-body">
            <span className="admin-stat-value">{formatCurrency(summary.currentRevenue)}</span>
            <span className="admin-stat-label">Revenue ({days}d)</span>
            <p className="admin-stat-sub" style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
              {summary.revenueGrowth >= 0 ? (
                <FiTrendingUp size={12} color="#10b981" />
              ) : (
                <FiTrendingDown size={12} color="#ef4444" />
              )}
              <span style={{ color: summary.revenueGrowth >= 0 ? '#10b981' : '#ef4444' }}>
                {summary.revenueGrowth >= 0 ? '+' : ''}
                {summary.revenueGrowth}% vs prev period
              </span>
            </p>
          </div>
        </div>

        <div className="admin-stat-card">
          <div className="admin-stat-icon admin-stat-icon--orders" />
          <div className="admin-stat-body">
            <span className="admin-stat-value">
              {topProducts.reduce((s, p) => s + p.unitsSold, 0)}
            </span>
            <span className="admin-stat-label">Units Sold ({days}d)</span>
            <p className="admin-stat-sub">Across {topProducts.length} top products</p>
          </div>
        </div>

        <div className="admin-stat-card">
          <div className="admin-stat-icon admin-stat-icon--users" />
          <div className="admin-stat-body">
            <span className="admin-stat-value">{userGrowth.reduce((s, u) => s + u.users, 0)}</span>
            <span className="admin-stat-label">New Users (6mo)</span>
            <p className="admin-stat-sub">{userGrowth.length} active months</p>
          </div>
        </div>

        <div className="admin-stat-card">
          <div className="admin-stat-icon admin-stat-icon--products" />
          <div className="admin-stat-body">
            <span className="admin-stat-value">{topSellers.length}</span>
            <span className="admin-stat-label">Active Sellers ({days}d)</span>
            <p className="admin-stat-sub">With sales activity</p>
          </div>
        </div>
      </div>

      {/* Revenue trend */}
      <div className="admin-chart-card" style={{ marginBottom: '1.25rem' }}>
        <p className="admin-chart-title">Daily Revenue Trend</p>
        {revenueByDay.length === 0 ? (
          <div
            style={{ textAlign: 'center', padding: '2rem', color: '#9ca3af', fontSize: '.82rem' }}
          >
            No revenue data for this period
          </div>
        ) : (
          <ResponsiveContainer width="100%" height={240}>
            <AreaChart data={revenueByDay} margin={{ top: 4, right: 8, left: 0, bottom: 0 }}>
              <defs>
                <linearGradient id="aGrad" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="#FF9900" stopOpacity={0.25} />
                  <stop offset="95%" stopColor="#FF9900" stopOpacity={0} />
                </linearGradient>
              </defs>
              <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
              <XAxis dataKey="_id" tick={{ fontSize: 10 }} tickFormatter={(v) => v.slice(5)} />
              <YAxis tick={{ fontSize: 10 }} tickFormatter={(v) => `$${v}`} width={60} />
              <Tooltip formatter={(v) => [formatCurrency(Number(v) || 0), 'Revenue']} />
              <Area
                type="monotone"
                dataKey="revenue"
                stroke="#FF9900"
                fill="url(#aGrad)"
                strokeWidth={2}
                dot={false}
              />
            </AreaChart>
          </ResponsiveContainer>
        )}
      </div>

      {/* Two-column charts */}
      <div className="admin-charts-row" style={{ marginBottom: '1.25rem' }}>
        {/* Category revenue breakdown */}
        <div className="admin-chart-card">
          <p className="admin-chart-title">Revenue by Category</p>
          {categoryBreakdown.length === 0 ? (
            <div
              style={{ textAlign: 'center', padding: '2rem', color: '#9ca3af', fontSize: '.82rem' }}
            >
              No data
            </div>
          ) : (
            <ResponsiveContainer width="100%" height={240}>
              <BarChart
                data={categoryBreakdown}
                layout="vertical"
                margin={{ top: 4, right: 16, left: 8, bottom: 0 }}
              >
                <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" horizontal={false} />
                <XAxis
                  type="number"
                  tick={{ fontSize: 9 }}
                  tickFormatter={(v) => `$${(v / 1000).toFixed(0)}k`}
                />
                <YAxis type="category" dataKey="_id" tick={{ fontSize: 9 }} width={80} />
                <Tooltip formatter={(v) => [formatCurrency(Number(v) || 0), 'Revenue']} />
                <Bar dataKey="revenue" radius={[0, 4, 4, 0]}>
                  {categoryBreakdown.map((_: unknown, i: number) => (
                    <Cell key={i} fill={COLORS[i % COLORS.length]} />
                  ))}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          )}
        </div>

        {/* Order fulfillment pie */}
        <div className="admin-chart-card">
          <p className="admin-chart-title">Order Fulfillment Status</p>
          {orderFulfillment.length === 0 ? (
            <div
              style={{ textAlign: 'center', padding: '2rem', color: '#9ca3af', fontSize: '.82rem' }}
            >
              No data
            </div>
          ) : (
            <ResponsiveContainer width="100%" height={240}>
              <PieChart>
                <Pie
                  data={orderFulfillment}
                  dataKey="count"
                  nameKey="_id"
                  cx="50%"
                  cy="50%"
                  outerRadius={80}
                  labelLine={false}
                >
                  {orderFulfillment.map((_: unknown, i: number) => (
                    <Cell key={i} fill={COLORS[i % COLORS.length]} />
                  ))}
                </Pie>
                <Legend formatter={(val) => <span style={{ fontSize: '.7rem' }}>{val}</span>} />
                <Tooltip />
              </PieChart>
            </ResponsiveContainer>
          )}
        </div>
      </div>

      {/* User growth bar chart */}
      <div className="admin-chart-card" style={{ marginBottom: '1.25rem' }}>
        <p className="admin-chart-title">User Registrations (Last 6 Months)</p>
        {userGrowth.length === 0 ? (
          <div
            style={{ textAlign: 'center', padding: '2rem', color: '#9ca3af', fontSize: '.82rem' }}
          >
            No data
          </div>
        ) : (
          <ResponsiveContainer width="100%" height={200}>
            <BarChart data={userGrowth} margin={{ top: 4, right: 8, left: 0, bottom: 0 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
              <XAxis dataKey="_id" tick={{ fontSize: 10 }} />
              <YAxis tick={{ fontSize: 10 }} allowDecimals={false} />
              <Tooltip formatter={(v) => [v, 'New Users']} />
              <Bar dataKey="users" fill="#3b82f6" radius={[4, 4, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        )}
      </div>

      {/* Top sellers & products tables */}
      <div className="admin-charts-row">
        <div className="admin-table-card" style={{ marginBottom: 0 }}>
          <div className="admin-table-toolbar">
            <h3>Top Sellers ({days}d)</h3>
          </div>
          <div className="admin-table-wrap">
            <table className="admin-table">
              <thead>
                <tr>
                  <th>#</th>
                  <th>Seller</th>
                  <th>Orders</th>
                  <th>Revenue</th>
                </tr>
              </thead>
              <tbody>
                {topSellers.length === 0 ? (
                  <tr>
                    <td colSpan={4} className="admin-table__empty">
                      No data
                    </td>
                  </tr>
                ) : (
                  topSellers.map((s, i) => (
                    <tr key={s._id}>
                      <td style={{ color: '#9ca3af', fontWeight: 700 }}>#{i + 1}</td>
                      <td>
                        <div style={{ fontSize: '.8rem', fontWeight: 600 }}>{s.name}</div>
                        <div style={{ fontSize: '.7rem', color: '#6b7280' }}>{s.email}</div>
                      </td>
                      <td style={{ fontSize: '.8rem' }}>{s.orders}</td>
                      <td style={{ fontWeight: 700, fontSize: '.8rem' }}>
                        {formatCurrency(s.revenue)}
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>

        <div className="admin-table-card" style={{ marginBottom: 0 }}>
          <div className="admin-table-toolbar">
            <h3>Top Products ({days}d)</h3>
          </div>
          <div className="admin-table-wrap">
            <table className="admin-table">
              <thead>
                <tr>
                  <th>#</th>
                  <th>Product</th>
                  <th>Units</th>
                  <th>Revenue</th>
                </tr>
              </thead>
              <tbody>
                {topProducts.length === 0 ? (
                  <tr>
                    <td colSpan={4} className="admin-table__empty">
                      No data
                    </td>
                  </tr>
                ) : (
                  topProducts.slice(0, 5).map((p, i) => (
                    <tr key={p._id}>
                      <td style={{ color: '#9ca3af', fontWeight: 700 }}>#{i + 1}</td>
                      <td>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '.5rem' }}>
                          {p.image && (
                            <img
                              src={p.image}
                              alt=""
                              className="admin-product-thumb"
                              style={{ width: 28, height: 28 }}
                            />
                          )}
                          <span
                            style={{
                              fontSize: '.8rem',
                              fontWeight: 600,
                              maxWidth: 160,
                              overflow: 'hidden',
                              textOverflow: 'ellipsis',
                              whiteSpace: 'nowrap',
                            }}
                          >
                            {p.title}
                          </span>
                        </div>
                      </td>
                      <td style={{ fontSize: '.8rem' }}>{p.unitsSold}</td>
                      <td style={{ fontWeight: 700, fontSize: '.8rem' }}>
                        {formatCurrency(p.revenue)}
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </>
  )
}
