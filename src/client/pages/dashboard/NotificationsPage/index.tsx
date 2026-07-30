import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { FiBell, FiCheckCircle } from 'react-icons/fi'
import {
  useNotifications,
  useMarkNotificationRead,
  useMarkAllNotificationsRead,
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

  const notifications = data?.data.notifications ?? []
  const total = data?.data.total ?? 0
  const unread = data?.data.unread ?? 0
  const totalPages = Math.ceil(total / PAGE_LIMIT)

  const handleClick = (id: string, link?: string, read?: boolean) => {
    if (!read) markRead.mutate(id)
    if (link) navigate(link)
  }

  if (isLoading) return <LoadingSpinner />

  return (
    <div>
      <div className="dashboard-page-header">
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
          <div>
            <h1 className="dashboard-page-title">
              <FiBell style={{ marginRight: 8, verticalAlign: 'middle' }} />
              Notifications
            </h1>
            <p className="dashboard-page-subtitle">
              {unread > 0 ? `${unread} unread` : 'All caught up'} · {total} total
            </p>
          </div>
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
              >
                {!n.read && <span className="notification-item__dot" />}
                <span className={`notification-item__icon notification-item__icon--${n.type}`}>
                  {ICON_MAP[n.type]}
                </span>
                <div className="notification-item__body">
                  <p className="notification-item__title">{n.title}</p>
                  <p className="notification-item__message">{n.message}</p>
                  <span className="notification-item__time">{formatTime(n.createdAt)}</span>
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
