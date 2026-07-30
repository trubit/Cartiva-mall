import { Outlet } from 'react-router-dom'
import { useIsMobile } from '../../../hooks/useBreakpoint.js'
import SellerSidebar, { SellerMobileNav } from '../../../components/seller/SellerSidebar/index.js'

export default function SellerLayout() {
  const isMobile = useIsMobile(991)

  // ── Desktop: left sidebar ──────────────────────────────────────────────────
  if (!isMobile) {
    return (
      <div
        style={{
          display: 'flex',
          minHeight: '100%',
          background: 'var(--color-neutral-50, #f8f9fa)',
        }}
      >
        <SellerSidebar />
        <main style={{ flex: 1, minWidth: 0, overflowX: 'hidden' }}>
          <Outlet />
        </main>
      </div>
    )
  }

  // ── Mobile / Tablet: top tab strip ────────────────────────────────────────
  return (
    <div
      style={{
        display: 'flex',
        flexDirection: 'column',
        minHeight: '100%',
        background: 'var(--color-neutral-50, #f8f9fa)',
      }}
    >
      <SellerMobileNav />
      <main style={{ flex: 1, minWidth: 0, overflowX: 'hidden' }}>
        <Outlet />
      </main>
    </div>
  )
}
