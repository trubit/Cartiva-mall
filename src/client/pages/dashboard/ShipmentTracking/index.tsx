import { useState } from 'react'
import { FiSearch, FiPackage, FiCheckCircle, FiTruck, FiClock, FiXCircle } from 'react-icons/fi'
import { useMyShipments, useShipmentTracking } from '../../../hooks/useShipping.js'
import type { ShipmentStatus } from '../../../../shared/types/shipping.types.js'

const STATUS_LABEL: Record<ShipmentStatus, string> = {
  pending: 'Pending',
  picked_up: 'Picked Up',
  in_transit: 'In Transit',
  out_for_delivery: 'Out for Delivery',
  delivered: 'Delivered',
  failed: 'Delivery Failed',
  cancelled: 'Cancelled',
}

const STATUS_ICON: Record<ShipmentStatus, React.ReactNode> = {
  pending: <FiClock size={14} />,
  picked_up: <FiPackage size={14} />,
  in_transit: <FiTruck size={14} />,
  out_for_delivery: <FiTruck size={14} />,
  delivered: <FiCheckCircle size={14} />,
  failed: <FiXCircle size={14} />,
  cancelled: <FiXCircle size={14} />,
}

function StatusBadge({ status }: { status: ShipmentStatus }) {
  const color =
    status === 'delivered'
      ? '#2ecc71'
      : status === 'failed' || status === 'cancelled'
        ? '#e53e3e'
        : status === 'out_for_delivery'
          ? '#FF9900'
          : '#3182ce'

  return (
    <span
      style={{
        display: 'inline-flex',
        alignItems: 'center',
        gap: 4,
        padding: '3px 10px',
        borderRadius: 12,
        fontSize: 12,
        fontWeight: 600,
        background: color + '22',
        color,
      }}
    >
      {STATUS_ICON[status]} {STATUS_LABEL[status]}
    </span>
  )
}

function TrackingSearch() {
  const [input, setInput] = useState('')
  const [trackingNumber, setTrackingNumber] = useState('')
  const { data, isPending, error } = useShipmentTracking(trackingNumber)

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault()
    if (input.trim()) setTrackingNumber(input.trim().toUpperCase())
  }

  return (
    <div style={{ marginBottom: 24 }}>
      <form onSubmit={handleSearch} style={{ display: 'flex', gap: 8, marginBottom: 16 }}>
        <input
          value={input}
          onChange={(e) => setInput(e.target.value)}
          placeholder="Enter tracking number (e.g. TRK-ABC123DEF456)"
          style={{
            flex: 1,
            padding: '9px 14px',
            border: '1px solid var(--border-color, #ccc)',
            borderRadius: 6,
            fontSize: 14,
            outline: 'none',
          }}
        />
        <button
          type="submit"
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: 6,
            padding: '9px 16px',
            background: '#FF9900',
            border: 'none',
            borderRadius: 6,
            cursor: 'pointer',
            fontWeight: 600,
            fontSize: 14,
          }}
        >
          <FiSearch size={15} /> Track
        </button>
      </form>

      {isPending && trackingNumber && <p style={{ opacity: 0.5, fontSize: 13 }}>Tracking…</p>}
      {error && <p style={{ color: '#e53e3e', fontSize: 13 }}>Shipment not found.</p>}
      {data && (
        <div
          style={{ border: '1px solid var(--border-color, #eee)', borderRadius: 8, padding: 16 }}
        >
          <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 12 }}>
            <div>
              <p style={{ margin: 0, fontWeight: 700 }}>{data.trackingNumber}</p>
              <p style={{ margin: '2px 0 0', fontSize: 13, opacity: 0.6 }}>{data.carrier}</p>
            </div>
            <StatusBadge status={data.status} />
          </div>
          <div>
            {data.events.map((ev, i) => (
              <div
                key={i}
                style={{
                  display: 'flex',
                  gap: 10,
                  paddingBottom: 10,
                  borderLeft: '2px solid var(--border-color, #eee)',
                  marginLeft: 6,
                  paddingLeft: 12,
                }}
              >
                <div>
                  <p style={{ margin: 0, fontSize: 13, fontWeight: 600 }}>
                    {STATUS_LABEL[ev.status]}
                  </p>
                  <p style={{ margin: '2px 0 0', fontSize: 12, opacity: 0.6 }}>
                    {ev.location ?? ''} · {new Date(ev.timestamp).toLocaleString()}
                  </p>
                  {ev.description && (
                    <p style={{ margin: '2px 0 0', fontSize: 12, opacity: 0.5 }}>
                      {ev.description}
                    </p>
                  )}
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  )
}

export default function ShipmentTracking() {
  const [page, setPage] = useState(1)
  const { data, isPending } = useMyShipments(page)
  const items = data?.items ?? []

  return (
    <div style={{ maxWidth: 800, margin: '0 auto', padding: '24px 16px' }}>
      <h1 style={{ margin: '0 0 20px', fontSize: 22, fontWeight: 700 }}>Shipment Tracking</h1>

      <TrackingSearch />

      <h2 style={{ fontSize: 16, fontWeight: 700, marginBottom: 12 }}>My Shipments</h2>

      {isPending && <p style={{ opacity: 0.5 }}>Loading…</p>}

      {!isPending && items.length === 0 && (
        <p style={{ opacity: 0.5, fontSize: 13 }}>No shipments found.</p>
      )}

      <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
        {items.map((s) => (
          <div
            key={s._id}
            style={{
              border: '1px solid var(--border-color, #eee)',
              borderRadius: 8,
              padding: '14px 16px',
              display: 'flex',
              justifyContent: 'space-between',
              alignItems: 'center',
              gap: 12,
            }}
          >
            <div style={{ minWidth: 0 }}>
              <p style={{ margin: 0, fontWeight: 600, fontSize: 14 }}>{s.trackingNumber}</p>
              <p style={{ margin: '2px 0 0', fontSize: 12, opacity: 0.6 }}>
                {s.carrier} · {s.shippingAddress.city}, {s.shippingAddress.country}
              </p>
              {s.estimatedDelivery && (
                <p style={{ margin: '2px 0 0', fontSize: 12, opacity: 0.5 }}>
                  Est. delivery: {new Date(s.estimatedDelivery).toLocaleDateString()}
                </p>
              )}
            </div>
            <StatusBadge status={s.status} />
          </div>
        ))}
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
