import { describe, it, expect, vi, beforeAll } from 'vitest'
import request from 'supertest'

// ── Mocks ────────────────────────────────────────────────────────────────────
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

// Mock Google OAuth to return configurable identity payloads
const mockGooglePayloads: Record<string, any> = {
  token_google_first: {
    sub: 'gid_google_first_101',
    email: 'googlefirst@example.com',
    given_name: 'GoogleFirst',
    family_name: 'Customer',
    email_verified: true,
  },
  token_google_first_repeat: {
    sub: 'gid_google_first_101',
    email: 'googlefirst@example.com',
    given_name: 'GoogleFirst',
    family_name: 'Customer',
    email_verified: true,
  },
  token_local_first_link: {
    sub: 'gid_local_link_202',
    email: 'localfirst@example.com',
    given_name: 'LocalFirst',
    family_name: 'Customer',
    email_verified: true,
  },
  token_unverified_email: {
    sub: 'gid_unverified_303',
    email: 'unverified_google@example.com',
    given_name: 'Unverified',
    family_name: 'Google',
    email_verified: false,
  },
  token_conflicting_gid: {
    sub: 'gid_conflicting_different_404',
    email: 'localfirst@example.com', // same email but different Google ID
    given_name: 'Conflicting',
    family_name: 'Google',
    email_verified: true,
  },
  token_existing_gid_other_email: {
    sub: 'gid_google_first_101', // already used by googlefirst@example.com
    email: 'different_email@example.com',
    given_name: 'Imposter',
    family_name: 'User',
    email_verified: true,
  },
}

