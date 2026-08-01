import { useEffect } from 'react'
import { Link } from 'react-router-dom'
import { FiX, FiCheckCircle, FiTrash2 } from 'react-icons/fi'
import { useNotifications } from '../../../hooks/useNotifications.js'
import type { INotification } from '../../../../shared/types/notification.types.js'

interface Props {
  open: boolean
  onClose: () => void
}

function timeAgo(dateStr: string) {
  const diff = Date.now() - new Date(dateStr).getTime()
  const mins = Math.floor(diff / 60000)
  if (mins < 1) return 'just now'
  if (mins < 60) return `${mins}m ago`
  const hrs = Math.floor(mins / 60)
  if (hrs < 24) return `${hrs}h ago`
  return `${Math.floor(hrs / 24)}d ago`
}

function NotifItem({
  n,
  onRead,
  onDelete,
}: {
  n: INotification
  onRead: (id: string) => void
  onDelete: (id: string) => void
}) {
  const titleEl = (
    <p
      style={{
        margin: 0,
        fontWeight: n.read ? 400 : 700,
        fontSize: 13,
        color: '#111827',
        lineHeight: 1.4,
      }}
    >
      {n.title}
    </p>
  )

  return (
    <div
      style={{
        display: 'flex',
        gap: 10,
        padding: '12px 16px',
        background: n.read ? '#fff' : '#fffbf2',
        borderBottom: '1px solid #e7e7e7',
        transition: 'background 0.15s',
      }}
    >
      {/* Unread dot */}
      {!n.read && (
        <div
          style={{
            width: 8,
            height: 8,
            borderRadius: '50%',
            background: '#FF9900',
            flexShrink: 0,
            marginTop: 5,
          }}
        />
      )}

      <div style={{ flex: 1, minWidth: 0 }}>
        {n.link ? (
          <Link to={n.link} style={{ textDecoration: 'none' }}>
            {titleEl}
          </Link>
        ) : (
          titleEl
        )}
        <p
          style={{
            margin: '3px 0 0',
            fontSize: 12,
            color: '#4b5563',
            lineHeight: 1.5,
            display: '-webkit-box',
            WebkitLineClamp: 2,
            WebkitBoxOrient: 'vertical',
            overflow: 'hidden',
          }}
        >
          {n.message}
        </p>
        <span style={{ fontSize: 11, color: '#9ca3af', marginTop: 4, display: 'block' }}>
          {timeAgo(n.createdAt)}
        </span>
      </div>

      <div style={{ display: 'flex', flexDirection: 'column', gap: 4, flexShrink: 0 }}>
        {!n.read && (
          <button
            onClick={() => onRead(n._id)}
            aria-label="Mark read"
            title="Mark as read"
            style={{
              background: 'none',
              border: 'none',
              cursor: 'pointer',
              padding: 2,
              color: '#FF9900',
            }}
          >
            <FiCheckCircle size={15} />
          </button>
        )}
        <button
          onClick={() => onDelete(n._id)}
          aria-label="Delete"
          title="Delete notification"
          style={{
            background: 'none',
            border: 'none',
            cursor: 'pointer',
            padding: 2,
            color: '#9ca3af',
          }}
        >
          <FiTrash2 size={14} />
        </button>
      </div>
    </div>
  )
}

export default function NotificationDrawer({ open, onClose }: Props) {
  const { listQuery, markRead, markAllRead, deleteNotification } = useNotifications()
  const items = listQuery.data?.items ?? []

  useEffect(() => {
    if (!open) return
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose()
    }
    document.addEventListener('keydown', onKey)
    return () => document.removeEventListener('keydown', onKey)
  }, [open, onClose])

  if (!open) return null

  return (
    <>
      <div
        onClick={onClose}
        style={{
          position: 'fixed',
          inset: 0,
          background: 'rgba(0,0,0,0.35)',
          zIndex: 1100,
        }}
      />
      <div
        role="dialog"
        aria-modal="true"
        aria-label="Notifications"
        style={{
          position: 'fixed',
          top: 0,
          right: 0,
          bottom: 0,
          width: 360,
          maxWidth: '100vw',
          background: '#ffffff',
          color: '#111827',
          boxShadow: '-4px 0 24px rgba(0,0,0,0.15)',
          zIndex: 1101,
          display: 'flex',
          flexDirection: 'column',
        }}
      >
        {/* Header */}
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            padding: '14px 16px',
            borderBottom: '1px solid var(--border-color, #e7e7e7)',
            flexShrink: 0,
          }}
        >
          <h2 style={{ margin: 0, fontSize: 16, fontWeight: 700, color: '#111827' }}>
            Notifications
          </h2>
          <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
            {items.some((n) => !n.read) && (
              <button
                onClick={() => markAllRead.mutate()}
                style={{
                  fontSize: 12,
                  background: 'none',
                  border: 'none',
                  color: '#FF9900',
                  cursor: 'pointer',
                }}
              >
                Mark all read
              </button>
            )}
            <button
              onClick={onClose}
              aria-label="Close"
              style={{
                background: 'none',
                border: 'none',
                cursor: 'pointer',
                padding: 4,
                color: '#374151',
              }}
            >
              <FiX size={20} />
            </button>
          </div>
        </div>

        {/* List */}
        <div style={{ flex: 1, overflowY: 'auto' }}>
          {listQuery.isPending && (
            <p style={{ textAlign: 'center', padding: 24, color: '#9ca3af', fontSize: 13 }}>
              Loading…
            </p>
          )}
          {!listQuery.isPending && items.length === 0 && (
            <p style={{ textAlign: 'center', padding: 32, color: '#9ca3af', fontSize: 13 }}>
              No notifications yet
            </p>
          )}
          {items.map((n) => (
            <NotifItem
              key={n._id}
              n={n}
              onRead={(id) => markRead.mutate(id)}
              onDelete={(id) => deleteNotification.mutate(id)}
            />
          ))}
        </div>

        {/* Footer */}
        <div
          style={{
            padding: '10px 16px',
            borderTop: '1px solid var(--border-color, #e7e7e7)',
            flexShrink: 0,
          }}
        >
          <Link
            to="/dashboard/notifications"
            onClick={onClose}
            style={{
              fontSize: 13,
              color: '#FF9900',
              textDecoration: 'none',
              display: 'block',
              textAlign: 'center',
            }}
          >
            See all notifications
          </Link>
        </div>
      </div>
    </>
  )
}
