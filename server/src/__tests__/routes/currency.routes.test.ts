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

const BASE = `${API_PREFIX}/currencies`

beforeAll(async () => {
  if (mongoose.connection.readyState === 0) {
    await mongoose.connect(process.env.MONGO_URI ?? 'mongodb://127.0.0.1:27017/cartiva_test')
  }
})

describe('Currency Routes Integration Tests', () => {
  it('GET /currencies returns supported currencies list', async () => {
    const res = await request(app).get(BASE).expect(200)

    expect(res.body.success).toBe(true)
    expect(res.body.data.currencies).toBeInstanceOf(Array)
    expect(res.body.data.currencies.length).toBeGreaterThanOrEqual(4)
    expect(res.body.data.baseCurrency).toBe('USD')
  })

  it('GET /currencies/rates returns live/cached exchange rates', async () => {
    const res = await request(app).get(`${BASE}/rates?base=USD`).expect(200)

    expect(res.body.success).toBe(true)
    expect(res.body.data.base).toBe('USD')
    expect(res.body.data.rates).toHaveProperty('NGN')
    expect(res.body.data.rates).toHaveProperty('EUR')
    expect(res.body.data.rates).toHaveProperty('GBP')
  })

  it('GET /currencies/convert calculates converted amount with audit metadata', async () => {
    const res = await request(app).get(`${BASE}/convert?amount=150&from=USD&to=NGN`).expect(200)

    expect(res.body.success).toBe(true)
    expect(res.body.data.originalAmount).toBe(150)
    expect(res.body.data.originalCurrency).toBe('USD')
    expect(res.body.data.targetCurrency).toBe('NGN')
    expect(res.body.data.targetAmount).toBeGreaterThan(75000)
    expect(res.body.data.rate).toBeGreaterThan(500)
    expect(res.body.data.formattedOriginal).toContain('150.00')
  })

  it('POST /currencies/convert supports body payload', async () => {
    const res = await request(app)
      .post(`${BASE}/convert`)
      .send({ amount: 50, from: 'EUR', to: 'USD' })
      .expect(200)

    expect(res.body.success).toBe(true)
    expect(res.body.data.originalCurrency).toBe('EUR')
    expect(res.body.data.targetCurrency).toBe('USD')
    expect(res.body.data.targetAmount).toBeGreaterThan(0)
  })
})