vi.mock('google-auth-library', () => {
  class OAuth2Client {
    verifyIdToken = vi.fn().mockImplementation(async ({ idToken }) => {
      const payload = mockGooglePayloads[idToken]
      if (payload) {
        return {
          getPayload: () => payload,
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
    passwordResetLimiter: pass,
    otpLimiter: pass,
  }
})

import app from '../../app.js'

describe('Cartival Mall — Unified Authentication & Bidirectional Account Linking', () => {
  beforeAll(async () => {
    process.env['NODE_ENV'] = 'test'
    process.env['JWT_ACCESS_SECRET'] = 'test-jwt-access-secret-minimum-32-chars-long'
    process.env['JWT_REFRESH_SECRET'] = 'test-jwt-refresh-secret-minimum-32-chars-long'
  })

  // ── 1. Google Sign-Up First → Google Sign-In (Same Account) ────────────────
  let googleFirstUserId: string

  it('1. Google sign-up creates user with Google provider and pre-verified email', async () => {
    const res = await request(app)
      .post('/api/v1/auth/google')
      .send({ credential: 'token_google_first' })

    expect(res.status).toBe(200)
    expect(res.body.success).toBe(true)
    expect(res.body.data.user.email).toBe('googlefirst@example.com')
    expect(res.body.data.user.emailVerified).toBe(true)
    expect(res.body.data.accessToken).toBeDefined()

    googleFirstUserId = res.body.data.user._id
    expect(googleFirstUserId).toBeDefined()
  })

  it('2. Repeated Google sign-in returns the same account without creating duplicates', async () => {
    const res = await request(app)
      .post('/api/v1/auth/google')
      .send({ credential: 'token_google_first_repeat' })

    expect(res.status).toBe(200)
    expect(res.body.data.user._id).toBe(googleFirstUserId)
    expect(res.body.data.user.email).toBe('googlefirst@example.com')
  })

  // ── 2. Google User Attempting Normal Login Before Setting Password ─────────
  it('3. Normal password login is rejected with helpful guidance when Google user has no password', async () => {
    const res = await request(app).post('/api/v1/auth/login').send({
      email: 'googlefirst@example.com',
      password: 'RandomPassword123!',
    })

    expect(res.status).toBe(400)
    expect(res.body.success).toBe(false)
    expect(res.body.message).toMatch(/created with google.*password/i)
  })

  // ── 3. Google Sign-Up First → Set Password → Normal Email/Password Login ──
  it('4. Authenticated Google user can set password and subsequently log in via email & password', async () => {
    // A. Log in via Google to get access token
    const googleLoginRes = await request(app)
      .post('/api/v1/auth/google')
      .send({ credential: 'token_google_first' })
    const token = googleLoginRes.body.data.accessToken

    // B. Set password via /api/v1/auth/set-password
    const setPwRes = await request(app)
      .post('/api/v1/auth/set-password')
      .set('Authorization', `Bearer ${token}`)
      .send({ password: 'GoogleUserPassword123!' })

    expect(setPwRes.status).toBe(200)
    expect(setPwRes.body.success).toBe(true)

    // C. Log in via normal email/password form
    const normalLoginRes = await request(app).post('/api/v1/auth/login').send({
      email: 'googlefirst@example.com',
      password: 'GoogleUserPassword123!',
    })

    expect(normalLoginRes.status).toBe(200)
    expect(normalLoginRes.body.data.user._id).toBe(googleFirstUserId)
    expect(normalLoginRes.body.data.user.email).toBe('googlefirst@example.com')
    expect(normalLoginRes.body.data.accessToken).toBeDefined()
  })

  it('5. Google-first user with password can still sign in using Google (both work, same ID)', async () => {
    const res = await request(app)
      .post('/api/v1/auth/google')
      .send({ credential: 'token_google_first' })

    expect(res.status).toBe(200)
    expect(res.body.data.user._id).toBe(googleFirstUserId)
  })

  // ── 4. Normal Sign-Up First → Normal Login ────────────────────────────────
  let localFirstUserId: string

  it('6. Normal email/password registration creates user requiring OTP', async () => {
    const res = await request(app).post('/api/v1/auth/register').send({
      firstName: 'LocalFirst',
      lastName: 'Customer',
      username: 'localfirstuser',
      email: 'localfirst@example.com',
      password: 'InitialPassword123!',
    })

    expect(res.status).toBe(201)
    expect(res.body.success).toBe(true)
  })

  it('7. Duplicate normal registration is rejected with 409', async () => {
    const res = await request(app).post('/api/v1/auth/register').send({
      firstName: 'Duplicate',
      lastName: 'Attempt',
      username: 'localfirstuser_dup',
      email: 'localfirst@example.com',
      password: 'SomePassword123!',
    })

    expect(res.status).toBe(409)
    expect(res.body.success).toBe(false)
  })

  // ── 5. Normal Sign-Up First → Verified Google Sign-In (Secure Account Linking) ──
  it('8. Google sign-in with matching email safely links Google to existing local account', async () => {
    const res = await request(app)
      .post('/api/v1/auth/google')
      .send({ credential: 'token_local_first_link' })

    expect(res.status).toBe(200)
    expect(res.body.success).toBe(true)
    expect(res.body.data.user.email).toBe('localfirst@example.com')
    expect(res.body.data.user.emailVerified).toBe(true)

    localFirstUserId = res.body.data.user._id
    expect(localFirstUserId).toBeDefined()
  })

  it('9. Linked account can still log in using the original email and password', async () => {
    const res = await request(app).post('/api/v1/auth/login').send({
      email: 'localfirst@example.com',
      password: 'InitialPassword123!',
    })

    expect(res.status).toBe(200)
    expect(res.body.data.user._id).toBe(localFirstUserId)
    expect(res.body.data.user.email).toBe('localfirst@example.com')
  })

  it('10. Linked account rejects incorrect password with 401', async () => {
    const res = await request(app).post('/api/v1/auth/login').send({
      email: 'localfirst@example.com',
      password: 'WrongPassword!',
    })

    expect(res.status).toBe(401)
    expect(res.body.success).toBe(false)
  })

  // ── 6. Security Protections ────────────────────────────────────────────────
  it('11. Unverified Google email is rejected for linking/sign-in with 403', async () => {
    const res = await request(app)
      .post('/api/v1/auth/google')
      .send({ credential: 'token_unverified_email' })

    expect(res.status).toBe(403)
    expect(res.body.success).toBe(false)
    expect(res.body.message).toMatch(/not verified by google/i)
  })

  it('12. Conflicting Google ID on already linked account is rejected with 409', async () => {
    const res = await request(app)
      .post('/api/v1/auth/google')
      .send({ credential: 'token_conflicting_gid' })

    expect(res.status).toBe(409)
    expect(res.body.success).toBe(false)
    expect(res.body.message).toMatch(/different google account is already linked/i)
  })

  it('13. Google ID already linked to another user account cannot take over a different account', async () => {
    const res = await request(app)
      .post('/api/v1/auth/google')
      .send({ credential: 'token_existing_gid_other_email' })

    expect(res.status).toBe(409)
    expect(res.body.success).toBe(false)
    expect(res.body.message).toMatch(/already linked to another.*account/i)
  })

  it('14. Invalid or tampered Google token signature is rejected with 401', async () => {
    const res = await request(app)
      .post('/api/v1/auth/google')
      .send({ credential: 'completely_invalid_tampered_token' })

    expect(res.status).toBe(401)
    expect(res.body.success).toBe(false)
  })
})
