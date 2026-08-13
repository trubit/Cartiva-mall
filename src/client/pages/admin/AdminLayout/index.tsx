import { NavLink, Outlet, Link } from 'react-router-dom'
import {
  FiGrid,
  FiUsers,
  FiPackage,
  FiShoppingBag,
  FiBriefcase,
  FiBarChart2,
  FiFileText,
  FiSettings,
  FiArchive,
  FiTag,
  FiTruck,
  FiRotateCcw,
  FiBox,
  FiUserCheck,
  FiDollarSign,
  FiPieChart,
  FiTrendingUp,
  FiZap,
  FiShield,
  FiCode,
  FiRadio,
  FiCpu,
} from 'react-icons/fi'
import { useAdminStats, useAdminFraudAlerts } from '../../../hooks/useAdmin.js'
import { useIsMobile } from '../../../hooks/useBreakpoint.js'
import Logo from '../../../components/ui/Logo/index.js'

const NAV_OVERVIEW = [
  { to: '/admin', end: true, Icon: FiGrid, label: 'Dashboard' },
  { to: '/admin/analytics', end: false, Icon: FiBarChart2, label: 'Analytics' },
  { to: '/admin/reports', end: false, Icon: FiFileText, label: 'Reports' },
]
const NAV_MANAGE = [
  { to: '/admin/users', end: false, Icon: FiUsers, label: 'Users' },
  { to: '/admin/sellers', end: false, Icon: FiBriefcase, label: 'Sellers' },
  { to: '/admin/products', end: false, Icon: FiPackage, label: 'Products' },
  { to: '/admin/orders', end: false, Icon: FiShoppingBag, label: 'Orders' },
  { to: '/admin/inventory', end: false, Icon: FiArchive, label: 'Inventory' },
  { to: '/admin/promotions', end: false, Icon: FiTag, label: 'Promotions' },
]
const NAV_OPERATIONS = [
  { to: '/admin/shipping', end: false, Icon: FiTruck, label: 'Shipping' },
  { to: '/admin/returns', end: false, Icon: FiRotateCcw, label: 'Returns' },
  { to: '/admin/vendors', end: false, Icon: FiBox, label: 'Vendors' },
  { to: '/admin/vendor-approvals', end: false, Icon: FiUserCheck, label: 'Vendor Approvals' },
]
const NAV_ENTERPRISE = [
  { to: '/admin/godmode', end: false, Icon: FiCpu, label: 'God-Mode AI' },
  { to: '/admin/finance', end: false, Icon: FiDollarSign, label: 'Finance' },
  { to: '/admin/analytics-bi', end: false, Icon: FiPieChart, label: 'BI & Analytics' },
  { to: '/admin/forecasting', end: false, Icon: FiTrendingUp, label: 'Forecasting' },
  { to: '/admin/workflows', end: false, Icon: FiZap, label: 'Workflows' },
  { to: '/admin/iam', end: false, Icon: FiShield, label: 'IAM & Security' },
  { to: '/admin/developer-platform', end: false, Icon: FiCode, label: 'Developer Platform' },
  { to: '/admin/event-system', end: false, Icon: FiRadio, label: 'Event System' },
]
const NAV_SYSTEM = [{ to: '/admin/settings', end: false, Icon: FiSettings, label: 'Settings' }]

const NAV_ALL = [
  ...NAV_OVERVIEW,
  ...NAV_MANAGE,
  ...NAV_OPERATIONS,
  ...NAV_ENTERPRISE,
  ...NAV_SYSTEM,
]

// ─── inline style constants ─────────────────────────────────────────────────
const SIDEBAR_BG = '#131921'
const ACCENT = '#FF9900'
const TEXT_DIM = 'rgba(255,255,255,0.65)'
const TEXT_BRIGHT = '#fff'
const BORDER = 'rgba(255,255,255,0.10)'
const GROUP_COLOR = 'rgba(255,255,255,0.30)'

