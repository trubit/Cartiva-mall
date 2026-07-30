import { Outlet } from 'react-router-dom'
import Navbar from '../components/layout/Navbar.js'
import EmailVerificationBanner from '../components/layout/EmailVerificationBanner/index.js'
import BottomNav from '../components/layout/BottomNav.js'
import { useMe } from '../hooks/useAuth.js'

function AuthSync() {
  useMe()
  return null
}

export default function NavbarLayout() {
  return (
    <div style={{ display: 'flex', flexDirection: 'column', minHeight: '100vh' }}>
      <AuthSync />
      <Navbar />
      <EmailVerificationBanner />
      <main style={{ flex: 1 }}>
        <Outlet />
      </main>
      <BottomNav />
    </div>
  )
}
