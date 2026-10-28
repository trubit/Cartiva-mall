import { describe, it, expect, vi, beforeEach } from 'vitest'
import express from 'express'
import request from 'supertest'
import rateLimit from 'express-rate-limit'
import type { Redis } from 'ioredis'
import {
  createRedisStore,
  ResilientRateLimitStore,
  rateLimiterStatus,
  makeStore,
  globalLimiter,
  authLimiter,
  searchLimiter,
  uploadLimiter,
  dashboardLimiter,
  adminLimiter,
  paymentLimiter,
  checkoutLimiter,
  messageLimiter,
  trackLimiter,
  notificationLimiter,
} from '../../middlewares/rateLimiter.middleware.js'
import * as redisModule from '../../database/redis.js'

describe('Redis Rate Limiter Suite', () => {
  let mockHitsMap: Map<string, number>

  const createMockRedisClient = (overrides?: Partial<Redis>): Redis => {
    mockHitsMap = new Map<string, number>()

    const fakeClient = {
      status: 'ready',
      call: vi.fn().mockImplementation(async (command: string, ...args: any[]) => {
        const cmd = command.toUpperCase()
        if (cmd === 'SCRIPT' && args[0]?.toUpperCase() === 'LOAD') {
          // Return a mock SHA string
          return 'mock-increment-sha-12345'
        }
        if (cmd === 'EVALSHA') {
          // command: EVALSHA sha numkeys key resetOnChange windowMs
          const key = args[2]
          const currentHits = (mockHitsMap.get(key) || 0) + 1
          mockHitsMap.set(key, currentHits)
          const windowMs = Number(args[4]) || 60000
          // Redis Lua script returns [totalHits, timeToExpire]
          return [currentHits, windowMs]
        }
        if (cmd === 'PTTL') {
          return 60000
        }
        if (cmd === 'DEL') {
          const key = args[0]
          mockHitsMap.delete(key)
          return 1
        }
        return 'OK'
      }),
      on: vi.fn(),
      connect: vi.fn().mockResolvedValue(undefined),
      disconnect: vi.fn(),
      ...overrides,
    } as unknown as Redis

    return fakeClient
  }

  beforeEach(() => {
    vi.restoreAllMocks()
    rateLimiterStatus.isDegraded = false
    rateLimiterStatus.lastDegradedReason = null
  })

  // =========================================================================
  // 1. Redis store initialization succeeds with supported configuration
  // =========================================================================
  it('1. Redis store initialization succeeds with supported sendCommand configuration', async () => {
    const mockClient = createMockRedisClient()
    const store = createRedisStore('rl:test:', mockClient)

    expect(store).toBeDefined()
    expect(typeof store.init).toBe('function')
    expect(typeof store.increment).toBe('function')

    // Call init and increment to verify Lua script loading
    store.init({ windowMs: 60000 } as any)
    const result = await store.increment('client-1')

    expect(result).toBeDefined()
    expect(result.totalHits).toBe(1)
    expect(result.resetTime).toBeInstanceOf(Date)
    expect(mockClient.call).toHaveBeenCalledWith('SCRIPT', 'LOAD', expect.any(String))
  })

  // =========================================================================
  // 2. Requests increment the correct rate-limit counter
  // =========================================================================
  it('2. Requests increment the correct rate-limit counter', async () => {
    const mockClient = createMockRedisClient()
    const store = new ResilientRateLimitStore('rl:test:', mockClient)
    store.init({ windowMs: 60000 } as any)

    vi.spyOn(redisModule, 'isRedisReady').mockReturnValue(true)

    const res1 = await store.increment('192.168.1.100')
    expect(res1.totalHits).toBe(1)

    const res2 = await store.increment('192.168.1.100')
    expect(res2.totalHits).toBe(2)

    const res3 = await store.increment('192.168.1.100')
    expect(res3.totalHits).toBe(3)

    // Different IP has separate counter
    const resOther = await store.increment('192.168.1.200')
    expect(resOther.totalHits).toBe(1)
  })

  // =========================================================================
  // 3. Rate limits are enforced
  // =========================================================================
  it('3. Rate limits are strictly enforced when limit is exceeded', async () => {
    const mockClient = createMockRedisClient()
    const store = new ResilientRateLimitStore('rl:enforce:', mockClient)
    vi.spyOn(redisModule, 'isRedisReady').mockReturnValue(true)

    const app = express()
    const testLimiter = rateLimit({
      windowMs: 60 * 1000,
      max: 2,
      store,
      standardHeaders: true,
      legacyHeaders: false,
      message: { success: false, message: 'Too many requests' },
    })

    app.get('/test-limit', testLimiter, (_req, res) => {
      res.json({ success: true, message: 'allowed' })
    })

    // 1st request -> Allowed
    const res1 = await request(app).get('/test-limit')
    expect(res1.status).toBe(200)
    expect(res1.body.success).toBe(true)

    // 2nd request -> Allowed
    const res2 = await request(app).get('/test-limit')
    expect(res2.status).toBe(200)

    // 3rd request -> Blocked with 429
    const res3 = await request(app).get('/test-limit')
    expect(res3.status).toBe(429)
    expect(res3.body.success).toBe(false)
    expect(res3.body.message).toBe('Too many requests')
  })

  // =========================================================================
  // 4. Redis failures are handled deliberately without unhandled rejections
  // =========================================================================
  it('4. Redis failures are handled deliberately, fall back to memory store, and mark degraded status', async () => {
    const brokenClient = createMockRedisClient({
      call: vi.fn().mockRejectedValue(new Error('Connection to Redis lost: ECONNREFUSED')),
    })

    const store = new ResilientRateLimitStore('rl:resilient:', brokenClient)
    store.init({ windowMs: 60000 } as any)

    // Simulate Redis client being marked ready initially, but call() fails
    vi.spyOn(redisModule, 'isRedisReady').mockReturnValue(true)

    // Should NOT throw or produce unhandled promise rejection; falls back to MemoryStore
    const res1 = await store.increment('failing-client-1')
    expect(res1).toBeDefined()
    expect(res1.totalHits).toBe(1)
    expect(rateLimiterStatus.isDegraded).toBe(true)
    expect(rateLimiterStatus.lastDegradedReason).toContain('Connection to Redis lost')

    // Subsequent increment still succeeds via fallback
    const res2 = await store.increment('failing-client-1')
    expect(res2.totalHits).toBe(2)

    // When Redis recovers and succeeds
    vi.spyOn(redisModule, 'isRedisReady').mockReturnValue(true)
    brokenClient.call = vi.fn().mockImplementation(async (command: string, ..._args: any[]) => {
      if (command === 'SCRIPT') return 'mock-increment-sha'
      if (command === 'EVALSHA') return [10, 60000]
      return 'OK'
    })

    const resRecovered = await store.increment('recovered-client')
    expect(resRecovered.totalHits).toBe(10)
    expect(rateLimiterStatus.isDegraded).toBe(false)
    expect(rateLimiterStatus.lastDegradedReason).toBeNull()
  })

  // =========================================================================
  // 5. Rate limiting works across multiple application instances (cluster)
  // =========================================================================
  it('5. Rate limiting works correctly across multiple application instances sharing Redis', async () => {
    // Both worker instances share the exact same Redis backend
    const sharedRedis = createMockRedisClient()
    vi.spyOn(redisModule, 'isRedisReady').mockReturnValue(true)

    const instance1Store = new ResilientRateLimitStore('rl:cluster:', sharedRedis)
    const instance2Store = new ResilientRateLimitStore('rl:cluster:', sharedRedis)

    instance1Store.init({ windowMs: 60000 } as any)
    instance2Store.init({ windowMs: 60000 } as any)

    // Request 1 arrives at Worker Instance 1
    const resFromInstance1 = await instance1Store.increment('shared-client-ip')
    expect(resFromInstance1.totalHits).toBe(1)

    // Request 2 arrives at Worker Instance 2 for the same client IP
    const resFromInstance2 = await instance2Store.increment('shared-client-ip')
    expect(resFromInstance2.totalHits).toBe(2)

    // Request 3 arrives back at Worker Instance 1
    const res3 = await instance1Store.increment('shared-client-ip')
    expect(res3.totalHits).toBe(3)
  })

  // =========================================================================
  // 6. All relevant rate limiters use the same validated, compatible integration
  // =========================================================================
  it('6. All exported limiters use the validated configuration and are valid middleware', () => {
    const limiters = [
      { name: 'globalLimiter', limiter: globalLimiter },
      { name: 'authLimiter', limiter: authLimiter },
      { name: 'searchLimiter', limiter: searchLimiter },
      { name: 'uploadLimiter', limiter: uploadLimiter },
      { name: 'dashboardLimiter', limiter: dashboardLimiter },
      { name: 'adminLimiter', limiter: adminLimiter },
      { name: 'paymentLimiter', limiter: paymentLimiter },
      { name: 'checkoutLimiter', limiter: checkoutLimiter },
      { name: 'messageLimiter', limiter: messageLimiter },
      { name: 'trackLimiter', limiter: trackLimiter },
      { name: 'notificationLimiter', limiter: notificationLimiter },
    ]

    for (const { name, limiter } of limiters) {
      expect(limiter, `${name} should be defined`).toBeDefined()
      expect(typeof limiter, `${name} should be an Express middleware function`).toBe('function')
    }

    // Verify makeStore creates ResilientRateLimitStore when client is provided
    const mockClient = createMockRedisClient()
    const createdStore = makeStore('rl:custom:', mockClient)
    expect(createdStore).toBeInstanceOf(ResilientRateLimitStore)
  })
})
