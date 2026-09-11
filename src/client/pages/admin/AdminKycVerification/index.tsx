import { useState } from 'react'
import { FiSearch, FiShield, FiCheckCircle, FiAlertCircle, FiExternalLink } from 'react-icons/fi'
import { useAdminKycSellers, useReviewSellerKyc } from '../../../hooks/useAdmin.js'
import type { AdminSellerKycProfile } from '../../../services/adminService.js'
import { formatDate } from '../../../../shared/helpers/index.js'

export default function AdminKycVerification() {
  const [statusFilter, setStatusFilter] = useState('UNDER_REVIEW')
  const [searchInput, setSearchInput] = useState('')
  const [search, setSearch] = useState('')
  const [page, setPage] = useState(1)

  // Review Modals state
  const [activeSeller, setActiveSeller] = useState<AdminSellerKycProfile | null>(null)
  const [reviewAction, setReviewAction] = useState<'APPROVE' | 'REJECT' | 'REQUEST_ACTION' | null>(
    null,
  )
  const [reason, setReason] = useState('')
  const [actionError, setActionError] = useState('')

  const params: Record<string, string> = {
    page: String(page),
    limit: '20',
  }
  if (statusFilter && statusFilter !== 'ALL') {
    params.status = statusFilter
  }
  if (search) {
    params.search = search
  }

  const { data, isLoading, isError, refetch } = useAdminKycSellers(params)
  const reviewMutation = useReviewSellerKyc()

  const profiles = data?.data ?? []
  const pagination = data?.pagination

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault()
    setSearch(searchInput.trim())
    setPage(1)
  }

  const handleOpenReview = (
    seller: AdminSellerKycProfile,
    action: 'APPROVE' | 'REJECT' | 'REQUEST_ACTION',
  ) => {
    setActiveSeller(seller)
    setReviewAction(action)
    setReason('')
    setActionError('')
  }

  const handleCloseReview = () => {
    setActiveSeller(null)
    setReviewAction(null)
    setReason('')
    setActionError('')
  }

  const handleSubmitReview = async () => {
    if (!activeSeller || !reviewAction) return
    setActionError('')

    if (reviewAction === 'REJECT' && !reason.trim()) {
      setActionError('Please specify the reason for rejection.')
      return
    }

    if (reviewAction === 'REQUEST_ACTION' && !reason.trim()) {
      setActionError('Please specify the required correction or action needed.')
      return
    }

    try {
      await reviewMutation.mutateAsync({
        sellerId: activeSeller._id,
        data: {
          action: reviewAction,
          rejectionReason: reviewAction === 'REJECT' ? reason.trim() : undefined,
          actionRequiredReason: reviewAction === 'REQUEST_ACTION' ? reason.trim() : undefined,
        },
      })
      handleCloseReview()
      refetch()
    } catch (err: any) {
      setActionError(
        err?.response?.data?.message || err?.message || 'Failed to submit review action',
      )
    }
  }

  const STATUS_CONFIG: Record<
    string,
    { label: string; bg: string; color: string; border: string }
  > = {
    NOT_STARTED: { label: 'Not Started', bg: '#f3f4f6', color: '#4b5563', border: '#e5e7eb' },
    PENDING: { label: 'Pending', bg: '#fffbeb', color: '#b45309', border: '#fde68a' },
    UNDER_REVIEW: { label: 'Under Review', bg: '#eff6ff', color: '#1d4ed8', border: '#bfdbfe' },
    VERIFIED: { label: 'Verified', bg: '#ecfdf5', color: '#047857', border: '#a7f3d0' },
    REJECTED: { label: 'Rejected', bg: '#fef2f2', color: '#b91c1c', border: '#fecaca' },
    REQUIRES_ACTION: {
      label: 'Action Required',
      bg: '#fff7ed',
      color: '#c2410c',
      border: '#ffedd5',
    },
  }

  return (
    <div style={{ paddingBottom: '3rem' }}>
      {/* Page Header */}
      <div className="admin-page-header">
        <div>
          <h1
            className="admin-page-title"
            style={{ display: 'flex', alignItems: 'center', gap: 10 }}
          >
            <FiShield /> Seller KYC Verification
          </h1>
          <p className="admin-page-subtitle">
            Review and certify vendor identities, business documentation, and Paystack bank accounts
          </p>
        </div>
      </div>

      {/* Filter Tabs */}
      <div
        style={{
          display: 'flex',
          gap: 8,
          marginBottom: '1.25rem',
          flexWrap: 'wrap',
          alignItems: 'center',
        }}
      >
        {[
          { key: 'UNDER_REVIEW', label: 'Under Review' },
          { key: 'REQUIRES_ACTION', label: 'Action Required' },
          { key: 'VERIFIED', label: 'Approved / Verified' },
          { key: 'REJECTED', label: 'Rejected' },
          { key: 'ALL', label: 'All Submissions' },
        ].map((tab) => (
          <button
            key={tab.key}
            onClick={() => {
              setStatusFilter(tab.key)
              setPage(1)
            }}
            style={{
              padding: '8px 16px',
              borderRadius: 8,
              border: statusFilter === tab.key ? '1px solid #007185' : '1px solid #e5e7eb',
              background: statusFilter === tab.key ? '#007185' : '#fff',
              color: statusFilter === tab.key ? '#fff' : '#374151',
              fontWeight: 600,
              fontSize: '0.82rem',
              cursor: 'pointer',
              transition: 'all 0.15s ease',
            }}
          >
            {tab.label}
          </button>
        ))}
      </div>

      {/* Table Card */}
      <div className="admin-table-card">
        <div className="admin-table-toolbar">
          <h3 style={{ margin: 0, fontSize: '0.95rem', fontWeight: 700 }}>
            Applications {pagination ? `(${pagination.total})` : ''}
          </h3>

          <form onSubmit={handleSearch} className="admin-search">
            <FiSearch size={14} color="#9ca3af" />
            <input
              placeholder="Search store, legal name, ID, account…"
              value={searchInput}
              onChange={(e) => setSearchInput(e.target.value)}
            />
          </form>
        </div>

        {isLoading ? (
          <div className="admin-loading" style={{ padding: '3rem', textAlign: 'center' }}>
            <p>Loading seller KYC records...</p>
          </div>
        ) : isError ? (
          <div style={{ padding: '2rem', textAlign: 'center', color: '#dc2626' }}>
            <FiAlertCircle size={24} />
            <p style={{ margin: '8px 0 0' }}>Failed to load KYC applications.</p>
          </div>
        ) : profiles.length === 0 ? (
          <div
            style={{
              padding: '3.5rem 1rem',
              textAlign: 'center',
              color: '#6b7280',
            }}
          >
            <FiCheckCircle size={36} color="#9ca3af" style={{ marginBottom: 10 }} />
            <h4 style={{ margin: 0, fontSize: '1rem', color: '#374151' }}>
              No KYC submissions found
            </h4>
            <p style={{ margin: '4px 0 0', fontSize: '0.85rem' }}>
              No seller profiles currently match the selected status filter.
            </p>
          </div>
        ) : (
          <div className="admin-table-wrap">
            <table className="admin-table">
              <thead>
                <tr>
                  <th>Seller & Store</th>
                  <th>Legal Identity & Entity</th>
                  <th>Verified Bank Account</th>
                  <th>Status</th>
                  <th>Submitted</th>
                  <th style={{ textAlign: 'right' }}>Review Actions</th>
                </tr>
              </thead>
              <tbody>
                {profiles.map((profile) => {
                  const statusInfo =
                    STATUS_CONFIG[profile.kycStatus] || STATUS_CONFIG['NOT_STARTED']
                  const kyc = profile.kycData
                  const bank = kyc?.bankDetails
                  const user = profile.userId

                  return (
                    <tr key={profile._id}>
                      {/* Seller & Store */}
                      <td>
                        <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                          <div
                            style={{
                              width: 38,
                              height: 38,
                              borderRadius: '50%',
                              background: '#f3f4f6',
                              display: 'flex',
                              alignItems: 'center',
                              justifyContent: 'center',
                              fontSize: '0.85rem',
                              fontWeight: 700,
                              color: '#4b5563',
                            }}
                          >
                            {user?.firstName?.[0] || 'S'}
                          </div>
                          <div>
                            <div style={{ fontWeight: 700, fontSize: '0.88rem', color: '#111827' }}>
                              {profile.storeName || 'Unnamed Store'}
                            </div>
                            <div style={{ fontSize: '0.78rem', color: '#6b7280' }}>
                              {user?.firstName} {user?.lastName} · {user?.email}
                            </div>
                            {user?.phoneNumber && (
                              <div style={{ fontSize: '0.72rem', color: '#9ca3af' }}>
                                Tel: {user.phoneNumber}
                              </div>
                            )}
                          </div>
                        </div>
                      </td>

                      {/* Legal Identity */}
                      <td>
                        <div style={{ fontSize: '0.82rem' }}>
                          <div style={{ fontWeight: 600, color: '#111827' }}>
                            {kyc?.legalName || 'N/A'}
                          </div>
                          <div style={{ color: '#4b5563', textTransform: 'capitalize' }}>
                            Type: {kyc?.businessType || 'individual'}
                          </div>
                          <div style={{ color: '#6b7280', fontSize: '0.75rem' }}>
                            <span style={{ textTransform: 'uppercase', fontWeight: 600 }}>
                              {kyc?.idType || 'ID'}:
                            </span>{' '}
                            {kyc?.idNumber || 'N/A'}
                          </div>
                          {kyc?.idDocumentUrl && (
                            <a
                              href={kyc.idDocumentUrl}
                              target="_blank"
                              rel="noopener noreferrer"
                              style={{
                                display: 'inline-flex',
                                alignItems: 'center',
                                gap: 4,
                                color: '#007185',
                                fontSize: '0.75rem',
                                fontWeight: 600,
                                textDecoration: 'none',
                                marginTop: 4,
                              }}
                            >
                              <FiExternalLink size={12} /> View Document
                            </a>
                          )}
                        </div>
                      </td>

                      {/* Bank Details */}
                      <td>
                        <div style={{ fontSize: '0.82rem' }}>
                          {bank ? (
                            <>
                              <div style={{ fontWeight: 600, color: '#111827' }}>
                                {bank.bankName || 'Bank'}
                              </div>
                              <div style={{ color: '#4b5563', fontFamily: 'monospace' }}>
                                {bank.accountNumber}
                              </div>
                              <div style={{ fontSize: '0.75rem', color: '#6b7280' }}>
                                {bank.accountName}
                              </div>
                              {bank.isResolved && (
                                <span
                                  style={{
                                    display: 'inline-flex',
                                    alignItems: 'center',
                                    gap: 3,
                                    background: '#ecfdf5',
                                    color: '#059669',
                                    padding: '2px 6px',
                                    borderRadius: 4,
                                    fontSize: '0.68rem',
                                    fontWeight: 700,
                                    marginTop: 3,
                                  }}
                                >
                                  ✓ Paystack Verified
                                </span>
                              )}
                            </>
                          ) : (
                            <span style={{ color: '#9ca3af', fontStyle: 'italic' }}>
                              No bank provided
                            </span>
                          )}
                        </div>
                      </td>

                      {/* Status */}
                      <td>
                        <span
                          style={{
                            display: 'inline-block',
                            background: statusInfo.bg,
                            color: statusInfo.color,
                            border: `1px solid ${statusInfo.border}`,
                            padding: '4px 10px',
                            borderRadius: 999,
                            fontSize: '0.75rem',
                            fontWeight: 700,
                          }}
                        >
                          {statusInfo.label}
                        </span>
                        {kyc?.rejectionReason && profile.kycStatus === 'REJECTED' && (
                          <div
                            style={{
                              fontSize: '0.72rem',
                              color: '#dc2626',
                              marginTop: 4,
                              maxWidth: 160,
                            }}
                          >
                            Reason: {kyc.rejectionReason}
                          </div>
                        )}
                        {kyc?.actionRequiredReason && profile.kycStatus === 'REQUIRES_ACTION' && (
                          <div
                            style={{
                              fontSize: '0.72rem',
                              color: '#d97706',
                              marginTop: 4,
                              maxWidth: 160,
                            }}
                          >
                            Action: {kyc.actionRequiredReason}
                          </div>
                        )}
                      </td>

                      {/* Date */}
                      <td style={{ fontSize: '0.8rem', color: '#6b7280' }}>
                        {kyc?.submittedAt
                          ? formatDate(kyc.submittedAt)
                          : formatDate(profile.createdAt)}
                      </td>

                      {/* Actions */}
                      <td style={{ textAlign: 'right' }}>
                        <div
                          style={{
                            display: 'flex',
                            gap: 6,
                            justifyContent: 'flex-end',
                            flexWrap: 'wrap',
                          }}
                        >
                          {profile.kycStatus !== 'VERIFIED' && (
                            <button
                              onClick={() => handleOpenReview(profile, 'APPROVE')}
                              style={{
                                background: '#16a34a',
                                color: '#fff',
                                border: 'none',
                                borderRadius: 6,
                                padding: '6px 12px',
                                fontSize: '0.78rem',
                                fontWeight: 700,
                                cursor: 'pointer',
                              }}
                            >
                              Approve
                            </button>
                          )}

                          {profile.kycStatus !== 'REQUIRES_ACTION' && (
                            <button
                              onClick={() => handleOpenReview(profile, 'REQUEST_ACTION')}
                              style={{
                                background: '#f59e0b',
                                color: '#fff',
                                border: 'none',
                                borderRadius: 6,
                                padding: '6px 12px',
                                fontSize: '0.78rem',
                                fontWeight: 700,
                                cursor: 'pointer',
                              }}
                            >
                              Request Action
                            </button>
                          )}

                          {profile.kycStatus !== 'REJECTED' && (
                            <button
                              onClick={() => handleOpenReview(profile, 'REJECT')}
                              style={{
                                background: '#ef4444',
                                color: '#fff',
                                border: 'none',
                                borderRadius: 6,
                                padding: '6px 12px',
                                fontSize: '0.78rem',
                                fontWeight: 700,
                                cursor: 'pointer',
                              }}
                            >
                              Reject
                            </button>
                          )}
                        </div>
                      </td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Review Action Modal */}
      {activeSeller && reviewAction && (
        <div
          style={{
            position: 'fixed',
            inset: 0,
            background: 'rgba(0,0,0,0.5)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            zIndex: 1000,
            padding: '1rem',
          }}
        >
          <div
            style={{
              background: '#fff',
              borderRadius: 12,
              padding: '2rem',
              width: '100%',
              maxWidth: 500,
              boxShadow: '0 20px 25px -5px rgba(0,0,0,0.1)',
            }}
          >
            <h3 style={{ margin: '0 0 8px', fontSize: '1.2rem', fontWeight: 800 }}>
              {reviewAction === 'APPROVE' && 'Approve Seller KYC'}
              {reviewAction === 'REJECT' && 'Reject Seller KYC'}
              {reviewAction === 'REQUEST_ACTION' && 'Request Action / Document Correction'}
            </h3>

            <p style={{ color: '#4b5563', fontSize: '0.85rem', margin: '0 0 1.25rem' }}>
              Target Seller: <strong>{activeSeller.storeName}</strong> (
              {activeSeller.userId?.firstName} {activeSeller.userId?.lastName})
            </p>

            {actionError && (
              <div
                style={{
                  background: '#fef2f2',
                  border: '1px solid #fecaca',
                  color: '#b91c1c',
                  padding: 10,
                  borderRadius: 8,
                  marginBottom: 12,
                  fontSize: '0.82rem',
                }}
              >
                {actionError}
              </div>
            )}

            {reviewAction === 'APPROVE' && (
              <p style={{ fontSize: '0.9rem', color: '#374151', lineHeight: 1.5 }}>
                Approving this seller will set their status to <strong>VERIFIED</strong>. This will
                unlock their ability to set up their store and publish products to Cartiva
                Marketplace.
              </p>
            )}

            {reviewAction === 'REJECT' && (
              <div>
                <label
                  style={{
                    display: 'block',
                    fontSize: '0.82rem',
                    fontWeight: 600,
                    marginBottom: 6,
                    color: '#374151',
                  }}
                >
                  Rejection Reason *
                </label>
                <textarea
                  rows={3}
                  className="sl-textarea"
                  value={reason}
                  onChange={(e) => setReason(e.target.value)}
                  placeholder="e.g. Identity document is illegible or name does not match bank record."
                  required
                />
              </div>
            )}

            {reviewAction === 'REQUEST_ACTION' && (
              <div>
                <label
                  style={{
                    display: 'block',
                    fontSize: '0.82rem',
                    fontWeight: 600,
                    marginBottom: 6,
                    color: '#374151',
                  }}
                >
                  Action Required / Note for Seller *
                </label>
                <textarea
                  rows={3}
                  className="sl-textarea"
                  value={reason}
                  onChange={(e) => setReason(e.target.value)}
                  placeholder="e.g. Please re-upload a clear government-issued ID showing full date of birth."
                  required
                />
              </div>
            )}

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
                onClick={handleCloseReview}
                disabled={reviewMutation.isPending}
                style={{
                  padding: '10px 18px',
                  background: '#f3f4f6',
                  color: '#374151',
                  border: 'none',
                  borderRadius: 6,
                  fontWeight: 600,
                  fontSize: '0.85rem',
                  cursor: 'pointer',
                }}
              >
                Cancel
              </button>

              <button
                type="button"
                onClick={handleSubmitReview}
                disabled={reviewMutation.isPending}
                style={{
                  padding: '10px 20px',
                  background:
                    reviewAction === 'APPROVE'
                      ? '#16a34a'
                      : reviewAction === 'REJECT'
                        ? '#ef4444'
                        : '#f59e0b',
                  color: '#fff',
                  border: 'none',
                  borderRadius: 6,
                  fontWeight: 700,
                  fontSize: '0.85rem',
                  cursor: reviewMutation.isPending ? 'not-allowed' : 'pointer',
                }}
              >
                {reviewMutation.isPending ? 'Processing...' : 'Confirm Action'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
