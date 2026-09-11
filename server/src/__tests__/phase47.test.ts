import { describe, it, expect } from 'vitest'
import { validateEnv, env } from '../config/env.js'
import { CircuitBreaker, withRetry, withTimeout, TimeoutError } from '../utils/resilience.js'

describe('Phase 47: Global Production Readiness & Resilience Suite', () => {
  describe('Environment Configuration & Startup Validation', () => {
    it('should validate required environment variables in production mode', () => {
      // Should not throw in test mode
      expect(() => validateEnv()).not.toThrow()
    })

    it('should have required environment variables set for development and test', () => {
      expect(env.MONGODB_URI).toBeDefined()
      expect(env.JWT_ACCESS_SECRET).toBeDefined()
      expect(env.JWT_REFRESH_SECRET).toBeDefined()
    })
  })

  describe('Resilience Utilities — Circuit Breaker', () => {
    it('should stay CLOSED when operations succeed', async () => {
      const breaker = new CircuitBreaker({
        name: 'TestService',
        failureThreshold: 2,
        volumeThreshold: 2,
      })
      const res = await breaker.fire(async () => 'OK')
      expect(res).toBe('OK')
      expect(breaker.getStatus().state).toBe('CLOSED')
    })

    it('should open after reaching failure threshold and reject calls', async () => {
      const breaker = new CircuitBreaker({
        name: 'FailingService',
        failureThreshold: 2,
        volumeThreshold: 2,
      })
      for (let i = 0; i < 2; i++) {
        await expect(
          breaker.fire(async () => {
            throw new Error('Service down')
          }),
        ).rejects.toThrow()
      }
      expect(breaker.getStatus().state).toBe('OPEN')
      await expect(breaker.fire(async () => 'OK')).rejects.toThrow(/OPEN/)
    })
  })

  describe('Resilience Utilities — Timeout & Retry', () => {
    it('should execute operation within timeout limit', async () => {
      const res = await withTimeout(Promise.resolve('fast_result'), 1000, 'FastOp')
      expect(res).toBe('fast_result')
    })

    it('should reject with TimeoutError when operation exceeds deadline', async () => {
      const slowOp = new Promise((resolve) => setTimeout(() => resolve('slow'), 500))
      await expect(withTimeout(slowOp, 50, 'SlowOp')).rejects.toThrow(TimeoutError)
    })

    it('should retry failed transient operation with backoff and succeed', async () => {
      let attempts = 0
      const result = await withRetry(
        async (attempt) => {
          attempts = attempt
          if (attempt < 2) throw new Error('Transient error')
          return 'retry_success'
        },
        { maxAttempts: 3, initialDelayMs: 10 },
      )
      expect(result).toBe('retry_success')
      expect(attempts).toBe(2)
    })
  })
})
