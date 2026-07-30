import {
  FiDollarSign,
  FiClock,
  FiCheckCircle,
  FiTrendingUp,
  FiAlertCircle,
  FiInfo,
} from 'react-icons/fi'
import { useSellerEarnings } from '../../../hooks/useSeller.js'
import SellerStatsCard from '../../../components/seller/SellerStatsCard/index.js'
import { RevenueBarChart } from '../../../components/seller/RevenueChart/index.js'
import { formatCurrency } from '../../../../shared/helpers/index.js'

export default function SellerPayouts() {
  const { data, isLoading, isError } = useSellerEarnings()

  return (
    <div className="container section sl-page">
      <div className="sl-page-header">
        <div>
          <h1 className="sl-page-title">Payouts & Earnings</h1>
          <p className="sl-page-subtitle">Track your store revenue and withdrawal status</p>
        </div>
      </div>

      {isError && (
        <div className="sl-alert sl-alert--error">
          <FiAlertCircle /> Failed to load earnings data.
        </div>
      )}

      {/* Platform fee notice */}
      <div className="sl-alert sl-alert--info">
        <FiInfo size={16} />
        <span>
          Platform fee: <strong>{isLoading ? '—' : `${data?.platformFeePercent ?? 5}%`}</strong> is
          deducted from each transaction. Net earnings are displayed after fee deduction.
        </span>
      </div>

      {/* Stats cards */}
      <div className="sl-stats-grid">
        <SellerStatsCard
          icon={<FiDollarSign size={22} />}
          label="Total Revenue"
          value={isLoading ? '—' : formatCurrency(data?.totalRevenue ?? 0)}
          sub="Gross (before fees)"
          accent="teal"
          loading={isLoading}
        />
        <SellerStatsCard
          icon={<FiCheckCircle size={22} />}
          label="Net Earnings"
          value={isLoading ? '—' : formatCurrency(data?.netRevenue ?? 0)}
          sub={`After ${data?.platformFeePercent ?? 5}% platform fee`}
          accent="green"
          loading={isLoading}
        />
        <SellerStatsCard
          icon={<FiTrendingUp size={22} />}
          label="This Month"
          value={isLoading ? '—' : formatCurrency(data?.thisMonthRevenue ?? 0)}
          sub={`Last month: ${isLoading ? '—' : formatCurrency(data?.lastMonthRevenue ?? 0)}`}
          accent="orange"
          loading={isLoading}
        />
        <SellerStatsCard
          icon={<FiClock size={22} />}
          label="Pending Balance"
          value={isLoading ? '—' : formatCurrency(data?.pendingBalance ?? 0)}
          sub="From unpaid orders"
          accent="purple"
          loading={isLoading}
        />
      </div>

      {/* Available balance card */}
      <div className="sl-earnings-hero">
        <div className="sl-earnings-hero__inner">
          <p className="sl-earnings-hero__label">Available Balance</p>
          <p className="sl-earnings-hero__amount">
            {isLoading ? (
              <span
                className="skeleton"
                style={{ display: 'inline-block', width: 140, height: 40, borderRadius: 8 }}
              />
            ) : (
              formatCurrency(data?.availableBalance ?? 0)
            )}
          </p>
          <p className="sl-earnings-hero__sub">Net earnings ready for withdrawal</p>
          <button className="sl-btn sl-btn--primary sl-btn--lg" disabled>
            Request Withdrawal{' '}
            <span style={{ fontSize: '0.7rem', marginLeft: 6, opacity: 0.7 }}>(Coming Soon)</span>
          </button>
        </div>
        <div className="sl-earnings-hero__decoration" aria-hidden />
      </div>

      {/* Monthly revenue chart */}
      <div className="sl-chart-card">
        <div className="sl-chart-card__header">
          <p className="sl-chart-card__title">Monthly Revenue — Last 6 Months</p>
        </div>
        <RevenueBarChart data={data?.revenueByMonth ?? []} loading={isLoading} height={240} />
      </div>

      {/* Payout history placeholder */}
      <div className="sl-table-card">
        <div className="sl-table-card__header">
          <h3>Payout History</h3>
        </div>
        <div className="sl-empty" style={{ padding: '2.5rem 0' }}>
          <FiDollarSign size={40} style={{ color: 'var(--color-neutral-300)', marginBottom: 12 }} />
          <p style={{ color: 'var(--color-neutral-500)', margin: 0, fontSize: 'var(--text-sm)' }}>
            No payouts yet. Withdrawal functionality is coming soon.
          </p>
        </div>
      </div>
    </div>
  )
}
