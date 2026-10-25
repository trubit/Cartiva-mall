import { useState } from 'react'
import {
  FiSearch,
  FiDollarSign,
  FiCheckCircle,
  FiClock,
  FiAlertCircle,
  FiRefreshCw,
  FiCopy,
  FiCheck,
  FiX,
  FiFileText,
  FiMail,
  FiBell,
  FiPlus,
  FiTrash2,
  FiSave,
  FiCalendar,
} from 'react-icons/fi'
import {
  useAdminWithdrawals,
  useFulfillManualWithdrawal,
  useRejectWithdrawal,
  useReconcileStuckWithdrawals,
  usePayoutSettings,
  useUpdatePayoutSettings,
} from '../../../hooks/useAdmin.js'
import {
  formatCurrency,
  formatDate,
  getWithdrawalTimelineStatus,
  formatFriendlyTimelineEntry,
} from '../../../../shared/helpers/index.js'
import type { ISellerWithdrawal } from '../../../../shared/types/seller.types.js'

export default function AdminWithdrawals() {
  const [statusFilter, setStatusFilter] = useState('')
  const [searchInput, setSearchInput] = useState('')
  const [search, setSearch] = useState('')
  const [page, setPage] = useState(1)

  // Modals state
  const [selectedWd, setSelectedWd] = useState<ISellerWithdrawal | null>(null)
  const [actionType, setActionType] = useState<'fulfill' | 'reject' | 'details' | null>(null)

  // Form states
  const [manualRef, setManualRef] = useState('')
  const [note, setNote] = useState('')
  const [rejectReason, setRejectReason] = useState('')
  const [actionError, setActionError] = useState<string | null>(null)
  const [actionSuccess, setActionSuccess] = useState<string | null>(null)
  const [copiedId, setCopiedId] = useState<string | null>(null)

  const params: Record<string, string> = { page: String(page), limit: '20' }
  if (statusFilter) params.status = statusFilter

  const { data, isLoading, refetch } = useAdminWithdrawals(params)
  const fulfillMutation = useFulfillManualWithdrawal()
  const rejectMutation = useRejectWithdrawal()
  const reconcileMutation = useReconcileStuckWithdrawals()

  // Payout Notification Settings state & hooks
  const { data: payoutSettingsData, refetch: refetchPayoutSettings } = usePayoutSettings()
  const updatePayoutSettingsMutation = useUpdatePayoutSettings()
  const payoutSettings = payoutSettingsData?.data
  const payoutEmails: string[] = payoutSettings?.notificationEmails ?? []

  const [isSettingsModalOpen, setIsSettingsModalOpen] = useState(false)
  const [editEmails, setEditEmails] = useState<string[]>([])
  const [editNotifyOnWithdrawal, setEditNotifyOnWithdrawal] = useState<boolean>(true)
  const [newEmailText, setNewEmailText] = useState('')
  const [settingsError, setSettingsError] = useState<string | null>(null)
  const [settingsSuccess, setSettingsSuccess] = useState<string | null>(null)

  const withdrawals: ISellerWithdrawal[] = data?.data ?? []
  const pagination = data?.pagination

  const filteredWithdrawals = search
    ? withdrawals.filter(
        (w) =>
          w.withdrawalNumber.toLowerCase().includes(search.toLowerCase()) ||
          w.payoutAccount?.accountName?.toLowerCase().includes(search.toLowerCase()) ||
          (typeof w.sellerId === 'object' &&
            (w.sellerId?.storeName?.toLowerCase().includes(search.toLowerCase()) ||
              w.sellerId?.email?.toLowerCase().includes(search.toLowerCase()))),
      )
    : withdrawals

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault()
    setSearch(searchInput)
    setPage(1)
  }

  const handleCopy = (text: string, id: string) => {
    navigator.clipboard.writeText(text)
    setCopiedId(id)
    setTimeout(() => setCopiedId(null), 2000)
  }

  const openFulfillModal = (wd: ISellerWithdrawal) => {
    setSelectedWd(wd)
    setActionType('fulfill')
    setManualRef('')
    setNote('')
    setActionError(null)
    setActionSuccess(null)
  }

  const openRejectModal = (wd: ISellerWithdrawal) => {
    setSelectedWd(wd)
    setActionType('reject')
    setRejectReason('')
    setActionError(null)
    setActionSuccess(null)
  }

  const openDetailsModal = (wd: ISellerWithdrawal) => {
    setSelectedWd(wd)
    setActionType('details')
    setActionError(null)
    setActionSuccess(null)
  }

  const closeModal = () => {
    setSelectedWd(null)
    setActionType(null)
    setActionError(null)
  }

  const openSettingsModal = () => {
    setEditEmails(payoutSettings?.notificationEmails ? [...payoutSettings.notificationEmails] : [])
    setEditNotifyOnWithdrawal(payoutSettings?.notifyOnWithdrawalRequest !== false)
    setNewEmailText('')
    setSettingsError(null)
    setSettingsSuccess(null)
    setIsSettingsModalOpen(true)
  }

  const closeSettingsModal = () => {
    setIsSettingsModalOpen(false)
    setSettingsError(null)
    setSettingsSuccess(null)
  }

  const isValidEmail = (email: string) => /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email.trim())

  const handleAddEmailInModal = (e?: React.FormEvent) => {
    if (e) e.preventDefault()
    setSettingsError(null)
    const raw = newEmailText.trim()
    if (!raw) return

    const candidates = raw
      .split(/[,;\s]+/)
      .map((item) => item.trim().toLowerCase())
      .filter(Boolean)

    const invalid = candidates.find((email) => !isValidEmail(email))
    if (invalid) {
      setSettingsError(`"${invalid}" is not a valid email address.`)
      return
    }

    const newUnique = candidates.filter((email) => !editEmails.includes(email))
    if (newUnique.length === 0) {
      setSettingsError('All entered email addresses are already in the list.')
      return
    }

    setEditEmails((prev) => [...prev, ...newUnique])
    setNewEmailText('')
  }

  const handleRemoveEmailInModal = (indexToRemove: number) => {
    setEditEmails((prev) => prev.filter((_, idx) => idx !== indexToRemove))
    setSettingsError(null)
  }

  const handleSaveSettingsInModal = async (e: React.FormEvent) => {
    e.preventDefault()
    setSettingsError(null)
    setSettingsSuccess(null)

    const finalEmails = [...editEmails]
    if (newEmailText.trim()) {
      const candidates = newEmailText
        .split(/[,;\s]+/)
        .map((item) => item.trim().toLowerCase())
        .filter(Boolean)

      const invalid = candidates.find((email) => !isValidEmail(email))
      if (invalid) {
        setSettingsError(`"${invalid}" is not a valid email address.`)
        return
      }

      for (const cand of candidates) {
        if (!finalEmails.includes(cand)) {
          finalEmails.push(cand)
        }
      }
      setEditEmails(finalEmails)
      setNewEmailText('')
    }

    if (editNotifyOnWithdrawal && finalEmails.length === 0) {
      setSettingsError('Please provide at least one valid notification email address.')
      return
    }

    try {
      await updatePayoutSettingsMutation.mutateAsync({
        notificationEmails: finalEmails,
        notifyOnWithdrawalRequest: editNotifyOnWithdrawal,
      })
      setSettingsSuccess('Notification settings updated successfully!')
      refetchPayoutSettings()
      setTimeout(() => {
        closeSettingsModal()
      }, 1200)
    } catch (err: any) {
      setSettingsError(err.response?.data?.message || 'Failed to update notification settings')
    }
  }

  const handleFulfillSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!selectedWd) return
    if (!manualRef.trim()) {
      setActionError('Bank Transaction Reference or Session ID is required')
      return
    }

    try {
      setActionError(null)
      await fulfillMutation.mutateAsync({
        id: selectedWd._id,
        data: { manualReference: manualRef.trim(), note: note.trim() || undefined },
      })
      setActionSuccess(`Withdrawal ${selectedWd.withdrawalNumber} fulfilled successfully!`)
      closeModal()
      refetch()
    } catch (err: any) {
      setActionError(err.response?.data?.message || 'Failed to fulfill withdrawal')
    }
  }

  const handleRejectSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!selectedWd) return
    if (!rejectReason.trim()) {
      setActionError('Please provide a reason for rejecting this withdrawal')
      return
    }

    try {
      setActionError(null)
      await rejectMutation.mutateAsync({
        id: selectedWd._id,
        reason: rejectReason.trim(),
      })
      setActionSuccess(
        `Withdrawal ${selectedWd.withdrawalNumber} rejected. Balance restored to seller.`,
      )
      closeModal()
      refetch()
    } catch (err: any) {
      setActionError(err.response?.data?.message || 'Failed to reject withdrawal')
    }
  }

  const handleReconcile = async () => {
    try {
      setActionError(null)
      setActionSuccess(null)
      const res = await reconcileMutation.mutateAsync()
      setActionSuccess(
        `Reconciliation complete: ${res.data?.reconciledCount ?? 0} stuck request(s) transitioned to Pending Approval.`,
      )
      refetch()
    } catch (err: any) {
      setActionError(err.response?.data?.message || 'Reconciliation failed')
    }
  }

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'completed':
        return (
          <span
            className="admin-badge"
            style={{
              background: '#dcfce7',
              color: '#166534',
              display: 'inline-flex',
              alignItems: 'center',
              gap: 4,
              padding: '3px 8px',
              borderRadius: 6,
              fontWeight: 600,
              fontSize: '0.78rem',
            }}
          >
            <FiCheckCircle size={12} /> Completed
          </span>
        )
      case 'pending_approval':
        return (
          <span
            className="admin-badge"
            style={{
              background: '#fef3c7',
              color: '#92400e',
              border: '1px solid #fde68a',
              display: 'inline-flex',
              alignItems: 'center',
              gap: 4,
              padding: '3px 8px',
              borderRadius: 6,
              fontWeight: 600,
              fontSize: '0.78rem',
            }}
          >
            <FiClock size={12} /> Pending Approval
          </span>
        )
      case 'processing':
        return (
          <span
            className="admin-badge"
            style={{
              background: '#e0f2fe',
              color: '#075985',
              display: 'inline-flex',
              alignItems: 'center',
              gap: 4,
              padding: '3px 8px',
              borderRadius: 6,
              fontWeight: 600,
              fontSize: '0.78rem',
            }}
          >
            <FiClock size={12} /> Processing
          </span>
        )
      case 'pending':
        return (
          <span
            className="admin-badge"
            style={{
              background: '#f3f4f6',
              color: '#374151',
              display: 'inline-flex',
              alignItems: 'center',
              gap: 4,
              padding: '3px 8px',
              borderRadius: 6,
              fontWeight: 600,
              fontSize: '0.78rem',
            }}
          >
            <FiClock size={12} /> Pending
          </span>
        )
      case 'rejected':
        return (
          <span
            className="admin-badge"
            style={{
              background: '#fee2e2',
              color: '#991b1b',
              display: 'inline-flex',
              alignItems: 'center',
              gap: 4,
              padding: '3px 8px',
              borderRadius: 6,
              fontWeight: 600,
              fontSize: '0.78rem',
            }}
          >
            <FiAlertCircle size={12} /> Rejected
          </span>
        )
      case 'failed':
      case 'reversed':
        return (
          <span
            className="admin-badge"
            style={{
              background: '#fee2e2',
              color: '#991b1b',
              display: 'inline-flex',
              alignItems: 'center',
              gap: 4,
              padding: '3px 8px',
              borderRadius: 6,
              fontWeight: 600,
              fontSize: '0.78rem',
            }}
          >
            <FiAlertCircle size={12} /> {status}
          </span>
        )
      default:
        return <span className="admin-badge">{status}</span>
    }
  }

  return (
    <>
      <div
        className="admin-page-header"
        style={{
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          flexWrap: 'wrap',
          gap: 12,
        }}
      >
        <div>
          <h1 className="admin-page-title">Seller Payouts &amp; Withdrawals</h1>
          <p className="admin-page-subtitle">
            Review requests, fulfill manual bank payouts, and reconcile stuck gateway transfers
          </p>
        </div>

        <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
          <button
            className="admin-btn"
            style={{
              display: 'inline-flex',
              alignItems: 'center',
              gap: 6,
              background: '#fff',
              color: '#0369a1',
              border: '1px solid #bae6fd',
              borderRadius: 8,
              padding: '9px 14px',
              fontWeight: 600,
              fontSize: '0.85rem',
              cursor: 'pointer',
            }}
            onClick={openSettingsModal}
          >
            <FiMail size={15} style={{ color: '#0284c7' }} />
            <span>
              {payoutEmails.length > 0
                ? `Alert Emails: ${payoutEmails[0]}${payoutEmails.length > 1 ? ` (+${payoutEmails.length - 1})` : ''}`
                : 'Configure Alert Email'}
            </span>
          </button>

          <button
            className="admin-btn"
            style={{
              display: 'inline-flex',
              alignItems: 'center',
              gap: 6,
              background: '#0284c7',
              color: '#fff',
              border: 'none',
              borderRadius: 8,
              padding: '9px 16px',
              fontWeight: 600,
              fontSize: '0.85rem',
              cursor: 'pointer',
            }}
            onClick={handleReconcile}
            disabled={reconcileMutation.isPending}
          >
            <FiRefreshCw
              size={14}
              style={{
                animation: reconcileMutation.isPending ? 'spin 1s linear infinite' : 'none',
              }}
            />
            {reconcileMutation.isPending ? 'Reconciling…' : 'Reconcile Stuck Requests'}
          </button>
        </div>
      </div>

      {/* Option 1 Payout Architecture & Notification Info Banner */}
      <div
        style={{
          background: 'var(--color-primary-50, rgba(2, 132, 199, 0.08))',
          border: '1px solid var(--color-neutral-200, rgba(2, 132, 199, 0.25))',
          borderRadius: 8,
          padding: '12px 16px',
          marginBottom: '1rem',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          flexWrap: 'wrap',
          gap: 12,
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
          <div
            style={{
              width: 32,
              height: 32,
              borderRadius: 6,
              background: '#0284c7',
              color: '#fff',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              flexShrink: 0,
            }}
          >
            <FiMail size={18} />
          </div>
          <div>
            <div
              style={{
                fontWeight: 700,
                fontSize: '0.88rem',
                color: 'var(--color-brand-text, #e6edf3)',
              }}
            >
              Seller Withdrawal Email Alerts (Option 1: Manual Bank Payouts)
            </div>
            <div style={{ fontSize: '0.82rem', color: 'var(--color-neutral-500, #94a3b8)' }}>
              {payoutSettings?.notifyOnWithdrawalRequest !== false && payoutEmails.length > 0 ? (
                <>
                  Instant email notifications are sent to{' '}
                  <strong style={{ color: 'var(--color-brand-text, #e6edf3)' }}>
                    {payoutEmails.join(', ')}
                  </strong>{' '}
                  whenever a seller requests a withdrawal. Make the bank transfer, then click
                  &ldquo;Fulfill Payout&rdquo; to record the reference.
                </>
              ) : (
                <span style={{ color: '#ef4444', fontWeight: 600 }}>
                  ⚠️ No notification email configured. Click below to enter the email of the person
                  in charge of sending payouts.
                </span>
              )}
            </div>
          </div>
        </div>

        <button
          onClick={openSettingsModal}
          className="admin-btn admin-btn--primary"
          style={{
            padding: '7px 14px',
            borderRadius: 6,
            fontSize: '0.82rem',
            cursor: 'pointer',
            display: 'inline-flex',
            alignItems: 'center',
            gap: 6,
          }}
        >
          <FiBell size={13} />
          {payoutEmails.length > 0 ? 'Edit Notification Email(s)' : 'Set Notification Email'}
        </button>
      </div>

      {actionSuccess && (
        <div
          style={{
            background: '#ecfdf5',
            color: '#065f46',
            border: '1px solid #a7f3d0',
            padding: '12px 16px',
            borderRadius: 8,
            marginBottom: '1rem',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            <FiCheckCircle size={18} /> {actionSuccess}
          </div>
          <button
            onClick={() => setActionSuccess(null)}
            style={{
              background: 'transparent',
              border: 'none',
              cursor: 'pointer',
              color: '#065f46',
            }}
          >
            <FiX size={16} />
          </button>
        </div>
      )}

      {actionError && (
        <div
          style={{
            background: '#fef2f2',
            color: '#991b1b',
            border: '1px solid #fecaca',
            padding: '12px 16px',
            borderRadius: 8,
            marginBottom: '1rem',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            <FiAlertCircle size={18} /> {actionError}
          </div>
          <button
            onClick={() => setActionError(null)}
            style={{
              background: 'transparent',
              border: 'none',
              cursor: 'pointer',
              color: '#991b1b',
            }}
          >
            <FiX size={16} />
          </button>
        </div>
      )}

      {/* Filter strip */}
      <div style={{ display: 'flex', gap: '.5rem', marginBottom: '1rem', flexWrap: 'wrap' }}>
        {[
          ['', 'All'],
          ['pending_approval', 'Pending Approval'],
          ['processing', 'Processing'],
          ['completed', 'Completed'],
          ['failed', 'Failed'],
        ].map(([val, label]) => (
          <button
            key={val}
            className={`admin-btn ${statusFilter === val ? 'admin-btn--primary' : 'admin-btn--deactivate'}`}
            onClick={() => {
              setStatusFilter(val)
              setPage(1)
            }}
          >
            {label}
          </button>
        ))}
      </div>

      <div className="admin-table-card">
        <div className="admin-table-toolbar">
          <h3>Withdrawals {pagination && `(${pagination.total})`}</h3>

          <form onSubmit={handleSearch} className="admin-search">
            <FiSearch size={13} color="#9ca3af" />
            <input
              placeholder="Search withdrawal ID, store, bank name…"
              value={searchInput}
              onChange={(e) => setSearchInput(e.target.value)}
            />
          </form>
        </div>

        {isLoading ? (
          <div className="admin-loading" style={{ padding: '3rem', textAlign: 'center' }}>
            Loading withdrawal requests…
          </div>
        ) : (
          <div className="admin-table-wrap">
            <table className="admin-table">
              <thead>
                <tr>
                  <th>Withdrawal ID</th>
                  <th>Seller</th>
                  <th>Beneficiary Account</th>
                  <th>Amount</th>
                  <th>Method</th>
                  <th>Status</th>
                  <th>Requested Date</th>
                  <th>Expected Completion</th>
                  <th>Actions</th>
                </tr>
              </thead>
              <tbody>
                {filteredWithdrawals.length === 0 ? (
                  <tr>
                    <td
                      colSpan={9}
                      className="admin-table__empty"
                      style={{ textAlign: 'center', padding: '3rem' }}
                    >
                      <FiDollarSign size={36} color="#d1d5db" style={{ marginBottom: 8 }} />
                      <div>No withdrawals found for this filter.</div>
                    </td>
                  </tr>
                ) : (
                  filteredWithdrawals.map((wd) => {
                    const sellerObj = typeof wd.sellerId === 'object' ? wd.sellerId : null
                    const isPending =
                      wd.status === 'pending' ||
                      wd.status === 'pending_approval' ||
                      wd.status === 'processing'

                    return (
                      <tr key={wd._id}>
                        <td>
                          <strong style={{ color: 'var(--color-brand-text, #e6edf3)' }}>
                            {wd.withdrawalNumber}
                          </strong>
                          {wd.manualPayoutReference && (
                            <div style={{ fontSize: '0.72rem', color: '#16a34a' }}>
                              Ref: {wd.manualPayoutReference}
                            </div>
                          )}
                        </td>
                        <td>
                          <div
                            style={{ fontWeight: 600, color: 'var(--color-brand-text, #e6edf3)' }}
                          >
                            {sellerObj?.storeName ||
                              (sellerObj
                                ? `${sellerObj.firstName || ''} ${sellerObj.lastName || ''}`.trim()
                                : 'Seller')}
                          </div>
                          <div
                            style={{
                              fontSize: '0.75rem',
                              color: 'var(--color-neutral-500, #8b949e)',
                            }}
                          >
                            {sellerObj?.email || '—'}
                          </div>
                        </td>
                        <td>
                          <div
                            style={{ fontWeight: 600, color: 'var(--color-brand-text, #e6edf3)' }}
                          >
                            {wd.payoutAccount?.bankName}
                          </div>
                          <div
                            style={{
                              display: 'inline-flex',
                              alignItems: 'center',
                              gap: 6,
                              fontSize: '0.8rem',
                              fontFamily: 'monospace',
                              background: 'var(--color-neutral-100, #21262d)',
                              border: '1px solid var(--color-neutral-200, #30363d)',
                              color: 'var(--color-brand-text, #e6edf3)',
                              padding: '2px 8px',
                              borderRadius: 4,
                              marginTop: 3,
                            }}
                          >
                            <span style={{ color: 'inherit', fontWeight: 600 }}>
                              {wd.payoutAccount?.accountNumber}
                            </span>
                            <button
                              onClick={() =>
                                handleCopy(wd.payoutAccount?.accountNumber || '', wd._id)
                              }
                              title="Copy account number"
                              style={{
                                background: 'transparent',
                                border: 'none',
                                cursor: 'pointer',
                                padding: 0,
                                display: 'flex',
                                alignItems: 'center',
                                color:
                                  copiedId === wd._id
                                    ? '#16a34a'
                                    : 'var(--color-neutral-400, #8b949e)',
                              }}
                            >
                              {copiedId === wd._id ? <FiCheck size={12} /> : <FiCopy size={12} />}
                            </button>
                          </div>
                          <div
                            style={{
                              fontSize: '0.72rem',
                              color: 'var(--color-neutral-500, #8b949e)',
                              marginTop: 2,
                            }}
                          >
                            {wd.payoutAccount?.accountName}
                          </div>
                        </td>
                        <td>
                          <strong
                            style={{ color: 'var(--color-link, #38bdf8)', fontSize: '0.95rem' }}
                          >
                            {formatCurrency(wd.netAmount || wd.amount, wd.currency || 'NGN')}
                          </strong>
                          {wd.fee > 0 && (
                            <div
                              style={{
                                fontSize: '0.72rem',
                                color: 'var(--color-neutral-500, #8b949e)',
                              }}
                            >
                              Fee: {formatCurrency(wd.fee, wd.currency || 'NGN')}
                            </div>
                          )}
                        </td>
                        <td>
                          <span
                            style={{
                              fontSize: '0.75rem',
                              textTransform: 'uppercase',
                              padding: '2px 6px',
                              borderRadius: 4,
                              background: wd.payoutMethod === 'manual' ? '#f0fdf4' : '#eff6ff',
                              color: wd.payoutMethod === 'manual' ? '#166534' : '#1e40af',
                              border:
                                wd.payoutMethod === 'manual'
                                  ? '1px solid #bbf7d0'
                                  : '1px solid #bfdbfe',
                              fontWeight: 600,
                            }}
                          >
                            {wd.payoutMethod}
                          </span>
                        </td>
                        <td>{getStatusBadge(wd.status)}</td>
                        <td
                          style={{ fontSize: '0.8rem', color: 'var(--color-neutral-500, #8b949e)' }}
                        >
                          {formatDate(wd.requestedAt || wd.createdAt)}
                        </td>
                        <td>
                          {(() => {
                            const timeline = getWithdrawalTimelineStatus(
                              wd.status,
                              wd.requestedAt || wd.createdAt,
                              wd.expectedCompletionDate,
                            )
                            return (
                              <div>
                                <div
                                  style={{
                                    display: 'flex',
                                    alignItems: 'center',
                                    gap: 5,
                                    fontSize: '0.8rem',
                                  }}
                                >
                                  <FiCalendar size={12} style={{ color: '#38bdf8' }} />
                                  <span style={{ fontWeight: 600 }}>
                                    {timeline.formattedExpectedDate}
                                  </span>
                                </div>
                                {timeline.isOverdue && (
                                  <span
                                    style={{
                                      display: 'inline-block',
                                      fontSize: '0.68rem',
                                      color: '#ef4444',
                                      fontWeight: 700,
                                      background: 'rgba(239, 68, 68, 0.1)',
                                      border: '1px solid rgba(239, 68, 68, 0.25)',
                                      padding: '1px 5px',
                                      borderRadius: 4,
                                      marginTop: 2,
                                    }}
                                  >
                                    OVERDUE
                                  </span>
                                )}
                              </div>
                            )
                          })()}
                        </td>
                        <td>
                          <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
                            {isPending && (
                              <>
                                <button
                                  className="admin-btn admin-btn--primary"
                                  style={{
                                    fontSize: '0.75rem',
                                    padding: '4px 8px',
                                    background: '#16a34a',
                                    border: 'none',
                                  }}
                                  onClick={() => openFulfillModal(wd)}
                                >
                                  Fulfill Payout
                                </button>
                                <button
                                  className="admin-btn admin-btn--deactivate"
                                  style={{
                                    fontSize: '0.75rem',
                                    padding: '4px 8px',
                                    color: '#dc2626',
                                    borderColor: '#fca5a5',
                                  }}
                                  onClick={() => openRejectModal(wd)}
                                >
                                  Reject
                                </button>
                              </>
                            )}
                            <button
                              className="admin-btn admin-btn--secondary"
                              style={{ fontSize: '0.75rem', padding: '4px 8px' }}
                              onClick={() => openDetailsModal(wd)}
                            >
                              <FiFileText size={12} /> Details
                            </button>
                          </div>
                        </td>
                      </tr>
                    )
                  })
                )}
              </tbody>
            </table>
          </div>
        )}

        {pagination && (pagination.totalPages ?? (pagination as any).pages ?? 1) > 1 && (
          <div
            style={{
              display: 'flex',
              justifyContent: 'flex-end',
              gap: 8,
              padding: '1rem',
              borderTop: '1px solid var(--color-neutral-200, #30363d)',
            }}
          >
            <button
              className="admin-btn"
              disabled={page <= 1}
              onClick={() => setPage((p) => Math.max(1, p - 1))}
            >
              Previous
            </button>
            <span
              style={{
                alignSelf: 'center',
                fontSize: '0.85rem',
                color: 'var(--color-neutral-500, #8b949e)',
              }}
            >
              Page {page} of {pagination.totalPages ?? (pagination as any).pages}
            </span>
            <button
              className="admin-btn"
              disabled={page >= (pagination.totalPages ?? (pagination as any).pages)}
              onClick={() => setPage((p) => p + 1)}
            >
              Next
            </button>
          </div>
        )}
      </div>

      {/* ── Modal: Fulfill Manual Payout ── */}
      {actionType === 'fulfill' && selectedWd && (
        <div
          style={{
            position: 'fixed',
            inset: 0,
            background: 'rgba(0,0,0,0.5)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            zIndex: 9999,
            padding: '1rem',
          }}
        >
          <div
            className="admin-table-card"
            style={{
              background: 'var(--color-white, #1c2128)',
              border: '1px solid var(--color-neutral-200, #30363d)',
              borderRadius: 12,
              maxWidth: 520,
              width: '100%',
              boxShadow: '0 25px 50px -12px rgba(0,0,0,0.5)',
              overflow: 'hidden',
              color: 'var(--color-brand-text, #e6edf3)',
            }}
          >
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
                  fontSize: '1.15rem',
                  fontWeight: 700,
                  color: 'var(--color-brand-text, #e6edf3)',
                }}
              >
                Fulfill Manual Bank Payout
              </h3>
              <button
                onClick={closeModal}
                style={{
                  background: 'transparent',
                  border: 'none',
                  cursor: 'pointer',
                  color: 'var(--color-neutral-500, #8b949e)',
                  display: 'flex',
                  alignItems: 'center',
                }}
              >
                <FiX size={20} />
              </button>
            </div>

            <form onSubmit={handleFulfillSubmit} style={{ padding: '1.5rem' }}>
              <div
                style={{
                  background: 'var(--color-neutral-50, #161b22)',
                  border: '1px solid var(--color-neutral-200, #30363d)',
                  borderRadius: 8,
                  padding: '1rem',
                  marginBottom: '1.25rem',
                }}
              >
                <div
                  style={{
                    fontSize: '0.78rem',
                    fontWeight: 700,
                    letterSpacing: '0.05em',
                    color: 'var(--color-neutral-500, #8b949e)',
                    marginBottom: 4,
                  }}
                >
                  TRANSFER INSTRUCTIONS
                </div>
                <div
                  style={{
                    fontSize: '0.85rem',
                    color: 'var(--color-brand-text, #e6edf3)',
                    lineHeight: 1.5,
                  }}
                >
                  Perform a direct bank transfer from your business bank app to the seller's account
                  details below, then enter the transaction reference / session ID to settle the
                  request.
                </div>

                <div
                  style={{
                    marginTop: 12,
                    paddingTop: 12,
                    borderTop: '1px dashed var(--color-neutral-200, #30363d)',
                    display: 'grid',
                    gridTemplateColumns: '1fr 1fr',
                    gap: 8,
                    fontSize: '0.85rem',
                  }}
                >
                  <div>
                    <span style={{ color: 'var(--color-neutral-500, #8b949e)' }}>Bank:</span>{' '}
                    <strong style={{ color: 'var(--color-brand-text, #e6edf3)' }}>
                      {selectedWd.payoutAccount?.bankName}
                    </strong>
                  </div>
                  <div>
                    <span style={{ color: 'var(--color-neutral-500, #8b949e)' }}>Account No:</span>{' '}
                    <strong
                      style={{ fontFamily: 'monospace', color: 'var(--color-brand-text, #e6edf3)' }}
                    >
                      {selectedWd.payoutAccount?.accountNumber}
                    </strong>
                  </div>
                  <div style={{ gridColumn: 'span 2' }}>
                    <span style={{ color: 'var(--color-neutral-500, #8b949e)' }}>
                      Account Name:
                    </span>{' '}
                    <strong style={{ color: 'var(--color-brand-text, #e6edf3)' }}>
                      {selectedWd.payoutAccount?.accountName}
                    </strong>
                  </div>
                  <div style={{ gridColumn: 'span 2' }}>
                    <span style={{ color: 'var(--color-neutral-500, #8b949e)' }}>
                      Exact Amount:
                    </span>{' '}
                    <strong style={{ color: '#22c55e', fontSize: '1.05rem', fontWeight: 800 }}>
                      {formatCurrency(
                        selectedWd.netAmount || selectedWd.amount,
                        selectedWd.currency || 'NGN',
                      )}
                    </strong>
                  </div>
                </div>
              </div>

              {actionError && (
                <div
                  style={{
                    background: '#fef2f2',
                    color: '#991b1b',
                    padding: '8px 12px',
                    borderRadius: 6,
                    fontSize: '0.85rem',
                    marginBottom: '1rem',
                  }}
                >
                  {actionError}
                </div>
              )}

              <div style={{ marginBottom: '1rem' }}>
                <label
                  style={{
                    display: 'block',
                    fontSize: '0.85rem',
                    fontWeight: 600,
                    marginBottom: 4,
                    color: 'var(--color-brand-text, #e6edf3)',
                  }}
                >
                  Bank Transaction Reference / Session ID{' '}
                  <span style={{ color: '#dc2626' }}>*</span>
                </label>
                <input
                  type="text"
                  required
                  placeholder="e.g. 100004241022143029871629810 or FT2429583719"
                  value={manualRef}
                  onChange={(e) => setManualRef(e.target.value)}
                  style={{
                    width: '100%',
                    padding: '9px 12px',
                    borderRadius: 6,
                    border: '1px solid var(--color-neutral-200, #30363d)',
                    background: 'var(--color-neutral-50, #0d1117)',
                    color: 'var(--color-brand-text, #e6edf3)',
                    fontSize: '0.9rem',
                    outline: 'none',
                  }}
                />
              </div>

              <div style={{ marginBottom: '1.25rem' }}>
                <label
                  style={{
                    display: 'block',
                    fontSize: '0.85rem',
                    fontWeight: 600,
                    marginBottom: 4,
                    color: 'var(--color-brand-text, #e6edf3)',
                  }}
                >
                  Internal Note (Optional)
                </label>
                <input
                  type="text"
                  placeholder="e.g. Sent via FirstBank Corporate App"
                  value={note}
                  onChange={(e) => setNote(e.target.value)}
                  style={{
                    width: '100%',
                    padding: '9px 12px',
                    borderRadius: 6,
                    border: '1px solid var(--color-neutral-200, #30363d)',
                    background: 'var(--color-neutral-50, #0d1117)',
                    color: 'var(--color-brand-text, #e6edf3)',
                    fontSize: '0.9rem',
                    outline: 'none',
                  }}
                />
              </div>

              <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 10 }}>
                <button
                  type="button"
                  className="admin-btn"
                  onClick={closeModal}
                  disabled={fulfillMutation.isPending}
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="admin-btn admin-btn--primary"
                  style={{ background: '#16a34a' }}
                  disabled={fulfillMutation.isPending}
                >
                  {fulfillMutation.isPending ? 'Fulfilling…' : 'Confirm & Settle Payout'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ── Modal: Reject Withdrawal ── */}
      {actionType === 'reject' && selectedWd && (
        <div
          style={{
            position: 'fixed',
            inset: 0,
            background: 'rgba(0,0,0,0.5)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            zIndex: 9999,
            padding: '1rem',
          }}
        >
          <div
            className="admin-table-card"
            style={{
              background: 'var(--color-white, #1c2128)',
              border: '1px solid var(--color-neutral-200, #30363d)',
              borderRadius: 12,
              maxWidth: 480,
              width: '100%',
              boxShadow: '0 25px 50px -12px rgba(0,0,0,0.5)',
              overflow: 'hidden',
              color: 'var(--color-brand-text, #e6edf3)',
            }}
          >
            <div
              style={{
                padding: '1.25rem 1.5rem',
                borderBottom: '1px solid var(--color-neutral-200, #30363d)',
                display: 'flex',
                justifyContent: 'space-between',
                alignItems: 'center',
              }}
            >
              <h3 style={{ margin: 0, fontSize: '1.15rem', fontWeight: 700, color: '#dc2626' }}>
                Reject Withdrawal
              </h3>
              <button
                onClick={closeModal}
                style={{
                  background: 'transparent',
                  border: 'none',
                  cursor: 'pointer',
                  color: 'var(--color-neutral-500, #8b949e)',
                  display: 'flex',
                  alignItems: 'center',
                }}
              >
                <FiX size={20} />
              </button>
            </div>

            <form onSubmit={handleRejectSubmit} style={{ padding: '1.5rem' }}>
              <p
                style={{
                  fontSize: '0.88rem',
                  color: 'var(--color-brand-text, #e6edf3)',
                  margin: '0 0 1rem',
                  lineHeight: 1.5,
                }}
              >
                Are you sure you want to reject withdrawal{' '}
                <strong style={{ color: 'var(--color-brand-text, #e6edf3)' }}>
                  {selectedWd.withdrawalNumber}
                </strong>{' '}
                for{' '}
                <strong style={{ color: 'var(--color-brand-text, #e6edf3)' }}>
                  {formatCurrency(
                    selectedWd.netAmount || selectedWd.amount,
                    selectedWd.currency || 'NGN',
                  )}
                </strong>
                ? The reserved funds will be atomically restored to the seller&apos;s available
                balance.
              </p>

              {actionError && (
                <div
                  style={{
                    background: '#fef2f2',
                    color: '#991b1b',
                    padding: '8px 12px',
                    borderRadius: 6,
                    fontSize: '0.85rem',
                    marginBottom: '1rem',
                  }}
                >
                  {actionError}
                </div>
              )}

              <div style={{ marginBottom: '1.25rem' }}>
                <label
                  style={{
                    display: 'block',
                    fontSize: '0.85rem',
                    fontWeight: 600,
                    marginBottom: 4,
                    color: 'var(--color-brand-text, #e6edf3)',
                  }}
                >
                  Rejection Reason <span style={{ color: '#dc2626' }}>*</span>
                </label>
                <textarea
                  rows={3}
                  required
                  placeholder="e.g. Account name mismatch with seller profile, or invalid NIP details"
                  value={rejectReason}
                  onChange={(e) => setRejectReason(e.target.value)}
                  style={{
                    width: '100%',
                    padding: '9px 12px',
                    borderRadius: 6,
                    border: '1px solid var(--color-neutral-200, #30363d)',
                    background: 'var(--color-neutral-50, #0d1117)',
                    color: 'var(--color-brand-text, #e6edf3)',
                    fontSize: '0.9rem',
                    resize: 'vertical',
                    outline: 'none',
                  }}
                />
              </div>

              <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 10 }}>
                <button
                  type="button"
                  className="admin-btn"
                  onClick={closeModal}
                  disabled={rejectMutation.isPending}
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="admin-btn admin-btn--deactivate"
                  style={{ background: '#dc2626', color: '#fff', border: 'none' }}
                  disabled={rejectMutation.isPending}
                >
                  {rejectMutation.isPending ? 'Rejecting…' : 'Confirm Rejection'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ── Modal: Audit Details ── */}
      {actionType === 'details' && selectedWd && (
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
        >
          <div
            style={{
              background: 'var(--color-white, #1c2128)',
              borderRadius: 12,
              maxWidth: 580,
              width: '100%',
              boxShadow: '0 25px 50px -12px rgba(0,0,0,0.5)',
              border: '1px solid var(--color-neutral-200, #30363d)',
              color: 'var(--color-brand-text, #e6edf3)',
              overflow: 'hidden',
              maxHeight: '90vh',
              display: 'flex',
              flexDirection: 'column',
            }}
          >
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
                  fontSize: '1.15rem',
                  fontWeight: 700,
                  color: 'var(--color-brand-text, #e6edf3)',
                  display: 'flex',
                  alignItems: 'center',
                  gap: 8,
                }}
              >
                Withdrawal Audit Trail{' '}
                <span
                  style={{
                    fontSize: '0.85rem',
                    color: 'var(--color-neutral-500, #8b949e)',
                    fontWeight: 500,
                  }}
                >
                  ({selectedWd.withdrawalNumber})
                </span>
              </h3>
              <button
                onClick={closeModal}
                style={{
                  background: 'transparent',
                  border: 'none',
                  cursor: 'pointer',
                  color: 'var(--color-neutral-500, #8b949e)',
                  display: 'flex',
                  alignItems: 'center',
                  padding: 4,
                  borderRadius: 4,
                }}
                aria-label="Close"
              >
                <FiX size={20} />
              </button>
            </div>

            <div style={{ padding: '1.5rem', overflowY: 'auto' }}>
              <div
                style={{
                  display: 'grid',
                  gridTemplateColumns: selectedWd.manualPayoutReference ? '1fr 1fr 1fr' : '1fr 1fr',
                  gap: '1rem',
                  marginBottom: '1.25rem',
                  background: 'var(--color-neutral-50, #161b22)',
                  border: '1px solid var(--color-neutral-200, #30363d)',
                  borderRadius: 8,
                  padding: '1rem',
                }}
              >
                <div>
                  <div
                    style={{
                      fontSize: '0.75rem',
                      fontWeight: 700,
                      letterSpacing: '0.05em',
                      color: 'var(--color-neutral-500, #8b949e)',
                      marginBottom: 6,
                    }}
                  >
                    STATUS
                  </div>
                  <div>{getStatusBadge(selectedWd.status)}</div>
                </div>

                <div>
                  <div
                    style={{
                      fontSize: '0.75rem',
                      fontWeight: 700,
                      letterSpacing: '0.05em',
                      color: 'var(--color-neutral-500, #8b949e)',
                      marginBottom: 6,
                    }}
                  >
                    EXPECTED COMPLETION
                  </div>
                  {(() => {
                    const timeline = getWithdrawalTimelineStatus(
                      selectedWd.status,
                      selectedWd.requestedAt || selectedWd.createdAt,
                      selectedWd.expectedCompletionDate,
                    )
                    return (
                      <div>
                        <strong
                          style={{
                            color: '#38bdf8',
                            fontSize: '0.86rem',
                            display: 'inline-flex',
                            alignItems: 'center',
                            gap: 4,
                          }}
                        >
                          <FiCalendar size={13} /> {timeline.formattedExpectedDate}
                        </strong>
                        {timeline.isOverdue && (
                          <div
                            style={{
                              color: '#ef4444',
                              fontSize: '0.72rem',
                              fontWeight: 700,
                              marginTop: 2,
                            }}
                          >
                            Overdue (4-Working-Day Target Passed)
                          </div>
                        )}
                      </div>
                    )
                  })()}
                </div>

                {selectedWd.manualPayoutReference && (
                  <div>
                    <div
                      style={{
                        fontSize: '0.75rem',
                        fontWeight: 700,
                        letterSpacing: '0.05em',
                        color: 'var(--color-neutral-500, #8b949e)',
                        marginBottom: 6,
                      }}
                    >
                      MANUAL PAYOUT REFERENCE
                    </div>
                    <code
                      style={{
                        fontFamily: 'monospace',
                        fontSize: '0.85rem',
                        color: '#22c55e',
                        fontWeight: 600,
                        wordBreak: 'break-all',
                      }}
                    >
                      {selectedWd.manualPayoutReference}
                    </code>
                  </div>
                )}
              </div>

              {selectedWd.failureReason && (
                <div
                  style={{
                    background: 'rgba(239, 68, 68, 0.1)',
                    border: '1px solid rgba(239, 68, 68, 0.25)',
                    padding: '10px 14px',
                    borderRadius: 8,
                    color: '#f87171',
                    fontSize: '0.85rem',
                    marginBottom: '1.25rem',
                  }}
                >
                  <strong style={{ color: '#ef4444' }}>Failure Reason:</strong>{' '}
                  {selectedWd.failureReason}
                </div>
              )}

              <h4
                style={{
                  fontSize: '0.88rem',
                  fontWeight: 700,
                  letterSpacing: '0.03em',
                  margin: '0 0 0.75rem',
                  color: 'var(--color-brand-text, #e6edf3)',
                  display: 'flex',
                  alignItems: 'center',
                  gap: 6,
                }}
              >
                Event Log
              </h4>

              <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
                {selectedWd.auditLog && selectedWd.auditLog.length > 0 ? (
                  selectedWd.auditLog.map((log, idx) => {
                    const item = formatFriendlyTimelineEntry(log.status, log.note)
                    return (
                      <div
                        key={idx}
                        style={{
                          background: 'var(--color-neutral-50, #161b22)',
                          border: '1px solid var(--color-neutral-200, #30363d)',
                          borderRadius: 8,
                          padding: '10px 14px',
                          fontSize: '0.85rem',
                        }}
                      >
                        <div
                          style={{
                            display: 'flex',
                            justifyContent: 'space-between',
                            alignItems: 'center',
                            marginBottom: 4,
                          }}
                        >
                          <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                            <span
                              style={{
                                background: item.badgeBg,
                                color: item.badgeColor,
                                padding: '2px 8px',
                                borderRadius: 6,
                                fontWeight: 700,
                                fontSize: '0.74rem',
                                textTransform: 'uppercase',
                                letterSpacing: '0.04em',
                              }}
                            >
                              {item.badgeText}
                            </span>
                            <strong
                              style={{
                                color: 'var(--color-brand-text, #e6edf3)',
                                fontSize: '0.84rem',
                              }}
                            >
                              {item.stageTitle}
                            </strong>
                          </div>
                          <span
                            style={{
                              color: 'var(--color-neutral-500, #8b949e)',
                              fontWeight: 400,
                              fontSize: '0.78rem',
                            }}
                          >
                            {formatDate(log.timestamp)}
                          </span>
                        </div>
                        <div
                          style={{
                            color: 'var(--color-brand-text, #cbd5e1)',
                            lineHeight: 1.5,
                            fontSize: '0.84rem',
                            marginTop: 4,
                          }}
                        >
                          {item.friendlyNote}
                        </div>
                        {log.note && log.note !== item.friendlyNote && (
                          <div
                            style={{
                              color: 'var(--color-neutral-500, #64748b)',
                              fontSize: '0.75rem',
                              marginTop: 4,
                              fontStyle: 'italic',
                              background: 'rgba(0,0,0,0.2)',
                              padding: '2px 6px',
                              borderRadius: 4,
                            }}
                          >
                            Raw Log: {log.note}
                          </div>
                        )}
                      </div>
                    )
                  })
                ) : (
                  <div
                    style={{
                      fontSize: '0.85rem',
                      color: 'var(--color-neutral-500, #8b949e)',
                      textAlign: 'center',
                      padding: '1.5rem',
                      background: 'var(--color-neutral-50, #161b22)',
                      borderRadius: 8,
                      border: '1px dashed var(--color-neutral-200, #30363d)',
                    }}
                  >
                    No audit logs recorded
                  </div>
                )}
              </div>
            </div>

            <div
              style={{
                padding: '1rem 1.5rem',
                borderTop: '1px solid var(--color-neutral-200, #30363d)',
                display: 'flex',
                justifyContent: 'flex-end',
              }}
            >
              <button
                className="admin-btn"
                onClick={closeModal}
                style={{
                  background: 'var(--color-neutral-100, #21262d)',
                  color: 'var(--color-brand-text, #e6edf3)',
                  border: '1px solid var(--color-neutral-200, #30363d)',
                }}
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ── Modal: Payout Notification Email Settings ── */}
      {isSettingsModalOpen && (
        <div
          style={{
            position: 'fixed',
            inset: 0,
            background: 'rgba(0,0,0,0.5)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            zIndex: 9999,
            padding: '1rem',
          }}
        >
          <div
            className="admin-table-card"
            style={{
              background: 'var(--color-white, #1c2128)',
              border: '1px solid var(--color-neutral-200, #30363d)',
              borderRadius: 12,
              maxWidth: 540,
              width: '100%',
              boxShadow: '0 25px 50px -12px rgba(0,0,0,0.5)',
              overflow: 'hidden',
              maxHeight: '92vh',
              display: 'flex',
              flexDirection: 'column',
              color: 'var(--color-brand-text, #e6edf3)',
            }}
          >
            <div
              style={{
                padding: '1.25rem 1.5rem',
                borderBottom: '1px solid var(--color-neutral-200, #30363d)',
                display: 'flex',
                justifyContent: 'space-between',
                alignItems: 'center',
                background: 'var(--color-neutral-50, #161b22)',
              }}
            >
              <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                <div
                  style={{
                    width: 32,
                    height: 32,
                    borderRadius: 6,
                    background: '#0284c7',
                    color: '#fff',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                  }}
                >
                  <FiMail size={16} />
                </div>
                <div>
                  <h3
                    style={{
                      margin: 0,
                      fontSize: '1.05rem',
                      fontWeight: 700,
                      color: 'var(--color-brand-text, #e6edf3)',
                    }}
                  >
                    Payout Alert Email Settings
                  </h3>
                  <div style={{ fontSize: '0.78rem', color: 'var(--color-neutral-500, #8b949e)' }}>
                    Notify person in charge when sellers request withdrawals
                  </div>
                </div>
              </div>
              <button
                onClick={closeSettingsModal}
                style={{
                  background: 'transparent',
                  border: 'none',
                  cursor: 'pointer',
                  color: 'var(--color-neutral-500, #8b949e)',
                }}
              >
                <FiX size={20} />
              </button>
            </div>

            <form
              onSubmit={handleSaveSettingsInModal}
              style={{ padding: '1.5rem', overflowY: 'auto' }}
            >
              {settingsSuccess && (
                <div
                  style={{
                    background: '#ecfdf5',
                    color: '#065f46',
                    border: '1px solid #a7f3d0',
                    padding: '10px 12px',
                    borderRadius: 6,
                    fontSize: '0.85rem',
                    marginBottom: '1rem',
                    display: 'flex',
                    alignItems: 'center',
                    gap: 8,
                  }}
                >
                  <FiCheckCircle size={16} /> {settingsSuccess}
                </div>
              )}

              {settingsError && (
                <div
                  style={{
                    background: '#fef2f2',
                    color: '#991b1b',
                    border: '1px solid #fecaca',
                    padding: '10px 12px',
                    borderRadius: 6,
                    fontSize: '0.85rem',
                    marginBottom: '1rem',
                    display: 'flex',
                    alignItems: 'center',
                    gap: 8,
                  }}
                >
                  <FiAlertCircle size={16} /> {settingsError}
                </div>
              )}

              {/* Notification Toggle */}
              <div
                style={{
                  background: 'var(--color-neutral-50, #161b22)',
                  border: '1px solid var(--color-neutral-200, #30363d)',
                  borderRadius: 8,
                  padding: '10px 14px',
                  marginBottom: '1.25rem',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'space-between',
                  gap: 12,
                }}
              >
                <div>
                  <div
                    style={{
                      fontWeight: 600,
                      fontSize: '0.86rem',
                      color: 'var(--color-brand-text, #e6edf3)',
                    }}
                  >
                    Send Email on Withdrawal Request
                  </div>
                  <div style={{ fontSize: '0.78rem', color: 'var(--color-neutral-500, #8b949e)' }}>
                    Sends immediate email with bank details &amp; amount
                  </div>
                </div>
                <input
                  type="checkbox"
                  checked={editNotifyOnWithdrawal}
                  onChange={(e) => setEditNotifyOnWithdrawal(e.target.checked)}
                  style={{ width: 18, height: 18, cursor: 'pointer', accentColor: '#0284c7' }}
                />
              </div>

              {/* Current Recipient List */}
              <div style={{ marginBottom: '1.25rem' }}>
                <label
                  style={{
                    display: 'block',
                    fontSize: '0.85rem',
                    fontWeight: 600,
                    color: 'var(--color-brand-text, #e6edf3)',
                    marginBottom: 6,
                  }}
                >
                  Alert Recipient Email Address(es)
                </label>

                {editEmails.length === 0 ? (
                  <div
                    style={{
                      border: '1px dashed var(--color-neutral-200, #30363d)',
                      borderRadius: 6,
                      padding: '12px',
                      textAlign: 'center',
                      color: 'var(--color-neutral-500, #8b949e)',
                      fontSize: '0.82rem',
                    }}
                  >
                    No email address added yet. Enter the email below.
                  </div>
                ) : (
                  <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
                    {editEmails.map((email, idx) => (
                      <div
                        key={idx}
                        style={{
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'space-between',
                          padding: '7px 10px',
                          borderRadius: 6,
                          border: '1px solid var(--color-neutral-200, #30363d)',
                          background: 'var(--color-neutral-50, #161b22)',
                        }}
                      >
                        <span
                          style={{
                            fontSize: '0.85rem',
                            fontWeight: 600,
                            color: 'var(--color-brand-text, #e6edf3)',
                          }}
                        >
                          {email}
                          {idx === 0 && (
                            <span
                              style={{
                                marginLeft: 6,
                                background: '#e0e7ff',
                                color: '#3730a3',
                                fontSize: '0.68rem',
                                fontWeight: 700,
                                padding: '1px 5px',
                                borderRadius: 4,
                              }}
                            >
                              PRIMARY
                            </span>
                          )}
                        </span>
                        <button
                          type="button"
                          onClick={() => handleRemoveEmailInModal(idx)}
                          style={{
                            background: 'transparent',
                            border: 'none',
                            color: '#ef4444',
                            cursor: 'pointer',
                            display: 'flex',
                            alignItems: 'center',
                            gap: 3,
                            fontSize: '0.75rem',
                          }}
                        >
                          <FiTrash2 size={13} /> Remove
                        </button>
                      </div>
                    ))}
                  </div>
                )}
              </div>

              {/* Add email field */}
              <div style={{ marginBottom: '1.25rem' }}>
                <label
                  style={{
                    display: 'block',
                    fontSize: '0.82rem',
                    fontWeight: 600,
                    color: 'var(--color-brand-text, #e6edf3)',
                    marginBottom: 4,
                  }}
                >
                  Add / Change Email
                </label>
                <div style={{ display: 'flex', gap: 8 }}>
                  <input
                    type="email"
                    placeholder="e.g. finance@gmail.com or payout@cartivalmall.com"
                    value={newEmailText}
                    onChange={(e) => {
                      setNewEmailText(e.target.value)
                      setSettingsError(null)
                    }}
                    onKeyDown={(e) => {
                      if (e.key === 'Enter') {
                        e.preventDefault()
                        handleAddEmailInModal()
                      }
                    }}
                    style={{
                      flex: 1,
                      padding: '8px 12px',
                      borderRadius: 6,
                      border: '1px solid var(--color-neutral-200, #30363d)',
                      background: 'var(--color-neutral-50, #0d1117)',
                      color: 'var(--color-brand-text, #e6edf3)',
                      fontSize: '0.85rem',
                      outline: 'none',
                    }}
                  />
                  <button
                    type="button"
                    onClick={() => handleAddEmailInModal()}
                    className="admin-btn admin-btn--primary"
                    style={{ padding: '8px 14px', borderRadius: 6, fontSize: '0.82rem' }}
                  >
                    <FiPlus size={14} /> Add
                  </button>
                </div>
                <div
                  style={{
                    fontSize: '0.75rem',
                    color: 'var(--color-neutral-500, #8b949e)',
                    marginTop: 4,
                  }}
                >
                  Enter the email address of the person who will send money to sellers from their
                  mobile bank app.
                </div>
              </div>

              <div
                style={{
                  display: 'flex',
                  justifyContent: 'flex-end',
                  gap: 10,
                  marginTop: '1.5rem',
                }}
              >
                <button
                  type="button"
                  className="admin-btn"
                  onClick={closeSettingsModal}
                  disabled={updatePayoutSettingsMutation.isPending}
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="admin-btn admin-btn--primary"
                  style={{
                    background: '#0284c7',
                    color: '#fff',
                    border: 'none',
                    display: 'inline-flex',
                    alignItems: 'center',
                    gap: 6,
                    padding: '8px 16px',
                  }}
                  disabled={updatePayoutSettingsMutation.isPending}
                >
                  <FiSave size={14} />
                  {updatePayoutSettingsMutation.isPending ? 'Saving…' : 'Save Email Settings'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </>
  )
}
