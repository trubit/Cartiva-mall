import { useState } from 'react'
import { FiUsers, FiSlash, FiCheckCircle } from 'react-icons/fi'
import {
  useAdminVendorList,
  useSuspendVendor,
  useReinstateVendor,
} from '../../../hooks/useVendor.js'

const PLAN_COLORS: Record<string, string> = {
  free: '#888',
  basic: '#3182ce',
  professional: '#805ad5',
  enterprise: '#FF9900',
}

export default function AdminVendors() {
  const [page, setPage] = useState(1)
  const [suspendingId, setSuspendingId] = useState<string | null>(null)
  const [reason, setReason] = useState('')

  const { data, isPending } = useAdminVendorList(page)
  const suspend = useSuspendVendor()
  const reinstate = useReinstateVendor()

  const vendors = data?.items ?? []

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
        <FiUsers /> Vendor Management
      </h1>

      {isPending && <p style={{ opacity: 0.5 }}>Loading…</p>}

      {!isPending && vendors.length === 0 && (
        <p style={{ opacity: 0.5, fontSize: 13 }}>No sellers found.</p>
      )}

      <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
        {vendors.map((v) => {
          const plan = v.subscription?.plan ?? 'free'
          const planColor = PLAN_COLORS[plan] ?? '#888'

          return (
            <div
              key={v._id}
              style={{
                border: '1px solid var(--border-color, #eee)',
                borderRadius: 8,
                padding: '14px 16px',
              }}
            >
              <div
                style={{
                  display: 'flex',
                  justifyContent: 'space-between',
                  alignItems: 'flex-start',
                }}
              >
                <div>
                  <p style={{ margin: 0, fontWeight: 600, fontSize: 15 }}>
                    {v.firstName} {v.lastName}
                  </p>
                  <p style={{ margin: '2px 0 4px', fontSize: 13, opacity: 0.6 }}>{v.email}</p>
                  <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
                    <span
                      style={{
                        padding: '2px 8px',
                        borderRadius: 10,
                        fontSize: 11,
                        fontWeight: 700,
                        background: planColor + '22',
                        color: planColor,
                      }}
                    >
                      {plan.toUpperCase()}
                    </span>
                    <span
                      style={{
                        padding: '2px 8px',
                        borderRadius: 10,
                        fontSize: 11,
                        fontWeight: 700,
                        background: v.isActive ? '#2ecc7122' : '#e53e3e22',
                        color: v.isActive ? '#2ecc71' : '#e53e3e',
                      }}
                    >
                      {v.isActive ? 'Active' : 'Suspended'}
                    </span>
                    {v.subscription && (
                      <span style={{ fontSize: 11, opacity: 0.5 }}>
                        {(100 - v.subscription.commissionRate * 100).toFixed(0)}% payout rate
                      </span>
                    )}
                  </div>
                  <p style={{ margin: '4px 0 0', fontSize: 11, opacity: 0.4 }}>
                    Joined {new Date(v.createdAt).toLocaleDateString()}
                  </p>
                </div>

                <div style={{ display: 'flex', gap: 8 }}>
                  {v.isActive ? (
                    suspendingId === v._id ? (
                      <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
                        <input
                          value={reason}
                          onChange={(e) => setReason(e.target.value)}
                          placeholder="Reason (optional)"
                          style={{
                            padding: '5px 8px',
                            borderRadius: 4,
                            border: '1px solid #ccc',
                            fontSize: 12,
                          }}
                        />
                        <div style={{ display: 'flex', gap: 4 }}>
                          <button
                            onClick={() => {
                              suspend.mutate({ sellerId: v._id, reason: reason || undefined })
                              setSuspendingId(null)
                              setReason('')
                            }}
                            style={{
                              padding: '4px 10px',
                              background: '#e53e3e',
                              color: '#fff',
                              border: 'none',
                              borderRadius: 4,
                              cursor: 'pointer',
                              fontSize: 12,
                            }}
                          >
                            Confirm
                          </button>
                          <button
                            onClick={() => {
                              setSuspendingId(null)
                              setReason('')
                            }}
                            style={{
                              padding: '4px 8px',
                              background: 'none',
                              border: '1px solid #ccc',
                              borderRadius: 4,
                              cursor: 'pointer',
                              fontSize: 12,
                            }}
                          >
                            Cancel
                          </button>
                        </div>
                      </div>
                    ) : (
                      <button
                        onClick={() => setSuspendingId(v._id)}
                        style={{
                          display: 'flex',
                          alignItems: 'center',
                          gap: 4,
                          padding: '5px 10px',
                          background: '#e53e3e22',
                          color: '#e53e3e',
                          border: '1px solid #e53e3e44',
                          borderRadius: 6,
                          cursor: 'pointer',
                          fontSize: 12,
                          fontWeight: 600,
                        }}
                      >
                        <FiSlash size={12} /> Suspend
                      </button>
                    )
                  ) : (
                    <button
                      onClick={() => reinstate.mutate(v._id)}
                      disabled={reinstate.isPending}
                      style={{
                        display: 'flex',
                        alignItems: 'center',
                        gap: 4,
                        padding: '5px 10px',
                        background: '#2ecc7122',
                        color: '#2ecc71',
                        border: '1px solid #2ecc7144',
                        borderRadius: 6,
                        cursor: 'pointer',
                        fontSize: 12,
                        fontWeight: 600,
                      }}
                    >
                      <FiCheckCircle size={12} /> Reinstate
                    </button>
                  )}
                </div>
              </div>
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
