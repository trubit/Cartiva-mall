import { NavLink, Link } from 'react-router-dom'
import {
  FiGrid,
  FiPackage,
  FiShoppingBag,
  FiBarChart2,
  FiDollarSign,
  FiSettings,
  FiExternalLink,
  FiArchive,
} from 'react-icons/fi'
import Logo from '../../ui/Logo/index.js'

const NAV = [
  { to: '/seller', end: true, Icon: FiGrid, label: 'Dashboard' },
  { to: '/seller/products', end: false, Icon: FiPackage, label: 'Products' },
  { to: '/seller/inventory', end: false, Icon: FiArchive, label: 'Inventory' },
  { to: '/seller/orders', end: false, Icon: FiShoppingBag, label: 'Orders' },
  { to: '/seller/analytics', end: false, Icon: FiBarChart2, label: 'Analytics' },
  { to: '/seller/payouts', end: false, Icon: FiDollarSign, label: 'Payouts' },
  { to: '/seller/settings', end: false, Icon: FiSettings, label: 'Settings' },
]

const SIDEBAR_BG = '#0B2D3D'
const ACCENT = '#007185'
const TEXT_DIM = 'rgba(255,255,255,0.60)'
const TEXT_BRIGHT = '#fff'
const BORDER = 'rgba(255,255,255,0.10)'
const GROUP_COLOR = 'rgba(255,255,255,0.28)'

// ─── Desktop sidebar ──────────────────────────────────────────────────────────
export default function SellerSidebar() {
  return (
    <aside
      style={{
        width: '240px',
        flexShrink: 0,
        background: SIDEBAR_BG,
        color: TEXT_BRIGHT,
        display: 'flex',
        flexDirection: 'column',
        position: 'sticky',
        top: 0,
        height: '100vh',
        overflowY: 'auto',
      }}
    >
      {/* Logo */}
      <div
        style={{ padding: '1.25rem', borderBottom: `1px solid ${BORDER}`, marginBottom: '0.5rem' }}
      >
        <Link to="/" style={{ textDecoration: 'none', display: 'block', marginBottom: '0.5rem' }}>
          <Logo size="sm" theme="dark" />
        </Link>
        <span
          style={{
            fontSize: '0.62rem',
            fontWeight: 700,
            letterSpacing: '0.16em',
            textTransform: 'uppercase',
            color: 'rgba(200,169,106,0.6)',
          }}
        >
          Seller Hub
        </span>
      </div>

      {/* Nav */}
      <nav style={{ display: 'flex', flexDirection: 'column', padding: '0.5rem 0', flex: 1 }}>
        <p
          style={{
            fontSize: '0.62rem',
            fontWeight: 700,
            letterSpacing: '0.08em',
            textTransform: 'uppercase',
            color: GROUP_COLOR,
            padding: '0.75rem 1.25rem 0.25rem',
            margin: 0,
          }}
        >
          Overview
        </p>
        {NAV.slice(0, 1).map(({ to, end, Icon, label }) => (
          <SidebarLink key={to} to={to} end={end} Icon={Icon} label={label} />
        ))}

        <p
          style={{
            fontSize: '0.62rem',
            fontWeight: 700,
            letterSpacing: '0.08em',
            textTransform: 'uppercase',
            color: GROUP_COLOR,
            padding: '0.75rem 1.25rem 0.25rem',
            margin: 0,
          }}
        >
          Manage
        </p>
        {NAV.slice(1, 4).map(({ to, end, Icon, label }) => (
          <SidebarLink key={to} to={to} end={end} Icon={Icon} label={label} />
        ))}

        <p
          style={{
            fontSize: '0.62rem',
            fontWeight: 700,
            letterSpacing: '0.08em',
            textTransform: 'uppercase',
            color: GROUP_COLOR,
            padding: '0.75rem 1.25rem 0.25rem',
            margin: 0,
          }}
        >
          Account
        </p>
        {NAV.slice(4).map(({ to, end, Icon, label }) => (
          <SidebarLink key={to} to={to} end={end} Icon={Icon} label={label} />
        ))}
      </nav>

      {/* Footer link */}
      <div style={{ padding: '1rem 1.25rem', borderTop: `1px solid ${BORDER}` }}>
        <Link
          to="/"
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: 6,
            color: TEXT_DIM,
            fontSize: '0.75rem',
            textDecoration: 'none',
          }}
        >
          <FiExternalLink size={13} /> View Storefront
        </Link>
      </div>
    </aside>
  )
}

// ─── Mobile tab strip ─────────────────────────────────────────────────────────
export function SellerMobileNav() {
  return (
    <nav
      style={{
        display: 'flex',
        background: SIDEBAR_BG,
        overflowX: 'auto',
        WebkitOverflowScrolling: 'touch',
        scrollbarWidth: 'none',
        borderBottom: `2px solid ${BORDER}`,
        flexShrink: 0,
      }}
    >
      {NAV.map(({ to, end, Icon, label }) => (
        <NavLink
          key={to}
          to={to}
          end={end}
          style={({ isActive }) => ({
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            justifyContent: 'center',
            gap: 3,
            padding: '0.65rem 1rem',
            color: isActive ? ACCENT : TEXT_DIM,
            textDecoration: 'none',
            fontSize: '0.68rem',
            fontWeight: 600,
            whiteSpace: 'nowrap',
            borderBottom: isActive ? `3px solid ${ACCENT}` : '3px solid transparent',
            minWidth: '60px',
            flexShrink: 0,
          })}
        >
          <Icon size={18} />
          <span>{label}</span>
        </NavLink>
      ))}
    </nav>
  )
}

function SidebarLink({
  to,
  end,
  Icon,
  label,
}: {
  to: string
  end?: boolean
  Icon: React.ElementType
  label: string
}) {
  return (
    <NavLink
      to={to}
      end={end}
      style={({ isActive }) => ({
        display: 'flex',
        alignItems: 'center',
        gap: '0.625rem',
        padding: '0.65rem 1.25rem',
        color: isActive ? '#4fc3f7' : TEXT_DIM,
        textDecoration: 'none',
        fontSize: '0.83rem',
        fontWeight: 500,
        borderLeft: isActive ? `3px solid ${ACCENT}` : '3px solid transparent',
        background: isActive ? 'rgba(0,113,133,0.15)' : 'transparent',
        transition: 'background 0.14s, color 0.14s',
      })}
    >
      <Icon size={15} />
      {label}
    </NavLink>
  )
}
