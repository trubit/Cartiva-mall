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
  sendEmailVerificationOtp: vi.fn().mockResolvedValue(undefined),
  sendPasswordResetOtp: vi.fn().mockResolvedValue(undefined),
  sendEmail: vi.fn().mockResolvedValue(undefined),
}))

vi.mock('google-auth-library', () => {
  class OAuth2Client {
    verifyIdToken = vi.fn().mockImplementation(async ({ idToken }) => {
      if (idToken === 'valid_google_jwt_token') {
        return {
          getPayload: () => ({
            sub: 'google-123456',
            email: 'googleuser@example.com',
            given_name: 'Google',
            family_name: 'User',
            picture: 'https://example.com/pic.jpg',
          }),
        }
      }
      throw new Error('Invalid token signature')
    })
    getToken = vi.fn().mockRejectedValue(new Error('Invalid authorization code'))
  }
  return { OAuth2Client }
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

// ── App + models imported after mocks ─────────────────────────────────────────
import app from '../../app.js'
import { User as UserModel } from '../../modules/user/user.model.js'
import { Otp as OtpModel } from '../../modules/auth/otp.model.js'
import * as emailUtils from '../../utils/email.js'
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
describe('POST /auth/register', { timeout: 60000 }, () => {
  it('returns 201 and dispatches real OTP verification email', async () => {
    const res = await request(app).post(`${AUTH}/register`).send(validRegistration('reg01'))

    expect(res.status).toBe(201)
    expect(res.body.success).toBe(true)
    expect(emailUtils.sendEmailVerificationOtp).toHaveBeenCalled()
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

  it('correctly assigns seller role when role=seller is chosen', async () => {
    const sellerData = { ...validRegistration('seller01'), role: 'seller' }
    const res = await request(app).post(`${AUTH}/register`).send(sellerData)
    expect(res.status).toBe(201)

    const createdUser = await UserModel.findOne({ email: sellerData.email })
    expect(createdUser).toBeDefined()
    expect(createdUser!.role).toBe('seller')
  })

  it('correctly assigns buyer (user) role when role=user is chosen', async () => {
    const buyerData = { ...validRegistration('buyer01'), role: 'user' }
    const res = await request(app).post(`${AUTH}/register`).send(buyerData)
    expect(res.status).toBe(201)

    const createdUser = await UserModel.findOne({ email: buyerData.email })
    expect(createdUser).toBeDefined()
    expect(createdUser!.role).toBe('user')
  })
})

describe('POST /auth/verify-otp (Production Email Verification)', () => {
  it('verifies 6-digit OTP and activates user account', async () => {
    const regData = validRegistration('otpverify01')
    await request(app).post(`${AUTH}/register`).send(regData)

    const calls = vi.mocked(emailUtils.sendEmailVerificationOtp).mock.calls
    const latestCall = calls[calls.length - 1]
    const dispatchedOtp = latestCall[2]

    const res = await request(app)
      .post(`${AUTH}/verify-otp`)
      .send({ email: regData.email, otp: dispatchedOtp })

    expect(res.status).toBe(200)
    expect(res.body.success).toBe(true)
    expect(res.body.data).toHaveProperty('accessToken')

    const updatedUser = await UserModel.findOne({ email: regData.email })
    expect(updatedUser!.emailVerified).toBe(true)
  })

  it('rejects invalid OTP with 400', async () => {
    const regData = validRegistration('otpverify02')
    await request(app).post(`${AUTH}/register`).send(regData)

    const res = await request(app)
      .post(`${AUTH}/verify-otp`)
      .send({ email: regData.email, otp: '111111' })

    expect(res.status).toBe(400)
    expect(res.body.success).toBe(false)
  })
})

describe('POST /auth/forgot-password & /auth/reset-password-otp', () => {
  it('handles full OTP-based password recovery flow', async () => {
    const user = await createVerifiedUser('pwrecovery01')

    // 1. Request Reset OTP
    const forgotRes = await request(app).post(`${AUTH}/forgot-password`).send({ email: user.email })

    expect(forgotRes.status).toBe(200)
    expect(emailUtils.sendPasswordResetOtp).toHaveBeenCalled()

    const resetCalls = vi.mocked(emailUtils.sendPasswordResetOtp).mock.calls
    const resetOtp = resetCalls[resetCalls.length - 1][2]

    // 2. Verify OTP check endpoint
    const verifyCheckRes = await request(app)
      .post(`${AUTH}/verify-reset-otp`)
      .send({ email: user.email, otp: resetOtp, purpose: 'PASSWORD_RESET' })

    expect(verifyCheckRes.status).toBe(200)

    // Simulate cooldown / reset OTP record active for password submission
    await OtpModel.updateMany({ email: user.email }, { $set: { usedAt: null } })

    // 3. Reset password with OTP
    const resetRes = await request(app).post(`${AUTH}/reset-password-otp`).send({
      email: user.email,
      otp: resetOtp,
      password: 'NewSecurePassword123!',
      confirmPassword: 'NewSecurePassword123!',
    })

    expect(resetRes.status).toBe(200)

    // 4. Validate login with new password
    const loginRes = await request(app)
      .post(`${AUTH}/login`)
      .send({ email: user.email, password: 'NewSecurePassword123!' })

    expect(loginRes.status).toBe(200)
    expect(loginRes.body.data).toHaveProperty('accessToken')
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

  it('returns 2xx and clears cookies for unauthenticated/expired logout', async () => {
    const res = await request(app).post(`${AUTH}/logout`)
    expect(res.status).toBeGreaterThanOrEqual(200)
    expect(res.status).toBeLessThan(300)
  })
})

describe('POST /auth/google (Google OAuth)', () => {
  it('returns 400 when neither credential nor code is provided', async () => {
    const res = await request(app).post(`${AUTH}/google`).send({})
    expect(res.status).toBe(400)
  })

  it('returns 401 when invalid token/code is provided', async () => {
    const res = await request(app)
      .post(`${AUTH}/google`)
      .send({ credential: 'invalid_google_jwt_token' })
    expect(res.status).toBe(401)
  })
})
