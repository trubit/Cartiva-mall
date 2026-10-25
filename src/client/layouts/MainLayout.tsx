import { Outlet } from 'react-router-dom'
import Navbar from '../components/layout/Navbar.js'
import Footer from '../components/layout/Footer.js'
import EmailVerificationBanner from '../components/layout/EmailVerificationBanner/index.js'
import BottomNav from '../components/layout/BottomNav.js'
import RouteErrorBoundary from '../components/RouteErrorBoundary.js'
import { useMe } from '../hooks/useAuth.js'
import { useAuthStore } from '../store/authStore.js'

function AuthSync() {
  useMe()
  return null
}

export default function MainLayout() {
  const isAuthenticated = useAuthStore((s) => s.isAuthenticated)

  return (
    <div style={{ display: 'flex', flexDirection: 'column', minHeight: '100vh' }}>
      <AuthSync />
      <Navbar />
      <EmailVerificationBanner />
      <main style={{ flex: 1 }}>
        <RouteErrorBoundary>
          <Outlet />
        </RouteErrorBoundary>
      </main>
      {!isAuthenticated && <Footer />}
      <BottomNav />
    </div>
  )
}
