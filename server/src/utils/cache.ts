import { redis } from '../database/redis.js'
import { logger } from './logger.js'

/**
 * Get a cached value. Returns null if Redis is unavailable or key is missing.
 */
export async function cacheGet<T>(key: string): Promise<T | null> {
  try {
    const raw = await redis.get(key)
    if (!raw) return null
    return JSON.parse(raw) as T
  } catch {
    return null
  }
}

/**
 * Set a cached value with a TTL in seconds.
 * Silently swallows Redis errors so callers always fall through to the DB.
 */
export async function cacheSet(key: string, value: unknown, ttlSeconds: number): Promise<void> {
  try {
    await redis.set(key, JSON.stringify(value), 'EX', ttlSeconds)
  } catch (err) {
    logger.debug('Cache set failed (Redis unavailable)', { key, err })
  }
}

/** Delete one or more cache keys. */
export async function cacheDel(...keys: string[]): Promise<void> {
  try {
    if (keys.length > 0) await redis.del(...keys)
  } catch {
    // non-fatal
  }
}

/** Delete all keys matching a pattern (uses SCAN, not KEYS, to avoid blocking). */
export async function cacheDelPattern(pattern: string): Promise<void> {
  try {
    let cursor = '0'
    do {
      const [nextCursor, keys] = await redis.scan(cursor, 'MATCH', pattern, 'COUNT', 100)
      cursor = nextCursor
      if (keys.length > 0) await redis.del(...keys)
    } while (cursor !== '0')
  } catch {
    // non-fatal
  }
}

/**
 * Increment a counter in Redis by 1 and return the new value.
 * Used for batching view counts without blocking.
 */
export async function cacheIncr(key: string, ttlSeconds?: number): Promise<number> {
  try {
    const val = await redis.incr(key)
    if (ttlSeconds && val === 1) {
      await redis.expire(key, ttlSeconds)
    }
    return val
  } catch {
    return 0
  }
}

/**
 * Check if a value already exists in a Redis set (for idempotency checks).
 * Adds the value and sets TTL on first call; returns true if it already existed.
 */
export async function cacheSetAdd(
  setKey: string,
  member: string,
  ttlSeconds: number,
): Promise<boolean> {
  try {
    const added = await redis.sadd(setKey, member)
    if (added === 1) {
      await redis.expire(setKey, ttlSeconds)
      return false // first time we see this member
    }
    return true // already existed → duplicate
  } catch {
    return false // on Redis failure, allow through (fail-open)
  }
}
