import rateLimit from 'express-rate-limit'
import { RedisStore, type RedisReply } from 'rate-limit-redis'
import { redis } from '../database/redis.js'
import { env } from '../config/env.js'

// In production each limiter gets its own RedisStore so counts are shared across
// all cluster workers. In development Redis is optional; fall back to in-memory.
export const makeStore = (prefix: string) => {
  if (env.NODE_ENV !== 'production') return undefined
  try {
    return new RedisStore({
      prefix,
      sendCommand: (...args: string[]) => {
        try {
          return (redis.call(...(args as [string, ...string[]])) as Promise<RedisReply>).catch(
            () => null as unknown as RedisReply,
          )
        } catch {
          return Promise.resolve(null as unknown as RedisReply)
        }
      },
    })
  } catch {
    return undefined
  }
}

const isDev = env.NODE_ENV !== 'production'

/** In dev, use very high caps so tests never hit limits */
const devMax = (prodLimit: number, devLimit = 100_000) => (isDev ? devLimit : prodLimit)

/**
 * Skip rate limiting entirely for localhost in development.
 * In production this always returns false so every limiter is enforced.
 */
const skipDev = (req: any): boolean => {
  if (!isDev) return false
  const ip: string = req.ip ?? ''
  const remote: string = req.socket?.remoteAddress ?? ''
  const xff: string = (req.headers['x-forwarded-for'] as string) ?? ''
  const loopback = ['127.0.0.1', '::1', '::ffff:127.0.0.1', 'localhost']
  return loopback.some((l) => ip.includes(l) || remote.includes(l) || xff.includes(l))
}

/** Applied to every route — generous limit, stops runaway clients */
export const globalLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: devMax(500),
  store: makeStore('rl:global:'),
  skip: skipDev,
  standardHeaders: true,
  legacyHeaders: false,
  message: { success: false, message: 'Too many requests — please try again later' },
})

/** Login, register, password reset — strict to prevent brute-force */
export const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: devMax(20, 100),
  store: makeStore('rl:auth:'),
  skip: skipDev,
  standardHeaders: true,
  legacyHeaders: false,
  message: { success: false, message: 'Too many authentication attempts' },
})

/** Product search / listing — each triggers a full-text MongoDB search */
export const searchLimiter = rateLimit({
  windowMs: 60 * 1000,
  max: devMax(60, 1000),
  store: makeStore('rl:search:'),
  skip: skipDev,
  standardHeaders: true,
  legacyHeaders: false,
  message: { success: false, message: 'Too many search requests — slow down' },
})

/** Image uploads — 40 MB per request, Cloudinary quota is finite */
export const uploadLimiter = rateLimit({
  windowMs: 60 * 60 * 1000,
  max: devMax(20, 200),
  store: makeStore('rl:upload:'),
  skip: skipDev,
  standardHeaders: true,
  legacyHeaders: false,
  message: { success: false, message: 'Upload limit reached — try again in an hour' },
})

/** Seller/admin dashboard & analytics — each triggers many aggregations */
export const dashboardLimiter = rateLimit({
  windowMs: 60 * 1000,
  max: devMax(30, 1000),
  store: makeStore('rl:dashboard:'),
  skip: skipDev,
  standardHeaders: true,
  legacyHeaders: false,
  message: { success: false, message: 'Dashboard request limit reached — please wait' },
})

/** Admin operations — Redis-backed so multi-worker cluster shares counters */
export const adminLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: devMax(200, 2000),
  store: makeStore('rl:admin:'),
  skip: skipDev,
  standardHeaders: true,
  legacyHeaders: false,
  message: { success: false, message: 'Too many admin requests, please try again later.' },
})

/** Payment operations — Redis-backed for accurate multi-worker limiting */
export const paymentLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: devMax(40, 500),
  store: makeStore('rl:payment:'),
  skip: skipDev,
  standardHeaders: true,
  legacyHeaders: false,
  message: { success: false, message: 'Too many payment requests, please try again later.' },
})

/** Checkout mutations — Redis-backed for accurate multi-worker limiting */
export const checkoutLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: devMax(60, 500),
  store: makeStore('rl:checkout:'),
  skip: skipDev,
  standardHeaders: true,
  legacyHeaders: false,
  message: { success: false, message: 'Too many checkout requests — please slow down' },
})

/** Messaging — generous for chat but prevents spam floods */
export const messageLimiter = rateLimit({
  windowMs: 60 * 1000,
  max: devMax(120, 1000),
  store: makeStore('rl:msg:'),
  skip: skipDev,
  standardHeaders: true,
  legacyHeaders: false,
  message: { success: false, message: 'Too many messages — slow down' },
})

/** Behaviour tracking events — higher frequency than typical API calls */
export const trackLimiter = rateLimit({
  windowMs: 60 * 1000,
  max: devMax(500, 5000),
  store: makeStore('rl:track:'),
  skip: skipDev,
  standardHeaders: true,
  legacyHeaders: false,
  message: { success: false, message: 'Too many tracking events — slow down' },
})

/** Notification endpoints — dedicated limiter separate from globalLimiter */
export const notificationLimiter = rateLimit({
  windowMs: 60 * 1000,
  max: devMax(120, 3000),
  store: makeStore('rl:notif:'),
  skip: skipDev,
  standardHeaders: true,
  legacyHeaders: false,
  message: { success: false, message: 'Too many notification requests — slow down' },
})
