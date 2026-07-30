import { Redis } from 'ioredis'
import { env } from '../config/env.js'
import { logger } from '../utils/logger.js'

// Shared retry back-off: 200 ms → 10 s cap, give up after 20 attempts.
const retryStrategy = (times: number) => {
  if (times > 20) return null
  return Math.min(times * 200, 10_000)
}

const redisBaseOptions = {
  host: env.REDIS_HOST,
  port: env.REDIS_PORT,
  ...(env.REDIS_PASSWORD ? { password: env.REDIS_PASSWORD } : {}),
  ...(env.REDIS_TLS_ENABLED ? { tls: {} } : {}),
  retryStrategy,
}

/** Primary client — used for caching, rate limiting, pub/sub publish.
 *  enableOfflineQueue: false so cache helpers fail-open immediately when Redis is down.
 */
export const redis = new Redis({
  ...redisBaseOptions,
  lazyConnect: true,
  enableOfflineQueue: false,
  maxRetriesPerRequest: 2,
})

/** Subscriber client — dedicated to Socket.IO Redis adapter subscriptions.
 *  enableOfflineQueue: true (default) so subscribe() queues until the connection
 *  is ready instead of throwing an unhandled rejection during adapter setup.
 */
export const redisSub = new Redis({
  ...redisBaseOptions,
  lazyConnect: true,
})

redis.on('connect', () => logger.info('Redis connected'))
redis.on('reconnecting', () => logger.warn('Redis reconnecting…'))
redis.on('error', () => {}) // suppress per-error noise; retryStrategy handles it

redisSub.on('error', () => {})

export const connectRedis = async (): Promise<void> => {
  try {
    await redis.connect()
    await redisSub.connect()
    logger.info('Redis pub+sub clients connected')
  } catch {
    logger.warn('Redis not available — cache/socket-adapter layer disabled')
  }
}
