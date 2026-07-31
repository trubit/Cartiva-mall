import { describe, it, expect, vi, beforeAll } from 'vitest'
import request from 'supertest'

// ── Mocks MUST be declared before any server imports ─────────────────────────
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
  }
})

// ── App + models imported after mocks ─────────────────────────────────────────
import app from '../../app.js'
import { User as UserModel } from '../../modules/user/user.model.js'
import { API_PREFIX } from '../../../../src/shared/constants/index.js'

const AUTH = `${API_PREFIX}/auth`

// ── Helpers ───────────────────────────────────────────────────────────────────
function validRegistration(seed: string) {
  return {
    firstName: 'Test',
    lastName: 'User',
    username: `testuser_${seed}`,
    email: `testuser_${seed}@example.com`,
    password: 'TestPass1!',
    role: 'user',
  }
}

async function createVerifiedUser(seed: string) {
  return UserModel.create({
    firstName: 'Verified',
    lastName: 'User',
    username: `verified_${seed}`,
    email: `verified_${seed}@example.com`,
    password: 'TestPass1!',
    emailVerified: true,
    isActive: true,
    role: 'user',
  })
}

// ── Tests ─────────────────────────────────────────────────────────────────────
describe('POST /auth/register', () => {
  it('returns 201 and success:true for valid payload', async () => {
    const res = await request(app).post(`${AUTH}/register`).send(validRegistration('reg01'))

    expect(res.status).toBe(201)
    expect(res.body.success).toBe(true)
  })

  it('returns 4xx for duplicate email', async () => {
    const data = validRegistration('reg02')
    await request(app).post(`${AUTH}/register`).send(data)
    const res = await request(app).post(`${AUTH}/register`).send(data)
    expect(res.status).toBeGreaterThanOrEqual(400)
    expect(res.status).toBeLessThan(500)
  })

  it('returns 4xx for missing required fields', async () => {
    const res = await request(app)
      .post(`${AUTH}/register`)
      .send({ email: 'incomplete@example.com' })
    expect(res.status).toBeGreaterThanOrEqual(400)
    expect(res.status).toBeLessThan(500)
  })

  it('returns 4xx for weak password', async () => {
    const res = await request(app)
      .post(`${AUTH}/register`)
      .send({ ...validRegistration('reg03'), password: 'weakpass' })
    expect(res.status).toBeGreaterThanOrEqual(400)
    expect(res.status).toBeLessThan(500)
  })

  it('returns 4xx for invalid email format', async () => {
    const res = await request(app)
      .post(`${AUTH}/register`)
      .send({ ...validRegistration('reg04'), email: 'not-an-email' })
    expect(res.status).toBeGreaterThanOrEqual(400)
    expect(res.status).toBeLessThan(500)
  })
})

describe('POST /auth/login', () => {
  beforeAll(async () => {
    await createVerifiedUser('login01')
  })

  it('returns 200 with accessToken for valid credentials', async () => {
    const res = await request(app)
      .post(`${AUTH}/login`)
      .send({ email: 'verified_login01@example.com', password: 'TestPass1!' })

    expect(res.status).toBe(200)
    expect(res.body.data).toHaveProperty('accessToken')
  })

  it('returns 4xx for wrong password', async () => {
    const res = await request(app)
      .post(`${AUTH}/login`)
      .send({ email: 'verified_login01@example.com', password: 'WrongPass999!' })
    expect(res.status).toBeGreaterThanOrEqual(400)
    expect(res.status).toBeLessThan(500)
  })

  it('returns 4xx for non-existent email', async () => {
    const res = await request(app)
      .post(`${AUTH}/login`)
      .send({ email: 'nobody_at_all@example.com', password: 'TestPass1!' })
    expect(res.status).toBeGreaterThanOrEqual(400)
    expect(res.status).toBeLessThan(500)
  })

  it('returns 403 when email is not verified', async () => {
    await UserModel.create({
      firstName: 'Unverified',
      lastName: 'User',
      username: 'unverified_login_test',
      email: 'unverified_test@example.com',
      password: 'TestPass1!',
      emailVerified: false,
      isActive: true,
      role: 'user',
    })
    const res = await request(app)
      .post(`${AUTH}/login`)
      .send({ email: 'unverified_test@example.com', password: 'TestPass1!' })
    expect(res.status).toBe(403)
  })
})

describe('GET /auth/me', () => {
  let accessToken: string

  beforeAll(async () => {
    await createVerifiedUser('me01')
    const loginRes = await request(app)
      .post(`${AUTH}/login`)
      .send({ email: 'verified_me01@example.com', password: 'TestPass1!' })
    accessToken = loginRes.body.data?.accessToken
  })

  it('returns 200 with user data using Bearer token', async () => {
    const res = await request(app).get(`${AUTH}/me`).set('Authorization', `Bearer ${accessToken}`)

    expect(res.status).toBe(200)
    expect(res.body.success).toBe(true)
    const user = res.body.data?.user ?? res.body.data
    expect(user).toHaveProperty('email', 'verified_me01@example.com')
  })

  it('returns 401 without any token', async () => {
    const res = await request(app).get(`${AUTH}/me`)
    expect(res.status).toBe(401)
  })

  it('returns 401 with an invalid token', async () => {
    const res = await request(app)
      .get(`${AUTH}/me`)
      .set('Authorization', 'Bearer totally.invalid.token')
    expect(res.status).toBe(401)
  })
})

describe('POST /auth/logout', () => {
  let accessToken: string

  beforeAll(async () => {
    await createVerifiedUser('logout01')
    const loginRes = await request(app)
      .post(`${AUTH}/login`)
      .send({ email: 'verified_logout01@example.com', password: 'TestPass1!' })
    accessToken = loginRes.body.data?.accessToken
  })

  it('returns 2xx for authenticated logout', async () => {
    const res = await request(app)
      .post(`${AUTH}/logout`)
      .set('Authorization', `Bearer ${accessToken}`)
    expect(res.status).toBeGreaterThanOrEqual(200)
    expect(res.status).toBeLessThan(300)
  })

  it('returns 401 for unauthenticated logout', async () => {
    const res = await request(app).post(`${AUTH}/logout`)
    expect(res.status).toBe(401)
  })
})
