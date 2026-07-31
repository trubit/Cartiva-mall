import { useState } from 'react'
import { FiPackage, FiPlusCircle, FiMinusCircle, FiActivity } from 'react-icons/fi'
import { useWarehouses, useMovements, useStockAlerts, useResolveAlert } from '../../hooks/useInventory.js'
import { inventoryService } from '../../services/inventoryService.js'
import { useSellerProducts } from '../../hooks/useProducts.js'
import { useQueryClient } from '@tanstack/react-query'
import { INVENTORY_KEYS } from '../../hooks/useInventory.js'

type ActionType = 'in' | 'out' | 'set'

export default function SellerInventory() {
  const qc = useQueryClient()
  const { data: productsData } = useSellerProducts()
  const { data: warehouses = [] } = useWarehouses(true)
  const { data: alertsData } = useStockAlerts()
  const { data: movementsData } = useMovements()
  const { mutate: resolveAlert } = useResolveAlert()

  const products = productsData?.data ?? []
  const alerts = alertsData?.items ?? []
  const movements = movementsData?.items ?? []

  const [selectedProduct, setSelectedProduct] = useState('')
  const [selectedWarehouse, setSelectedWarehouse] = useState('')
  const [action, setAction] = useState<ActionType>('in')
  const [quantity, setQuantity] = useState(1)
  const [threshold, setThreshold] = useState(10)
  const [note, setNote] = useState('')
  const [loading, setLoading] = useState(false)
  const [message, setMessage] = useState('')

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!selectedProduct || !selectedWarehouse) return
    setLoading(true)
    setMessage('')
    try {
      if (action === 'set') {
        await inventoryService.setInventory(selectedProduct, selectedWarehouse, quantity, threshold)
      } else if (action === 'in') {
        await inventoryService.stockIn(selectedProduct, selectedWarehouse, quantity, note || undefined)
      } else {
        await inventoryService.stockOut(selectedProduct, selectedWarehouse, quantity, note || undefined)
      }
      setMessage('Stock updated successfully')
      void qc.invalidateQueries({ queryKey: INVENTORY_KEYS.all })
      setQuantity(1)
      setNote('')
    } catch (err: unknown) {
      const e = err as { response?: { data?: { message?: string } } }
      setMessage(e?.response?.data?.message ?? 'Error updating stock')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div style={{ padding: '1.5rem' }}>
      <h1 style={{ fontWeight: 700, fontSize: 'var(--text-xl)', marginBottom: '1.5rem' }}>
        Inventory Management
      </h1>

      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1.5rem', marginBottom: '2rem' }}>
        {/* Stock adjustment form */}
        <div
          style={{
            background: 'var(--color-white)',
            border: '1px solid var(--color-neutral-200)',
            borderRadius: 'var(--radius-lg)',
            padding: '1.25rem',
          }}
        >
          <h2 style={{ fontWeight: 700, fontSize: 'var(--text-base)', marginBottom: '1rem', display: 'flex', alignItems: 'center', gap: 8 }}>
            <FiPackage size={16} /> Update Stock
          </h2>

          <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
            <div>
              <label style={{ fontSize: 'var(--text-xs)', fontWeight: 600, display: 'block', marginBottom: 4 }}>
                Product
              </label>
              <select
                className="form-control"
                value={selectedProduct}
                onChange={(e) => setSelectedProduct(e.target.value)}
                required
              >
                <option value="">Select a product…</option>
                {products.map((p) => (
                  <option key={p._id} value={p._id}>
                    {p.title} ({p.sku})
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label style={{ fontSize: 'var(--text-xs)', fontWeight: 600, display: 'block', marginBottom: 4 }}>
                Warehouse
              </label>
              {warehouses.length === 0 ? (
                <p style={{ fontSize: 'var(--text-xs)', color: 'var(--color-neutral-400)' }}>
                  No active warehouses configured. Contact admin.
                </p>
              ) : (
                <select
                  className="form-control"
                  value={selectedWarehouse}
                  onChange={(e) => setSelectedWarehouse(e.target.value)}
                  required
                >
                  <option value="">Select warehouse…</option>
                  {warehouses.map((wh) => (
                    <option key={wh._id} value={wh._id}>
                      {wh.name} ({wh.code})
                    </option>
                  ))}
                </select>
              )}
            </div>

            <div>
              <label style={{ fontSize: 'var(--text-xs)', fontWeight: 600, display: 'block', marginBottom: 4 }}>
                Action
              </label>
              <div style={{ display: 'flex', gap: 8 }}>
                {(['in', 'out', 'set'] as ActionType[]).map((a) => (
                  <button
                    key={a}
                    type="button"
                    onClick={() => setAction(a)}
                    style={{
                      flex: 1,
                      padding: '0.4rem',
                      border: '1px solid var(--color-neutral-200)',
                      borderRadius: 'var(--radius-md)',
                      background: action === a ? 'var(--color-brand-accent)' : 'none',
                      color: action === a ? '#fff' : 'var(--color-brand-text)',
                      fontWeight: 600,
                      fontSize: 'var(--text-xs)',
                      cursor: 'pointer',
                    }}
                  >
                    {a === 'in' ? (
                      <><FiPlusCircle size={12} style={{ marginRight: 4 }} />Stock In</>
                    ) : a === 'out' ? (
                      <><FiMinusCircle size={12} style={{ marginRight: 4 }} />Stock Out</>
                    ) : (
                      'Set Quantity'
                    )}
                  </button>
                ))}
              </div>
            </div>

            <div>
              <label style={{ fontSize: 'var(--text-xs)', fontWeight: 600, display: 'block', marginBottom: 4 }}>
                Quantity
              </label>
              <input
                type="number"
                className="form-control"
                value={quantity}
                onChange={(e) => setQuantity(Number(e.target.value))}
                min={1}
                required
              />
            </div>

            {action === 'set' && (
              <div>
                <label style={{ fontSize: 'var(--text-xs)', fontWeight: 600, display: 'block', marginBottom: 4 }}>
                  Low Stock Threshold
                </label>
                <input
                  type="number"
                  className="form-control"
                  value={threshold}
                  onChange={(e) => setThreshold(Number(e.target.value))}
                  min={0}
                />
              </div>
            )}

            {action !== 'set' && (
              <div>
                <label style={{ fontSize: 'var(--text-xs)', fontWeight: 600, display: 'block', marginBottom: 4 }}>
                  Note (optional)
                </label>
                <input
                  type="text"
                  className="form-control"
                  value={note}
                  onChange={(e) => setNote(e.target.value)}
                  placeholder="Reason or reference…"
                  maxLength={200}
                />
              </div>
            )}

            <button
              type="submit"
              className="btn btn-primary"
              disabled={loading || !selectedProduct || !selectedWarehouse}
            >
              {loading ? 'Updating…' : 'Update Stock'}
            </button>

            {message && (
              <div
                style={{
                  padding: '0.5rem 0.75rem',
                  borderRadius: 'var(--radius-md)',
                  fontSize: 'var(--text-sm)',
                  background: message.includes('success') ? 'var(--color-success-50)' : '#fee2e2',
                  color: message.includes('success') ? 'var(--color-success)' : '#dc2626',
                }}
              >
                {message}
              </div>
            )}
          </form>
        </div>

        {/* Active alerts */}
        <div
          style={{
            background: 'var(--color-white)',
            border: '1px solid var(--color-neutral-200)',
            borderRadius: 'var(--radius-lg)',
            padding: '1.25rem',
          }}
        >
          <h2 style={{ fontWeight: 700, fontSize: 'var(--text-base)', marginBottom: '1rem' }}>
            Stock Alerts
          </h2>
          {alerts.length === 0 ? (
            <p style={{ fontSize: 'var(--text-sm)', color: 'var(--color-neutral-400)' }}>
              No active alerts.
            </p>
          ) : (
            alerts.map((alert) => {
              const prod = typeof alert.productId === 'object' ? alert.productId : null
              const wh = typeof alert.warehouseId === 'object' ? alert.warehouseId : null
              const colors: Record<string, string> = {
                low_stock: '#f59e0b',
                out_of_stock: '#ef4444',
                overstock: '#3b82f6',
              }
              return (
                <div
                  key={alert._id}
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: 8,
                    padding: '0.5rem 0',
                    borderBottom: '1px solid var(--color-neutral-100)',
                  }}
                >
                  <div style={{ width: 8, height: 8, borderRadius: '50%', background: colors[alert.alertType], flexShrink: 0 }} />
                  <div style={{ flex: 1 }}>
                    <div style={{ fontSize: 'var(--text-sm)', fontWeight: 600 }}>{prod?.title ?? '—'}</div>
                    <div style={{ fontSize: 'var(--text-xs)', color: 'var(--color-neutral-400)' }}>
                      {wh?.name} · {alert.currentQuantity} units
                    </div>
                  </div>
                  <button
                    onClick={() => resolveAlert(alert._id)}
                    style={{
                      background: 'none',
                      border: 'none',
                      fontSize: 'var(--text-xs)',
                      color: 'var(--color-success)',
                      cursor: 'pointer',
                      fontWeight: 600,
                    }}
                  >
                    Resolve
                  </button>
                </div>
              )
            })
          )}
        </div>
      </div>

      {/* Recent movements */}
      <div
        style={{
          background: 'var(--color-white)',
          border: '1px solid var(--color-neutral-200)',
          borderRadius: 'var(--radius-lg)',
          padding: '1.25rem',
        }}
      >
        <h2 style={{ fontWeight: 700, fontSize: 'var(--text-base)', marginBottom: '1rem', display: 'flex', alignItems: 'center', gap: 8 }}>
          <FiActivity size={15} /> Recent Movements
        </h2>
        <div style={{ overflowX: 'auto' }}>
          <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 'var(--text-sm)' }}>
            <thead>
              <tr style={{ borderBottom: '2px solid var(--color-neutral-100)' }}>
                {['Product', 'Warehouse', 'Type', 'Qty', 'Note', 'Date'].map((h) => (
                  <th key={h} style={{ padding: '0.4rem 0.75rem', textAlign: 'left', fontWeight: 600 }}>{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {movements.length === 0 && (
                <tr>
                  <td colSpan={6} style={{ padding: '1.5rem', textAlign: 'center', color: 'var(--color-neutral-400)' }}>
                    No movements yet.
                  </td>
                </tr>
              )}
              {movements.map((m) => {
                const prod = typeof m.productId === 'object' ? m.productId : null
                const wh = typeof m.warehouseId === 'object' ? m.warehouseId : null
                return (
                  <tr key={m._id} style={{ borderBottom: '1px solid var(--color-neutral-50)' }}>
                    <td style={{ padding: '0.4rem 0.75rem' }}>{prod?.title ?? '—'}</td>
                    <td style={{ padding: '0.4rem 0.75rem' }}>{wh?.name ?? '—'}</td>
                    <td style={{ padding: '0.4rem 0.75rem' }}>
                      <span style={{
                        padding: '1px 6px',
                        borderRadius: 'var(--radius-sm)',
                        fontSize: 'var(--text-xs)',
                        fontWeight: 600,
                        background: m.type === 'in' ? 'var(--color-success-50)' : m.type === 'out' ? '#fee2e2' : 'var(--color-neutral-100)',
                        color: m.type === 'in' ? 'var(--color-success)' : m.type === 'out' ? '#dc2626' : 'var(--color-neutral-500)',
                      }}>
                        {m.type}
                      </span>
                    </td>
                    <td style={{ padding: '0.4rem 0.75rem' }}>{m.quantity}</td>
                    <td style={{ padding: '0.4rem 0.75rem', color: 'var(--color-neutral-500)' }}>{m.note ?? '—'}</td>
                    <td style={{ padding: '0.4rem 0.75rem', color: 'var(--color-neutral-400)', fontSize: 'var(--text-xs)' }}>
                      {new Date(m.createdAt).toLocaleDateString()}
                    </td>
                  </tr>
                )
              })}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  )
}
