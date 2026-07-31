import { useState } from 'react'
import { FiTag, FiZap, FiPlus, FiTrash2, FiToggleLeft, FiToggleRight } from 'react-icons/fi'
import {
  useAdminCoupons,
  useAdminPromotions,
  useCreateCoupon,
  useDeleteCoupon,
  useToggleCoupon,
  useCreatePromotion,
  useDeletePromotion,
  useTogglePromotion,
} from '../../../hooks/usePromotions.js'
import type { ICoupon, IPromotion } from '../../../../shared/types/promotion.types.js'

type Tab = 'coupons' | 'promotions'

const tdStyle: React.CSSProperties = { padding: '0.5rem 0.75rem', fontSize: 'var(--text-sm)' }

export default function AdminPromotions() {
  const [tab, setTab] = useState<Tab>('coupons')
  const [showCouponForm, setShowCouponForm] = useState(false)
  const [showPromoForm, setShowPromoForm] = useState(false)

  const { data: couponsData } = useAdminCoupons()
  const { data: promosData } = useAdminPromotions()
  const { mutate: createCoupon } = useCreateCoupon()
  const { mutate: deleteCoupon } = useDeleteCoupon()
  const { mutate: toggleCoupon } = useToggleCoupon()
  const { mutate: createPromo } = useCreatePromotion()
  const { mutate: deletePromo } = useDeletePromotion()
  const { mutate: togglePromo } = useTogglePromotion()

  const coupons = couponsData?.items ?? []
  const promos = promosData?.items ?? []

  const [couponForm, setCouponForm] = useState<Partial<ICoupon>>({
    type: 'percentage',
    value: 10,
    minOrderAmount: 0,
    maxDiscountAmount: 0,
    isActive: true,
  })

  const [promoForm, setPromoForm] = useState<Partial<IPromotion>>({
    type: 'deal',
    discountType: 'percentage',
    discountValue: 10,
    isActive: true,
    startDate: new Date().toISOString().slice(0, 16),
    endDate: new Date(Date.now() + 7 * 86400000).toISOString().slice(0, 16),
  })

  const handleCouponSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    createCoupon(couponForm, { onSuccess: () => setShowCouponForm(false) })
  }

  const handlePromoSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    createPromo(promoForm, { onSuccess: () => setShowPromoForm(false) })
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
        <h1 style={{ fontWeight: 700, fontSize: 'var(--text-xl)' }}>Promotions & Coupons</h1>
        <button
          onClick={() => tab === 'coupons' ? setShowCouponForm(true) : setShowPromoForm(true)}
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
          <FiPlus size={14} /> {tab === 'coupons' ? 'New Coupon' : 'New Promotion'}
        </button>
      </div>

      <div style={{ display: 'flex', gap: 8, marginBottom: '1.5rem' }}>
        <button style={tabStyle('coupons')} onClick={() => setTab('coupons')}>
          <FiTag size={13} style={{ marginRight: 6 }} />Coupons ({coupons.length})
        </button>
        <button style={tabStyle('promotions')} onClick={() => setTab('promotions')}>
          <FiZap size={13} style={{ marginRight: 6 }} />Promotions ({promos.length})
        </button>
      </div>

      {/* Coupon form */}
      {showCouponForm && tab === 'coupons' && (
        <div style={{
          background: 'var(--color-neutral-50)',
          border: '1px solid var(--color-neutral-200)',
          borderRadius: 'var(--radius-lg)',
          padding: '1.25rem',
          marginBottom: '1.5rem',
        }}>
          <h3 style={{ fontWeight: 700, marginBottom: '1rem' }}>New Coupon</h3>
          <form onSubmit={handleCouponSubmit} style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: '0.75rem' }}>
            <div>
              <label style={{ fontSize: 'var(--text-xs)', fontWeight: 600, display: 'block', marginBottom: 4 }}>Code *</label>
              <input className="form-control" placeholder="SAVE20" required
                value={couponForm.code ?? ''}
                onChange={(e) => setCouponForm((p) => ({ ...p, code: e.target.value }))}
              />
            </div>
            <div>
              <label style={{ fontSize: 'var(--text-xs)', fontWeight: 600, display: 'block', marginBottom: 4 }}>Type</label>
              <select className="form-control"
                value={couponForm.type}
                onChange={(e) => setCouponForm((p) => ({ ...p, type: e.target.value as ICoupon['type'] }))}
              >
                <option value="percentage">Percentage</option>
                <option value="fixed">Fixed Amount</option>
              </select>
            </div>
            <div>
              <label style={{ fontSize: 'var(--text-xs)', fontWeight: 600, display: 'block', marginBottom: 4 }}>
                Value ({couponForm.type === 'percentage' ? '%' : '$'}) *
              </label>
              <input type="number" className="form-control" min={0} required
                value={couponForm.value ?? ''}
                onChange={(e) => setCouponForm((p) => ({ ...p, value: Number(e.target.value) }))}
              />
            </div>
            <div>
              <label style={{ fontSize: 'var(--text-xs)', fontWeight: 600, display: 'block', marginBottom: 4 }}>Min Order ($)</label>
              <input type="number" className="form-control" min={0}
                value={couponForm.minOrderAmount ?? 0}
                onChange={(e) => setCouponForm((p) => ({ ...p, minOrderAmount: Number(e.target.value) }))}
              />
            </div>
            <div>
              <label style={{ fontSize: 'var(--text-xs)', fontWeight: 600, display: 'block', marginBottom: 4 }}>Max Uses (blank = unlimited)</label>
              <input type="number" className="form-control" min={1}
                value={couponForm.maxUses ?? ''}
                onChange={(e) => setCouponForm((p) => ({ ...p, maxUses: e.target.value ? Number(e.target.value) : null }))}
              />
            </div>
            <div>
              <label style={{ fontSize: 'var(--text-xs)', fontWeight: 600, display: 'block', marginBottom: 4 }}>Expires At</label>
              <input type="datetime-local" className="form-control"
                value={couponForm.expiresAt ? new Date(couponForm.expiresAt).toISOString().slice(0, 16) : ''}
                onChange={(e) => setCouponForm((p) => ({ ...p, expiresAt: e.target.value ? new Date(e.target.value).toISOString() : null }))}
              />
            </div>
            <div style={{ gridColumn: '1 / -1', display: 'flex', gap: 8 }}>
              <button type="submit" className="btn btn-primary">Create Coupon</button>
              <button type="button" className="btn" onClick={() => setShowCouponForm(false)}>Cancel</button>
            </div>
          </form>
        </div>
      )}

      {/* Promotion form */}
      {showPromoForm && tab === 'promotions' && (
        <div style={{
          background: 'var(--color-neutral-50)',
          border: '1px solid var(--color-neutral-200)',
          borderRadius: 'var(--radius-lg)',
          padding: '1.25rem',
          marginBottom: '1.5rem',
        }}>
          <h3 style={{ fontWeight: 700, marginBottom: '1rem' }}>New Promotion</h3>
          <form onSubmit={handlePromoSubmit} style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: '0.75rem' }}>
            <div style={{ gridColumn: '1 / -1' }}>
              <label style={{ fontSize: 'var(--text-xs)', fontWeight: 600, display: 'block', marginBottom: 4 }}>Title *</label>
              <input className="form-control" placeholder="Summer Flash Sale" required
                value={promoForm.title ?? ''}
                onChange={(e) => setPromoForm((p) => ({ ...p, title: e.target.value }))}
              />
            </div>
            <div>
              <label style={{ fontSize: 'var(--text-xs)', fontWeight: 600, display: 'block', marginBottom: 4 }}>Type</label>
              <select className="form-control"
                value={promoForm.type}
                onChange={(e) => setPromoForm((p) => ({ ...p, type: e.target.value as IPromotion['type'] }))}
              >
                <option value="flash_sale">Flash Sale</option>
                <option value="deal">Deal</option>
                <option value="campaign">Campaign</option>
              </select>
            </div>
            <div>
              <label style={{ fontSize: 'var(--text-xs)', fontWeight: 600, display: 'block', marginBottom: 4 }}>Discount Type</label>
              <select className="form-control"
                value={promoForm.discountType}
                onChange={(e) => setPromoForm((p) => ({ ...p, discountType: e.target.value as IPromotion['discountType'] }))}
              >
                <option value="percentage">Percentage</option>
                <option value="fixed">Fixed Amount</option>
              </select>
            </div>
            <div>
              <label style={{ fontSize: 'var(--text-xs)', fontWeight: 600, display: 'block', marginBottom: 4 }}>
                Discount ({promoForm.discountType === 'percentage' ? '%' : '$'}) *
              </label>
              <input type="number" className="form-control" min={0} required
                value={promoForm.discountValue ?? ''}
                onChange={(e) => setPromoForm((p) => ({ ...p, discountValue: Number(e.target.value) }))}
              />
            </div>
            <div>
              <label style={{ fontSize: 'var(--text-xs)', fontWeight: 600, display: 'block', marginBottom: 4 }}>Start Date *</label>
              <input type="datetime-local" className="form-control" required
                value={promoForm.startDate ? new Date(promoForm.startDate).toISOString().slice(0, 16) : ''}
                onChange={(e) => setPromoForm((p) => ({ ...p, startDate: e.target.value ? new Date(e.target.value).toISOString() : undefined }))}
              />
            </div>
            <div>
              <label style={{ fontSize: 'var(--text-xs)', fontWeight: 600, display: 'block', marginBottom: 4 }}>End Date *</label>
              <input type="datetime-local" className="form-control" required
                value={promoForm.endDate ? new Date(promoForm.endDate).toISOString().slice(0, 16) : ''}
                onChange={(e) => setPromoForm((p) => ({ ...p, endDate: e.target.value ? new Date(e.target.value).toISOString() : undefined }))}
              />
            </div>
            <div>
              <label style={{ fontSize: 'var(--text-xs)', fontWeight: 600, display: 'block', marginBottom: 4 }}>Badge Label</label>
              <input className="form-control" placeholder="HOT DEAL" maxLength={50}
                value={promoForm.badgeLabel ?? ''}
                onChange={(e) => setPromoForm((p) => ({ ...p, badgeLabel: e.target.value }))}
              />
            </div>
            <div style={{ gridColumn: '1 / -1' }}>
              <label style={{ fontSize: 'var(--text-xs)', fontWeight: 600, display: 'block', marginBottom: 4 }}>Description</label>
              <textarea className="form-control" rows={2} placeholder="Describe this promotion…"
                value={promoForm.description ?? ''}
                onChange={(e) => setPromoForm((p) => ({ ...p, description: e.target.value }))}
              />
            </div>
            <div style={{ gridColumn: '1 / -1', display: 'flex', gap: 8 }}>
              <button type="submit" className="btn btn-primary">Create Promotion</button>
              <button type="button" className="btn" onClick={() => setShowPromoForm(false)}>Cancel</button>
            </div>
          </form>
        </div>
      )}

      {/* Coupons table */}
      {tab === 'coupons' && (
        <div style={{ overflowX: 'auto' }}>
          <table style={{ width: '100%', borderCollapse: 'collapse' }}>
            <thead>
              <tr style={{ borderBottom: '2px solid var(--color-neutral-100)' }}>
                {['Code', 'Type', 'Value', 'Min Order', 'Uses', 'Expires', 'Status', ''].map((h) => (
                  <th key={h} style={{ ...tdStyle, fontWeight: 700 }}>{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {coupons.length === 0 && (
                <tr><td colSpan={8} style={{ ...tdStyle, textAlign: 'center', color: 'var(--color-neutral-400)' }}>No coupons yet.</td></tr>
              )}
              {coupons.map((c) => (
                <tr key={c._id} style={{ borderBottom: '1px solid var(--color-neutral-100)' }}>
                  <td style={{ ...tdStyle, fontWeight: 700, fontFamily: 'monospace' }}>{c.code}</td>
                  <td style={tdStyle}>{c.type}</td>
                  <td style={tdStyle}>{c.type === 'percentage' ? `${c.value}%` : `$${c.value}`}</td>
                  <td style={tdStyle}>${c.minOrderAmount}</td>
                  <td style={tdStyle}>{c.usedCount}{c.maxUses ? `/${c.maxUses}` : ''}</td>
                  <td style={{ ...tdStyle, color: 'var(--color-neutral-500)', fontSize: 'var(--text-xs)' }}>
                    {c.expiresAt ? new Date(c.expiresAt).toLocaleDateString() : 'Never'}
                  </td>
                  <td style={tdStyle}>
                    <span style={{
                      padding: '2px 8px', borderRadius: 'var(--radius-full)', fontSize: 'var(--text-xs)', fontWeight: 600,
                      background: c.isActive ? 'var(--color-success-50)' : 'var(--color-neutral-100)',
                      color: c.isActive ? 'var(--color-success)' : 'var(--color-neutral-400)',
                    }}>
                      {c.isActive ? 'Active' : 'Inactive'}
                    </span>
                  </td>
                  <td style={tdStyle}>
                    <div style={{ display: 'flex', gap: 6 }}>
                      <button onClick={() => toggleCoupon(c._id)} title={c.isActive ? 'Deactivate' : 'Activate'}
                        style={{ background: 'none', border: 'none', cursor: 'pointer', color: c.isActive ? 'var(--color-success)' : 'var(--color-neutral-400)' }}>
                        {c.isActive ? <FiToggleRight size={16} /> : <FiToggleLeft size={16} />}
                      </button>
                      <button onClick={() => { if (confirm('Delete coupon?')) deleteCoupon(c._id) }}
                        style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--color-danger)' }}>
                        <FiTrash2 size={14} />
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {/* Promotions table */}
      {tab === 'promotions' && (
        <div style={{ overflowX: 'auto' }}>
          <table style={{ width: '100%', borderCollapse: 'collapse' }}>
            <thead>
              <tr style={{ borderBottom: '2px solid var(--color-neutral-100)' }}>
                {['Title', 'Type', 'Discount', 'Start', 'End', 'Status', ''].map((h) => (
                  <th key={h} style={{ ...tdStyle, fontWeight: 700 }}>{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {promos.length === 0 && (
                <tr><td colSpan={7} style={{ ...tdStyle, textAlign: 'center', color: 'var(--color-neutral-400)' }}>No promotions yet.</td></tr>
              )}
              {promos.map((p) => (
                <tr key={p._id} style={{ borderBottom: '1px solid var(--color-neutral-100)' }}>
                  <td style={{ ...tdStyle, fontWeight: 600 }}>{p.title}</td>
                  <td style={tdStyle}>{p.type.replace('_', ' ')}</td>
                  <td style={tdStyle}>{p.discountType === 'percentage' ? `${p.discountValue}%` : `$${p.discountValue}`}</td>
                  <td style={{ ...tdStyle, fontSize: 'var(--text-xs)', color: 'var(--color-neutral-500)' }}>{new Date(p.startDate).toLocaleDateString()}</td>
                  <td style={{ ...tdStyle, fontSize: 'var(--text-xs)', color: 'var(--color-neutral-500)' }}>{new Date(p.endDate).toLocaleDateString()}</td>
                  <td style={tdStyle}>
                    <span style={{
                      padding: '2px 8px', borderRadius: 'var(--radius-full)', fontSize: 'var(--text-xs)', fontWeight: 600,
                      background: p.isActive ? 'var(--color-success-50)' : 'var(--color-neutral-100)',
                      color: p.isActive ? 'var(--color-success)' : 'var(--color-neutral-400)',
                    }}>
                      {p.isActive ? 'Active' : 'Inactive'}
                    </span>
                  </td>
                  <td style={tdStyle}>
                    <div style={{ display: 'flex', gap: 6 }}>
                      <button onClick={() => togglePromo(p._id)} title={p.isActive ? 'Deactivate' : 'Activate'}
                        style={{ background: 'none', border: 'none', cursor: 'pointer', color: p.isActive ? 'var(--color-success)' : 'var(--color-neutral-400)' }}>
                        {p.isActive ? <FiToggleRight size={16} /> : <FiToggleLeft size={16} />}
                      </button>
                      <button onClick={() => { if (confirm('Delete promotion?')) deletePromo(p._id) }}
                        style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--color-danger)' }}>
                        <FiTrash2 size={14} />
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  )
}
