import { useState } from 'react'
import {
  FiPackage,
  FiAlertTriangle,
  FiActivity,
  FiPlus,
  FiEdit2,
  FiTrash2,
  FiCheck,
} from 'react-icons/fi'
import {
  useWarehouses,
  useCreateWarehouse,
  useUpdateWarehouse,
  useDeleteWarehouse,
  useStockAlerts,
  useMovements,
  useResolveAlert,
} from '../../../hooks/useInventory.js'
import type { IWarehouse } from '../../../services/inventoryService.js'

type Tab = 'warehouses' | 'alerts' | 'movements'

const ALERT_LABELS: Record<string, string> = {
  low_stock: 'Low Stock',
  out_of_stock: 'Out of Stock',
  overstock: 'Overstock',
}
const ALERT_COLORS: Record<string, string> = {
  low_stock: '#f59e0b',
  out_of_stock: '#ef4444',
  overstock: '#3b82f6',
}

const cardStyle: React.CSSProperties = {
  background: 'var(--color-white)',
  border: '1px solid var(--color-neutral-200)',
  borderRadius: 'var(--radius-lg)',
  padding: '1rem 1.25rem',
  marginBottom: '0.75rem',
}

export default function AdminInventory() {
  const [tab, setTab] = useState<Tab>('warehouses')
  const [showForm, setShowForm] = useState(false)
  const [editingWh, setEditingWh] = useState<IWarehouse | null>(null)
  const [form, setForm] = useState({
    name: '',
    code: '',
    capacity: '',
    city: '',
    country: '',
  })

  const { data: warehouses = [] } = useWarehouses()
  const { data: alertsData } = useStockAlerts()
  const { data: movementsData } = useMovements()
  const { mutate: createWh } = useCreateWarehouse()
  const { mutate: updateWh } = useUpdateWarehouse()
  const { mutate: deleteWh } = useDeleteWarehouse()
  const { mutate: resolveAlert } = useResolveAlert()

  const alerts = alertsData?.items ?? []
  const movements = movementsData?.items ?? []

  const resetForm = () => {
    setForm({ name: '', code: '', capacity: '', city: '', country: '' })
    setEditingWh(null)
    setShowForm(false)
  }

  const openEdit = (wh: IWarehouse) => {
    setEditingWh(wh)
    setForm({
      name: wh.name,
      code: wh.code,
      capacity: String(wh.capacity),
      city: wh.address.city,
      country: wh.address.country,
    })
    setShowForm(true)
  }

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    const payload = {
      name: form.name,
      code: form.code.toUpperCase(),
      capacity: Number(form.capacity),
      address: { street: '', city: form.city, state: '', country: form.country, postalCode: '' },
    }
    if (editingWh) {
      updateWh({ id: editingWh._id, data: payload }, { onSuccess: resetForm })
    } else {
      createWh(payload, { onSuccess: resetForm })
    }
  }

  const tabStyle = (t: Tab): React.CSSProperties => ({
    padding: '0.5rem 1rem',
    border: 'none',
    background: tab === t ? 'var(--color-brand-accent)' : 'var(--color-neutral-100)',
    color: tab === t ? '#fff' : 'var(--color-brand-text)',
    borderRadius: 'var(--radius-md)',
    cursor: 'pointer',
    fontWeight: 600,
    fontSize: 'var(--text-sm)',
  })

  return (
    <div style={{ padding: '1.5rem' }}>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '1.5rem' }}>
        <h1 style={{ fontWeight: 700, fontSize: 'var(--text-xl)' }}>Inventory Management</h1>
        {tab === 'warehouses' && (
          <button
            onClick={() => setShowForm(true)}
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: 6,
              padding: '0.5rem 1rem',
              background: 'var(--color-brand-accent)',
              color: '#fff',
              border: 'none',
              borderRadius: 'var(--radius-md)',
              fontWeight: 600,
              cursor: 'pointer',
            }}
          >
            <FiPlus size={14} /> Add Warehouse
          </button>
        )}
      </div>

      {/* Tabs */}
      <div style={{ display: 'flex', gap: 8, marginBottom: '1.5rem' }}>
        <button style={tabStyle('warehouses')} onClick={() => setTab('warehouses')}>
          <FiPackage size={13} style={{ marginRight: 6 }} />
          Warehouses ({warehouses.length})
        </button>
        <button style={tabStyle('alerts')} onClick={() => setTab('alerts')}>
          <FiAlertTriangle size={13} style={{ marginRight: 6 }} />
          Alerts ({alerts.length})
        </button>
        <button style={tabStyle('movements')} onClick={() => setTab('movements')}>
          <FiActivity size={13} style={{ marginRight: 6 }} />
          Movements
        </button>
      </div>

      {/* Warehouse form */}
      {showForm && tab === 'warehouses' && (
        <div
          style={{
            ...cardStyle,
            marginBottom: '1.5rem',
            background: 'var(--color-neutral-50)',
          }}
        >
          <h3 style={{ fontWeight: 700, marginBottom: '1rem' }}>
            {editingWh ? 'Edit Warehouse' : 'New Warehouse'}
          </h3>
          <form onSubmit={handleSubmit} style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.75rem' }}>
            <div>
              <label style={{ fontSize: 'var(--text-xs)', fontWeight: 600, display: 'block', marginBottom: 4 }}>
                Name *
              </label>
              <input
                className="form-control"
                value={form.name}
                onChange={(e) => setForm((p) => ({ ...p, name: e.target.value }))}
                required
                placeholder="Main Warehouse"
              />
            </div>
            <div>
              <label style={{ fontSize: 'var(--text-xs)', fontWeight: 600, display: 'block', marginBottom: 4 }}>
                Code *
              </label>
              <input
                className="form-control"
                value={form.code}
                onChange={(e) => setForm((p) => ({ ...p, code: e.target.value }))}
                required
                placeholder="WH-01"
                maxLength={20}
              />
            </div>
            <div>
              <label style={{ fontSize: 'var(--text-xs)', fontWeight: 600, display: 'block', marginBottom: 4 }}>
                City
              </label>
              <input
                className="form-control"
                value={form.city}
                onChange={(e) => setForm((p) => ({ ...p, city: e.target.value }))}
                placeholder="Lagos"
              />
            </div>
            <div>
              <label style={{ fontSize: 'var(--text-xs)', fontWeight: 600, display: 'block', marginBottom: 4 }}>
                Country
              </label>
              <input
                className="form-control"
                value={form.country}
                onChange={(e) => setForm((p) => ({ ...p, country: e.target.value }))}
                placeholder="Nigeria"
              />
            </div>
            <div>
              <label style={{ fontSize: 'var(--text-xs)', fontWeight: 600, display: 'block', marginBottom: 4 }}>
                Capacity (units)
              </label>
              <input
                type="number"
                className="form-control"
                value={form.capacity}
                onChange={(e) => setForm((p) => ({ ...p, capacity: e.target.value }))}
                placeholder="10000"
                min={0}
              />
            </div>
            <div style={{ display: 'flex', alignItems: 'flex-end', gap: 8 }}>
              <button type="submit" className="btn btn-primary" style={{ flex: 1 }}>
                {editingWh ? 'Save Changes' : 'Create'}
              </button>
              <button type="button" onClick={resetForm} className="btn" style={{ flex: 1 }}>
                Cancel
              </button>
            </div>
          </form>
        </div>
      )}

      {/* Warehouses tab */}
      {tab === 'warehouses' && (
        <div>
          {warehouses.length === 0 && (
            <p style={{ color: 'var(--color-neutral-400)', fontSize: 'var(--text-sm)' }}>
              No warehouses yet. Add one to get started.
            </p>
          )}
          {warehouses.map((wh) => (
            <div key={wh._id} style={{ ...cardStyle, display: 'flex', alignItems: 'center', gap: '1rem' }}>
              <div
                style={{
                  width: 40,
                  height: 40,
                  borderRadius: 'var(--radius-md)',
                  background: 'var(--color-brand-light)',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  flexShrink: 0,
                }}
              >
                <FiPackage size={18} color="var(--color-brand-accent)" />
              </div>
              <div style={{ flex: 1 }}>
                <div style={{ fontWeight: 700 }}>{wh.name}</div>
                <div style={{ fontSize: 'var(--text-xs)', color: 'var(--color-neutral-500)' }}>
                  {wh.code} · {wh.address.city}{wh.address.country ? `, ${wh.address.country}` : ''}
                  {wh.capacity > 0 ? ` · ${wh.capacity.toLocaleString()} units capacity` : ''}
                </div>
              </div>
              <div
                style={{
                  padding: '2px 8px',
                  borderRadius: 'var(--radius-full)',
                  fontSize: 'var(--text-xs)',
                  fontWeight: 600,
                  background: wh.isActive ? 'var(--color-success-50)' : 'var(--color-neutral-100)',
                  color: wh.isActive ? 'var(--color-success)' : 'var(--color-neutral-400)',
                }}
              >
                {wh.isActive ? 'Active' : 'Inactive'}
              </div>
              <div style={{ display: 'flex', gap: 8 }}>
                <button
                  onClick={() => openEdit(wh)}
                  style={{
                    background: 'none',
                    border: '1px solid var(--color-neutral-200)',
                    borderRadius: 'var(--radius-md)',
                    padding: '6px 8px',
                    cursor: 'pointer',
                    color: 'var(--color-neutral-500)',
                  }}
                >
                  <FiEdit2 size={13} />
                </button>
                <button
                  onClick={() => {
                    if (confirm('Delete this warehouse?')) deleteWh(wh._id)
                  }}
                  style={{
                    background: 'none',
                    border: '1px solid var(--color-neutral-200)',
                    borderRadius: 'var(--radius-md)',
                    padding: '6px 8px',
                    cursor: 'pointer',
                    color: 'var(--color-danger)',
                  }}
                >
                  <FiTrash2 size={13} />
                </button>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Alerts tab */}
      {tab === 'alerts' && (
        <div>
          {alerts.length === 0 && (
            <p style={{ color: 'var(--color-neutral-400)', fontSize: 'var(--text-sm)' }}>
              No active alerts.
            </p>
          )}
          {alerts.map((alert) => {
            const prod = typeof alert.productId === 'object' ? alert.productId : null
            const wh = typeof alert.warehouseId === 'object' ? alert.warehouseId : null
            return (
              <div key={alert._id} style={{ ...cardStyle, display: 'flex', alignItems: 'center', gap: '1rem' }}>
                <div
                  style={{
                    width: 10,
                    height: 10,
                    borderRadius: '50%',
                    background: ALERT_COLORS[alert.alertType] ?? '#ccc',
                    flexShrink: 0,
                  }}
                />
                <div style={{ flex: 1 }}>
                  <div style={{ fontWeight: 600, fontSize: 'var(--text-sm)' }}>
                    {prod?.title ?? String(alert.productId)}
                  </div>
                  <div style={{ fontSize: 'var(--text-xs)', color: 'var(--color-neutral-500)' }}>
                    {wh?.name ?? 'Unknown warehouse'} · {ALERT_LABELS[alert.alertType]} ·{' '}
                    {alert.currentQuantity} units
                  </div>
                </div>
                <span
                  style={{
                    padding: '2px 8px',
                    borderRadius: 'var(--radius-full)',
                    fontSize: 'var(--text-xs)',
                    fontWeight: 700,
                    background: ALERT_COLORS[alert.alertType] + '20',
                    color: ALERT_COLORS[alert.alertType],
                  }}
                >
                  {ALERT_LABELS[alert.alertType]}
                </span>
                <button
                  onClick={() => resolveAlert(alert._id)}
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: 4,
                    background: 'none',
                    border: '1px solid var(--color-neutral-200)',
                    borderRadius: 'var(--radius-md)',
                    padding: '5px 10px',
                    cursor: 'pointer',
                    fontSize: 'var(--text-xs)',
                    fontWeight: 600,
                    color: 'var(--color-success)',
                  }}
                >
                  <FiCheck size={12} /> Resolve
                </button>
              </div>
            )
          })}
        </div>
      )}

      {/* Movements tab */}
      {tab === 'movements' && (
        <div style={{ overflowX: 'auto' }}>
          <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 'var(--text-sm)' }}>
            <thead>
              <tr style={{ borderBottom: '2px solid var(--color-neutral-100)' }}>
                {['Product', 'Warehouse', 'Type', 'Qty', 'Note', 'By', 'Date'].map((h) => (
                  <th key={h} style={{ padding: '0.5rem 0.75rem', textAlign: 'left', fontWeight: 600 }}>
                    {h}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {movements.length === 0 && (
                <tr>
                  <td colSpan={7} style={{ padding: '2rem', textAlign: 'center', color: 'var(--color-neutral-400)' }}>
                    No movements yet.
                  </td>
                </tr>
              )}
              {movements.map((m) => {
                const prod = typeof m.productId === 'object' ? m.productId : null
                const wh = typeof m.warehouseId === 'object' ? m.warehouseId : null
                const by = typeof m.createdBy === 'object' ? m.createdBy : null
                return (
                  <tr key={m._id} style={{ borderBottom: '1px solid var(--color-neutral-100)' }}>
                    <td style={{ padding: '0.5rem 0.75rem' }}>{prod?.title ?? '—'}</td>
                    <td style={{ padding: '0.5rem 0.75rem' }}>{wh?.name ?? '—'}</td>
                    <td style={{ padding: '0.5rem 0.75rem' }}>
                      <span
                        style={{
                          padding: '2px 6px',
                          borderRadius: 'var(--radius-sm)',
                          fontSize: 'var(--text-xs)',
                          fontWeight: 600,
                          background:
                            m.type === 'in' || m.type === 'release'
                              ? 'var(--color-success-50)'
                              : m.type === 'out' || m.type === 'reservation'
                                ? '#fee2e2'
                                : 'var(--color-neutral-100)',
                          color:
                            m.type === 'in' || m.type === 'release'
                              ? 'var(--color-success)'
                              : m.type === 'out' || m.type === 'reservation'
                                ? '#dc2626'
                                : 'var(--color-neutral-500)',
                        }}
                      >
                        {m.type}
                      </span>
                    </td>
                    <td style={{ padding: '0.5rem 0.75rem', fontVariantNumeric: 'tabular-nums' }}>
                      {m.quantity > 0 ? '+' : ''}{m.quantity}
                    </td>
                    <td style={{ padding: '0.5rem 0.75rem', color: 'var(--color-neutral-500)' }}>
                      {m.note ?? '—'}
                    </td>
                    <td style={{ padding: '0.5rem 0.75rem' }}>
                      {by ? `${by.firstName} ${by.lastName}` : '—'}
                    </td>
                    <td style={{ padding: '0.5rem 0.75rem', color: 'var(--color-neutral-400)', fontSize: 'var(--text-xs)' }}>
                      {new Date(m.createdAt).toLocaleDateString()}
                    </td>
                  </tr>
                )
              })}
            </tbody>
          </table>
        </div>
      )}
    </div>
  )
}
