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

vi.mock('../../utils/email.js', () => ({
  sendVerificationEmail: vi.fn().mockResolvedValue(undefined),
  sendPasswordResetEmail: vi.fn().mockResolvedValue(undefined),
}))

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
import { User as UserModel } from '../../modules/user/user.model.js'
import { Product as ProductModel } from '../../modules/product/product.model.js'
import { API_PREFIX, PRODUCT_CATEGORIES } from '../../../../src/shared/constants/index.js'

const CART = `${API_PREFIX}/cart`
const AUTH = `${API_PREFIX}/auth`

async function loginAndGetToken(email: string, password: string): Promise<string> {
  const res = await request(app).post(`${AUTH}/login`).send({ email, password })
  return res.body.data?.accessToken ?? ''
}

let accessToken: string
let testProductId: string

beforeAll(async () => {
  await UserModel.create({
    firstName: 'Cart',
    lastName: 'Tester',
    username: 'cart_tester_user',
    email: 'cart_tester@example.com',
    password: 'TestPass1!',
    emailVerified: true,
    isActive: true,
    role: 'user',
  })

  const seller = await UserModel.create({
    firstName: 'Cart',
    lastName: 'Seller',
    username: 'cart_seller_user',
    email: 'cart_seller@example.com',
    password: 'TestPass1!',
    emailVerified: true,
    isActive: true,
    role: 'seller',
  })

  const product = await ProductModel.create({
    title: 'Cart Test Product',
    description: 'Product used in cart route tests.',
    price: 35.0,
    category: PRODUCT_CATEGORIES[0],
    stockQuantity: 20,
    sku: `CART-SKU-${Date.now()}`,
    images: [],
    tags: [],
    isActive: true,
    status: 'active',
    isFeatured: false,
    ratingsAverage: 0,
    ratingsCount: 0,
    views: 0,
    sellerId: (seller._id as mongoose.Types.ObjectId).toString(),
  })

  testProductId = (product._id as mongoose.Types.ObjectId).toString()
  accessToken = await loginAndGetToken('cart_tester@example.com', 'TestPass1!')
})

describe('GET /cart', () => {
  it('returns 401 for unauthenticated requests', async () => {
    const res = await request(app).get(CART)
    expect(res.status).toBe(401)
  })

  it('returns 200 for authenticated requests', async () => {
    const res = await request(app).get(CART).set('Authorization', `Bearer ${accessToken}`)
    expect(res.status).toBe(200)
    expect(res.body.success).toBe(true)
  })

  it('returns a cart object with items array', async () => {
    const res = await request(app).get(CART).set('Authorization', `Bearer ${accessToken}`)
    expect(res.body.data).toHaveProperty('items')
    expect(Array.isArray(res.body.data.items)).toBe(true)
  })
})

describe('POST /cart/add', () => {
  it('returns 401 for unauthenticated requests', async () => {
    const res = await request(app)
      .post(`${CART}/add`)
      .send({ productId: testProductId, quantity: 1 })
    expect(res.status).toBe(401)
  })

  it('returns 2xx when authenticated and product exists', async () => {
    const res = await request(app)
      .post(`${CART}/add`)
      .set('Authorization', `Bearer ${accessToken}`)
      .send({ productId: testProductId, quantity: 1 })
    expect(res.status).toBeGreaterThanOrEqual(200)
    expect(res.status).toBeLessThan(300)
    expect(res.body.success).toBe(true)
  })

  it('returns 4xx for missing productId', async () => {
    const res = await request(app)
      .post(`${CART}/add`)
      .set('Authorization', `Bearer ${accessToken}`)
      .send({ quantity: 1 })
    expect(res.status).toBeGreaterThanOrEqual(400)
    expect(res.status).toBeLessThan(500)
  })
})

describe('DELETE /cart/remove/:productId', () => {
  it('returns 401 for unauthenticated requests', async () => {
    const res = await request(app).delete(`${CART}/remove/${testProductId}`)
    expect(res.status).toBe(401)
  })

  it('returns 2xx for authenticated removal', async () => {
    // Add item first
    await request(app)
      .post(`${CART}/add`)
      .set('Authorization', `Bearer ${accessToken}`)
      .send({ productId: testProductId, quantity: 1 })

    const res = await request(app)
      .delete(`${CART}/remove/${testProductId}`)
      .set('Authorization', `Bearer ${accessToken}`)
    expect(res.status).toBeGreaterThanOrEqual(200)
    expect(res.status).toBeLessThan(300)
  })
})

describe('DELETE /cart/clear', () => {
  it('returns 401 for unauthenticated requests', async () => {
    const res = await request(app).delete(`${CART}/clear`)
    expect(res.status).toBe(401)
  })

  it('returns 2xx and clears all cart items', async () => {
    // Populate cart first
    await request(app)
      .post(`${CART}/add`)
      .set('Authorization', `Bearer ${accessToken}`)
      .send({ productId: testProductId, quantity: 2 })

    const clearRes = await request(app)
      .delete(`${CART}/clear`)
      .set('Authorization', `Bearer ${accessToken}`)
    expect(clearRes.status).toBeGreaterThanOrEqual(200)
    expect(clearRes.status).toBeLessThan(300)

    const cartRes = await request(app).get(CART).set('Authorization', `Bearer ${accessToken}`)
    expect(cartRes.body.data.items).toHaveLength(0)
  })
})
