import { useState } from 'react'
import { FiTruck, FiChevronDown } from 'react-icons/fi'
import { useAllShipments, useUpdateShipmentStatus } from '../../../hooks/useShipping.js'
import type { ShipmentStatus } from '../../../../shared/types/shipping.types.js'

const STATUSES: ShipmentStatus[] = [
  'pending',
  'picked_up',
  'in_transit',
  'out_for_delivery',
  'delivered',
  'failed',
  'cancelled',
]

const STATUS_LABEL: Record<ShipmentStatus, string> = {
  pending: 'Pending',
  picked_up: 'Picked Up',
  in_transit: 'In Transit',
  out_for_delivery: 'Out for Delivery',
  delivered: 'Delivered',
  failed: 'Failed',
  cancelled: 'Cancelled',
}

const STATUS_COLOR: Record<ShipmentStatus, string> = {
  pending: '#888',
  picked_up: '#3182ce',
  in_transit: '#3182ce',
  out_for_delivery: '#FF9900',
  delivered: '#2ecc71',
  failed: '#e53e3e',
  cancelled: '#e53e3e',
}

function StatusBadge({ status }: { status: ShipmentStatus }) {
  const color = STATUS_COLOR[status]
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
      {STATUS_LABEL[status]}
    </span>
  )
}

export default function AdminShipping() {
  const [page, setPage] = useState(1)
  const [filterStatus, setFilterStatus] = useState<ShipmentStatus | undefined>()
  const { data, isPending } = useAllShipments(page, filterStatus)
  const updateStatus = useUpdateShipmentStatus()
  const [updatingId, setUpdatingId] = useState<string | null>(null)
  const [newStatus, setNewStatus] = useState<ShipmentStatus>('in_transit')

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
        <FiTruck /> Shipping Management
      </h1>

      {/* Filter */}
      <div style={{ marginBottom: 16, display: 'flex', gap: 8, alignItems: 'center' }}>
        <label style={{ fontSize: 13, fontWeight: 600 }}>Filter:</label>
        <select
          value={filterStatus ?? ''}
          onChange={(e) => {
            setFilterStatus((e.target.value as ShipmentStatus) || undefined)
            setPage(1)
          }}
          style={{
            padding: '6px 10px',
            borderRadius: 6,
            border: '1px solid var(--border-color, #ccc)',
            fontSize: 13,
          }}
        >
          <option value="">All Statuses</option>
          {STATUSES.map((s) => (
            <option key={s} value={s}>
              {STATUS_LABEL[s]}
            </option>
          ))}
        </select>
      </div>

      {isPending && <p style={{ opacity: 0.5 }}>Loading…</p>}

      <div style={{ overflowX: 'auto' }}>
        <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 13 }}>
          <thead>
            <tr style={{ borderBottom: '2px solid var(--border-color, #eee)', textAlign: 'left' }}>
              <th style={{ padding: '8px 12px' }}>Tracking #</th>
              <th style={{ padding: '8px 12px' }}>Carrier</th>
              <th style={{ padding: '8px 12px' }}>Destination</th>
              <th style={{ padding: '8px 12px' }}>Status</th>
              <th style={{ padding: '8px 12px' }}>Created</th>
              <th style={{ padding: '8px 12px' }}>Action</th>
            </tr>
          </thead>
          <tbody>
            {items.map((s) => (
              <tr key={s._id} style={{ borderBottom: '1px solid var(--border-color, #eee)' }}>
                <td style={{ padding: '10px 12px', fontFamily: 'monospace', fontWeight: 600 }}>
                  {s.trackingNumber}
                </td>
                <td style={{ padding: '10px 12px' }}>{s.carrier}</td>
                <td style={{ padding: '10px 12px' }}>
                  {s.shippingAddress.city}, {s.shippingAddress.country}
                </td>
                <td style={{ padding: '10px 12px' }}>
                  <StatusBadge status={s.status} />
                </td>
                <td style={{ padding: '10px 12px' }}>
                  {new Date(s.createdAt).toLocaleDateString()}
                </td>
                <td style={{ padding: '10px 12px' }}>
                  {updatingId === s._id ? (
                    <div style={{ display: 'flex', gap: 4 }}>
                      <select
                        value={newStatus}
                        onChange={(e) => setNewStatus(e.target.value as ShipmentStatus)}
                        style={{
                          padding: '4px 6px',
                          borderRadius: 4,
                          border: '1px solid #ccc',
                          fontSize: 12,
                        }}
                      >
                        {STATUSES.map((st) => (
                          <option key={st} value={st}>
                            {STATUS_LABEL[st]}
                          </option>
                        ))}
                      </select>
                      <button
                        onClick={() => {
                          updateStatus.mutate({ id: s._id, status: newStatus })
                          setUpdatingId(null)
                        }}
                        style={{
                          padding: '4px 8px',
                          background: '#FF9900',
                          border: 'none',
                          borderRadius: 4,
                          cursor: 'pointer',
                          fontSize: 12,
                        }}
                      >
                        Save
                      </button>
                      <button
                        onClick={() => setUpdatingId(null)}
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
                  ) : (
                    <button
                      onClick={() => {
                        setUpdatingId(s._id)
                        setNewStatus(s.status)
                      }}
                      style={{
                        padding: '4px 10px',
                        background: 'none',
                        border: '1px solid #ccc',
                        borderRadius: 4,
                        cursor: 'pointer',
                        fontSize: 12,
                        display: 'flex',
                        alignItems: 'center',
                        gap: 4,
                      }}
                    >
                      Update <FiChevronDown size={11} />
                    </button>
                  )}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
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
