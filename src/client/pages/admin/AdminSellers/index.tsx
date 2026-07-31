import { useState } from 'react'
import { FiSearch, FiShield, FiShieldOff, FiStar } from 'react-icons/fi'
import { useAdminSellers, useVerifySeller } from '../../../hooks/useAdmin.js'
import { formatDate } from '../../../../shared/helpers/index.js'
import type { AdminSeller } from '../../../services/adminService.js'
import { getImageUrl } from '../../../utils/image.js'

export default function AdminSellers() {
  const [verified, setVerified] = useState('')
  const [searchInput, setSearchInput] = useState('')
  const [search, setSearch] = useState('')
  const [page, setPage] = useState(1)

  const params: Record<string, string> = { page: String(page), limit: '20' }
  if (search) params.search = search
  if (verified) params.verified = verified

  const { data, isLoading } = useAdminSellers(params)
  const verify = useVerifySeller()

  const sellers = data?.data ?? []
  const pagination = data?.pagination

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault()
    setSearch(searchInput)
    setPage(1)
  }

  return (
    <>
      <div className="admin-page-header">
        <h1 className="admin-page-title">Sellers</h1>
        <p className="admin-page-subtitle">Verify and manage marketplace sellers</p>
      </div>

      {/* Filter strip */}
      <div style={{ display: 'flex', gap: '.5rem', marginBottom: '1rem', flexWrap: 'wrap' }}>
        {[
          ['', 'All'],
          ['true', 'Verified'],
          ['false', 'Unverified'],
        ].map(([val, label]) => (
          <button
            key={val}
            className={`admin-btn ${verified === val ? 'admin-btn--primary' : 'admin-btn--deactivate'}`}
            onClick={() => {
              setVerified(val)
              setPage(1)
            }}
          >
            {label}
          </button>
        ))}
      </div>

      <div className="admin-table-card">
        <div className="admin-table-toolbar">
          <h3>All Sellers {pagination && `(${pagination.total})`}</h3>

          <form onSubmit={handleSearch} className="admin-search">
            <FiSearch size={13} color="#9ca3af" />
            <input
              placeholder="Search store name…"
              value={searchInput}
              onChange={(e) => setSearchInput(e.target.value)}
            />
          </form>
        </div>

        {isLoading ? (
          <div className="admin-loading">Loading sellers…</div>
        ) : (
          <div className="admin-table-wrap">
            <table className="admin-table">
              <thead>
                <tr>
                  <th>Store</th>
                  <th>Owner</th>
                  <th>Status</th>
                  <th>Verified</th>
                  <th>Rating</th>
                  <th>Joined</th>
                  <th>Actions</th>
                </tr>
              </thead>
              <tbody>
                {sellers.length === 0 ? (
                  <tr>
                    <td colSpan={7} className="admin-table__empty">
                      No sellers found
                    </td>
                  </tr>
                ) : (
                  sellers.map((seller: AdminSeller) => (
                    <tr key={seller._id}>
                      <td>
                        <div className="admin-user-cell">
                          {seller.storeLogo ? (
                            <img
                              src={getImageUrl(seller.storeLogo)}
                              alt=""
                              className="admin-avatar"
                            />
                          ) : (
                            <div className="admin-avatar-fallback">
                              {seller.storeName?.[0]?.toUpperCase() ?? 'S'}
                            </div>
                          )}
                          <div>
                            <div className="admin-user-name">{seller.storeName}</div>
                            <div
                              className="admin-user-email"
                              style={{
                                maxWidth: 160,
                                overflow: 'hidden',
                                textOverflow: 'ellipsis',
                                whiteSpace: 'nowrap',
                              }}
                            >
                              {seller.storeDescription}
                            </div>
                          </div>
                        </div>
                      </td>
                      <td>
                        <div style={{ fontSize: '.8rem', fontWeight: 600 }}>
                          {seller.userId?.firstName} {seller.userId?.lastName}
                        </div>
                        <div style={{ fontSize: '.7rem', color: '#6b7280' }}>
                          {seller.userId?.email}
                        </div>
                      </td>
                      <td>
                        <span
                          className={`admin-pill admin-pill--${seller.userId?.isActive ? 'active' : 'inactive'}`}
                        >
                          {seller.userId?.isActive ? 'Active' : 'Suspended'}
                        </span>
                      </td>
                      <td>
                        <span
                          className={`admin-pill ${seller.isVerified ? 'admin-pill--active' : 'admin-pill--pending'}`}
                        >
                          {seller.isVerified ? 'Verified' : 'Unverified'}
                        </span>
                      </td>
                      <td>
                        <span
                          style={{
                            display: 'flex',
                            alignItems: 'center',
                            gap: '.2rem',
                            fontSize: '.8rem',
                          }}
                        >
                          <FiStar size={12} color="#f59e0b" fill="#f59e0b" />
                          {seller.rating?.toFixed(1) ?? '—'}
                        </span>
                      </td>
                      <td style={{ fontSize: '.72rem', color: '#6b7280' }}>
                        {formatDate(seller.createdAt)}
                      </td>
                      <td>
                        <button
                          className={`admin-btn ${seller.isVerified ? 'admin-btn--block' : 'admin-btn--approve'}`}
                          onClick={() => verify.mutate(seller._id)}
                          disabled={verify.isPending}
                        >
                          {seller.isVerified ? (
                            <>
                              <FiShieldOff size={12} /> Unverify
                            </>
                          ) : (
                            <>
                              <FiShield size={12} /> Verify
                            </>
                          )}
                        </button>
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
