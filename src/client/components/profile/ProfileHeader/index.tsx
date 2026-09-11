import { NavLink } from 'react-router-dom'
import { FiUser, FiEdit3, FiMapPin, FiSettings, FiLogOut, FiPackage, FiGrid } from 'react-icons/fi'
import type { IUser } from '../../../../shared/types/user.types.js'
import { ROLES } from '../../../../shared/constants/index.js'
import { useLogout } from '../../../hooks/useAuth.js'

interface Props {
  user: IUser
}

const ROLE_LABEL: Record<string, string> = { user: 'Buyer', seller: 'Seller', admin: 'Admin' }

export default function ProfileHeader({ user }: Props) {
  const logoutMutation = useLogout()

  const initials = `${user.firstName[0] ?? ''}${user.lastName[0] ?? ''}`.toUpperCase()

  return (
    <aside className="profile-sidebar">
      <div className="profile-sidebar-header">
        <div className="profile-sidebar-avatar-wrap">
          {user.profileImage ? (
            <img
              src={user.profileImage}
              alt={`${user.firstName} ${user.lastName}`}
              className="profile-sidebar-avatar"
            />
          ) : (
            <div className="profile-avatar-fallback">{initials}</div>
          )}
        </div>
        <p className="profile-sidebar-name">
          {user.firstName} {user.lastName}
        </p>
        <p className="profile-sidebar-email">{user.email}</p>
        <span className={`profile-role-badge profile-role-badge--${user.role}`}>
          {ROLE_LABEL[user.role] ?? user.role}
        </span>
      </div>

      <nav className="profile-nav">
        <NavLink
          to="/profile"
          end
          className={({ isActive }) => `profile-nav-item${isActive ? ' active' : ''}`}
        >
          <FiUser /> My Profile
        </NavLink>
        <NavLink
          to="/profile/edit"
          className={({ isActive }) => `profile-nav-item${isActive ? ' active' : ''}`}
        >
          <FiEdit3 /> Edit Profile
        </NavLink>
        <NavLink
          to="/profile/address"
          className={({ isActive }) => `profile-nav-item${isActive ? ' active' : ''}`}
        >
          <FiMapPin /> Address Book
        </NavLink>
        <NavLink
          to="/orders"
          className={({ isActive }) => `profile-nav-item${isActive ? ' active' : ''}`}
        >
          <FiPackage /> My Orders
        </NavLink>
        <NavLink
          to="/profile/settings"
          className={({ isActive }) => `profile-nav-item${isActive ? ' active' : ''}`}
        >
          <FiSettings /> Settings
        </NavLink>

        {(user.role === ROLES.SELLER || user.role === ROLES.ADMIN) && (
          <>
            <div className="profile-nav-divider" />
            <NavLink
              to="/seller"
              className={({ isActive }) =>
                `profile-nav-item profile-nav-item--seller${isActive ? ' active' : ''}`
              }
            >
              <FiGrid /> Seller Hub
            </NavLink>
          </>
        )}

        <div className="profile-nav-divider" />

        <button
          className="profile-nav-item"
          style={{
            width: '100%',
            textAlign: 'left',
            border: 'none',
            background: 'transparent',
            color: '#dc2626',
          }}
          onClick={() => logoutMutation.mutate()}
        >
          <FiLogOut style={{ color: '#dc2626' }} /> Sign Out
        </button>
      </nav>
    </aside>
  )
}
