import { useState, useEffect } from 'react'
import {
  FiTruck,
  FiChevronDown,
  FiDollarSign,
  FiCheck,
  FiAlertCircle,
  FiSave,
  FiClock,
} from 'react-icons/fi'
import {
  useAllShipments,
  useUpdateShipmentStatus,
  useAdminShippingConfig,
  useUpdateAdminShippingConfig,
} from '../../../hooks/useShipping.js'
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

const CURRENCIES = ['NGN', 'USD', 'EUR', 'GBP', 'CAD', 'AUD']

export default function AdminShipping() {
  const [page, setPage] = useState(1)
  const [filterStatus, setFilterStatus] = useState<ShipmentStatus | undefined>()
  const { data, isPending } = useAllShipments(page, filterStatus)
  const updateStatus = useUpdateShipmentStatus()
  const [updatingId, setUpdatingId] = useState<string | null>(null)
  const [newStatus, setNewStatus] = useState<ShipmentStatus>('in_transit')

  // Shipping Config state
  const { data: configData, isLoading: isConfigLoading } = useAdminShippingConfig()
  const updateConfig = useUpdateAdminShippingConfig()
  const [ratesForm, setRatesForm] = useState<Record<string, number>>({})
  const [updateNote, setUpdateNote] = useState('')
  const [successMsg, setSuccessMsg] = useState<string | null>(null)
  const [errorMsg, setErrorMsg] = useState<string | null>(null)

  useEffect(() => {
    if (configData?.rates) {
      setRatesForm(configData.rates)
    } else if (configData?.fixedRates) {
      const fixed = configData.fixedRates as any
      if (fixed instanceof Map) {
        const obj: Record<string, number> = {}
        fixed.forEach((v: number, k: string) => {
          obj[k] = v
        })
        setRatesForm(obj)
      } else if (typeof fixed === 'object') {
        setRatesForm(fixed)
      }
    }
  }, [configData])

  const handleRateChange = (currency: string, value: string) => {
    const num = parseFloat(value)
    setRatesForm((prev) => ({
      ...prev,
      [currency]: isNaN(num) ? 0 : num,
    }))
  }

  const handleSaveConfig = async (e: React.FormEvent) => {
    e.preventDefault()
    setErrorMsg(null)
    setSuccessMsg(null)

    // Validate inputs
    for (const curr of CURRENCIES) {
      const val = ratesForm[curr]
      if (typeof val !== 'number' || val < 0 || isNaN(val)) {
        setErrorMsg(`Invalid shipping rate for ${curr}: must be a non-negative number`)
        return
      }
    }

    try {
      await updateConfig.mutateAsync({ rates: ratesForm, note: updateNote.trim() || undefined })
      setSuccessMsg('Authoritative shipping prices successfully updated and saved!')
      setUpdateNote('')
      setTimeout(() => setSuccessMsg(null), 4000)
    } catch (err: any) {
      setErrorMsg(err?.response?.data?.message || 'Failed to update shipping configuration')
    }
  }

  const items = data?.items ?? []

  return (
    <div style={{ padding: '24px 20px', maxWidth: 1200, margin: '0 auto' }}>
      <h1
        style={{
          margin: '0 0 20px',
          fontSize: 22,
          fontWeight: 700,
          display: 'flex',
          alignItems: 'center',
          gap: 8,
          color: '#f8fafc',
        }}
      >
        <FiTruck /> Shipping & Delivery Management
      </h1>

      {/* ─── Admin Shipping Price Configuration Card ────────────────────── */}
      <section
        style={{
          background: 'rgba(255, 255, 255, 0.04)',
          border: '1px solid rgba(255, 255, 255, 0.1)',
          borderRadius: 12,
          padding: 24,
          marginBottom: 32,
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 8 }}>
          <div
            style={{
              width: 36,
              height: 36,
              borderRadius: 8,
              background: 'rgba(255, 153, 0, 0.15)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              color: '#FF9900',
            }}
          >
            <FiDollarSign size={20} />
          </div>
          <div>
            <h2 style={{ fontSize: '1.2rem', fontWeight: 700, margin: 0, color: '#f8fafc' }}>
              Authoritative Fixed Shipping Prices
            </h2>
            <p style={{ margin: '4px 0 0', fontSize: '0.85rem', color: '#94a3b8' }}>
              Cartiva uses administrator-controlled fixed shipping fees. Changes immediately apply
              to all new checkout sessions.
            </p>
          </div>
        </div>

        {successMsg && (
          <div
            style={{
              padding: '12px 16px',
              borderRadius: 8,
              background: 'rgba(34, 197, 94, 0.15)',
              border: '1px solid rgba(34, 197, 94, 0.3)',
              color: '#4ade80',
              fontSize: '0.9rem',
              display: 'flex',
              alignItems: 'center',
              gap: 8,
              margin: '16px 0',
            }}
          >
            <FiCheck /> {successMsg}
          </div>
        )}

        {errorMsg && (
          <div
            style={{
              padding: '12px 16px',
              borderRadius: 8,
              background: 'rgba(239, 68, 68, 0.15)',
              border: '1px solid rgba(239, 68, 68, 0.3)',
              color: '#f87171',
              fontSize: '0.9rem',
              display: 'flex',
              alignItems: 'center',
              gap: 8,
              margin: '16px 0',
            }}
          >
            <FiAlertCircle /> {errorMsg}
          </div>
        )}

        <form onSubmit={handleSaveConfig} style={{ marginTop: 16 }}>
          <div
            style={{
              display: 'grid',
              gridTemplateColumns: 'repeat(auto-fit, minmax(170px, 1fr))',
              gap: 16,
              marginBottom: 20,
            }}
          >
            {CURRENCIES.map((curr) => (
              <div
                key={curr}
                style={{
                  background: 'rgba(255, 255, 255, 0.03)',
                  border: '1px solid rgba(255, 255, 255, 0.08)',
                  borderRadius: 8,
                  padding: 12,
                }}
              >
                <label
                  style={{
                    display: 'block',
                    fontSize: '0.82rem',
                    fontWeight: 700,
                    color: '#94a3b8',
                    marginBottom: 6,
                    textTransform: 'uppercase',
                  }}
                >
                  {curr} Shipping Fee
                </label>
                <div style={{ position: 'relative', display: 'flex', alignItems: 'center' }}>
                  <input
                    type="number"
                    step="0.01"
                    min="0"
                    value={ratesForm[curr] ?? ''}
                    onChange={(e) => handleRateChange(curr, e.target.value)}
                    disabled={isConfigLoading || updateConfig.isPending}
                    style={{
                      width: '100%',
                      padding: '8px 10px',
                      borderRadius: 6,
                      border: '1px solid rgba(255, 255, 255, 0.15)',
                      background: '#131921',
                      color: '#f8fafc',
                      fontSize: '0.95rem',
                      fontWeight: 600,
                    }}
                  />
                </div>
              </div>
            ))}
          </div>

          <div style={{ display: 'flex', gap: 12, alignItems: 'center', flexWrap: 'wrap' }}>
            <input
              type="text"
              placeholder="Reason or note for rate adjustment (optional)…"
              value={updateNote}
              onChange={(e) => setUpdateNote(e.target.value)}
              style={{
                flex: 1,
                minWidth: 260,
                padding: '10px 14px',
                borderRadius: 6,
                border: '1px solid rgba(255, 255, 255, 0.15)',
                background: '#131921',
                color: '#f8fafc',
                fontSize: '0.88rem',
              }}
            />
            <button
              type="submit"
              disabled={isConfigLoading || updateConfig.isPending}
              style={{
                padding: '10px 22px',
                background: '#FF9900',
                color: '#131921',
                border: 'none',
                borderRadius: 6,
                fontWeight: 700,
                fontSize: '0.9rem',
                cursor: updateConfig.isPending ? 'wait' : 'pointer',
                display: 'flex',
                alignItems: 'center',
                gap: 8,
              }}
            >
              <FiSave /> {updateConfig.isPending ? 'Saving Rates…' : 'Save Shipping Prices'}
            </button>
          </div>

          {configData?.updatedAt && (
            <div
              style={{
                marginTop: 12,
                fontSize: '0.78rem',
                color: '#64748b',
                display: 'flex',
                alignItems: 'center',
                gap: 6,
              }}
            >
              <FiClock /> Last updated: {new Date(configData.updatedAt).toLocaleString()}
            </div>
          )}
        </form>
      </section>

      {/* ─── Shipment Tracking Table ────────────────────────────────────── */}
      <h2 style={{ fontSize: '1.2rem', fontWeight: 700, margin: '0 0 14px', color: '#f8fafc' }}>
        Active Order Shipments
      </h2>

      {/* Filter */}
      <div style={{ marginBottom: 16, display: 'flex', gap: 8, alignItems: 'center' }}>
        <label style={{ fontSize: 13, fontWeight: 600, color: '#94a3b8' }}>Filter:</label>
        <select
          value={filterStatus ?? ''}
          onChange={(e) => {
            setFilterStatus((e.target.value as ShipmentStatus) || undefined)
            setPage(1)
          }}
          style={{
            padding: '6px 10px',
            borderRadius: 6,
            border: '1px solid rgba(255, 255, 255, 0.15)',
            background: '#131921',
            color: '#f8fafc',
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

      {isPending && <p style={{ opacity: 0.5, color: '#94a3b8' }}>Loading shipments…</p>}

      <div
        style={{
          overflowX: 'auto',
          background: 'rgba(255, 255, 255, 0.02)',
          borderRadius: 8,
          border: '1px solid rgba(255, 255, 255, 0.08)',
        }}
      >
        <table
          style={{ width: '100%', borderCollapse: 'collapse', fontSize: 13, color: '#cbd5e1' }}
        >
          <thead>
            <tr
              style={{
                borderBottom: '1px solid rgba(255, 255, 255, 0.1)',
                textAlign: 'left',
                color: '#94a3b8',
              }}
            >
              <th style={{ padding: '10px 12px' }}>Tracking #</th>
              <th style={{ padding: '10px 12px' }}>Carrier</th>
              <th style={{ padding: '10px 12px' }}>Destination</th>
              <th style={{ padding: '10px 12px' }}>Status</th>
              <th style={{ padding: '10px 12px' }}>Created</th>
              <th style={{ padding: '10px 12px' }}>Action</th>
            </tr>
          </thead>
          <tbody>
            {items.map((s) => (
              <tr key={s._id} style={{ borderBottom: '1px solid rgba(255, 255, 255, 0.05)' }}>
                <td
                  style={{
                    padding: '10px 12px',
                    fontFamily: 'monospace',
                    fontWeight: 600,
                    color: '#f8fafc',
                  }}
                >
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
                          background: '#131921',
                          color: '#fff',
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
                          color: '#131921',
                          fontWeight: 700,
                        }}
                      >
                        Save
                      </button>
                      <button
                        onClick={() => setUpdatingId(null)}
                        style={{
                          padding: '4px 8px',
                          background: 'none',
                          border: '1px solid #555',
                          borderRadius: 4,
                          cursor: 'pointer',
                          fontSize: 12,
                          color: '#ccc',
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
                        background: 'rgba(255, 255, 255, 0.05)',
                        border: '1px solid rgba(255, 255, 255, 0.2)',
                        borderRadius: 4,
                        cursor: 'pointer',
                        fontSize: 12,
                        color: '#f8fafc',
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
            style={{
              padding: '6px 14px',
              borderRadius: 4,
              border: '1px solid #555',
              background: '#131921',
              color: '#fff',
            }}
          >
            Prev
          </button>
          <span style={{ padding: '6px 10px', fontSize: 13, color: '#94a3b8' }}>
            {page} / {data?.pages}
          </span>
          <button
            disabled={page >= (data?.pages ?? 1)}
            onClick={() => setPage((p) => p + 1)}
            style={{
              padding: '6px 14px',
              borderRadius: 4,
              border: '1px solid #555',
              background: '#131921',
              color: '#fff',
            }}
          >
            Next
          </button>
        </div>
      )}
    </div>
  )
}
