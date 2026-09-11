import { useEffect } from 'react'
import { BrowserRouter } from 'react-router-dom'
import { QueryClientProvider } from '@tanstack/react-query'
import { GoogleOAuthProvider } from '@react-oauth/google'
import { queryClient } from './client/services/queryClient.js'
import AppRouter from './client/routes/index.js'
import { useThemeStore } from './client/store/themeStore.js'
import { useCurrencyStore } from './client/store/currencyStore.js'
import { useAuthStore } from './client/store/authStore.js'
import { authService } from './client/services/authService.js'
import { ErrorBoundary } from './client/components/ErrorBoundary.js'
import './client/styles/global.css'
import './client/styles/profile.css'
import './client/styles/payment.css'
import './client/styles/orders.css'
import './client/styles/seller.css'
import './client/styles/admin.css'
import './client/styles/dashboard.css'
import './client/styles/cart.css'
import './client/styles/checkout.css'
import './client/styles/auth.css'
import './client/styles/messaging.css'
import './client/styles/responsive.css'

import { createTheme, ThemeProvider } from '@mui/material'

const GOOGLE_CLIENT_ID =
  (import.meta.env.VITE_GOOGLE_CLIENT_ID as string) ||
  '734121952137-gr7nf99dj0hg3jrsraj994olqame0ckn.apps.googleusercontent.com'

const muiTheme = createTheme({
  palette: {
    mode: 'dark',
    primary: {
      main: '#ff9900',
    },
  },
  components: {
    MuiModal: {
      defaultProps: {
        disableRestoreFocus: true,
      },
    },
    MuiDialog: {
      defaultProps: {
        disableRestoreFocus: true,
      },
    },
    MuiDrawer: {
      defaultProps: {
        disableRestoreFocus: true,
      },
    },
  },
})

function ThemeSync() {
  const theme = useThemeStore((s) => s.theme)
  useEffect(() => {
    document.documentElement.setAttribute('data-theme', theme)
  }, [theme])
  return null
}

function CurrencySync() {
  const fetchRates = useCurrencyStore((s) => s.fetchRates)
  useEffect(() => {
    void fetchRates()
  }, [fetchRates])
  return null
}

function AuthSync() {
  const isAuthenticated = useAuthStore((s) => s.isAuthenticated)
  const setAuth = useAuthStore((s) => s.setAuth)
  const clearAuth = useAuthStore((s) => s.clearAuth)

  useEffect(() => {
    if (!isAuthenticated) return // guest — nothing to do

    // Silently validate the session via httpOnly refresh cookie.
    // If the cookie is missing/expired, clear persisted auth so future
    // page loads don't trigger a 401 spam loop.
    authService
      .refresh()
      .then((res) => {
        if (res?.data?.accessToken && res?.data?.user) {
          setAuth(res.data.user, res.data.accessToken)
        } else {
          clearAuth()
        }
      })
      .catch(() => {
        // Refresh cookie gone (expired, cleared, or server restarted).
        // Wipe persisted isAuthenticated so we don't loop.
        clearAuth()
      })
    // Only run once on mount — dependency array is intentionally empty.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  return null
}

import { useSocket } from './client/hooks/useSocket.js'

function SocketSync() {
  const user = useAuthStore((s) => s.user)
  const userId = user?._id || (user as any)?.id
  useSocket(userId)
  return null
}

export default function App() {
  return (
    <ErrorBoundary>
      <GoogleOAuthProvider clientId={GOOGLE_CLIENT_ID}>
        <ThemeProvider theme={muiTheme}>
          <QueryClientProvider client={queryClient}>
            <BrowserRouter>
              <ThemeSync />
              <CurrencySync />
              <AuthSync />
              <SocketSync />
              <ErrorBoundary>
                <AppRouter />
              </ErrorBoundary>
            </BrowserRouter>
          </QueryClientProvider>
        </ThemeProvider>
      </GoogleOAuthProvider>
    </ErrorBoundary>
  )
}
