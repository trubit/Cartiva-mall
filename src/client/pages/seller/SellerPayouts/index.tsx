import { useState } from 'react'
import {
  FiDollarSign,
  FiClock,
  FiCheckCircle,
  FiTrendingUp,
  FiAlertCircle,
  FiInfo,
  FiPlus,
  FiCreditCard,
  FiTrash2,
  FiList,
  FiFileText,
  FiArrowUpRight,
} from 'react-icons/fi'
import {
  useSellerEarnings,
  useSellerWithdrawals,
  useSellerPayoutAccounts,
  useDeletePayoutAccount,
  useSellerLedger,
} from '../../../hooks/useSeller.js'
import SellerStatsCard from '../../../components/seller/SellerStatsCard/index.js'
import { RevenueBarChart } from '../../../components/seller/RevenueChart/index.js'
import WithdrawalModal from '../../../components/seller/WithdrawalModal/index.js'
import AddBankAccountModal from '../../../components/seller/AddBankAccountModal/index.js'
import { useCurrency } from '../../../hooks/useCurrency.js'
import type {
  ISellerPayoutAccount,
  ISellerWithdrawal,
  ISellerLedgerEntry,
} from '../../../../shared/types/seller.types.js'

export default function SellerPayouts() {
  const { data, isLoading, isError } = useSellerEarnings()
  const { data: withdrawalsData, isLoading: loadingWithdrawals } = useSellerWithdrawals()
  const { data: payoutAccounts, isLoading: loadingAccounts } = useSellerPayoutAccounts()
  const { data: ledgerData, isLoading: loadingLedger } = useSellerLedger()
  const deleteAccountMutation = useDeletePayoutAccount()

  const [isWithdrawModalOpen, setIsWithdrawModalOpen] = useState(false)
  const [isAddBankModalOpen, setIsAddBankModalOpen] = useState(false)
  const [activeTab, setActiveTab] = useState<'withdrawals' | 'ledger' | 'accounts'>('withdrawals')
  const [actionError, setActionError] = useState<string | null>(null)

  const { formatPrice } = useCurrency()
  const currency = data?.currency || 'NGN'
  const availableBalance = data?.availableBalance ?? 0
  const canWithdraw = availableBalance > 0

  const handleDeleteAccount = async (id: string, name: string) => {
    setActionError(null)
    if (window.confirm(`Are you sure you want to remove ${name}?`)) {
      try {
        await deleteAccountMutation.mutateAsync(id)
      } catch (err: any) {
        setActionError(err.response?.data?.message || 'Failed to remove account')
      }
    }
  }

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'completed':
        return (
          <span className="sl-badge sl-badge--completed">
            <FiCheckCircle size={12} /> Completed
          </span>
        )
      case 'processing':
        return (
          <span className="sl-badge sl-badge--processing">
            <FiClock size={12} /> Processing
          </span>
        )
      case 'pending':
        return (
          <span className="sl-badge sl-badge--pending">
            <FiClock size={12} /> Pending
          </span>
        )
      case 'failed':
      case 'reversed':
        return (
          <span className="sl-badge sl-badge--failed">
            <FiAlertCircle size={12} /> {status}
          </span>
        )
      default:
        return <span className="sl-badge">{status}</span>
    }
  }

  return (
    <div className="container section sl-page">
      <div
        className="sl-page-header"
        style={{
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'flex-start',
          flexWrap: 'wrap',
          gap: '1rem',
        }}
      >
        <div>
          <h1 className="sl-page-title">Payouts & Earnings</h1>
          <p className="sl-page-subtitle">
            Track your store revenue, bank transfers, and real-time balance
          </p>
        </div>
        <div style={{ display: 'flex', gap: '0.75rem' }}>
          <button
            type="button"
            className="sl-btn sl-btn--secondary"
            onClick={() => setIsAddBankModalOpen(true)}
          >
            <FiCreditCard /> Add Bank Account
          </button>
          <button
            type="button"
            className="sl-btn sl-btn--primary"
            onClick={() => setIsWithdrawModalOpen(true)}
            disabled={!canWithdraw}
            title={canWithdraw ? 'Request payout to bank' : 'No available balance to withdraw'}
          >
            <FiArrowUpRight /> Request Withdrawal
          </button>
        </div>
      </div>

      {actionError && (
        <div className="sl-alert sl-alert--error">
          <FiAlertCircle /> {actionError}
        </div>
      )}

      {isError && (
        <div className="sl-alert sl-alert--error">
          <FiAlertCircle /> Failed to load earnings data from server.
        </div>
      )}

      {/* Platform fee notice */}
      <div className="sl-alert sl-alert--info">
        <FiInfo size={16} />
        <span>
          Platform commission:{' '}
          <strong>{isLoading ? '—' : `${data?.platformFeePercent ?? 5}%`}</strong> is deducted from
          sales. Net settled earnings are available for withdrawal with zero payout transfer fees.
        </span>
      </div>

      {/* Stats cards */}
      <div className="sl-stats-grid">
        <SellerStatsCard
          icon={<FiDollarSign size={22} />}
          label="Total Revenue"
          value={isLoading ? '—' : formatPrice(data?.totalRevenue ?? 0, currency)}
          sub="Gross lifetime sales"
          accent="teal"
          loading={isLoading}
        />
        <SellerStatsCard
          icon={<FiCheckCircle size={22} />}
          label="Net Earnings"
          value={isLoading ? '—' : formatPrice(data?.netRevenue ?? 0, currency)}
          sub={`After ${data?.platformFeePercent ?? 5}% platform fee`}
          accent="green"
          loading={isLoading}
        />
        <SellerStatsCard
          icon={<FiTrendingUp size={22} />}
          label="This Month"
          value={isLoading ? '—' : formatPrice(data?.thisMonthRevenue ?? 0, currency)}
          sub={`Last month: ${isLoading ? '—' : formatPrice(data?.lastMonthRevenue ?? 0, currency)}`}
          accent="orange"
          loading={isLoading}
        />
        <SellerStatsCard
          icon={<FiClock size={22} />}
          label="Pending Earnings"
          value={isLoading ? '—' : formatPrice(data?.pendingBalance ?? 0, currency)}
          sub="Orders in transit / hold"
          accent="purple"
          loading={isLoading}
        />
      </div>

      {/* Available balance card */}
      <div className="sl-earnings-hero">
        <div className="sl-earnings-hero__inner">
          <p className="sl-earnings-hero__label">AVAILABLE BALANCE</p>
          <p className="sl-earnings-hero__amount">
            {isLoading ? (
              <span
                className="skeleton"
                style={{ display: 'inline-block', width: 180, height: 44, borderRadius: 8 }}
              />
            ) : (
              formatPrice(availableBalance, currency)
            )}
          </p>
          <p className="sl-earnings-hero__sub">
            {canWithdraw
              ? 'Net settled earnings ready for automated bank withdrawal'
              : 'Funds will become available once buyer delivery is confirmed'}
          </p>
          <button
            type="button"
            className="sl-btn sl-btn--primary sl-btn--lg"
            onClick={() => setIsWithdrawModalOpen(true)}
            disabled={!canWithdraw}
            style={{
              opacity: canWithdraw ? 1 : 0.65,
              cursor: canWithdraw ? 'pointer' : 'not-allowed',
            }}
          >
            Request Withdrawal
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

      {/* Payout & Financial Data Section */}
      <div className="sl-table-card">
        {/* Tab Navigation */}
        <div className="sl-tab-nav">
          <button
            type="button"
            className={`sl-tab-btn ${activeTab === 'withdrawals' ? 'sl-tab-btn--active' : ''}`}
            onClick={() => setActiveTab('withdrawals')}
          >
            <FiList style={{ marginRight: 6 }} /> Withdrawal History (
            {withdrawalsData?.data?.length ?? 0})
          </button>
          <button
            type="button"
            className={`sl-tab-btn ${activeTab === 'accounts' ? 'sl-tab-btn--active' : ''}`}
            onClick={() => setActiveTab('accounts')}
          >
            <FiCreditCard style={{ marginRight: 6 }} /> Saved Bank Accounts (
            {payoutAccounts?.length ?? 0})
          </button>
          <button
            type="button"
            className={`sl-tab-btn ${activeTab === 'ledger' ? 'sl-tab-btn--active' : ''}`}
            onClick={() => setActiveTab('ledger')}
          >
            <FiFileText style={{ marginRight: 6 }} /> Financial Ledger
          </button>
        </div>

        {/* TAB 1: WITHDRAWALS TABLE */}
        {activeTab === 'withdrawals' && (
          <div>
            {loadingWithdrawals ? (
              <div
                style={{ padding: '2rem', textAlign: 'center', color: 'var(--color-neutral-400)' }}
              >
                Loading withdrawal history...
              </div>
            ) : withdrawalsData?.data && withdrawalsData.data.length > 0 ? (
              <div style={{ overflowX: 'auto' }}>
                <table className="so-table" style={{ width: '100%', borderCollapse: 'collapse' }}>
                  <thead>
                    <tr>
                      <th>Withdrawal ID</th>
                      <th>Requested Date</th>
                      <th>Destination Bank</th>
                      <th>Account Holder</th>
                      <th>Amount</th>
                      <th>Status</th>
                    </tr>
                  </thead>
                  <tbody>
                    {withdrawalsData.data.map((wd: ISellerWithdrawal) => (
                      <tr key={wd._id}>
                        <td>
                          <span style={{ fontWeight: 700, fontFamily: 'monospace' }}>
                            {wd.withdrawalNumber}
                          </span>
                        </td>
                        <td className="so-date">
                          {new Date(wd.requestedAt || wd.createdAt).toLocaleDateString(undefined, {
                            year: 'numeric',
                            month: 'short',
                            day: 'numeric',
                            hour: '2-digit',
                            minute: '2-digit',
                          })}
                        </td>
                        <td>
                          <strong>{wd.payoutAccount?.bankName || 'Bank Account'}</strong>
                          <div style={{ fontSize: '0.75rem', color: 'var(--color-neutral-500)' }}>
                            •••• {wd.payoutAccount?.accountNumber?.slice(-4) || '****'}
                          </div>
                        </td>
                        <td>{wd.payoutAccount?.accountName || '—'}</td>
                        <td>
                          <strong style={{ color: '#007185' }}>
                            {formatPrice(wd.netAmount || wd.amount, wd.currency || currency)}
                          </strong>
                        </td>
                        <td>{getStatusBadge(wd.status)}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            ) : (
              <div className="sl-empty" style={{ padding: '3rem 0' }}>
                <FiDollarSign
                  size={40}
                  style={{ color: 'var(--color-neutral-300)', marginBottom: 12 }}
                />
                <p
                  style={{
                    color: 'var(--color-neutral-500)',
                    margin: '0 0 1rem',
                    fontSize: 'var(--text-sm)',
                  }}
                >
                  No withdrawals requested yet. Click &quot;Request Withdrawal&quot; above to
                  transfer your available balance.
                </p>
              </div>
            )}
          </div>
        )}

        {/* TAB 2: SAVED BANK ACCOUNTS */}
        {activeTab === 'accounts' && (
          <div style={{ padding: '1.5rem' }}>
            <div
              style={{
                display: 'flex',
                justifyContent: 'space-between',
                alignItems: 'center',
                marginBottom: '1.25rem',
              }}
            >
              <div>
                <h4 style={{ margin: 0, fontWeight: 800 }}>Registered Bank Payout Accounts</h4>
                <p
                  style={{
                    margin: '4px 0 0',
                    fontSize: '0.82rem',
                    color: 'var(--color-neutral-500)',
                  }}
                >
                  Payouts are securely routed directly to these accounts via Paystack.
                </p>
              </div>
              <button
                type="button"
                className="sl-btn sl-btn--primary sl-btn--sm"
                onClick={() => setIsAddBankModalOpen(true)}
              >
                <FiPlus /> Add Bank Account
              </button>
            </div>

            {loadingAccounts ? (
              <p style={{ color: 'var(--color-neutral-400)' }}>Loading accounts...</p>
            ) : payoutAccounts && payoutAccounts.length > 0 ? (
              <div
                style={{
                  display: 'grid',
                  gridTemplateColumns: 'repeat(auto-fill, minmax(320px, 1fr))',
                  gap: '1rem',
                }}
              >
                {payoutAccounts.map((acc: ISellerPayoutAccount) => (
                  <div key={acc._id} className="sl-bank-card" style={{ margin: 0 }}>
                    <div className="sl-bank-card__info">
                      <div className="sl-bank-icon">
                        <FiCreditCard />
                      </div>
                      <div>
                        <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                          <p className="sl-bank-card__name">{acc.bankName}</p>
                          {acc.isDefault && (
                            <span className="sl-badge sl-badge--default">Default</span>
                          )}
                        </div>
                        <p className="sl-bank-card__number">
                          {acc.accountName} • •••• {acc.accountNumber.slice(-4)}
                        </p>
                      </div>
                    </div>
                    <button
                      type="button"
                      onClick={() =>
                        handleDeleteAccount(
                          acc._id,
                          `${acc.bankName} (${acc.accountNumber.slice(-4)})`,
                        )
                      }
                      style={{
                        background: 'none',
                        border: 'none',
                        color: 'var(--color-neutral-400)',
                        cursor: 'pointer',
                        padding: 6,
                        borderRadius: 6,
                      }}
                      title="Remove Account"
                    >
                      <FiTrash2 size={16} />
                    </button>
                  </div>
                ))}
              </div>
            ) : (
              <div
                style={{
                  textAlign: 'center',
                  padding: '2rem 0',
                  color: 'var(--color-neutral-500)',
                }}
              >
                <p>No payout accounts saved yet.</p>
                <button
                  type="button"
                  className="sl-btn sl-btn--primary sl-btn--sm"
                  onClick={() => setIsAddBankModalOpen(true)}
                >
                  <FiPlus /> Add Bank Account
                </button>
              </div>
            )}
          </div>
        )}

        {/* TAB 3: FINANCIAL LEDGER */}
        {activeTab === 'ledger' && (
          <div>
            {loadingLedger ? (
              <div
                style={{ padding: '2rem', textAlign: 'center', color: 'var(--color-neutral-400)' }}
              >
                Loading ledger...
              </div>
            ) : ledgerData?.data && ledgerData.data.length > 0 ? (
              <div style={{ overflowX: 'auto' }}>
                <table className="so-table" style={{ width: '100%', borderCollapse: 'collapse' }}>
                  <thead>
                    <tr>
                      <th>Date</th>
                      <th>Transaction Type</th>
                      <th>Reference</th>
                      <th>Description</th>
                      <th>Amount</th>
                    </tr>
                  </thead>
                  <tbody>
                    {ledgerData.data.map((entry: ISellerLedgerEntry) => (
                      <tr key={entry._id}>
                        <td className="so-date">
                          {new Date(entry.createdAt).toLocaleDateString(undefined, {
                            month: 'short',
                            day: 'numeric',
                            year: 'numeric',
                            hour: '2-digit',
                            minute: '2-digit',
                          })}
                        </td>
                        <td>
                          <span
                            className={`sl-badge ${
                              entry.type.includes('RELEASE') ||
                              entry.type.includes('SALE') ||
                              entry.type.includes('REVERSED')
                                ? 'sl-badge--completed'
                                : 'sl-badge--processing'
                            }`}
                          >
                            {entry.type}
                          </span>
                        </td>
                        <td style={{ fontFamily: 'monospace', fontWeight: 600 }}>
                          {entry.referenceId}
                        </td>
                        <td style={{ maxWidth: 280, fontSize: '0.8rem' }}>{entry.description}</td>
                        <td>
                          <strong style={{ color: entry.amount >= 0 ? '#10b981' : '#ef4444' }}>
                            {entry.amount >= 0 ? '+' : ''}
                            {formatPrice(entry.amount, entry.currency || currency)}
                          </strong>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            ) : (
              <div className="sl-empty" style={{ padding: '3rem 0' }}>
                <FiFileText
                  size={40}
                  style={{ color: 'var(--color-neutral-300)', marginBottom: 12 }}
                />
                <p
                  style={{
                    color: 'var(--color-neutral-500)',
                    margin: 0,
                    fontSize: 'var(--text-sm)',
                  }}
                >
                  Ledger audit entries will record all order sales, commission release, and
                  withdrawals here.
                </p>
              </div>
            )}
          </div>
        )}
      </div>

      {/* Withdrawal Modal */}
      <WithdrawalModal
        isOpen={isWithdrawModalOpen}
        onClose={() => setIsWithdrawModalOpen(false)}
        availableBalance={availableBalance}
        currency={currency}
        onOpenAddBankModal={() => {
          setIsWithdrawModalOpen(false)
          setIsAddBankModalOpen(true)
        }}
      />

      {/* Add Bank Account Modal */}
      <AddBankAccountModal
        isOpen={isAddBankModalOpen}
        onClose={() => setIsAddBankModalOpen(false)}
      />
    </div>
  )
}
