import { Redis, type RedisOptions } from 'ioredis'
import { env } from '../config/env.js'
import { logger } from '../utils/logger.js'

// Shared retry back-off: 200 ms → 10 s cap, give up after 20 attempts.
const retryStrategy = (times: number) => {
  if (times > 20) return null
  return Math.min(times * 200, 10_000)
}

const buildRedisOptions = (extra: Partial<RedisOptions> = {}): RedisOptions => {
  return {
    host: env.REDIS_HOST,
    port: env.REDIS_PORT,
    ...(env.REDIS_PASSWORD ? { password: env.REDIS_PASSWORD } : {}),
    ...(env.REDIS_TLS_ENABLED ? { tls: {} } : {}),
    retryStrategy,
    lazyConnect: true,
    enableOfflineQueue: true,
    maxRetriesPerRequest: 3,
    ...extra,
  }
}

const createClient = (extra: Partial<RedisOptions> = {}): Redis => {
  const options = buildRedisOptions(extra)
  if (env.REDIS_URL) {
    return new Redis(env.REDIS_URL, options)
  }
  return new Redis(options)
}

/** Primary client — used for caching, rate limiting, pub/sub publish. */
export const redis = createClient()

/** Subscriber client — dedicated to Socket.IO Redis adapter subscriptions. */
export const redisSub = createClient()

redis.on('connect', () => logger.info('Redis connected'))
redis.on('ready', () => logger.info('Redis connection ready'))
redis.on('reconnecting', () => logger.warn('Redis reconnecting…'))
redis.on('error', (err: Error) => {
  logger.warn('Redis client error', { error: err.message })
})

redisSub.on('connect', () => logger.info('Redis subscriber connected'))
redisSub.on('ready', () => logger.info('Redis subscriber ready'))
redisSub.on('reconnecting', () => logger.warn('Redis subscriber reconnecting…'))
redisSub.on('error', (err: Error) => {
  logger.warn('Redis subscriber error', { error: err.message })
})

export const isRedisReady = (): boolean => redis.status === 'ready'
export const isRedisSubReady = (): boolean => redisSub.status === 'ready'

export const connectRedis = async (): Promise<boolean> => {
  try {
    const pending: Promise<unknown>[] = []
    if (redis.status === 'wait') {
      pending.push(redis.connect())
    }
    if (redisSub.status === 'wait') {
      pending.push(redisSub.connect())
    }
    if (pending.length > 0) {
      await Promise.all(pending)
    }
    logger.info('Redis pub+sub clients connected and ready')
    return true
  } catch (err) {
    logger.warn('Redis not available — cache/socket-adapter layer degraded', {
      error: err instanceof Error ? err.message : String(err),
    })
    return false
  }
}

export const disconnectRedis = async (): Promise<void> => {
  try {
    if (redis.status !== 'end') await redis.quit()
    if (redisSub.status !== 'end') await redisSub.quit()
  } catch (err) {
    logger.warn('Error closing Redis connections', {
      error: err instanceof Error ? err.message : String(err),
    })
  }
}
