import type { CorsOptions } from 'cors'
import { env } from './env.js'

/**
 * Legitimate application request headers accepted by Cartiva Mall.
 * Preflight OPTIONS requests match against these headers.
 */
export const ALLOWED_HEADERS: string[] = [
  'Content-Type',
  'Authorization',
  'X-Request-ID',
  'x-request-id',
  'X-Correlation-ID',
  'x-correlation-id',
  'x-session-id',
  'x-refresh-token',
  'x-api-key',
  'Accept',
  'Origin',
  'X-Requested-With',
  'Range',
  'Cache-Control',
  'Pragma',
]

/**
 * Headers exposed to client JavaScript (Axios / Fetch) via Access-Control-Expose-Headers.
 */
export const EXPOSED_HEADERS: string[] = [
  'X-Request-ID',
  'x-request-id',
  'X-Correlation-ID',
  'x-correlation-id',
  'Retry-After',
  'Content-Range',
  'Content-Length',
]

/**
 * HTTP methods permitted by Cartiva Mall endpoints.
 */
export const ALLOWED_METHODS: string[] = [
  'GET',
  'POST',
  'PUT',
  'PATCH',
  'DELETE',
  'OPTIONS',
  'HEAD',
]

/**
 * Standard local development origins.
 */
const LOCAL_ORIGINS: string[] = [
  'http://localhost:5170',
  'http://localhost:5173',
  'http://localhost:3000',
  'http://127.0.0.1:5170',
  'http://127.0.0.1:5173',
  'http://127.0.0.1:3000',
]

/**
 * Canonical production Vercel frontend origin.
 */
export const VERCEL_PRODUCTION_ORIGIN = 'https://cartiva-mall.vercel.app'

/**
 * Validates whether an incoming HTTP or WebSocket origin is permitted.
 *
 * Security & Validation Policy:
 * 1. Origin undefined (curl, mobile apps, server-to-server) is permitted.
 * 2. Explicitly configured client and frontend URLs (env.CLIENT_URL, env.FRONTEND_URL) are permitted.
 * 3. Any additional comma-separated origins in env.ALLOWED_ORIGINS are permitted.
 * 4. The canonical Cartiva Mall Vercel production domain (https://cartiva-mall.vercel.app) is permitted.
 * 5. Specific Cartiva Mall Vercel preview branches matching https://cartiva-mall-*.vercel.app are permitted.
 * 6. Arbitrary third-party .vercel.app origins are strictly blocked to prevent credential theft.
 * 7. Standard local development origins are permitted.
 */
export const isAllowedOrigin = (origin?: string): boolean => {
  if (!origin) return true

  const cleanOrigin = origin.replace(/\/$/, '')
  const configuredClient = env.CLIENT_URL ? env.CLIENT_URL.replace(/\/$/, '') : ''
  const configuredFrontend = env.FRONTEND_URL ? env.FRONTEND_URL.replace(/\/$/, '') : ''

  // 1. Configured client / frontend URL
  if (configuredClient && cleanOrigin === configuredClient) return true
  if (configuredFrontend && cleanOrigin === configuredFrontend) return true

  // 2. Explicitly configured custom origins
  if (env.ALLOWED_ORIGINS && env.ALLOWED_ORIGINS.includes(cleanOrigin)) return true

  // 3. Exact Vercel production domain
  if (cleanOrigin === VERCEL_PRODUCTION_ORIGIN) return true

  // 4. Authorized Vercel preview deployments for this project only
  // Matches: https://cartiva-mall-<preview-slug>.vercel.app
  if (/^https:\/\/cartiva-mall(-[a-z0-9-]+)?\.vercel\.app$/i.test(cleanOrigin)) {
    return true
  }

  // 5. Localhost origins
  if (LOCAL_ORIGINS.includes(cleanOrigin)) {
    return true
  }

  return false
}

/**
 * Complete Express CORS middleware configuration.
 */
export const corsOptions: CorsOptions = {
  origin: (origin, callback) => {
    if (isAllowedOrigin(origin)) {
      callback(null, true)
    } else {
      callback(null, false)
    }
  },
  credentials: true,
  methods: ALLOWED_METHODS,
  allowedHeaders: ALLOWED_HEADERS,
  exposedHeaders: EXPOSED_HEADERS,
  maxAge: 86400, // 24 hours preflight cache
  optionsSuccessStatus: 204,
}
