import { useEffect } from 'react'
import { BrowserRouter } from 'react-router-dom'
import { QueryClientProvider } from '@tanstack/react-query'
import { queryClient } from './client/services/queryClient.js'
import AppRouter from './client/routes/index.js'
import { useThemeStore } from './client/store/themeStore.js'
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
import './client/styles/responsive.css'

function ThemeSync() {
  const theme = useThemeStore((s) => s.theme)
  useEffect(() => {
    document.documentElement.setAttribute('data-theme', theme)
  }, [theme])
  return null
}

export default function App() {
  return (
    <ErrorBoundary>
      <QueryClientProvider client={queryClient}>
        <BrowserRouter>
          <ThemeSync />
          <ErrorBoundary>
            <AppRouter />
          </ErrorBoundary>
        </BrowserRouter>
      </QueryClientProvider>
    </ErrorBoundary>
  )
}
