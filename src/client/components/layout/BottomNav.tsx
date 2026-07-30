import { Link, useLocation } from 'react-router-dom'
import { FiHome, FiSearch, FiShoppingCart, FiUser } from 'react-icons/fi'
import { useCartStore } from '../../store/cartStore.js'
import { useAuthStore } from '../../store/authStore.js'

const NAV_ITEMS = [
  { to: '/', icon: FiHome, label: 'Home', exact: true },
  { to: '/products', icon: FiSearch, label: 'Shop', exact: false },
  { to: '/cart', icon: FiShoppingCart, label: 'Cart', exact: false },
  { to: '/profile', icon: FiUser, label: 'Account', exact: false },
]

export default function BottomNav() {
  const location = useLocation()
  const totalItems = useCartStore((s) => s.totalItems())
  const { isAuthenticated } = useAuthStore()

  const isActive = (to: string, exact: boolean) =>
    exact ? location.pathname === to : location.pathname.startsWith(to)

  const accountTo = isAuthenticated ? '/profile' : '/login'

  return (
    <nav className="mobile-bottom-nav" aria-label="Mobile navigation">
      {NAV_ITEMS.map(({ to, icon: Icon, label, exact }) => {
        const href = label === 'Account' ? accountTo : to
        const active = isActive(to, exact)
        const showBadge = label === 'Cart' && totalItems > 0

        return (
          <Link
            key={label}
            to={href}
            className={`mobile-bottom-nav__item${active ? ' active' : ''}`}
            aria-current={active ? 'page' : undefined}
            aria-label={label}
          >
            <Icon size={22} aria-hidden="true" />
            <span>{label}</span>
            {showBadge && (
              <span className="mobile-bottom-nav__badge" aria-label={`${totalItems} items`}>
                {totalItems > 99 ? '99+' : totalItems}
              </span>
            )}
          </Link>
        )
      })}
    </nav>
  )
}
