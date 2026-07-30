import { useState } from 'react'
import { FiSearch, FiUserCheck, FiUserX } from 'react-icons/fi'
import { useAdminUsers, useToggleUserActive, useChangeUserRole } from '../../../hooks/useAdmin.js'
import { formatDate } from '../../../../shared/helpers/index.js'
import type { IUser } from '../../../../shared/types/user.types.js'
import type { UserRole } from '../../../../shared/types/auth.types.js'
import { getImageUrl } from '../../../utils/image.js'

const ROLES: UserRole[] = ['user', 'seller', 'admin']

export default function AdminUsers() {
  const [search, setSearch] = useState('')
  const [role, setRole] = useState('')
  const [status, setStatus] = useState('')
  const [page, setPage] = useState(1)
  const [searchInput, setSearchInput] = useState('')

  const params: Record<string, string> = { page: String(page), limit: '20' }
  if (search) params.search = search
  if (role) params.role = role
  if (status) params.status = status

  const { data, isLoading } = useAdminUsers(params)
  const toggleActive = useToggleUserActive()
  const changeRole = useChangeUserRole()

  const users = data?.data ?? []
  const pagination = data?.pagination

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault()
    setSearch(searchInput)
    setPage(1)
  }

  const handleFilter = (key: 'role' | 'status', val: string) => {
    if (key === 'role') {
      setRole(val)
      setPage(1)
    }
    if (key === 'status') {
      setStatus(val)
      setPage(1)
    }
  }

  return (
    <>
      <div className="admin-page-header">
        <h1 className="admin-page-title">Users</h1>
        <p className="admin-page-subtitle">Manage all registered accounts</p>
      </div>

      <div className="admin-table-card">
        <div className="admin-table-toolbar">
          <h3>All Users {pagination && `(${pagination.total})`}</h3>

          <form onSubmit={handleSearch} className="admin-search">
            <FiSearch size={13} color="#9ca3af" />
            <input
              placeholder="Search name, email, username…"
              value={searchInput}
              onChange={(e) => setSearchInput(e.target.value)}
            />
          </form>

          <select
            className="admin-select"
            value={role}
            onChange={(e) => handleFilter('role', e.target.value)}
          >
            <option value="">All Roles</option>
            {ROLES.map((r) => (
              <option key={r} value={r}>
                {r}
              </option>
            ))}
          </select>

          <select
            className="admin-select"
            value={status}
            onChange={(e) => handleFilter('status', e.target.value)}
          >
            <option value="">All Status</option>
            <option value="active">Active</option>
            <option value="inactive">Inactive</option>
          </select>
        </div>

        {isLoading ? (
          <div className="admin-loading">Loading users…</div>
        ) : (
          <div className="admin-table-wrap">
            <table className="admin-table">
              <thead>
                <tr>
                  <th>User</th>
                  <th>Username</th>
                  <th>Role</th>
                  <th>Status</th>
                  <th>Verified</th>
                  <th>Joined</th>
                  <th>Actions</th>
                </tr>
              </thead>
              <tbody>
                {users.length === 0 ? (
                  <tr>
                    <td colSpan={7} className="admin-table__empty">
                      No users found
                    </td>
                  </tr>
                ) : (
                  users.map((user: IUser) => {
                    const initials =
                      `${user.firstName?.[0] ?? ''}${user.lastName?.[0] ?? ''}`.toUpperCase()
                    return (
                      <tr key={user._id}>
                        <td>
                          <div className="admin-user-cell">
                            {user.profileImage ? (
                              <img src={getImageUrl(user.profileImage)} alt="" className="admin-avatar" />
                            ) : (
                              <div className="admin-avatar-fallback">{initials}</div>
                            )}
                            <div>
                              <div className="admin-user-name">
                                {user.firstName} {user.lastName}
                              </div>
                              <div className="admin-user-email">{user.email}</div>
                            </div>
                          </div>
                        </td>
                        <td style={{ color: '#6b7280' }}>@{user.username}</td>
                        <td>
                          <select
                            className="admin-role-select"
                            value={user.role}
                            onChange={(e) =>
                              changeRole.mutate({ id: user._id, role: e.target.value as UserRole })
                            }
                            disabled={changeRole.isPending}
                          >
                            {ROLES.map((r) => (
                              <option key={r} value={r}>
                                {r}
                              </option>
                            ))}
                          </select>
                        </td>
                        <td>
                          <span
                            className={`admin-pill admin-pill--${user.isActive ? 'active' : 'inactive'}`}
                          >
                            {user.isActive ? 'Active' : 'Inactive'}
                          </span>
                        </td>
                        <td>
                          <span
                            className={`admin-pill admin-pill--${user.emailVerified ? 'active' : 'pending'}`}
                          >
                            {user.emailVerified ? 'Yes' : 'No'}
                          </span>
                        </td>
                        <td style={{ color: '#6b7280', fontSize: '.75rem' }}>
                          {formatDate(user.createdAt as unknown as string)}
                        </td>
                        <td>
                          <button
                            className={`admin-btn ${user.isActive ? 'admin-btn--deactivate' : 'admin-btn--activate'}`}
                            onClick={() => toggleActive.mutate(user._id)}
                            disabled={toggleActive.isPending}
                          >
                            {user.isActive ? (
                              <>
                                <FiUserX size={12} /> Deactivate
                              </>
                            ) : (
                              <>
                                <FiUserCheck size={12} /> Activate
                              </>
                            )}
                          </button>
                        </td>
                      </tr>
                    )
                  })
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
