import { useState } from 'react'
import {
  usePendingApprovals,
  useApproveVendor,
  useRejectVendor,
} from '../../../hooks/useVendors.js'
import type { IVendor } from '../../../../shared/types/vendors.types.js'

const CARD_BG = '#fff'
const BORDER = '#e5e7eb'
const TEXT = '#111827'
const TEXT_MUTED = '#6b7280'

interface VendorWithUser extends IVendor {
  userId: { _id: string; firstName: string; lastName: string; email: string }
}

function ApprovalCard({
  vendor,
  onApprove,
  onReject,
}: {
  vendor: VendorWithUser
  onApprove: () => void
  onReject: (reason: string) => void
}) {
  const [rejecting, setRejecting] = useState(false)
  const [reason, setReason] = useState('')
  const user = typeof vendor.userId === 'object' ? vendor.userId : null

  return (
    <div
      style={{
        background: CARD_BG,
        border: `1px solid ${BORDER}`,
        borderRadius: 12,
        padding: '20px 24px',
        marginBottom: 16,
      }}
    >
      <div
        style={{
          display: 'flex',
          alignItems: 'flex-start',
          justifyContent: 'space-between',
          marginBottom: 16,
        }}
      >
        <div>
          <p style={{ fontWeight: 700, fontSize: '0.95rem', color: TEXT, margin: 0 }}>
            {vendor.businessName}
          </p>
          <p style={{ fontSize: '0.78rem', color: TEXT_MUTED, margin: '3px 0 0' }}>
            {user
              ? `${user.firstName} ${user.lastName} · ${user.email}`
              : String(vendor.userId)}
          </p>
          <p
            style={{
              fontSize: '0.75rem',
              color: TEXT_MUTED,
              margin: '2px 0 0',
              textTransform: 'capitalize',
            }}
          >
            {vendor.businessType} &middot; Applied{' '}
            {new Date(vendor.createdAt).toLocaleDateString()}
          </p>
        </div>
        <span
          style={{
            background: '#fef9c3',
            color: '#854d0e',
            fontSize: '0.72rem',
            fontWeight: 700,
            padding: '3px 10px',
            borderRadius: 999,
          }}
        >
          Pending
        </span>
      </div>

      {!rejecting ? (
        <div style={{ display: 'flex', gap: 10 }}>
          <button
            onClick={onApprove}
            style={{
              flex: 1,
              background: '#16a34a',
              color: '#fff',
              border: 'none',
              borderRadius: 8,
              padding: '8px 0',
              fontSize: '0.83rem',
              fontWeight: 600,
              cursor: 'pointer',
            }}
          >
            Approve
          </button>
          <button
            onClick={() => setRejecting(true)}
            style={{
              flex: 1,
              background: '#fee2e2',
              color: '#dc2626',
              border: 'none',
              borderRadius: 8,
              padding: '8px 0',
              fontSize: '0.83rem',
              fontWeight: 600,
              cursor: 'pointer',
            }}
          >
            Reject
          </button>
        </div>
      ) : (
        <div>
          <textarea
            value={reason}
            onChange={(e) => setReason(e.target.value)}
            placeholder="Rejection reason (required)"
            rows={2}
            style={{
              width: '100%',
              border: `1px solid ${BORDER}`,
              borderRadius: 8,
              padding: '8px 12px',
              fontSize: '0.83rem',
              marginBottom: 10,
              resize: 'vertical',
              boxSizing: 'border-box',
            }}
          />
          <div style={{ display: 'flex', gap: 10 }}>
            <button
              onClick={() => reason.trim() && onReject(reason)}
              disabled={!reason.trim()}
              style={{
                flex: 1,
                background: '#dc2626',
                color: '#fff',
                border: 'none',
                borderRadius: 8,
                padding: '8px 0',
                fontSize: '0.83rem',
                fontWeight: 600,
                cursor: reason.trim() ? 'pointer' : 'not-allowed',
                opacity: reason.trim() ? 1 : 0.5,
              }}
            >
              Confirm Rejection
            </button>
            <button
              onClick={() => {
                setRejecting(false)
                setReason('')
              }}
              style={{
                flex: 1,
                background: 'transparent',
                border: `1px solid ${BORDER}`,
                color: TEXT_MUTED,
                borderRadius: 8,
                padding: '8px 0',
                fontSize: '0.83rem',
                cursor: 'pointer',
              }}
            >
              Cancel
            </button>
          </div>
        </div>
      )}
    </div>
  )
}

