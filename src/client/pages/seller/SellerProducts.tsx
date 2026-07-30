import { useState } from 'react'
import { Link } from 'react-router-dom'
import { FiPlus, FiEdit, FiTrash2, FiPackage } from 'react-icons/fi'
import { useSellerProducts, useDeleteProduct } from '../../hooks/useProducts.js'
import { useProductStore } from '../../store/productStore.js'

export default function SellerProducts() {
  const { filters, setFilters } = useProductStore()
  const { data, isLoading } = useSellerProducts(filters)
  const deleteMutation = useDeleteProduct()
  const [deletingId, setDeletingId] = useState<string | null>(null)

  const products = data?.data ?? []
  const pagination = data?.pagination

  const handleDelete = async (id: string, title: string) => {
    if (!window.confirm(`Delete "${title}"? This cannot be undone.`)) return
    setDeletingId(id)
    try {
      await deleteMutation.mutateAsync(id)
    } finally {
      setDeletingId(null)
    }
  }

  return (
    <div className="container section">
      <div
        style={{
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          marginBottom: '1.75rem',
          flexWrap: 'wrap',
          gap: '1rem',
        }}
      >
        <div>
          <h1 style={{ fontSize: 'var(--text-2xl)', fontWeight: 800, marginBottom: 4 }}>
            My Products
          </h1>
          <p style={{ fontSize: 'var(--text-sm)', color: 'var(--color-neutral-500)' }}>
            Manage your product listings
          </p>
        </div>
        <Link
          to="/seller/products/create"
          style={{
            display: 'inline-flex',
            alignItems: 'center',
            gap: 6,
            padding: '0.625rem 1.25rem',
            background: 'var(--color-brand-accent)',
            color: 'var(--color-primary)',
            borderRadius: 'var(--radius-lg)',
            fontWeight: 700,
            fontSize: 'var(--text-sm)',
            textDecoration: 'none',
          }}
        >
          <FiPlus size={16} /> Add Product
        </Link>
      </div>

      {/* Search */}
      <div style={{ marginBottom: '1.25rem' }}>
        <input
          type="search"
          className="form-control"
          placeholder="Search your products…"
          style={{ maxWidth: 360 }}
          onChange={(e) => setFilters({ search: e.target.value || undefined })}
        />
      </div>

      {isLoading ? (
        <div style={{ textAlign: 'center', padding: '3rem', color: 'var(--color-neutral-400)' }}>
          Loading products…
        </div>
      ) : products.length === 0 ? (
        <div className="products-empty" style={{ padding: '4rem 2rem' }}>
          <div className="products-empty__icon">
            <FiPackage size={48} />
          </div>
          <p className="products-empty__title">No products yet</p>
          <p style={{ fontSize: 'var(--text-sm)', marginBottom: '1.5rem' }}>
            Start selling by adding your first product.
          </p>
          <Link
            to="/seller/products/create"
            style={{ color: 'var(--color-brand-accent)', fontWeight: 700, textDecoration: 'none' }}
          >
            + Add your first product
          </Link>
        </div>
      ) : (
        <div
          style={{
            background: 'var(--color-white)',
            borderRadius: 'var(--radius-xl)',
            border: '1px solid var(--color-neutral-200)',
            overflow: 'hidden',
          }}
        >
          <div style={{ overflowX: 'auto' }}>
            <table className="seller-table">
              <thead>
                <tr>
                  <th>Product</th>
                  <th>Category</th>
                  <th>Price</th>
                  <th>Stock</th>
                  <th>Status</th>
                  <th>Ratings</th>
                  <th>Actions</th>
                </tr>
              </thead>
              <tbody>
                {products.map((product) => (
                  <tr key={product._id}>
                    <td>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
                        {product.images[0] ? (
                          <img
                            src={product.images[0]}
                            alt={product.title}
                            className="seller-table__img"
                          />
                        ) : (
                          <div
                            className="seller-table__img"
                            style={{
                              background: 'var(--color-neutral-100)',
                              display: 'flex',
                              alignItems: 'center',
                              justifyContent: 'center',
                              fontSize: '1.25rem',
                            }}
                          >
                            🛍️
                          </div>
                        )}
                        <div>
                          <div
                            style={{ fontWeight: 600, fontSize: 'var(--text-sm)', marginBottom: 2 }}
                          >
                            {product.title}
                          </div>
                          <div
                            style={{
                              fontSize: 'var(--text-xs)',
                              color: 'var(--color-neutral-400)',
                            }}
                          >
                            SKU: {product.sku}
                          </div>
                        </div>
                      </div>
                    </td>
                    <td style={{ fontSize: 'var(--text-sm)', color: 'var(--color-neutral-600)' }}>
                      {product.category}
                    </td>
                    <td>
                      <div style={{ fontWeight: 700, fontSize: 'var(--text-sm)' }}>
                        ${(product.discountPrice ?? product.price).toFixed(2)}
                      </div>
                      {product.discountPrice && (
                        <div
                          style={{
                            fontSize: 'var(--text-xs)',
                            color: 'var(--color-neutral-400)',
                            textDecoration: 'line-through',
                          }}
                        >
                          ${product.price.toFixed(2)}
                        </div>
                      )}
                    </td>
                    <td>
                      <span
                        style={{
                          fontWeight: 600,
                          color:
                            product.stockQuantity === 0
                              ? 'var(--color-danger)'
                              : product.stockQuantity <= 5
                                ? 'var(--color-warning)'
                                : 'var(--color-success)',
                        }}
                      >
                        {product.stockQuantity}
                      </span>
                    </td>
                    <td>
                      <span className={`status-pill status-pill--${product.status}`}>
                        {product.status}
                      </span>
                    </td>
                    <td>
                      <div
                        style={{ fontSize: 'var(--text-xs)', color: 'var(--color-neutral-600)' }}
                      >
                        ★ {product.ratingsAverage.toFixed(1)} ({product.ratingsCount})
                      </div>
                    </td>
                    <td>
                      <div style={{ display: 'flex', gap: '0.375rem' }}>
                        <Link
                          to={`/seller/products/edit/${product._id}`}
                          style={{
                            padding: '0.375rem',
                            border: '1px solid var(--color-neutral-200)',
                            borderRadius: 'var(--radius-md)',
                            display: 'flex',
                            alignItems: 'center',
                            color: 'var(--color-neutral-600)',
                          }}
                          title="Edit"
                        >
                          <FiEdit size={14} />
                        </Link>
                        <button
                          onClick={() => handleDelete(product._id, product.title)}
                          disabled={deletingId === product._id}
                          style={{
                            padding: '0.375rem',
                            border: '1px solid var(--color-danger-50)',
                            borderRadius: 'var(--radius-md)',
                            background: 'none',
                            cursor: 'pointer',
                            display: 'flex',
                            alignItems: 'center',
                            color: 'var(--color-danger)',
                            opacity: deletingId === product._id ? 0.5 : 1,
                          }}
                          title="Delete"
                        >
                          <FiTrash2 size={14} />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {(pagination?.totalPages ?? 0) > 1 && (
            <div style={{ padding: '1rem', borderTop: '1px solid var(--color-neutral-100)' }}>
              <nav className="pagination" style={{ marginTop: 0 }}>
                <button
                  className="pagination__btn"
                  onClick={() => setFilters({ page: (filters.page ?? 1) - 1 })}
                  disabled={!pagination?.hasPrev}
                >
                  ‹
                </button>
                {Array.from({ length: pagination?.totalPages ?? 0 }, (_, i) => i + 1).map((p) => (
                  <button
                    key={p}
                    className={`pagination__btn${p === (filters.page ?? 1) ? ' pagination__btn--active' : ''}`}
                    onClick={() => setFilters({ page: p })}
                  >
                    {p}
                  </button>
                ))}
                <button
                  className="pagination__btn"
                  onClick={() => setFilters({ page: (filters.page ?? 1) + 1 })}
                  disabled={!pagination?.hasNext}
                >
                  ›
                </button>
              </nav>
            </div>
          )}
        </div>
      )}
    </div>
  )
}
