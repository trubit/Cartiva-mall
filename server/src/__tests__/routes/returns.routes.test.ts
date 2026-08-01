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

const BASE = `${API_PREFIX}/returns`

beforeAll(async () => {
  if (mongoose.connection.readyState === 0) {
    await mongoose.connect(process.env.MONGO_URI ?? 'mongodb://127.0.0.1:27017/cartiva_test')
  }
})

describe('POST /returns (auth required)', () => {
  it('returns 401 without token', async () => {
    const res = await request(app).post(BASE).send({}).expect(401)
    expect(res.body.success).toBe(false)
  })
})

describe('GET /returns (auth required)', () => {
  it('returns 401 without token', async () => {
    const res = await request(app).get(BASE).expect(401)
    expect(res.body.success).toBe(false)
  })
})

describe('GET /returns/:id (auth required)', () => {
  it('returns 401 without token', async () => {
    const fakeId = new mongoose.Types.ObjectId().toHexString()
    const res = await request(app).get(`${BASE}/${fakeId}`).expect(401)
    expect(res.body.success).toBe(false)
  })
})

describe('PUT /returns/:id/status (auth required)', () => {
  it('returns 401 without token', async () => {
    const fakeId = new mongoose.Types.ObjectId().toHexString()
    const res = await request(app)
      .put(`${BASE}/${fakeId}/status`)
      .send({ status: 'approved' })
      .expect(401)
    expect(res.body.success).toBe(false)
  })
})

describe('POST /returns/disputes (auth required)', () => {
  it('returns 401 without token', async () => {
    const res = await request(app).post(`${BASE}/disputes`).send({}).expect(401)
    expect(res.body.success).toBe(false)
  })
})

describe('GET /returns/disputes (auth required)', () => {
  it('returns 401 without token', async () => {
    const res = await request(app).get(`${BASE}/disputes`).expect(401)
    expect(res.body.success).toBe(false)
  })
})

describe('POST /returns/disputes/:id/messages (auth required)', () => {
  it('returns 401 without token', async () => {
    const fakeId = new mongoose.Types.ObjectId().toHexString()
    const res = await request(app)
      .post(`${BASE}/disputes/${fakeId}/messages`)
      .send({ content: 'test' })
      .expect(401)
    expect(res.body.success).toBe(false)
  })
})

describe('PUT /returns/disputes/:id/resolve (auth required)', () => {
  it('returns 401 without token', async () => {
    const fakeId = new mongoose.Types.ObjectId().toHexString()
    const res = await request(app)
      .put(`${BASE}/disputes/${fakeId}/resolve`)
      .send({ resolution: 'buyer_favor' })
      .expect(401)
    expect(res.body.success).toBe(false)
  })
})
