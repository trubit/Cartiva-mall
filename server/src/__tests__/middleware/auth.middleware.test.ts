import { describe, it, expect, vi } from 'vitest'
import type { Request, Response, NextFunction } from 'express'

// Mock ioredis before any server imports so redis.ts gets the fake client.
// Must be a class (not an arrow function) so `new Redis(...)` works.
vi.mock('ioredis', () => {
  class Redis {
    get = vi.fn().mockResolvedValue(null)
    set = vi.fn().mockResolvedValue('OK')
    del = vi.fn().mockResolvedValue(1)
    expire = vi.fn().mockResolvedValue(1)
    sadd = vi.fn().mockResolvedValue(0)
    scan = vi.fn().mockResolvedValue(['0', []])
    incr = vi.fn().mockResolvedValue(1)
    connect = vi.fn().mockResolvedValue(undefined)
    quit = vi.fn().mockResolvedValue('OK')
    on = vi.fn()
    status = 'ready'
  }
  return { default: Redis, Redis }
})

import { authenticate, authorize } from '../../middlewares/auth.middleware.js'
import { signAccessToken } from '../../utils/jwt.js'
import type { TokenPayload } from '../../../../src/shared/types/auth.types.js'

const testPayload: Omit<TokenPayload, 'iat' | 'exp'> = {
  userId: 'user-test-123',
  email: 'test@example.com',
  role: 'user',
}

function makeMockReq(overrides: Partial<Request> = {}): Request {
  return {
    headers: {},
    cookies: {},
    ...overrides,
  } as unknown as Request
}

function makeMockRes(): Response {
  return {} as Response
}

function makeMockNext(): NextFunction {
  return vi.fn()
}

describe('authenticate middleware', () => {
  it('sets req.user and calls next() with a valid Bearer token', async () => {
    const token = signAccessToken(testPayload)
    const req = makeMockReq({ headers: { authorization: `Bearer ${token}` } })
    const next = makeMockNext()

    await authenticate(req, makeMockRes(), next)

    expect(next).toHaveBeenCalledOnce()
    expect(next).toHaveBeenCalledWith()
    expect(req.user?.userId).toBe(testPayload.userId)
    expect(req.user?.email).toBe(testPayload.email)
  })

  it('sets req.user when token is in access_token cookie', async () => {
    const token = signAccessToken(testPayload)
    const req = makeMockReq({ cookies: { access_token: token } })
    const next = makeMockNext()

    await authenticate(req, makeMockRes(), next)

    expect(next).toHaveBeenCalledWith()
    expect(req.user?.userId).toBe(testPayload.userId)
  })

  it('calls next with 401 AppError when no token is provided', async () => {
    const req = makeMockReq()
    const next = makeMockNext()

    await authenticate(req, makeMockRes(), next)

    expect(next).toHaveBeenCalledOnce()
    const error = (next as ReturnType<typeof vi.fn>).mock.calls[0][0]
    expect(error).toBeDefined()
    expect(error.statusCode).toBe(401)
  })

  it('calls next with 401 AppError for an invalid token', async () => {
    const req = makeMockReq({ headers: { authorization: 'Bearer bad.invalid.token' } })
    const next = makeMockNext()

    await authenticate(req, makeMockRes(), next)

    const error = (next as ReturnType<typeof vi.fn>).mock.calls[0][0]
    expect(error.statusCode).toBe(401)
  })

  it('prefers Authorization header over cookie', async () => {
    const headerToken = signAccessToken({ ...testPayload, email: 'from-header@example.com' })
    const cookieToken = signAccessToken({ ...testPayload, email: 'from-cookie@example.com' })
    const req = makeMockReq({
      headers: { authorization: `Bearer ${headerToken}` },
      cookies: { access_token: cookieToken },
    })
    const next = makeMockNext()

    await authenticate(req, makeMockRes(), next)

    expect(req.user?.email).toBe('from-header@example.com')
  })
})

describe('authorize middleware', () => {
  it('calls next() when user has the required role', () => {
    const req = makeMockReq()
    req.user = { ...testPayload, iat: 0, exp: 9999999999 }
    const next = makeMockNext()

    authorize('user')(req, makeMockRes(), next)

    expect(next).toHaveBeenCalledWith()
  })

  it('calls next() when user matches one of multiple allowed roles', () => {
    const req = makeMockReq()
    req.user = { ...testPayload, role: 'admin', iat: 0, exp: 9999999999 }
    const next = makeMockNext()

    authorize('seller', 'admin')(req, makeMockRes(), next)

    expect(next).toHaveBeenCalledWith()
  })

  it('calls next with 403 AppError when user role is not in allowed list', () => {
    const req = makeMockReq()
    req.user = { ...testPayload, role: 'user', iat: 0, exp: 9999999999 }
    const next = makeMockNext()

    authorize('admin')(req, makeMockRes(), next)

    const error = (next as ReturnType<typeof vi.fn>).mock.calls[0][0]
    expect(error.statusCode).toBe(403)
  })

  it('calls next with 401 when req.user is not set', () => {
    const req = makeMockReq()
    const next = makeMockNext()

    authorize('user')(req, makeMockRes(), next)

    const error = (next as ReturnType<typeof vi.fn>).mock.calls[0][0]
    expect(error.statusCode).toBe(401)
  })
})
