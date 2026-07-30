import { useState } from 'react'
import { FiSearch, FiCheck, FiSlash } from 'react-icons/fi'
import { useAdminProducts, useApproveProduct, useBlockProduct } from '../../../hooks/useAdmin.js'
import { formatCurrency, formatDate } from '../../../../shared/helpers/index.js'
import type { IProduct } from '../../../../shared/types/product.types.js'
import { getImageUrl } from '../../../utils/image.js'

type FilterStatus = '' | 'pending' | 'active' | 'blocked'

export default function AdminProducts() {
  const [status, setStatus] = useState<FilterStatus>('pending')
  const [searchInput, setSearchInput] = useState('')
  const [search, setSearch] = useState('')
  const [page, setPage] = useState(1)

  const params: Record<string, string> = { page: String(page), limit: '20' }
  if (status) params.status = status
  if (search) params.search = search

  const { data, isLoading } = useAdminProducts(params)
  const approve = useApproveProduct()
  const blockP = useBlockProduct()

  const products = data?.data ?? []
  const pagination = data?.pagination

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault()
    setSearch(searchInput)
    setPage(1)
  }

  return (
    <>
      <div className="admin-page-header">
        <h1 className="admin-page-title">Products</h1>
        <p className="admin-page-subtitle">Review, approve, and manage marketplace products</p>
      </div>

      {/* Status tab bar */}
      <div style={{ display: 'flex', gap: '.5rem', marginBottom: '1rem', flexWrap: 'wrap' }}>
        {(['', 'pending', 'active', 'blocked'] as FilterStatus[]).map((s) => (
          <button
            key={s}
            className={`admin-btn ${status === s ? 'admin-btn--primary' : 'admin-btn--deactivate'}`}
            onClick={() => {
              setStatus(s)
              setPage(1)
            }}
          >
            {s === '' ? 'All' : s.charAt(0).toUpperCase() + s.slice(1)}
          </button>
        ))}
      </div>

      <div className="admin-table-card">
        <div className="admin-table-toolbar">
          <h3>
            {status
              ? `${status.charAt(0).toUpperCase() + status.slice(1)} Products`
              : 'All Products'}
            {pagination && ` (${pagination.total})`}
          </h3>

          <form onSubmit={handleSearch} className="admin-search">
            <FiSearch size={13} color="#9ca3af" />
            <input
              placeholder="Search title, brand, SKU…"
              value={searchInput}
              onChange={(e) => setSearchInput(e.target.value)}
            />
          </form>
        </div>

        {isLoading ? (
          <div className="admin-loading">Loading products…</div>
        ) : (
          <div className="admin-table-wrap">
            <table className="admin-table">
              <thead>
                <tr>
                  <th>Product</th>
                  <th>Seller</th>
                  <th>Category</th>
                  <th>Price</th>
                  <th>Stock</th>
                  <th>Status</th>
                  <th>Added</th>
                  <th>Actions</th>
                </tr>
              </thead>
              <tbody>
                {products.length === 0 ? (
                  <tr>
                    <td colSpan={8} className="admin-table__empty">
                      No products found
                    </td>
                  </tr>
                ) : (
                  (
                    products as Array<
                      IProduct & {
                        sellerId?: { firstName: string; lastName: string; email: string }
                      }
                    >
                  ).map((product) => (
                    <tr key={product._id}>
                      <td>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '.6rem' }}>
                          {product.images?.[0] ? (
                            <img src={getImageUrl(product.images[0])} alt="" className="admin-product-thumb" />
                          ) : (
                            <div
                              className="admin-product-thumb"
                              style={{
                                background: '#f3f4f6',
                                display: 'flex',
                                alignItems: 'center',
                                justifyContent: 'center',
                              }}
                            >
                              🛍️
                            </div>
                          )}
                          <div>
                            <div
                              style={{
                                fontWeight: 600,
                                fontSize: '.8rem',
                                maxWidth: 180,
                                overflow: 'hidden',
                                textOverflow: 'ellipsis',
                                whiteSpace: 'nowrap',
                              }}
                            >
                              {product.title}
                            </div>
                            <div style={{ fontSize: '.7rem', color: '#6b7280' }}>
                              SKU: {product.sku}
                            </div>
                          </div>
                        </div>
                      </td>
                      <td style={{ fontSize: '.75rem' }}>
                        <div>
                          {product.sellerId?.firstName} {product.sellerId?.lastName}
                        </div>
                        <div style={{ color: '#9ca3af' }}>{product.sellerId?.email}</div>
                      </td>
                      <td style={{ fontSize: '.75rem', color: '#6b7280' }}>{product.category}</td>
                      <td style={{ fontWeight: 600, fontSize: '.8rem' }}>
                        {product.discountPrice ? (
                          <span>
                            {formatCurrency(product.discountPrice)}{' '}
                            <span
                              style={{
                                textDecoration: 'line-through',
                                color: '#9ca3af',
                                fontWeight: 400,
                              }}
                            >
                              {formatCurrency(product.price)}
                            </span>
                          </span>
                        ) : (
                          formatCurrency(product.price)
                        )}
                      </td>
                      <td style={{ fontSize: '.8rem' }}>{product.stockQuantity}</td>
                      <td>
                        <span className={`admin-pill admin-pill--${product.status}`}>
                          {product.status}
                        </span>
                      </td>
                      <td style={{ fontSize: '.72rem', color: '#6b7280' }}>
                        {formatDate(product.createdAt as unknown as string)}
                      </td>
                      <td>
                        <div style={{ display: 'flex', gap: '.35rem' }}>
                          {product.status !== 'active' && (
                            <button
                              className="admin-btn admin-btn--approve"
                              onClick={() => approve.mutate(product._id)}
                              disabled={approve.isPending}
                            >
                              <FiCheck size={12} /> Approve
                            </button>
                          )}
                          {product.status !== 'blocked' && (
                            <button
                              className="admin-btn admin-btn--block"
                              onClick={() => blockP.mutate(product._id)}
                              disabled={blockP.isPending}
                            >
                              <FiSlash size={12} /> Block
                            </button>
                          )}
                        </div>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        )}

        {pagination && pagination.totalPages > 1 && (
          <div className="admin-pagination">
            <span>
              Showing {(page - 1) * 20 + 1}–{Math.min(page * 20, pagination.total)} of{' '}
              {pagination.total}
            </span>
            <div className="admin-pagination__btns">
              <button
                className="admin-pagination__btn"
                onClick={() => setPage((p) => p - 1)}
                disabled={!pagination.hasPrev}
              >
                ‹
              </button>
              {Array.from({ length: pagination.totalPages }, (_, i) => i + 1)
                .filter((p) => p === 1 || p === pagination.totalPages || Math.abs(p - page) <= 1)
                .map((p, i, arr) => (
                  <>
                    {i > 0 && (arr[i - 1] as number) < p - 1 && (
                      <span key={`e${i}`} style={{ padding: '0 4px' }}>
                        …
                      </span>
                    )}
                    <button
                      key={p}
                      className={`admin-pagination__btn${p === page ? ' admin-pagination__btn--active' : ''}`}
                      onClick={() => setPage(p)}
                    >
                      {p}
                    </button>
                  </>
                ))}
              <button
                className="admin-pagination__btn"
                onClick={() => setPage((p) => p + 1)}
                disabled={!pagination.hasNext}
              >
                ›
              </button>
            </div>
          </div>
        )}
      </div>
    </>
  )
}
