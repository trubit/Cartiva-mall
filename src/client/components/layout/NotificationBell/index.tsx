import { useState } from 'react'
import { FiBell } from 'react-icons/fi'
import { useNotifications } from '../../../hooks/useNotifications.js'
import NotificationDrawer from '../../notification/NotificationDrawer/index.js'

export default function NotificationBell() {
  const [open, setOpen] = useState(false)
  const { unreadQuery } = useNotifications(1, { enabled: false })
  const count = unreadQuery.data ?? 0

  return (
    <>
      <button
        className="amz-action-link__btn amz-notif-btn hide-mobile"
        onClick={() => setOpen(true)}
        aria-label={`Notifications${count > 0 ? ` (${count} unread)` : ''}`}
        style={{ position: 'relative', display: 'flex', alignItems: 'center', gap: 4 }}
      >
        <span style={{ position: 'relative' }}>
          <FiBell size={22} />
          {count > 0 && (
            <span
              style={{
                position: 'absolute',
                top: -6,
                right: -6,
                background: '#e53e3e',
                color: '#fff',
                fontSize: 10,
                fontWeight: 700,
                borderRadius: '50%',
                minWidth: 16,
                height: 16,
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                padding: '0 3px',
              }}
            >
              {count > 99 ? '99+' : count}
            </span>
          )}
        </span>
      </button>

      <NotificationDrawer open={open} onClose={() => setOpen(false)} />
    </>
  )
}
