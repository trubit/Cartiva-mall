import { Link } from 'react-router-dom'
import { FiEdit3, FiTrash2, FiPlus } from 'react-icons/fi'
import { formatCurrency } from '../../../../shared/helpers/index.js'
import type { IProduct } from '../../../../shared/types/index.js'

interface ProductTableProps {
  products: IProduct[]
  loading: boolean
  onDelete?: (id: string, title: string) => void
  deletingId?: string | null
  compact?: boolean
}

const PLACEHOLDER = 'https://placehold.co/44x44/eee/999?text=img'

function StockBadge({ qty }: { qty: number }) {
  const color =
    qty <= 5 ? 'var(--pm-danger-text)' : qty <= 15 ? '#D97706' : 'var(--pm-success-text)'
  const bg =
    qty <= 5 ? 'rgba(255,77,109,0.1)' : qty <= 15 ? 'rgba(217,119,6,0.1)' : 'rgba(34,197,94,0.1)'
  return (
    <span
      style={{
        display: 'inline-flex',
        alignItems: 'center',
        padding: '2px 8px',
        borderRadius: 999,
        fontSize: '0.72rem',
        fontWeight: 700,
        color,
        background: bg,
        fontVariantNumeric: 'tabular-nums',
      }}
    >
      {qty}
    </span>
  )
}

export default function ProductTable({
  products,
  loading,
  onDelete,
  deletingId,
  compact = false,
}: ProductTableProps) {
  if (loading) {
    return (
      <div className="d-flex flex-column gap-2">
        {[1, 2, 3, 4].map((i) => (
          <div key={i} className="skeleton" style={{ height: 56, borderRadius: 10 }} />
        ))}
      </div>
    )
  }

  if (products.length === 0) {
    return (
      <div className="sl-empty">
        <FiPlus size={32} style={{ marginBottom: 8, color: 'var(--pm-teal)', opacity: 0.5 }} />
        <p style={{ color: 'var(--color-neutral-500)', margin: 0, fontSize: '0.84rem' }}>
          No products yet.
        </p>
        <Link
          to="/seller/products/create"
          className="sl-btn sl-btn--primary"
          style={{ marginTop: 12 }}
        >
          Add Your First Product
        </Link>
      </div>
    )
  }

  return (
    <div className="sl-table-wrap">
      <table className="seller-table">
        <thead>
          <tr>
            <th>Product</th>
            <th>SKU</th>
            {!compact && <th>Category</th>}
            <th>Price</th>
            <th>Stock</th>
            <th>Status</th>
            {onDelete && <th>Actions</th>}
          </tr>
        </thead>
        <tbody>
          {products.map((p) => (
            <tr key={p._id}>
              <td>
                <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                  <img
                    src={p.images[0] ?? PLACEHOLDER}
                    alt={p.title}
                    className="seller-table__img"
                    onError={(e) => {
                      ;(e.target as HTMLImageElement).src = PLACEHOLDER
                    }}
                  />
                  <span style={{ fontWeight: 600, fontSize: '0.855rem' }}>
                    {compact ? p.title.slice(0, 40) + (p.title.length > 40 ? '…' : '') : p.title}
                  </span>
                </div>
              </td>
              <td
                style={{
                  fontFamily: 'SF Mono, Fira Code, Consolas, monospace',
                  fontSize: '0.75rem',
                  letterSpacing: '0.04em',
                  color: 'var(--color-neutral-500)',
                }}
              >
                {p.sku}
              </td>
              {!compact && (
                <td style={{ fontSize: '0.84rem', color: 'var(--color-neutral-500)' }}>
                  {p.category}
                </td>
              )}
              <td style={{ fontWeight: 700, fontVariantNumeric: 'tabular-nums' }}>
                {formatCurrency(p.discountPrice ?? p.price)}
                {p.discountPrice && (
                  <span
                    style={{
                      textDecoration: 'line-through',
                      color: 'var(--color-neutral-400)',
                      fontSize: '0.72rem',
                      marginLeft: 5,
                    }}
                  >
                    {formatCurrency(p.price)}
                  </span>
                )}
              </td>
              <td>
                <StockBadge qty={p.stockQuantity} />
              </td>
              <td>
                <span className={`status-pill status-pill--${p.status}`}>{p.status}</span>
              </td>
              {onDelete && (
                <td>
                  <div style={{ display: 'flex', gap: 5 }}>
                    <Link
                      to={`/seller/products/edit/${p._id}`}
                      className="pt-action-btn pt-action-btn--edit"
                    >
                      <FiEdit3 size={11} /> Edit
                    </Link>
                    <button
                      className="pt-action-btn pt-action-btn--delete"
                      onClick={() => onDelete(p._id, p.title)}
                      disabled={deletingId === p._id}
                    >
                      <FiTrash2 size={11} />
                      {deletingId === p._id ? '…' : 'Delete'}
                    </button>
                  </div>
                </td>
              )}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  )
}
