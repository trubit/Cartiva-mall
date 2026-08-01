import { describe, it, expect, vi, beforeAll } from 'vitest'
import request from 'supertest'
import mongoose from 'mongoose'

vi.mock('ioredis', () => {
  class Redis {
    get = vi.fn().mockResolvedValue(null)
    set = vi.fn().mockResolvedValue('OK')
    setex = vi.fn().mockResolvedValue('OK')
    del = vi.fn().mockResolvedValue(1)
    keys = vi.fn().mockResolvedValue([])
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

vi.mock('../../middlewares/rateLimiter.middleware.js', () => {
  const pass = (_req: unknown, _res: unknown, next: () => void) => next()
  return {
    globalLimiter: pass,
    authLimiter: pass,
    searchLimiter: pass,
    uploadLimiter: pass,
    dashboardLimiter: pass,
    checkoutLimiter: pass,
    paymentLimiter: pass,
    adminLimiter: pass,
    trackLimiter: pass,
    messageLimiter: pass,
  }
})

import app from '../../app.js'
import { API_PREFIX } from '../../../../src/shared/constants/index.js'

const BASE = `${API_PREFIX}/vendors`

beforeAll(async () => {
  if (mongoose.connection.readyState === 0) {
    await mongoose.connect(process.env.MONGO_URI ?? 'mongodb://127.0.0.1:27017/cartiva_test')
  }
})

describe('GET /vendors/storefront/:slug (public)', () => {
  it('returns 404 for unknown slug', async () => {
    const res = await request(app).get(`${BASE}/storefront/nonexistent-slug-xyz`).expect(404)
    expect(res.body.success).toBe(false)
  })
})

describe('POST /vendors/register (auth required)', () => {
  it('returns 401 without token', async () => {
    const res = await request(app).post(`${BASE}/register`).send({}).expect(401)
    expect(res.body.success).toBe(false)
  })
})

describe('GET /vendors/me (auth required)', () => {
  it('returns 401 without token', async () => {
    const res = await request(app).get(`${BASE}/me`).expect(401)
    expect(res.body.success).toBe(false)
  })
})

describe('GET /vendors/admin/pending (admin only)', () => {
  it('returns 401 without token', async () => {
    const res = await request(app).get(`${BASE}/admin/pending`).expect(401)
    expect(res.body.success).toBe(false)
  })
})

describe('GET /vendors/admin/all (admin only)', () => {
  it('returns 401 without token', async () => {
    const res = await request(app).get(`${BASE}/admin/all`).expect(401)
    expect(res.body.success).toBe(false)
  })
})

describe('PUT /vendors/:id/approve (admin only)', () => {
  it('returns 401 without token', async () => {
    const id = new mongoose.Types.ObjectId().toHexString()
    const res = await request(app).put(`${BASE}/${id}/approve`).expect(401)
    expect(res.body.success).toBe(false)
  })
})

describe('PUT /vendors/:id/reject (admin only)', () => {
  it('returns 401 without token', async () => {
    const id = new mongoose.Types.ObjectId().toHexString()
    const res = await request(app).put(`${BASE}/${id}/reject`).send({ reason: 'test' }).expect(401)
    expect(res.body.success).toBe(false)
  })
})

describe('PUT /vendors/:id/suspend (admin only)', () => {
  it('returns 401 without token', async () => {
    const id = new mongoose.Types.ObjectId().toHexString()
    const res = await request(app).put(`${BASE}/${id}/suspend`).send({ reason: 'test' }).expect(401)
    expect(res.body.success).toBe(false)
  })
})

describe('PUT /vendors/:id/reactivate (admin only)', () => {
  it('returns 401 without token', async () => {
    const id = new mongoose.Types.ObjectId().toHexString()
    const res = await request(app).put(`${BASE}/${id}/reactivate`).expect(401)
    expect(res.body.success).toBe(false)
  })
})

describe('PUT /vendors/:id/blacklist (admin only)', () => {
  it('returns 401 without token', async () => {
    const id = new mongoose.Types.ObjectId().toHexString()
    const res = await request(app)
      .put(`${BASE}/${id}/blacklist`)
      .send({ reason: 'test' })
      .expect(401)
    expect(res.body.success).toBe(false)
  })
})

describe('POST /vendors/:id/documents (auth required)', () => {
  it('returns 401 without token', async () => {
    const id = new mongoose.Types.ObjectId().toHexString()
    const res = await request(app).post(`${BASE}/${id}/documents`).send({}).expect(401)
    expect(res.body.success).toBe(false)
  })
})

describe('GET /vendors/:id/analytics (auth required)', () => {
  it('returns 401 without token', async () => {
    const id = new mongoose.Types.ObjectId().toHexString()
    const res = await request(app).get(`${BASE}/${id}/analytics`).expect(401)
    expect(res.body.success).toBe(false)
  })
})

describe('POST /vendors/:id/payouts (auth required)', () => {
  it('returns 401 without token', async () => {
    const id = new mongoose.Types.ObjectId().toHexString()
    const res = await request(app).post(`${BASE}/${id}/payouts`).send({}).expect(401)
    expect(res.body.success).toBe(false)
  })
})
