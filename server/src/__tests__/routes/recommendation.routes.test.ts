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
  }
})

import app from '../../app.js'
import { Product as ProductModel } from '../../modules/product/product.model.js'
import { API_PREFIX } from '../../../../src/shared/constants/index.js'

const REC = `${API_PREFIX}/recommendations`

let _seq = 0
const makeProduct = (overrides = {}) => ({
  title: 'Phase 16 Widget',
  description: 'A test product for the recommendation engine.',
  price: 29.99,
  images: ['https://example.com/img.jpg'],
  category: 'Electronics',
  stockQuantity: 20,
  sku: `SKU-REC-${Date.now()}-${++_seq}`,
  sellerId: new mongoose.Types.ObjectId(),
  status: 'active',
  isActive: true,
  ratingsAverage: 4.5,
  ratingsCount: 10,
  ...overrides,
})

beforeAll(async () => {
  if (mongoose.connection.readyState === 0) {
    await mongoose.connect(process.env.MONGO_URI ?? 'mongodb://127.0.0.1:27017/cartiva_test')
  }
  await ProductModel.deleteMany({ title: /Phase 16 Widget/ })
  await ProductModel.insertMany([
    makeProduct({ title: 'Phase 16 Widget A' }),
    makeProduct({ title: 'Phase 16 Widget B', price: 49.99 }),
    makeProduct({ title: 'Phase 16 Widget C', createdAt: new Date() }),
  ])
})

describe('GET /recommendations/best-sellers', () => {
  it('returns 200 with a products array', async () => {
    const res = await request(app).get(`${REC}/best-sellers`).expect(200)
    expect(res.body.success).toBe(true)
    expect(Array.isArray(res.body.data)).toBe(true)
  })

  it('respects limit query param', async () => {
    const res = await request(app).get(`${REC}/best-sellers?limit=2`).expect(200)
    expect(res.body.data.length).toBeLessThanOrEqual(2)
  })
})

describe('GET /recommendations/new-arrivals', () => {
  it('returns 200 with a products array', async () => {
    const res = await request(app).get(`${REC}/new-arrivals`).expect(200)
    expect(res.body.success).toBe(true)
    expect(Array.isArray(res.body.data)).toBe(true)
  })
})

describe('GET /recommendations/home', () => {
  it('returns 200 with bestSellers, newArrivals, personalizedForYou keys', async () => {
    const res = await request(app).get(`${REC}/home`).expect(200)
    expect(res.body.success).toBe(true)
    expect(res.body.data).toHaveProperty('bestSellers')
    expect(res.body.data).toHaveProperty('newArrivals')
    expect(res.body.data).toHaveProperty('personalizedForYou')
    expect(Array.isArray(res.body.data.bestSellers)).toBe(true)
    expect(Array.isArray(res.body.data.newArrivals)).toBe(true)
    // Anonymous request → empty personalized array
    expect(res.body.data.personalizedForYou).toEqual([])
  })
})

describe('GET /recommendations/frequently-bought-together/:productId', () => {
  it('returns 200 with a products array for any productId', async () => {
    const fakeId = new mongoose.Types.ObjectId().toHexString()
    const res = await request(app)
      .get(`${REC}/frequently-bought-together/${fakeId}`)
      .expect(200)
    expect(res.body.success).toBe(true)
    expect(Array.isArray(res.body.data)).toBe(true)
    // No matching orders → empty array is valid
  })
})

describe('GET /recommendations/personalized (auth required)', () => {
  it('returns 401 without auth token', async () => {
    const res = await request(app).get(`${REC}/personalized`).expect(401)
    expect(res.body.success).toBe(false)
  })
})

describe('POST /recommendations/behavior (auth required)', () => {
  it('returns 401 without auth token', async () => {
    const res = await request(app)
      .post(`${REC}/behavior`)
      .send({ eventType: 'view' })
      .expect(401)
    expect(res.body.success).toBe(false)
  })
})