export default function AdminLayout() {
  const { data: statsRes } = useAdminStats()
  const { data: fraudRes } = useAdminFraudAlerts()
  const stats = statsRes?.data
  const fraudCnt = fraudRes?.data?.total ?? 0
  const isMobile = useIsMobile(991)

  const getBadge = (label: string): number | null => {
    if (!stats) return null
    if (label === 'Users') return stats.users.total
    if (label === 'Products') return stats.products.pending > 0 ? stats.products.pending : null
    if (label === 'Orders') return stats.orders.total
    if (label === 'Settings') return fraudCnt > 0 ? fraudCnt : null
    return null
  }

  // ── Desktop: left sidebar ────────────────────────────────────────────────
  if (!isMobile) {
    return (
      <div
        style={{
          display: 'flex',
          minHeight: '100%',
          background: 'var(--color-neutral-50, #f8f9fa)',
        }}
      >
        {/* Sidebar */}
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
          {/* Logo block */}
          <div
            style={{
              padding: '1.25rem',
              borderBottom: `1px solid ${BORDER}`,
              marginBottom: '0.5rem',
            }}
          >
            <Link
              to="/"
              style={{ textDecoration: 'none', display: 'block', marginBottom: '0.5rem' }}
            >
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
              Admin Panel
            </span>
          </div>

          {/* Nav */}
          <nav style={{ display: 'flex', flexDirection: 'column', padding: '0.5rem 0' }}>
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
            {NAV_OVERVIEW.map(({ to, end, Icon, label }) => (
              <SidebarLink
                key={to}
                to={to}
                end={end}
                Icon={Icon}
                label={label}
                badge={getBadge(label)}
              />
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
            {NAV_MANAGE.map(({ to, end, Icon, label }) => (
              <SidebarLink
                key={to}
                to={to}
                end={end}
                Icon={Icon}
                label={label}
                badge={getBadge(label)}
              />
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
              Operations
            </p>
            {NAV_OPERATIONS.map(({ to, end, Icon, label }) => (
              <SidebarLink
                key={to}
                to={to}
                end={end}
                Icon={Icon}
                label={label}
                badge={getBadge(label)}
              />
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
              Enterprise
            </p>
            {NAV_ENTERPRISE.map(({ to, end, Icon, label }) => (
              <SidebarLink key={to} to={to} end={end} Icon={Icon} label={label} badge={null} />
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
              System
            </p>
            {NAV_SYSTEM.map(({ to, end, Icon, label }) => (
              <SidebarLink
                key={to}
                to={to}
                end={end}
                Icon={Icon}
                label={label}
                badge={getBadge(label)}
              />
            ))}
          </nav>
        </aside>

        {/* Content */}
        <main style={{ flex: 1, minWidth: 0, padding: '2rem' }}>
          <Outlet />
        </main>
      </div>
    )
  }

  // ── Mobile / Tablet: top tab bar ─────────────────────────────────────────
  return (
    <div
      style={{
        display: 'flex',
        flexDirection: 'column',
        minHeight: '100%',
        background: 'var(--color-neutral-50, #f8f9fa)',
      }}
    >
      {/* Tab strip */}
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
        {NAV_ALL.map(({ to, end, Icon, label }) => (
          <NavLink
            key={to}
            to={to}
            end={end}
            style={({ isActive }) => ({
              display: 'flex',
              flexDirection: 'column',
              alignItems: 'center',
              justifyContent: 'center',
              gap: '3px',
              padding: '0.65rem 1rem',
              color: isActive ? ACCENT : TEXT_DIM,
              textDecoration: 'none',
              fontSize: '0.7rem',
              fontWeight: 600,
              whiteSpace: 'nowrap',
              borderBottom: isActive ? `3px solid ${ACCENT}` : '3px solid transparent',
              minWidth: '64px',
              flexShrink: 0,
              position: 'relative',
            })}
          >
            <Icon size={18} />
            <span>{label}</span>
            {getBadge(label) !== null && (
              <span
                style={{
                  position: 'absolute',
                  top: 4,
                  right: 4,
                  background: '#dc2626',
                  color: '#fff',
                  fontSize: '.5rem',
                  fontWeight: 700,
                  padding: '1px 4px',
                  borderRadius: 999,
                  lineHeight: 1.4,
                }}
              >
                {getBadge(label)}
              </span>
            )}
          </NavLink>
        ))}
      </nav>

      {/* Content */}
      <main style={{ flex: 1, minWidth: 0, padding: '1rem', overflowX: 'hidden' }}>
        <Outlet />
      </main>
    </div>
  )
}

// ─── Sidebar link sub-component ─────────────────────────────────────────────
function SidebarLink({
  to,
  end,
  Icon,
  label,
  badge,
}: {
  to: string
  end?: boolean
  Icon: React.ElementType
  label: string
  badge: number | null
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
        color: isActive ? ACCENT : TEXT_DIM,
        textDecoration: 'none',
        fontSize: '0.83rem',
        fontWeight: 500,
        borderLeft: isActive ? `3px solid ${ACCENT}` : '3px solid transparent',
        background: isActive ? 'rgba(255,153,0,0.10)' : 'transparent',
        transition: 'background 0.14s, color 0.14s',
      })}
    >
      <Icon size={15} />
      {label}
      {badge !== null && (
        <span
          style={{
            marginLeft: 'auto',
            background: '#e53e3e',
            color: '#fff',
            fontSize: '0.6rem',
            fontWeight: 700,
            padding: '0.1rem 0.42rem',
            borderRadius: '999px',
            minWidth: '18px',
            textAlign: 'center',
          }}
        >
          {badge}
        </span>
      )}
    </NavLink>
  )
}
