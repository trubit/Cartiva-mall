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
  FiCalendar,
  FiX,
  FiShield,
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
import ConfirmDialog from '../../../components/common/ConfirmDialog/index.js'
import { useCurrency } from '../../../hooks/useCurrency.js'
import type {
  ISellerPayoutAccount,
  ISellerWithdrawal,
  ISellerLedgerEntry,
} from '../../../../shared/types/seller.types.js'
import {
  calculateExpectedCompletionDate,
  formatDate,
  getWithdrawalTimelineStatus,
  formatFriendlyTimelineEntry,
} from '../../../../shared/helpers/index.js'

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
  const [accountToDelete, setAccountToDelete] = useState<{ id: string; name: string } | null>(null)
  const [selectedDetailsWd, setSelectedDetailsWd] = useState<ISellerWithdrawal | null>(null)

  const { formatPrice } = useCurrency()
  const currency = data?.currency || 'NGN'
  const availableBalance = data?.availableBalance ?? 0
  const canWithdraw = availableBalance > 0

  const handleDeleteAccount = (id: string, name: string) => {
    setActionError(null)
    setAccountToDelete({ id, name })
  }

  const confirmDeleteAccount = async () => {
    if (!accountToDelete) return
    try {
      await deleteAccountMutation.mutateAsync(accountToDelete.id)
      setAccountToDelete(null)
    } catch (err: any) {
      setActionError(err.response?.data?.message || 'Failed to remove account')
      setAccountToDelete(null)
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
      case 'pending_approval':
        return (
          <span
            className="sl-badge"
            style={{
              background: '#fef3c7',
              color: '#92400e',
              border: '1px solid #fde68a',
              display: 'inline-flex',
              alignItems: 'center',
              gap: 4,
            }}
          >
            <FiClock size={12} /> Pending Approval
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
      case 'rejected':
        return (
          <span
            className="sl-badge sl-badge--failed"
            style={{
              background: '#fee2e2',
              color: '#991b1b',
              border: '1px solid #fecaca',
              display: 'inline-flex',
              alignItems: 'center',
              gap: 4,
            }}
          >
            <FiAlertCircle size={12} /> Rejected
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
            {/* 4-Working-Day Policy Information Banner */}
            <div
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: 10,
                padding: '12px 16px',
                background: 'rgba(2, 132, 199, 0.08)',
                borderBottom: '1px solid rgba(2, 132, 199, 0.2)',
                color: 'var(--color-brand-text, #0369a1)',
                fontSize: '0.85rem',
              }}
            >
              <FiClock style={{ flexShrink: 0, color: '#0284c7' }} />
              <span>
                <strong>Withdrawal Processing Policy:</strong> Withdrawals take up to 7 working days
                to complete. Working days exclude weekends and applicable public holidays. You can
                track real-time status and audit updates below.
              </span>
            </div>

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
                      <th>Expected Completion</th>
                      <th>Destination Bank</th>
                      <th>Account Holder</th>
                      <th>Amount</th>
                      <th>Status</th>
                      <th>Actions</th>
                    </tr>
                  </thead>
                  <tbody>
                    {withdrawalsData.data.map((wd: ISellerWithdrawal) => {
                      const timeline = getWithdrawalTimelineStatus(
                        wd.status,
                        wd.requestedAt || wd.createdAt,
                        wd.expectedCompletionDate,
                      )

                      return (
                        <tr key={wd._id}>
                          <td>
                            <span style={{ fontWeight: 700, fontFamily: 'monospace' }}>
                              {wd.withdrawalNumber}
                            </span>
                          </td>
                          <td className="so-date">
                            {formatDate(wd.requestedAt || wd.createdAt, {
                              year: 'numeric',
                              month: 'short',
                              day: 'numeric',
                              hour: '2-digit',
                              minute: '2-digit',
                            })}
                          </td>
                          <td>
                            <div
                              style={{
                                display: 'flex',
                                alignItems: 'center',
                                gap: 5,
                                fontSize: '0.84rem',
                              }}
                            >
                              <FiCalendar size={13} style={{ color: '#0284c7' }} />
                              <span style={{ fontWeight: 600 }}>
                                {timeline.formattedExpectedDate}
                              </span>
                            </div>
                            {timeline.isOverdue && (
                              <div
                                style={{
                                  fontSize: '0.72rem',
                                  color: '#dc2626',
                                  fontWeight: 700,
                                  marginTop: 2,
                                }}
                              >
                                Overdue Target
                              </div>
                            )}
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
                          <td>
                            <button
                              type="button"
                              className="sl-btn sl-btn--secondary sl-btn--sm"
                              onClick={() => setSelectedDetailsWd(wd)}
                              style={{ padding: '4px 10px', fontSize: '0.78rem' }}
                            >
                              <FiFileText size={12} style={{ marginRight: 4 }} /> Details
                            </button>
                          </td>
                        </tr>
                      )
                    })}
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

      {/* Delete Confirmation Dialog */}
      <ConfirmDialog
        open={Boolean(accountToDelete)}
        title="Remove Bank Account"
        message={`Are you sure you want to remove ${accountToDelete?.name || 'this bank account'}? This action cannot be undone.`}
        confirmText="Remove Account"
        cancelText="Keep Account"
        variant="danger"
        isLoading={deleteAccountMutation.isPending}
        onConfirm={confirmDeleteAccount}
        onClose={() => setAccountToDelete(null)}
      />

      {/* Seller Withdrawal Details Modal */}
      {selectedDetailsWd && (
        <div
          style={{
            position: 'fixed',
            inset: 0,
            background: 'rgba(0,0,0,0.65)',
            backdropFilter: 'blur(4px)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            zIndex: 9999,
            padding: '1rem',
          }}
          onClick={() => setSelectedDetailsWd(null)}
        >
          <div
            style={{
              background: 'var(--color-white, #1c2128)',
              borderRadius: 12,
              maxWidth: 560,
              width: '100%',
              boxShadow: '0 25px 50px -12px rgba(0,0,0,0.5)',
              border: '1px solid var(--color-neutral-200, #30363d)',
              color: 'var(--color-brand-text, #e6edf3)',
              overflow: 'hidden',
              maxHeight: '90vh',
              display: 'flex',
              flexDirection: 'column',
            }}
            onClick={(e) => e.stopPropagation()}
          >
            {/* Header */}
            <div
              style={{
                padding: '1.25rem 1.5rem',
                borderBottom: '1px solid var(--color-neutral-200, #30363d)',
                display: 'flex',
                justifyContent: 'space-between',
                alignItems: 'center',
              }}
            >
              <h3
                style={{
                  margin: 0,
                  fontSize: '1.1rem',
                  fontWeight: 700,
                  color: 'var(--color-brand-text, #e6edf3)',
                }}
              >
                Withdrawal Details ({selectedDetailsWd.withdrawalNumber})
              </h3>
              <button
                onClick={() => setSelectedDetailsWd(null)}
                style={{
                  background: 'transparent',
                  border: 'none',
                  cursor: 'pointer',
                  color: 'var(--color-neutral-500, #8b949e)',
                  padding: 4,
                }}
                aria-label="Close"
              >
                <FiX size={20} />
              </button>
            </div>

            {/* Body */}
            <div style={{ padding: '1.5rem', overflowY: 'auto' }}>
              {/* Policy note */}
              <div
                style={{
                  display: 'flex',
                  alignItems: 'flex-start',
                  gap: 8,
                  padding: '10px 12px',
                  background: 'rgba(2, 132, 199, 0.08)',
                  border: '1px solid rgba(2, 132, 199, 0.25)',
                  borderRadius: 8,
                  fontSize: '0.82rem',
                  color: 'var(--color-brand-text, #38bdf8)',
                  marginBottom: '1.25rem',
                }}
              >
                <FiClock style={{ flexShrink: 0, marginTop: 2 }} />
                <span>
                  Withdrawals take up to 7 working days to complete. Working days exclude weekends
                  and applicable public holidays.
                </span>
              </div>

              {/* Status and Expected Date Grid */}
              <div
                style={{
                  display: 'grid',
                  gridTemplateColumns: '1fr 1fr',
                  gap: '1rem',
                  background: 'var(--color-neutral-50, #161b22)',
                  border: '1px solid var(--color-neutral-200, #30363d)',
                  borderRadius: 8,
                  padding: '1rem',
                  marginBottom: '1.25rem',
                }}
              >
                <div>
                  <div
                    style={{
                      fontSize: '0.75rem',
                      fontWeight: 700,
                      color: 'var(--color-neutral-500, #8b949e)',
                      marginBottom: 6,
                    }}
                  >
                    CURRENT STATUS
                  </div>
                  <div>{getStatusBadge(selectedDetailsWd.status)}</div>
                </div>
                <div>
                  <div
                    style={{
                      fontSize: '0.75rem',
                      fontWeight: 700,
                      color: 'var(--color-neutral-500, #8b949e)',
                      marginBottom: 6,
                    }}
                  >
                    EXPECTED COMPLETION
                  </div>
                  <strong
                    style={{
                      color: '#38bdf8',
                      display: 'inline-flex',
                      alignItems: 'center',
                      gap: 4,
                    }}
                  >
                    <FiCalendar size={13} />{' '}
                    {formatDate(
                      selectedDetailsWd.expectedCompletionDate ||
                        calculateExpectedCompletionDate(
                          new Date(selectedDetailsWd.requestedAt || selectedDetailsWd.createdAt),
                        ),
                    )}
                  </strong>
                </div>
              </div>

              {/* Amount and Bank details */}
              <div
                style={{
                  background: 'var(--color-neutral-50, #161b22)',
                  border: '1px solid var(--color-neutral-200, #30363d)',
                  borderRadius: 8,
                  padding: '1rem',
                  marginBottom: '1.25rem',
                  display: 'flex',
                  flexDirection: 'column',
                  gap: 8,
                  fontSize: '0.86rem',
                }}
              >
                <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                  <span style={{ color: 'var(--color-neutral-500, #8b949e)' }}>
                    Net Payout Amount:
                  </span>
                  <strong style={{ color: '#22c55e', fontSize: '1rem' }}>
                    {formatPrice(
                      selectedDetailsWd.netAmount || selectedDetailsWd.amount,
                      selectedDetailsWd.currency || currency,
                    )}
                  </strong>
                </div>
                <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                  <span style={{ color: 'var(--color-neutral-500, #8b949e)' }}>
                    Requested Date:
                  </span>
                  <span>
                    {formatDate(selectedDetailsWd.requestedAt || selectedDetailsWd.createdAt)}
                  </span>
                </div>
                <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                  <span style={{ color: 'var(--color-neutral-500, #8b949e)' }}>
                    Destination Bank:
                  </span>
                  <strong style={{ color: 'var(--color-brand-text, #e6edf3)' }}>
                    {selectedDetailsWd.payoutAccount?.bankName}
                  </strong>
                </div>
                <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                  <span style={{ color: 'var(--color-neutral-500, #8b949e)' }}>
                    Account Number:
                  </span>
                  <code style={{ fontFamily: 'monospace' }}>
                    •••• {selectedDetailsWd.payoutAccount?.accountNumber?.slice(-4)}
                  </code>
                </div>
                <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                  <span style={{ color: 'var(--color-neutral-500, #8b949e)' }}>Account Name:</span>
                  <span>{selectedDetailsWd.payoutAccount?.accountName}</span>
                </div>
              </div>

              {selectedDetailsWd.failureReason && (
                <div
                  style={{
                    background: 'rgba(239, 68, 68, 0.1)',
                    border: '1px solid rgba(239, 68, 68, 0.25)',
                    padding: '10px 12px',
                    borderRadius: 8,
                    color: '#f87171',
                    fontSize: '0.85rem',
                    marginBottom: '1rem',
                  }}
                >
                  <strong>Reason:</strong> {selectedDetailsWd.failureReason}
                </div>
              )}

              {/* Activity Timeline */}
              {selectedDetailsWd.auditLog && selectedDetailsWd.auditLog.length > 0 && (
                <div>
                  <h4
                    style={{
                      margin: '0 0 12px',
                      fontSize: '0.92rem',
                      fontWeight: 700,
                      color: 'var(--color-brand-text, #e6edf3)',
                      display: 'flex',
                      alignItems: 'center',
                      gap: 6,
                    }}
                  >
                    <FiList size={16} /> Activity Timeline
                  </h4>
                  <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
                    {selectedDetailsWd.auditLog.map((log, idx) => {
                      const item = formatFriendlyTimelineEntry(log.status, log.note)
                      return (
                        <div
                          key={idx}
                          style={{
                            background: 'var(--color-neutral-50, #161b22)',
                            border: '1px solid var(--color-neutral-200, #30363d)',
                            borderRadius: 8,
                            padding: '12px 14px',
                            display: 'flex',
                            flexDirection: 'column',
                            gap: 6,
                          }}
                        >
                          <div
                            style={{
                              display: 'flex',
                              justifyContent: 'space-between',
                              alignItems: 'center',
                              flexWrap: 'wrap',
                              gap: 6,
                            }}
                          >
                            <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                              <span
                                style={{
                                  background: item.badgeBg,
                                  color: item.badgeColor,
                                  display: 'inline-flex',
                                  alignItems: 'center',
                                  gap: 4,
                                  padding: '2px 8px',
                                  borderRadius: 6,
                                  fontWeight: 700,
                                  fontSize: '0.74rem',
                                  textTransform: 'uppercase',
                                  letterSpacing: '0.03em',
                                }}
                              >
                                {item.iconType === 'completed' && <FiCheckCircle size={11} />}
                                {item.iconType === 'review' && <FiShield size={11} />}
                                {item.iconType === 'processing' && <FiClock size={11} />}
                                {(item.iconType === 'failed' || item.iconType === 'reversed') && (
                                  <FiAlertCircle size={11} />
                                )}
                                {item.badgeText}
                              </span>
                              <strong
                                style={{
                                  color: 'var(--color-brand-text, #f1f5f9)',
                                  fontSize: '0.86rem',
                                  fontWeight: 600,
                                }}
                              >
                                {item.stageTitle}
                              </strong>
                            </div>
                            <span
                              style={{
                                color: 'var(--color-neutral-500, #8b949e)',
                                fontSize: '0.78rem',
                                display: 'inline-flex',
                                alignItems: 'center',
                                gap: 4,
                              }}
                            >
                              <FiCalendar size={11} /> {formatDate(log.timestamp)}
                            </span>
                          </div>
                          <div
                            style={{
                              color: 'var(--color-neutral-400, #94a3b8)',
                              fontSize: '0.84rem',
                              lineHeight: 1.5,
                              paddingLeft: 2,
                            }}
                          >
                            {item.friendlyNote}
                          </div>
                        </div>
                      )
                    })}
                  </div>
                </div>
              )}
            </div>

            {/* Footer */}
            <div
              style={{
                padding: '1rem 1.5rem',
                borderTop: '1px solid var(--color-neutral-200, #30363d)',
                display: 'flex',
                justifyContent: 'flex-end',
              }}
            >
              <button
                className="sl-btn sl-btn--secondary"
                onClick={() => setSelectedDetailsWd(null)}
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
