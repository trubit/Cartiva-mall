import { describe, it, expect, vi } from 'vitest'
import request from 'supertest'

// ── Mocks MUST be declared before importing app ─────────────────────────────
vi.mock('ioredis', () => {
  class Redis {
    get = vi.fn().mockResolvedValue(null)
    set = vi.fn().mockResolvedValue('OK')
    setex = vi.fn().mockResolvedValue('OK')
    del = vi.fn().mockResolvedValue(1)
    exists = vi.fn().mockResolvedValue(0)
    expire = vi.fn().mockResolvedValue(1)
    sadd = vi.fn().mockResolvedValue(0)
    scan = vi.fn().mockResolvedValue(['0', []])
    incr = vi.fn().mockResolvedValue(1)
    call = vi.fn().mockResolvedValue(null)
    ping = vi.fn().mockResolvedValue('PONG')
    connect = vi.fn().mockResolvedValue(undefined)
    quit = vi.fn().mockResolvedValue('OK')
    on = vi.fn()
    disconnect = vi.fn()
    status = 'ready'
  }
  return { default: Redis, Redis }
})

vi.mock('../../utils/email.js', () => ({
  sendVerificationEmail: vi.fn().mockResolvedValue(undefined),
  sendPasswordResetEmail: vi.fn().mockResolvedValue(undefined),
  sendEmailVerificationOtp: vi.fn().mockResolvedValue(undefined),
  sendPasswordResetOtp: vi.fn().mockResolvedValue(undefined),
  sendEmail: vi.fn().mockResolvedValue(undefined),
}))

import app from '../../app.js'
import { isAllowedOrigin, VERCEL_PRODUCTION_ORIGIN } from '../../config/cors.js'

