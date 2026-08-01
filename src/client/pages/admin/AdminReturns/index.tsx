import { useState } from 'react'
import { FiPackage } from 'react-icons/fi'
import { useMyReturns, useUpdateReturnStatus } from '../../../hooks/useReturns.js'
import type { ReturnStatus } from '../../../../shared/types/returns.types.js'

const STATUSES: ReturnStatus[] = [
  'submitted',
  'under_review',
  'approved',
  'rejected',
  'awaiting_shipment',
  'in_transit',
  'received',
  'refunded',
  'completed',
]

const STATUS_COLOR: Record<ReturnStatus, string> = {
  submitted: '#3182ce',
  under_review: '#d69e2e',
  approved: '#2ecc71',
  rejected: '#e53e3e',
  awaiting_shipment: '#805ad5',
  in_transit: '#3182ce',
  received: '#2ecc71',
  refunded: '#2ecc71',
  completed: '#2ecc71',
}

function StatusBadge({ status }: { status: ReturnStatus }) {
  const color = STATUS_COLOR[status] ?? '#888'
  const label = status.replace(/_/g, ' ').replace(/\b\w/g, (c: string) => c.toUpperCase())
  return (
    <span
      style={{
        padding: '3px 10px',
        borderRadius: 12,
        fontSize: 12,
        fontWeight: 600,
        background: color + '22',
        color,
      }}
    >
      {label}
    </span>
  )
}

export default function AdminReturns() {
  const [page, setPage] = useState(1)
  const { data, isPending } = useMyReturns(page)
  const updateStatus = useUpdateReturnStatus()
  const [updatingId, setUpdatingId] = useState<string | null>(null)
  const [newStatus, setNewStatus] = useState<ReturnStatus>('under_review')
  const [adminNotes, setAdminNotes] = useState('')
  const [refundAmount, setRefundAmount] = useState('')

  const items = data?.items ?? []

  return (
    <div style={{ padding: '24px 20px' }}>
      <h1
        style={{
          margin: '0 0 20px',
          fontSize: 22,
          fontWeight: 700,
          display: 'flex',
          alignItems: 'center',
          gap: 8,
        }}
      >
        <FiPackage /> Returns Management
      </h1>

      {isPending && <p style={{ opacity: 0.5 }}>Loading…</p>}

      {!isPending && items.length === 0 && (
        <p style={{ opacity: 0.5, fontSize: 13 }}>No return requests found.</p>
      )}

      <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
        {items.map((r) => {
          const orderRef = typeof r.orderId === 'string' ? r.orderId : r.orderId.orderNumber
          return (
            <div
              key={r._id}
              style={{
                border: '1px solid var(--border-color, #eee)',
                borderRadius: 8,
                padding: '14px 16px',
              }}
            >
              <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 8 }}>
                <div>
                  <p style={{ margin: 0, fontWeight: 600, fontSize: 14 }}>Order: {orderRef}</p>
                  <p style={{ margin: '2px 0 0', fontSize: 12, opacity: 0.6 }}>
                    Type: {r.type.replace(/_/g, ' ')} · {r.items.length} item(s)
                  </p>
                </div>
                <StatusBadge status={r.status} />
              </div>
              <p style={{ margin: '0 0 6px', fontSize: 13, opacity: 0.7 }}>
                {r.description ?? r.reason}
              </p>

              {updatingId === r._id ? (
                <div
                  style={{
                    display: 'flex',
                    flexDirection: 'column',
                    gap: 8,
                    marginTop: 10,
                    borderTop: '1px solid var(--border-color, #eee)',
                    paddingTop: 10,
                  }}
                >
                  <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
                    <select
                      value={newStatus}
                      onChange={(e) => setNewStatus(e.target.value as ReturnStatus)}
                      style={{
                        padding: '6px 10px',
                        borderRadius: 6,
                        border: '1px solid #ccc',
                        fontSize: 13,
                      }}
                    >
                      {STATUSES.map((s) => (
                        <option key={s} value={s}>
                          {s.replace(/_/g, ' ')}
                        </option>
                      ))}
                    </select>
                    <input
                      value={refundAmount}
                      onChange={(e) => setRefundAmount(e.target.value)}
                      placeholder="Refund amount ($)"
                      type="number"
                      style={{
                        padding: '6px 10px',
                        borderRadius: 6,
                        border: '1px solid #ccc',
                        fontSize: 13,
                        width: 140,
                      }}
                    />
                  </div>
                  <textarea
                    value={adminNotes}
                    onChange={(e) => setAdminNotes(e.target.value)}
                    placeholder="Admin notes (optional)"
                    rows={2}
                    style={{
                      padding: '8px 10px',
                      borderRadius: 6,
                      border: '1px solid #ccc',
                      fontSize: 13,
                      resize: 'vertical',
                    }}
                  />
                  <div style={{ display: 'flex', gap: 8 }}>
                    <button
                      onClick={() => {
                        updateStatus.mutate({
                          id: r._id,
                          status: newStatus,
                          adminNotes: adminNotes || undefined,
                          refundAmount: refundAmount ? parseFloat(refundAmount) : undefined,
                        })
                        setUpdatingId(null)
                        setAdminNotes('')
                        setRefundAmount('')
                      }}
                      style={{
                        padding: '6px 14px',
                        background: '#FF9900',
                        border: 'none',
                        borderRadius: 6,
                        cursor: 'pointer',
                        fontWeight: 600,
                        fontSize: 13,
                      }}
                    >
                      Save
                    </button>
                    <button
                      onClick={() => {
                        setUpdatingId(null)
                        setAdminNotes('')
                        setRefundAmount('')
                      }}
                      style={{
                        padding: '6px 14px',
                        background: 'none',
                        border: '1px solid #ccc',
                        borderRadius: 6,
                        cursor: 'pointer',
                        fontSize: 13,
                      }}
                    >
                      Cancel
                    </button>
                  </div>
                </div>
              ) : (
                <button
                  onClick={() => {
                    setUpdatingId(r._id)
                    setNewStatus(r.status)
                  }}
                  style={{
                    marginTop: 8,
                    padding: '5px 12px',
                    background: 'none',
                    border: '1px solid #ccc',
                    borderRadius: 6,
                    cursor: 'pointer',
                    fontSize: 12,
                  }}
                >
                  Update Status
                </button>
              )}
            </div>
          )
        })}
      </div>

      {(data?.pages ?? 1) > 1 && (
        <div style={{ display: 'flex', justifyContent: 'center', gap: 8, marginTop: 20 }}>
          <button
            disabled={page <= 1}
            onClick={() => setPage((p) => p - 1)}
            style={{ padding: '6px 14px', borderRadius: 4, border: '1px solid #ccc' }}
          >
            Prev
          </button>
          <span style={{ padding: '6px 10px', fontSize: 13 }}>
            {page} / {data?.pages}
          </span>
          <button
            disabled={page >= (data?.pages ?? 1)}
            onClick={() => setPage((p) => p + 1)}
            style={{ padding: '6px 14px', borderRadius: 4, border: '1px solid #ccc' }}
          >
            Next
          </button>
        </div>
      )}
    </div>
  )
}
