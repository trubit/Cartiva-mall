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

    const attemptRefresh = () => {
      // Don't attempt if device is offline
      if (typeof navigator !== 'undefined' && !navigator.onLine) {
        return
      }

      authService
        .refresh()
        .then((res) => {
          if (res?.data?.accessToken && res?.data?.user) {
            setAuth(res.data.user, res.data.accessToken)
          } else {
            clearAuth()
          }
        })
        .catch((err: any) => {
          // If offline or network error, preserve stored session identity so offline features remain accessible.
          // Only wipe auth if the server explicitly rejected the credentials with 401 or 403.
          const status = err?.response?.status
          if (status === 401 || status === 403) {
            clearAuth()
          }
        })
    }

    attemptRefresh()

    // When connection is restored, silently re-validate credentials and refresh stale data
    const handleOnline = () => {
      attemptRefresh()
      void queryClient.invalidateQueries({ queryKey: ['cart'] })
      void queryClient.invalidateQueries({ queryKey: ['products'] })
    }

    window.addEventListener('online', handleOnline)
    return () => window.removeEventListener('online', handleOnline)
  }, [isAuthenticated, setAuth, clearAuth])

  return null
}

import { useSocket } from './client/hooks/useSocket.js'
import ScrollToTop from './client/components/common/ScrollToTop.js'
import ConnectionStatus from './client/components/common/ConnectionStatus/index.js'

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
              <ConnectionStatus />
              <ScrollToTop />
              <ThemeSync />
              <CurrencySync />
              <AuthSync />
              <SocketSync />
              <AppRouter />
            </BrowserRouter>
          </QueryClientProvider>
        </ThemeProvider>
      </GoogleOAuthProvider>
    </ErrorBoundary>
  )
}
