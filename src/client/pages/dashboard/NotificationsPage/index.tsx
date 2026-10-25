import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { FiBell, FiCheckCircle, FiTrash2 } from 'react-icons/fi'
import {
  useNotifications,
  useMarkNotificationRead,
  useMarkAllNotificationsRead,
  useDeleteNotification,
  useClearAllNotifications,
} from '../../../hooks/useDashboard.js'
import LoadingSpinner from '../../../components/ui/LoadingSpinner.js'
import type { NotificationType } from '../../../../shared/types/dashboard.types.js'

const ICON_MAP: Record<NotificationType, string> = {
  order: '📦',
  system: '⚙️',
  promotion: '🎉',
  wishlist: '❤️',
  security: '🔒',
}

const formatTime = (iso: string) => {
  const d = new Date(iso)
  const now = new Date()
  const diff = Math.floor((now.getTime() - d.getTime()) / 1000)
  if (diff < 60) return 'Just now'
  if (diff < 3600) return `${Math.floor(diff / 60)}m ago`
  if (diff < 86400) return `${Math.floor(diff / 3600)}h ago`
  if (diff < 604800) return `${Math.floor(diff / 86400)}d ago`
  return d.toLocaleDateString('en-US', { month: 'short', day: 'numeric' })
}

const PAGE_LIMIT = 20

export default function NotificationsPage() {
  const [page, setPage] = useState(1)
  const navigate = useNavigate()

  const { data, isLoading } = useNotifications({ page, limit: PAGE_LIMIT })
  const markRead = useMarkNotificationRead()
  const markAllRead = useMarkAllNotificationsRead()
  const deleteNotif = useDeleteNotification()
  const clearAll = useClearAllNotifications()

  const rawNotifications: Array<{
    _id: string
    title: string
    message: string
    type: NotificationType
    audience?: string
    read?: boolean
    link?: string
    createdAt: string
  }> = data?.data?.notifications ?? (data as any)?.notifications ?? []
  const notifications = rawNotifications.filter(
    (n) => n.audience !== 'SELLER' && !n.link?.startsWith('/seller'),
  )
  const total = notifications.length === 0 ? 0 : (data?.data?.total ?? (data as any)?.total ?? 0)
  const unread = notifications.length === 0 ? 0 : (data?.data?.unread ?? (data as any)?.unread ?? 0)
  const totalPages = Math.ceil(total / PAGE_LIMIT)

  const handleClick = (id: string, link?: string, read?: boolean) => {
    if (!read) markRead.mutate(id)
    if (link) navigate(link)
  }

  if (isLoading) return <LoadingSpinner />

  return (
    <div>
      <div className="dashboard-page-header">
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            flexWrap: 'wrap',
            gap: 12,
          }}
        >
          <div>
            <h1 className="dashboard-page-title">
              <FiBell style={{ marginRight: 8, verticalAlign: 'middle' }} />
              Notifications
            </h1>
            <p className="dashboard-page-subtitle">
              {unread > 0 ? `${unread} unread` : 'All caught up'} · {total} total
            </p>
          </div>
          <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
            {unread > 0 && (
              <button
                className="dashboard-btn dashboard-btn--outline"
                onClick={() => markAllRead.mutate()}
                disabled={markAllRead.isPending}
              >
                <FiCheckCircle />
                Mark all read
              </button>
            )}
            {total > 0 && (
              <button
                className="dashboard-btn dashboard-btn--outline"
                onClick={() => {
                  if (window.confirm('Are you sure you want to clear all your notifications?')) {
                    clearAll.mutate()
                  }
                }}
                disabled={clearAll.isPending}
                style={{ borderColor: '#fca5a5', color: '#dc2626' }}
              >
                <FiTrash2 />
                Clear all
              </button>
            )}
          </div>
        </div>
      </div>

      <div className="dashboard-section">
        {notifications.length === 0 ? (
          <div className="dashboard-empty">
            <FiBell className="dashboard-empty__icon" />
            <p className="dashboard-empty__title">No notifications</p>
            <p className="dashboard-empty__text">You're all caught up. Check back later.</p>
          </div>
        ) : (
          <ul className="notification-list">
            {notifications.map((n) => (
              <li
                key={n._id}
                className={`notification-item${!n.read ? ' notification-item--unread' : ''}`}
                onClick={() => handleClick(n._id, n.link, n.read)}
                role="button"
                tabIndex={0}
                onKeyDown={(e) => {
                  if (e.key === 'Enter') handleClick(n._id, n.link, n.read)
                }}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'space-between',
                  gap: 12,
                }}
              >
                <div
                  style={{ display: 'flex', alignItems: 'center', gap: 12, flex: 1, minWidth: 0 }}
                >
                  {!n.read && <span className="notification-item__dot" />}
                  <span className={`notification-item__icon notification-item__icon--${n.type}`}>
                    {ICON_MAP[n.type] || '🔔'}
                  </span>
                  <div className="notification-item__body" style={{ flex: 1, minWidth: 0 }}>
                    <p className="notification-item__title">{n.title}</p>
                    <p className="notification-item__message">{n.message}</p>
                    {n.title === 'Has Your Order Arrived?' && (
                      <div style={{ marginTop: 6 }}>
                        <span
                          style={{
                            display: 'inline-flex',
                            alignItems: 'center',
                            gap: 4,
                            padding: '3px 8px',
                            background: '#16a34a',
                            color: '#ffffff',
                            borderRadius: 4,
                            fontSize: 12,
                            fontWeight: 600,
                          }}
                        >
                          <FiCheckCircle size={13} />
                          Confirm Doorstep Delivery
                        </span>
                      </div>
                    )}
                    <span className="notification-item__time">{formatTime(n.createdAt)}</span>
                  </div>
                </div>

                <div style={{ display: 'flex', alignItems: 'center', gap: 6, flexShrink: 0 }}>
                  <button
                    onClick={(e) => {
                      e.stopPropagation()
                      deleteNotif.mutate(n._id)
                    }}
                    disabled={deleteNotif.isPending}
                    title="Delete notification"
                    aria-label="Delete notification"
                    style={{
                      background: 'none',
                      border: 'none',
                      cursor: 'pointer',
                      padding: 6,
                      color: '#9ca3af',
                      borderRadius: 4,
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                    }}
                    onMouseEnter={(e) => (e.currentTarget.style.color = '#ef4444')}
                    onMouseLeave={(e) => (e.currentTarget.style.color = '#9ca3af')}
                  >
                    <FiTrash2 size={16} />
                  </button>
                </div>
              </li>
            ))}
          </ul>
        )}
      </div>

      {totalPages > 1 && (
        <div className="dashboard-pagination">
          <button
            className="dashboard-pagination__btn"
            onClick={() => setPage((p) => p - 1)}
            disabled={page <= 1}
            aria-label="Previous page"
          >
            ‹
          </button>
          <span className="dashboard-pagination__info">
            {page} / {totalPages}
          </span>
          <button
            className="dashboard-pagination__btn"
            onClick={() => setPage((p) => p + 1)}
            disabled={page >= totalPages}
            aria-label="Next page"
          >
            ›
          </button>
        </div>
      )}
    </div>
  )
}
