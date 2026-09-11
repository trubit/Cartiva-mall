import { NavLink } from 'react-router-dom'
import {
  FiGrid,
  FiHeart,
  FiBell,
  FiCreditCard,
  FiEye,
  FiUser,
  FiShield,
  FiShoppingBag,
  FiTruck,
  FiRotateCcw,
  FiMessageSquare,
} from 'react-icons/fi'
import { useDashboardStore } from '../../../store/dashboardStore.js'
import { useUnreadMessagesCount } from '../../../hooks/useMessaging.js'
import type { IUser } from '../../../../shared/types/user.types.js'

interface DashboardSidebarProps {
  user?: IUser
}

const NAV_ITEMS = [
  { label: 'Overview', icon: FiGrid, to: '/dashboard' },
  { label: 'My Orders', icon: FiShoppingBag, to: '/orders' },
  { label: 'Wishlist', icon: FiHeart, to: '/dashboard/wishlist' },
  { label: 'Notifications', icon: FiBell, to: '/dashboard/notifications', badge: 'notifications' },
  { label: 'Messages', icon: FiMessageSquare, to: '/messages', badge: 'messages' },
  { label: 'Shipments', icon: FiTruck, to: '/dashboard/shipments' },
  { label: 'Returns', icon: FiRotateCcw, to: '/dashboard/returns' },
  { label: 'Payments', icon: FiCreditCard, to: '/dashboard/payments' },
  { label: 'Recently Viewed', icon: FiEye, to: '/dashboard/recently-viewed' },
]

const SETTINGS_ITEMS = [
  { label: 'Account', icon: FiUser, to: '/dashboard/account' },
  { label: 'Security', icon: FiShield, to: '/dashboard/security' },
]

export default function DashboardSidebar({ user }: DashboardSidebarProps) {
  const unreadNotifCount = useDashboardStore((s) => s.unreadCount)
  const { data: unreadMsgData } = useUnreadMessagesCount()
  const unreadMsgCount = unreadMsgData?.unreadConversations ?? 0

  const initials = user
    ? `${user.firstName?.[0] ?? ''}${user.lastName?.[0] ?? ''}`.toUpperCase() || '?'
    : '?'

  return (
    <aside className="dashboard-sidebar">
      {/* User identity */}
      <div className="dashboard-sidebar__user">
        {user?.profileImage ? (
          <img
            src={user.profileImage}
            alt={`${user.firstName} ${user.lastName}`}
            className="dashboard-sidebar__avatar"
          />
        ) : (
          <div className="dashboard-sidebar__avatar-placeholder">{initials}</div>
        )}
        <div style={{ overflow: 'hidden' }}>
          <div className="dashboard-sidebar__name">
            {user ? `${user.firstName} ${user.lastName}` : '—'}
          </div>
          <div className="dashboard-sidebar__email">{user?.email ?? ''}</div>
        </div>
      </div>

      {/* Main nav */}
      <ul className="dashboard-sidebar__nav">
        <li className="dashboard-sidebar__section-label">Dashboard</li>
        {NAV_ITEMS.map(({ label, icon: Icon, to, badge }) => {
          const badgeCount =
            badge === 'notifications' ? unreadNotifCount : badge === 'messages' ? unreadMsgCount : 0

          return (
            <li key={to}>
              <NavLink
                to={to}
                end={to === '/dashboard'}
                className={({ isActive }) => `dashboard-sidebar__link${isActive ? ' active' : ''}`}
              >
                <Icon className="dashboard-sidebar__link-icon" />
                {label}
                {badgeCount > 0 && (
                  <span className="dashboard-sidebar__badge">
                    {badgeCount > 99 ? '99+' : badgeCount}
                  </span>
                )}
              </NavLink>
            </li>
          )
        })}

        <li className="dashboard-sidebar__section-label" style={{ marginTop: '1rem' }}>
          Settings
        </li>
        {SETTINGS_ITEMS.map(({ label, icon: Icon, to }) => (
          <li key={to}>
            <NavLink
              to={to}
              className={({ isActive }) => `dashboard-sidebar__link${isActive ? ' active' : ''}`}
            >
              <Icon className="dashboard-sidebar__link-icon" />
              {label}
            </NavLink>
          </li>
        ))}

        {user?.role === 'seller' || user?.role === 'admin' ? (
          <li
            style={{
              marginTop: '1.25rem',
              paddingTop: '0.75rem',
              borderTop: '1px solid var(--color-neutral-200)',
            }}
          >
            <NavLink
              to="/seller"
              className="dashboard-sidebar__link"
              style={{ fontWeight: 700, color: 'var(--color-brand-accent, #FF9900)' }}
            >
              <FiGrid className="dashboard-sidebar__link-icon" />
              Switch to Seller Hub →
            </NavLink>
          </li>
        ) : (
          <li
            style={{
              marginTop: '1.25rem',
              paddingTop: '0.75rem',
              borderTop: '1px solid var(--color-neutral-200)',
            }}
          >
            <NavLink
              to="/seller/register"
              className="dashboard-sidebar__link"
              style={{ fontWeight: 600, color: '#007185' }}
            >
              <FiShoppingBag className="dashboard-sidebar__link-icon" />
              Become a Seller →
            </NavLink>
          </li>
        )}
      </ul>
    </aside>
  )
}