describe('CORS Architecture & Preflight Integration Tests', () => {
  const VERCEL_ORIGIN = VERCEL_PRODUCTION_ORIGIN // 'https://cartiva-mall.vercel.app'
  const VERCEL_PREVIEW = 'https://cartiva-mall-git-feat-auth.vercel.app'
  const LOCALHOST_ORIGIN = 'http://localhost:5170'
  const UNAUTHORIZED_EXTERNAL = 'https://evil-attacker.com'
  const UNAUTHORIZED_VERCEL = 'https://malicious-phishing.vercel.app'

  describe('isAllowedOrigin Unit Logic', () => {
    it('allows undefined origin (curl, mobile apps, server-to-server)', () => {
      expect(isAllowedOrigin(undefined)).toBe(true)
    })

    it('allows canonical Vercel production origin', () => {
      expect(isAllowedOrigin(VERCEL_ORIGIN)).toBe(true)
    })

    it('allows project-specific Vercel preview deployments', () => {
      expect(isAllowedOrigin(VERCEL_PREVIEW)).toBe(true)
      expect(isAllowedOrigin('https://cartiva-mall-123abc.vercel.app')).toBe(true)
    })

    it('rejects arbitrary third-party .vercel.app domains', () => {
      expect(isAllowedOrigin(UNAUTHORIZED_VERCEL)).toBe(false)
      expect(isAllowedOrigin('https://some-other-store.vercel.app')).toBe(false)
      expect(isAllowedOrigin('https://fakecartiva.vercel.app')).toBe(false)
    })

    it('rejects arbitrary unauthorized domains', () => {
      expect(isAllowedOrigin(UNAUTHORIZED_EXTERNAL)).toBe(false)
    })

    it('allows local development origins', () => {
      expect(isAllowedOrigin(LOCALHOST_ORIGIN)).toBe(true)
      expect(isAllowedOrigin('http://localhost:5173')).toBe(true)
      expect(isAllowedOrigin('http://localhost:3000')).toBe(true)
    })
  })

  describe('HTTP Preflight & CORS Headers on Endpoints', () => {
    it('1. responds to OPTIONS preflight from authorized Vercel origin with 204 and CORS headers', async () => {
      const res = await request(app)
        .options('/api/v1/currencies/rates')
        .set('Origin', VERCEL_ORIGIN)
        .set('Access-Control-Request-Method', 'GET')
        .set('Access-Control-Request-Headers', 'x-request-id')

      expect(res.status).toBe(204)
      expect(res.headers['access-control-allow-origin']).toBe(VERCEL_ORIGIN)
      expect(res.headers['access-control-allow-credentials']).toBe('true')
      expect(res.headers['access-control-allow-headers']).toMatch(/x-request-id/i)
      expect(res.headers['access-control-max-age']).toBe('86400')
    })

    it('2. allows x-request-id and X-Correlation-ID in preflight request headers', async () => {
      const res = await request(app)
        .options('/api/v1/currencies/rates')
        .set('Origin', VERCEL_ORIGIN)
        .set('Access-Control-Request-Method', 'GET')
        .set('Access-Control-Request-Headers', 'X-Request-ID, X-Correlation-ID')

      expect(res.status).toBe(204)
      expect(res.headers['access-control-allow-origin']).toBe(VERCEL_ORIGIN)
      expect(res.headers['access-control-allow-headers']).toMatch(/X-Request-ID/i)
      expect(res.headers['access-control-allow-headers']).toMatch(/X-Correlation-ID/i)
    })

    it('3. allows Authorization header in preflight for authenticated routes', async () => {
      const res = await request(app)
        .options('/api/v1/auth/me')
        .set('Origin', VERCEL_ORIGIN)
        .set('Access-Control-Request-Method', 'GET')
        .set('Access-Control-Request-Headers', 'authorization, x-request-id')

      expect(res.status).toBe(204)
      expect(res.headers['access-control-allow-origin']).toBe(VERCEL_ORIGIN)
      expect(res.headers['access-control-allow-headers']).toMatch(/authorization/i)
    })

    it('4. allows Content-Type and custom auth headers in preflight for POST /auth/login', async () => {
      const res = await request(app)
        .options('/api/v1/auth/login')
        .set('Origin', VERCEL_ORIGIN)
        .set('Access-Control-Request-Method', 'POST')
        .set('Access-Control-Request-Headers', 'content-type, x-request-id')

      expect(res.status).toBe(204)
      expect(res.headers['access-control-allow-origin']).toBe(VERCEL_ORIGIN)
      expect(res.headers['access-control-allow-headers']).toMatch(/content-type/i)
      expect(res.headers['access-control-allow-methods']).toMatch(/POST/i)
    })

    it('5. preserves CORS headers on actual GET /api/v1/currencies/rates with x-request-id', async () => {
      const customReqId = 'req-trace-test-12345'
      const res = await request(app)
        .get('/api/v1/currencies/rates')
        .set('Origin', VERCEL_ORIGIN)
        .set('X-Request-ID', customReqId)

      expect(res.headers['access-control-allow-origin']).toBe(VERCEL_ORIGIN)
      expect(res.headers['access-control-allow-credentials']).toBe('true')
      expect(res.headers['x-request-id']).toBe(customReqId)
    })

    it('6. preserves CORS headers on actual POST /api/v1/auth/login with x-request-id', async () => {
      const customReqId = 'req-trace-login-test'
      const res = await request(app)
        .post('/api/v1/auth/login')
        .set('Origin', VERCEL_ORIGIN)
        .set('X-Request-ID', customReqId)
        .send({ email: 'nonexistent@cartiva.com', password: 'Password123!' })

      // Even on 401 or other error, CORS headers MUST be present!
      expect(res.headers['access-control-allow-origin']).toBe(VERCEL_ORIGIN)
      expect(res.headers['access-control-allow-credentials']).toBe('true')
      expect(res.headers['x-request-id']).toBe(customReqId)
    })

    it('7. rejects preflight from unauthorized external origin', async () => {
      const res = await request(app)
        .options('/api/v1/currencies/rates')
        .set('Origin', UNAUTHORIZED_EXTERNAL)
        .set('Access-Control-Request-Method', 'GET')

      expect(res.headers['access-control-allow-origin']).toBeUndefined()
    })

    it('8. rejects preflight from arbitrary third-party .vercel.app origin', async () => {
      const res = await request(app)
        .options('/api/v1/currencies/rates')
        .set('Origin', UNAUTHORIZED_VERCEL)
        .set('Access-Control-Request-Method', 'GET')

      expect(res.headers['access-control-allow-origin']).toBeUndefined()
    })

    it('9. supports requests with missing origin (e.g. mobile app, curl, server-to-server)', async () => {
      const res = await request(app).get('/health')
      expect(res.status).toBe(200)
    })

    it('10. attaches CORS headers on 404 Route Not Found error responses', async () => {
      const res = await request(app)
        .get('/api/v1/non-existent-route-for-testing')
        .set('Origin', VERCEL_ORIGIN)

      expect(res.status).toBe(404)
      expect(res.headers['access-control-allow-origin']).toBe(VERCEL_ORIGIN)
      expect(res.headers['access-control-allow-credentials']).toBe('true')
    })

    it('11. executes preflight OPTIONS before authentication guards reject request', async () => {
      // /api/v1/auth/me requires JWT authentication, but OPTIONS must return 204 without auth
      const res = await request(app)
        .options('/api/v1/auth/me')
        .set('Origin', VERCEL_ORIGIN)
        .set('Access-Control-Request-Method', 'GET')
        .set('Access-Control-Request-Headers', 'authorization')

      expect(res.status).toBe(204)
      expect(res.headers['access-control-allow-origin']).toBe(VERCEL_ORIGIN)
    })

    it('12. supports authorized local development origin (http://localhost:5170)', async () => {
      const res = await request(app)
        .options('/api/v1/currencies/rates')
        .set('Origin', LOCALHOST_ORIGIN)
        .set('Access-Control-Request-Method', 'GET')

      expect(res.status).toBe(204)
      expect(res.headers['access-control-allow-origin']).toBe(LOCALHOST_ORIGIN)
      expect(res.headers['access-control-allow-credentials']).toBe('true')
    })

    it('13. supports authorized Cartiva Mall Vercel preview deployment', async () => {
      const res = await request(app)
        .options('/api/v1/currencies/rates')
        .set('Origin', VERCEL_PREVIEW)
        .set('Access-Control-Request-Method', 'GET')

      expect(res.status).toBe(204)
      expect(res.headers['access-control-allow-origin']).toBe(VERCEL_PREVIEW)
      expect(res.headers['access-control-allow-credentials']).toBe('true')
    })

    it('14. sanitizes invalid x-request-id containing disallowed characters to prevent injection', async () => {
      const maliciousId = 'attack<script>injection_test'
      const res = await request(app)
        .get('/api/v1/currencies/rates')
        .set('Origin', VERCEL_ORIGIN)
        .set('X-Request-ID', maliciousId)

      // Malicious ID with disallowed characters must be replaced with safe uuid
      expect(res.headers['x-request-id']).not.toBe(maliciousId)
      expect(res.headers['x-request-id']).toMatch(/^[a-zA-Z0-9_\-.]{1,128}$/)
    })
  })
})
