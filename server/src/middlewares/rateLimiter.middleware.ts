import rateLimit, {
  MemoryStore,
  type Store,
  type ClientRateLimitInfo,
  type Options as RateLimitOptions,
} from 'express-rate-limit'
import { RedisStore, type RedisReply } from 'rate-limit-redis'
import type { Redis } from 'ioredis'
import { redis, isRedisReady } from '../database/redis.js'
import { env } from '../config/env.js'
import { logger } from '../utils/logger.js'

export const rateLimiterStatus = {
  isDegraded: false,
  lastDegradedReason: null as string | null,
}

/**
 * Creates a raw RedisStore with the validated sendCommand signature.
 */
export const createRedisStore = (prefix: string, client: Redis = redis): RedisStore => {
  return new RedisStore({
    prefix,
    sendCommand: (command: string, ...args: string[]) => {
      return client.call(command, ...args) as Promise<RedisReply>
    },
  })
}

/**
 * ResilientRateLimitStore:
 * - In production: uses distributed RedisStore across all cluster/instance workers when Redis is available.
 * - When Redis is down or disconnected: falls back to in-memory limiting to keep endpoints protected,
 *   logs the degraded state, and sets rateLimiterStatus.isDegraded = true for /ready status.
 * - Recovers automatically when Redis is restored.
 */
export class ResilientRateLimitStore implements Store {
  public prefix: string
  public localKeys: boolean = false
  private redisStore: RedisStore
  private fallbackStore: MemoryStore

  constructor(prefix: string, client: Redis = redis) {
    this.prefix = prefix
    this.fallbackStore = new MemoryStore()
    this.redisStore = createRedisStore(prefix, client)
  }

  async init(options: RateLimitOptions): Promise<void> {
    this.fallbackStore.init(options)
    try {
      await this.redisStore.init?.(options)
    } catch (err) {
      rateLimiterStatus.isDegraded = true
      rateLimiterStatus.lastDegradedReason = err instanceof Error ? err.message : String(err)
      logger.warn(
        `Rate limiter Redis store init failed for ${this.prefix} — running in fallback mode`,
        {
          error: rateLimiterStatus.lastDegradedReason,
        },
      )
    }
  }

  async increment(key: string): Promise<ClientRateLimitInfo> {
    if (isRedisReady()) {
      try {
        const result = await this.redisStore.increment(key)
        if (rateLimiterStatus.isDegraded) {
          rateLimiterStatus.isDegraded = false
          rateLimiterStatus.lastDegradedReason = null
          logger.info(`Rate limiter Redis store recovered for ${this.prefix}`)
        }
        return result
      } catch (err) {
        rateLimiterStatus.isDegraded = true
        rateLimiterStatus.lastDegradedReason = err instanceof Error ? err.message : String(err)
        logger.warn(
          `Rate limiter Redis increment failed for ${this.prefix} — falling back to memory store`,
          {
            error: rateLimiterStatus.lastDegradedReason,
          },
        )
      }
    } else if (!rateLimiterStatus.isDegraded) {
      rateLimiterStatus.isDegraded = true
      rateLimiterStatus.lastDegradedReason = 'Redis client not in ready state'
    }
    return this.fallbackStore.increment(key)
  }

  async decrement(key: string): Promise<void> {
    if (isRedisReady()) {
      try {
        await this.redisStore.decrement(key)
        return
      } catch {
        // Fall back to memory decrement
      }
    }
    await this.fallbackStore.decrement(key)
  }

  async resetKey(key: string): Promise<void> {
    if (isRedisReady()) {
      try {
        await this.redisStore.resetKey(key)
      } catch {
        // Fall back to memory reset
      }
    }
    await this.fallbackStore.resetKey(key)
  }

  async resetAll(): Promise<void> {
    await this.fallbackStore.resetAll?.()
  }

  shutdown(): void {
    this.fallbackStore.shutdown?.()
  }
}

// In production each limiter gets its own ResilientRateLimitStore so counts are shared across
// all cluster workers. In development/test Redis is optional; fall back to in-memory.
export const makeStore = (prefix: string, client?: Redis): Store | undefined => {
  if (env.NODE_ENV !== 'production' && !client) return undefined
  try {
    return new ResilientRateLimitStore(prefix, client)
  } catch (err) {
    logger.warn(`Failed to construct RedisStore for ${prefix}, using default memory store`, {
      error: err instanceof Error ? err.message : String(err),
    })
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
