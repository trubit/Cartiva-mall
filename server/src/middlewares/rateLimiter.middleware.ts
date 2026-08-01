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

/** Applied to every route — generous limit, stops runaway clients */
export const globalLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 200,
  store: makeStore('rl:global:'),
  standardHeaders: true,
  legacyHeaders: false,
  message: { success: false, message: 'Too many requests — please try again later' },
})

/** Login, register, password reset — strict to prevent brute-force */
export const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 10,
  store: makeStore('rl:auth:'),
  standardHeaders: true,
  legacyHeaders: false,
  message: { success: false, message: 'Too many authentication attempts' },
})

/** Product search / listing — each triggers a full-text MongoDB search */
export const searchLimiter = rateLimit({
  windowMs: 60 * 1000,
  max: 30,
  store: makeStore('rl:search:'),
  standardHeaders: true,
  legacyHeaders: false,
  message: { success: false, message: 'Too many search requests — slow down' },
})

/** Image uploads — 40 MB per request, Cloudinary quota is finite */
export const uploadLimiter = rateLimit({
  windowMs: 60 * 60 * 1000,
  max: 20,
  store: makeStore('rl:upload:'),
  standardHeaders: true,
  legacyHeaders: false,
  message: { success: false, message: 'Upload limit reached — try again in an hour' },
})

/** Seller/admin dashboard & analytics — each triggers many aggregations */
export const dashboardLimiter = rateLimit({
  windowMs: 60 * 1000,
  max: 10,
  store: makeStore('rl:dashboard:'),
  standardHeaders: true,
  legacyHeaders: false,
  message: { success: false, message: 'Dashboard request limit reached — please wait' },
})

/** Admin operations — Redis-backed so multi-worker cluster shares counters */
export const adminLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 100,
  store: makeStore('rl:admin:'),
  standardHeaders: true,
  legacyHeaders: false,
  message: { success: false, message: 'Too many admin requests, please try again later.' },
})

/** Payment operations — Redis-backed for accurate multi-worker limiting */
export const paymentLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 20,
  store: makeStore('rl:payment:'),
  standardHeaders: true,
  legacyHeaders: false,
  message: { success: false, message: 'Too many payment requests, please try again later.' },
})

/** Checkout mutations — Redis-backed for accurate multi-worker limiting */
export const checkoutLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 30,
  store: makeStore('rl:checkout:'),
  standardHeaders: true,
  legacyHeaders: false,
  message: { success: false, message: 'Too many checkout requests — please slow down' },
})

/** Messaging — generous for chat but prevents spam floods */
export const messageLimiter = rateLimit({
  windowMs: 60 * 1000,
  max: 60,
  store: makeStore('rl:msg:'),
  standardHeaders: true,
  legacyHeaders: false,
  message: { success: false, message: 'Too many messages — slow down' },
})

/** Behaviour tracking events — higher frequency than typical API calls */
export const trackLimiter = rateLimit({
  windowMs: 60 * 1000,
  max: 200,
  store: makeStore('rl:track:'),
  standardHeaders: true,
  legacyHeaders: false,
  message: { success: false, message: 'Too many tracking events — slow down' },
})