export default function AdminVendorApproval() {
  const [page, setPage] = useState(1)
  const { data, isLoading, refetch } = usePendingApprovals(page)
  const approve = useApproveVendor()
  const reject = useRejectVendor()

  const items = (data?.items ?? []) as VendorWithUser[]
  const pages = data?.pages ?? 1

  const handleApprove = async (vendorId: string) => {
    await approve.mutateAsync(vendorId)
    void refetch()
  }

  const handleReject = async (vendorId: string, reason: string) => {
    await reject.mutateAsync({ vendorId, reason })
    void refetch()
  }

  return (
    <div style={{ padding: '24px 20px', maxWidth: 720 }}>
      <div
        style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          marginBottom: 28,
        }}
      >
        <div>
          <h1 style={{ fontSize: '1.5rem', fontWeight: 800, color: TEXT, margin: 0 }}>
            Vendor Approval Queue
          </h1>
          <p style={{ fontSize: '0.85rem', color: TEXT_MUTED, margin: '4px 0 0' }}>
            {data?.total ? `${data.total} pending application${data.total !== 1 ? 's' : ''}` : 'Review and approve vendor applications'}
          </p>
        </div>
        <div
          style={{
            background: '#fef9c3',
            color: '#854d0e',
            fontWeight: 700,
            fontSize: '1.1rem',
            padding: '8px 18px',
            borderRadius: 10,
            minWidth: 44,
            textAlign: 'center',
          }}
        >
          {data?.total ?? 0}
        </div>
      </div>

      {isLoading && (
        <div style={{ textAlign: 'center', color: TEXT_MUTED, padding: '3rem 0' }}>Loading…</div>
      )}

      {!isLoading && items.length === 0 && (
        <div
          style={{
            textAlign: 'center',
            color: TEXT_MUTED,
            padding: '4rem 0',
            background: CARD_BG,
            border: `1px solid ${BORDER}`,
            borderRadius: 12,
          }}
        >
          <p style={{ fontWeight: 700, fontSize: '1rem', margin: '0 0 6px' }}>
            No pending applications
          </p>
          <p style={{ fontSize: '0.85rem', margin: 0 }}>
            All vendor applications have been reviewed.
          </p>
        </div>
      )}

      {items.map((vendor) => (
        <ApprovalCard
          key={vendor._id}
          vendor={vendor}
          onApprove={() => void handleApprove(vendor._id)}
          onReject={(reason) => void handleReject(vendor._id, reason)}
        />
      ))}

      {pages > 1 && (
        <div
          style={{ display: 'flex', justifyContent: 'center', gap: 10, marginTop: 24 }}
        >
          <button
            onClick={() => setPage((p) => Math.max(1, p - 1))}
            disabled={page === 1}
            style={{
              padding: '6px 16px',
              border: `1px solid ${BORDER}`,
              borderRadius: 8,
              background: '#fff',
              color: TEXT_MUTED,
              cursor: page === 1 ? 'not-allowed' : 'pointer',
              opacity: page === 1 ? 0.4 : 1,
              fontSize: '0.83rem',
            }}
          >
            Prev
          </button>
          <span
            style={{
              padding: '6px 16px',
              fontSize: '0.83rem',
              color: TEXT_MUTED,
              display: 'flex',
              alignItems: 'center',
            }}
          >
            {page} / {pages}
          </span>
          <button
            onClick={() => setPage((p) => Math.min(pages, p + 1))}
            disabled={page === pages}
            style={{
              padding: '6px 16px',
              border: `1px solid ${BORDER}`,
              borderRadius: 8,
              background: '#fff',
              color: TEXT_MUTED,
              cursor: page === pages ? 'not-allowed' : 'pointer',
              opacity: page === pages ? 0.4 : 1,
              fontSize: '0.83rem',
            }}
          >
            Next
          </button>
        </div>
      )}
    </div>
  )
}
