import { useState } from 'react'
import { Link } from 'react-router-dom'
import {
  useMyVendorDetail,
  useVendorPayouts,
  useVendorAnalytics,
  useRequestPayout,
} from '../../../hooks/useVendors.js'
import type { IVendorPayout, PayoutMethod } from '../../../../shared/types/vendors.types.js'
import { formatCurrency } from '../../../../shared/helpers/index.js'

const STATUS_PILL: Record<string, string> = {
  pending: 'status-pill status-pill--pending',
  processing: 'status-pill',
  completed: 'status-pill status-pill--active',
  failed: 'status-pill status-pill--blocked',
  cancelled: 'status-pill',
}

const METHODS: { value: PayoutMethod; label: string }[] = [
  { value: 'bank_transfer', label: 'Bank Transfer' },
  { value: 'paypal', label: 'PayPal' },
  { value: 'stripe', label: 'Stripe' },
  { value: 'check', label: 'Check' },
]

function PayoutRow({ p }: { p: IVendorPayout }) {
  return (
    <tr>
      <td>{new Date(p.createdAt).toLocaleDateString()}</td>
      <td style={{ fontWeight: 600 }}>{formatCurrency(p.amount, p.currency)}</td>
      <td style={{ textTransform: 'capitalize' }}>{p.method.replace('_', ' ')}</td>
      <td>
        <span className={STATUS_PILL[p.status] ?? 'status-pill'}>{p.status}</span>
      </td>
      <td>{p.transactionId ?? '—'}</td>
    </tr>
  )
}

export default function PayoutDashboard() {
  const { data: vendorData, isLoading: vendorLoading } = useMyVendorDetail()
  const vendorId = vendorData?.vendor ? String(vendorData.vendor._id) : ''
  const { data: payouts } = useVendorPayouts(vendorId)
  const { data: analytics } = useVendorAnalytics(vendorId)
  const request = useRequestPayout(vendorId)

  const [showForm, setShowForm] = useState(false)
  const [method, setMethod] = useState<PayoutMethod>('bank_transfer')
  const [periodStart, setPeriodStart] = useState('')
  const [periodEnd, setPeriodEnd] = useState('')
  const [error, setError] = useState('')
  const [success, setSuccess] = useState(false)

  const handleRequest = async (e: React.FormEvent) => {
    e.preventDefault()
    setError('')
    setSuccess(false)
    try {
      await request.mutateAsync({ method, periodStart, periodEnd })
      setSuccess(true)
      setShowForm(false)
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Payout request failed')
    }
  }

  const items = payouts?.items ?? []
  const totalEarnings = analytics?.summary.totalEarnings ?? 0

  if (vendorLoading) {
    return (
      <div className="container section sl-page">
        <div className="sl-page-header">
          <h1 className="sl-page-title">Vendor Payouts</h1>
        </div>
        <div className="skeleton" style={{ height: 88, borderRadius: 12, marginBottom: 24 }} />
      </div>
    )
  }

  if (!vendorId) {
    return (
      <div className="container section sl-page">
        <div className="sl-page-header">
          <h1 className="sl-page-title">Vendor Payouts</h1>
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
          <h1 className="sl-page-title">Vendor Payouts</h1>
          <p className="sl-page-subtitle">Request and track your commission payouts</p>
        </div>
        <button className="sl-btn sl-btn--primary" onClick={() => setShowForm((v) => !v)}>
          {showForm ? 'Cancel' : 'Request Payout'}
        </button>
      </div>

      <div className="sl-stats-grid" style={{ gridTemplateColumns: '1fr', maxWidth: 320 }}>
        <div className="sl-stat-card">
          <div className="sl-stat-card__body">
            <span className="sl-stat-card__value">{formatCurrency(totalEarnings)}</span>
            <span className="sl-stat-card__label">Total Lifetime Earnings</span>
          </div>
        </div>
      </div>

      {showForm && (
        <div className="sl-settings-section">
          <div className="sl-settings-section__head">
            <h3>New Payout Request</h3>
          </div>
          <div className="sl-settings-section__body">
            <form onSubmit={handleRequest} className="seller-form">
              <div className="seller-form__section">
                <div className="seller-form__grid">
                  <div className="seller-form__field">
                    <label className="sl-form-label">Period Start</label>
                    <input
                      type="date"
                      className="form-control"
                      value={periodStart}
                      onChange={(e) => setPeriodStart(e.target.value)}
                      required
                    />
                  </div>
                  <div className="seller-form__field">
                    <label className="sl-form-label">Period End</label>
                    <input
                      type="date"
                      className="form-control"
                      value={periodEnd}
                      onChange={(e) => setPeriodEnd(e.target.value)}
                      required
                    />
                  </div>
                  <div className="seller-form__field seller-form__field--full">
                    <label className="sl-form-label">Payout Method</label>
                    <select
                      className="form-select"
                      value={method}
                      onChange={(e) => setMethod(e.target.value as PayoutMethod)}
                    >
                      {METHODS.map((m) => (
                        <option key={m.value} value={m.value}>
                          {m.label}
                        </option>
                      ))}
                    </select>
                  </div>
                </div>
                {error && (
                  <div className="sl-alert sl-alert--error" style={{ marginTop: 12 }}>
                    {error}
                  </div>
                )}
                {success && (
                  <div className="sl-alert sl-alert--info" style={{ marginTop: 12 }}>
                    Payout requested successfully!
                  </div>
                )}
              </div>
              <div className="seller-form__actions">
                <button
                  type="button"
                  className="sl-btn sl-btn--outline"
                  onClick={() => setShowForm(false)}
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="sl-btn sl-btn--primary"
                  disabled={request.isPending}
                >
                  {request.isPending ? 'Requesting…' : 'Submit Request'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      <div className="sl-table-card">
        <div className="sl-table-card__header">
          <h3>Payout History</h3>
        </div>
        {items.length === 0 ? (
          <div className="sl-empty">
            <p>No payouts yet.</p>
          </div>
        ) : (
          <div className="sl-table-wrap">
            <table className="seller-table">
              <thead>
                <tr>
                  <th>Date</th>
                  <th>Amount</th>
                  <th>Method</th>
                  <th>Status</th>
                  <th>Transaction ID</th>
                </tr>
              </thead>
              <tbody>
                {items.map((p) => (
                  <PayoutRow key={p._id} p={p} />
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  )
}
