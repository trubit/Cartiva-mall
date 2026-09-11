import { useState } from 'react'
import { FiPackage } from 'react-icons/fi'
import { useMyReturns } from '../../../hooks/useReturns.js'
import { useCurrency } from '../../../hooks/useCurrency.js'
import type { IReturn, ReturnStatus } from '../../../../shared/types/returns.types.js'

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
        backgroundColor: `${color}20`,
        color,
        border: `1px solid ${color}40`,
        borderRadius: 12,
        padding: '2px 8px',
        fontSize: 11,
        fontWeight: 600,
        textTransform: 'capitalize',
      }}
    >
      {label}
    </span>
  )
}

export default function ReturnsPage() {
  const [page, setPage] = useState(1)
  const { data, isLoading } = useMyReturns(page)
  const { formatPrice } = useCurrency()

  if (isLoading) return <div style={{ padding: 24 }}>Loading returns...</div>

  const returns: IReturn[] = data?.items ?? []

  return (
    <div style={{ maxWidth: 800, margin: '0 auto', padding: '24px 16px' }}>
      <h1 style={{ fontSize: 22, fontWeight: 700, marginBottom: 4 }}>My Returns</h1>
      <p style={{ color: 'var(--text-muted, #666)', fontSize: 13, marginBottom: 24 }}>
        Track your return requests and refunds
      </p>

      {returns.length === 0 && (
        <div style={{ textAlign: 'center', padding: '48px 0', opacity: 0.5 }}>
          <FiPackage size={40} style={{ marginBottom: 8 }} />
          <p>No return requests found.</p>
        </div>
      )}

      <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
        {returns.map((r: IReturn) => {
          const orderRef =
            typeof r.orderId === 'object' && r.orderId !== null
              ? ((r.orderId as { orderNumber?: string; _id?: string }).orderNumber ??
                (r.orderId as { _id?: string })._id)
              : String(r.orderId)

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
              <p style={{ margin: 0, fontSize: 13, opacity: 0.7 }}>{r.description ?? r.reason}</p>
              {r.refundAmount != null && (
                <p style={{ margin: '6px 0 0', fontSize: 13, fontWeight: 600, color: '#2ecc71' }}>
                  Refund: {formatPrice(r.refundAmount)}
                </p>
              )}
              <p style={{ margin: '4px 0 0', fontSize: 11, opacity: 0.4 }}>
                Submitted {new Date(r.createdAt).toLocaleDateString()}
              </p>
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
