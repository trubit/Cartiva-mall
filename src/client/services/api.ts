import axios, { type AxiosInstance, type InternalAxiosRequestConfig } from 'axios'
import { useAuthStore } from '../store/authStore.js'
import { withJitter, delay } from '../utils/resilience.js'

const api: AxiosInstance = axios.create({
  baseURL: '/api/v1',
  withCredentials: true,
  headers: { 'Content-Type': 'application/json' },
  timeout: 15000,
})

// ─── Token helpers ────────────────────────────────────────────────────────────

function isTokenExpired(token: string): boolean {
  try {
    const { exp } = JSON.parse(atob(token.split('.')[1])) as { exp?: unknown }
    if (typeof exp !== 'number' || isNaN(exp)) return true
    return exp * 1000 < Date.now() + 10_000 // treat as expired 10 s before actual expiry
  } catch {
    return true
  }
}

// Shared promise so concurrent requests don't all fire separate refreshes
let refreshPromise: Promise<string | null> | null = null

// Endpoints that must NEVER trigger automatic token refresh
// (avoids infinite refresh→401→refresh loops)
const AUTH_BYPASS_PATHS = ['/auth/refresh', '/auth/login', '/auth/register', '/auth/logout']

function isAuthBypassPath(url?: string): boolean {
  if (!url) return false
  return AUTH_BYPASS_PATHS.some((p) => url.includes(p))
}

export function doRefresh(): Promise<string | null> {
  if (!useAuthStore.getState().isAuthenticated) {
    return Promise.resolve(null)
  }

  if (!refreshPromise) {
    refreshPromise = axios
      .post<{ data: { accessToken: string; user?: any } }>(
        '/api/v1/auth/refresh',
        {},
        { withCredentials: true },
      )
      .then(({ data }) => {
        const token = data.data.accessToken
        const freshUser = data.data.user
        // Update the in-memory Zustand store with fresh user data & role
        const { user, setAuth } = useAuthStore.getState()
        if (freshUser || user) {
          setAuth(freshUser || user, token)
        }
        return token
      })
      .catch(() => {
        // Refresh cookie invalid/expired — clear persisted auth so we stop looping
        useAuthStore.getState().clearAuth()
        return null
      })
      .finally(() => {
        refreshPromise = null
      })
  }
  return refreshPromise
}

// ─── Request interceptor — proactively refresh before sending expired token & attach request IDs ──
api.interceptors.request.use(async (config: InternalAxiosRequestConfig) => {
  const { accessToken, isAuthenticated } = useAuthStore.getState()
  let token = accessToken

  // Never auto-refresh for auth endpoints — prevents infinite refresh→401 loops
  const skip = isAuthBypassPath(config.url)

  if (!skip && ((!token && isAuthenticated) || (token && isTokenExpired(token)))) {
    const fresh = await doRefresh()
    token = fresh
    if (!token && !useAuthStore.getState().isAuthenticated) {
      return Promise.reject(new axios.Cancel('Session expired'))
    }
  }

  if (config.headers) {
    if (token) {
      config.headers.Authorization = `Bearer ${token}`
    }
    const requestId = crypto.randomUUID
      ? crypto.randomUUID()
      : `req-${Date.now()}-${Math.random().toString(36).slice(2, 9)}`
    config.headers['X-Request-ID'] = config.headers['X-Request-ID'] || requestId
    config.headers['X-Correlation-ID'] = config.headers['X-Correlation-ID'] || requestId
  }
  return config
})

// ─── Response interceptor — auth refresh & resilient exponential backoff retry ──
let isRefreshing = false
let failedQueue: Array<{ resolve: (t: string) => void; reject: (e: unknown) => void }> = []

const processQueue = (error: unknown, token?: string) => {
  failedQueue.forEach(({ resolve, reject }) => (token ? resolve(token) : reject(error)))
  failedQueue = []
}

const forceLogout = () => {
  useAuthStore.getState().clearAuth()
}

const isRetryableError = (error: any): boolean => {
  if (!error.response) return true // Network connection failure / timeout
  const status = error.response.status
  // Never retry 429 — retrying a rate-limited request just makes it worse.
  // Only retry transient 5xx server errors.
  return status >= 500
}

const getRetryAfterMs = (error: any): number => {
  const retryAfter = error.response?.headers?.['retry-after']
  if (retryAfter) {
    const parsed = parseInt(retryAfter, 10)
    if (!isNaN(parsed)) return parsed * 1000 // convert seconds → ms
  }
  return 0
}

api.interceptors.response.use(
  (response) => response,
  async (error) => {
    const originalRequest = error.config

    if (!originalRequest) return Promise.reject(error)

    // 1. Handle 401 Unauthorized token refresh
    // Skip auto-retry for auth-bypass endpoints to prevent infinite loops
    if (
      error.response?.status === 401 &&
      !originalRequest._retry &&
      !isAuthBypassPath(originalRequest.url)
    ) {
      if (isRefreshing) {
        return new Promise((resolve, reject) => {
          failedQueue.push({ resolve, reject })
        }).then((token) => {
          originalRequest.headers.Authorization = `Bearer ${token}`
          return api(originalRequest)
        })
      }

      originalRequest._retry = true
      isRefreshing = true

      try {
        const token = await doRefresh()
        if (!token) throw new Error('Refresh failed')
        processQueue(null, token)
        originalRequest.headers.Authorization = `Bearer ${token}`
        return api(originalRequest)
      } catch (refreshError) {
        processQueue(refreshError)
        forceLogout()
        return Promise.reject(refreshError)
      } finally {
        isRefreshing = false
      }
    }

    // 2. Handle Transient Failures (502, 503, 504, 429, Network error) with exponential backoff & full jitter
    const method = (originalRequest.method || 'get').toLowerCase()
    const isIdempotent = ['get', 'head', 'options', 'put', 'delete'].includes(method)

    originalRequest._retryCount = originalRequest._retryCount || 0
    const maxRetries = 2

    if (isIdempotent && isRetryableError(error) && originalRequest._retryCount < maxRetries) {
      originalRequest._retryCount++
      const retryAfterMs = getRetryAfterMs(error)
      const baseDelayMs = retryAfterMs || 300 * Math.pow(2, originalRequest._retryCount - 1)
      const jitterDelayMs = retryAfterMs ? baseDelayMs : Math.round(withJitter(baseDelayMs, 0.25))
      await delay(jitterDelayMs)
      return api(originalRequest)
    }

    return Promise.reject(error)
  },
)

export default api
