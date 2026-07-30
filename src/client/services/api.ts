import axios, { type AxiosInstance, type InternalAxiosRequestConfig } from 'axios'
import { useAuthStore } from '../store/authStore.js'

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

function doRefresh(): Promise<string | null> {
  if (!refreshPromise) {
    refreshPromise = axios
      .post<{ data: { accessToken: string } }>(
        '/api/v1/auth/refresh',
        {},
        { withCredentials: true },
      )
      .then(({ data }) => {
        const token = data.data.accessToken
        // Update the in-memory Zustand store — never write tokens to localStorage
        const { user, setAuth } = useAuthStore.getState()
        if (user) setAuth(user, token)
        return token
      })
      .catch(() => null)
      .finally(() => {
        refreshPromise = null
      })
  }
  return refreshPromise
}

// ─── Request interceptor — proactively refresh before sending expired token ──
api.interceptors.request.use(async (config: InternalAxiosRequestConfig) => {
  const { accessToken, isAuthenticated } = useAuthStore.getState()
  let token = accessToken

  // Refresh when:
  // (a) token is present but expired/about to expire, OR
  // (b) token is absent but the user is authenticated — happens after a hard page
  //     reload (window.location.href) which clears in-memory Zustand state while
  //     the httpOnly refresh-token cookie is still valid.
  if ((!token && isAuthenticated) || (token && isTokenExpired(token))) {
    const fresh = await doRefresh()
    token = fresh // null if refresh failed; the response interceptor will handle it
  }

  if (token && config.headers) {
    config.headers.Authorization = `Bearer ${token}`
  }
  return config
})

// ─── Response interceptor — catch any unexpected 401s that slipped through ───
let isRefreshing = false
let failedQueue: Array<{ resolve: (t: string) => void; reject: (e: unknown) => void }> = []

const processQueue = (error: unknown, token?: string) => {
  failedQueue.forEach(({ resolve, reject }) => (token ? resolve(token) : reject(error)))
  failedQueue = []
}

const forceLogout = () => {
  useAuthStore.getState().clearAuth()
  window.location.href = '/login'
}

api.interceptors.response.use(
  (response) => response,
  async (error) => {
    const originalRequest = error.config

    if (error.response?.status === 401 && !originalRequest._retry) {
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

    return Promise.reject(error)
  },
)

export default api
