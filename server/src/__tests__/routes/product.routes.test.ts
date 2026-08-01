import { describe, it, expect, vi, beforeAll } from 'vitest'
import request from 'supertest'
import mongoose from 'mongoose'

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
import { Product as ProductModel } from '../../modules/product/product.model.js'
import { User as UserModel } from '../../modules/user/user.model.js'
import { API_PREFIX, PRODUCT_CATEGORIES } from '../../../../src/shared/constants/index.js'

const PRODUCTS = `${API_PREFIX}/products`

function makeProductData(overrides = {}) {
  return {
    title: 'Test Headphones',
    description: 'Comfortable and clear audio quality for everyday use.',
    price: 89.99,
    category: PRODUCT_CATEGORIES[0],
    stockQuantity: 25,
    sku: `SKU-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`,
    images: [],
    tags: [],
    isActive: true,
    status: 'active' as const,
    isFeatured: false,
    ratingsAverage: 0,
    ratingsCount: 0,
    views: 0,
    ...overrides,
  }
}

let sellerId: string

beforeAll(async () => {
  const seller = await UserModel.create({
    firstName: 'Seller',
    lastName: 'One',
    username: 'seller_one_products',
    email: 'seller_one_products@example.com',
    password: 'TestPass1!',
    emailVerified: true,
    isActive: true,
    role: 'seller',
  })
  sellerId = (seller._id as mongoose.Types.ObjectId).toString()

  await ProductModel.create([
    makeProductData({
      title: 'Laptop Pro',
      category: PRODUCT_CATEGORIES[0],
      isFeatured: true,
      sellerId,
    }),
    makeProductData({ title: 'Wireless Mouse', category: PRODUCT_CATEGORIES[0], sellerId }),
    makeProductData({ title: 'Yoga Mat', category: PRODUCT_CATEGORIES[3], sellerId }),
  ])
})

describe('GET /products', () => {
  it('returns 200 with success:true', async () => {
    const res = await request(app).get(PRODUCTS)
    expect(res.status).toBe(200)
    expect(res.body.success).toBe(true)
  })

  it('returns an array in data', async () => {
    const res = await request(app).get(PRODUCTS)
    expect(Array.isArray(res.body.data)).toBe(true)
  })

  it('returns a pagination object', async () => {
    const res = await request(app).get(PRODUCTS)
    expect(res.body).toHaveProperty('pagination')
    expect(res.body.pagination).toHaveProperty('total')
    expect(res.body.pagination).toHaveProperty('page')
    expect(res.body.pagination).toHaveProperty('limit')
  })

  it('supports category filter', async () => {
    const category = encodeURIComponent(PRODUCT_CATEGORIES[0])
    const res = await request(app).get(`${PRODUCTS}?category=${category}`)
    expect(res.status).toBe(200)
    expect(
      res.body.data.every((p: { category: string }) => p.category === PRODUCT_CATEGORIES[0]),
    ).toBe(true)
  })

  it('supports page and limit query params', async () => {
    const res = await request(app).get(`${PRODUCTS}?page=1&limit=2`)
    expect(res.status).toBe(200)
    expect(res.body.data.length).toBeLessThanOrEqual(2)
  })
})

describe('GET /products/featured', () => {
  it('returns 200 with success:true', async () => {
    const res = await request(app).get(`${PRODUCTS}/featured`)
    expect(res.status).toBe(200)
    expect(res.body.success).toBe(true)
  })

  it('returns an array', async () => {
    const res = await request(app).get(`${PRODUCTS}/featured`)
    expect(Array.isArray(res.body.data)).toBe(true)
  })

  it('only returns featured products', async () => {
    const res = await request(app).get(`${PRODUCTS}/featured`)
    expect(res.body.data.every((p: { isFeatured: boolean }) => p.isFeatured === true)).toBe(true)
  })
})

describe('GET /products/:id', () => {
  let productId: string

  beforeAll(async () => {
    const product = await ProductModel.create(
      makeProductData({ title: 'Specific Product', sellerId }),
    )
    productId = (product._id as mongoose.Types.ObjectId).toString()
  })

  it('returns 200 with the product for a valid id', async () => {
    const res = await request(app).get(`${PRODUCTS}/${productId}`)
    expect(res.status).toBe(200)
    expect(res.body.success).toBe(true)
    expect(res.body.data).toHaveProperty('_id', productId)
    expect(res.body.data).toHaveProperty('title', 'Specific Product')
  })

  it('returns 4xx for a non-existent product id', async () => {
    const fakeId = new mongoose.Types.ObjectId().toString()
    const res = await request(app).get(`${PRODUCTS}/${fakeId}`)
    expect(res.status).toBeGreaterThanOrEqual(400)
    expect(res.status).toBeLessThan(500)
  })
})
