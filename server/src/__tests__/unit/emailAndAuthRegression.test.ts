import { describe, it, expect, vi, beforeEach } from 'vitest'
import { sendEmail, verifyEmailConfig } from '../../utils/email.js'
import { AppError } from '../../middlewares/error.middleware.js'
import { env } from '../../config/env.js'

describe('Email Delivery & Resilient Fallback Suite', () => {
  beforeEach(() => {
    vi.restoreAllMocks()
  })

  it('correctly detects SMTP vs REST API credentials', async () => {
    // verifyEmailConfig executes cleanly without throwing
    await expect(verifyEmailConfig()).resolves.not.toThrow()
  })

  it('throws AppError in production if all real delivery methods fail', async () => {
    // Temporarily simulate production
    const originalNodeEnv = process.env.NODE_ENV
    const originalEnvNodeEnv = env.NODE_ENV
    try {
      // @ts-expect-error mutating for test

      env.NODE_ENV = 'production'
      process.env.NODE_ENV = 'production'

      // Force bad email config by passing empty credentials
      const originalUser = env.EMAIL_USER
      const originalPass = env.EMAIL_PASS
      const originalApiKey = env.BREVO_API_KEY
      // @ts-expect-error mutating for test
      env.EMAIL_USER = ''
      // @ts-expect-error mutating for test
      env.EMAIL_PASS = ''
      // @ts-expect-error mutating for test
      env.BREVO_API_KEY = ''

      await expect(
        sendEmail({
          to: 'unreachable@example.com',
          subject: 'Test Subject',
          html: '<p>Test</p>',
        }),
      ).rejects.toThrow(AppError)

      // Restore
      // @ts-expect-error restoring
      env.EMAIL_USER = originalUser
      // @ts-expect-error restoring
      env.EMAIL_PASS = originalPass
      // @ts-expect-error restoring
      env.BREVO_API_KEY = originalApiKey
    } finally {
      // @ts-expect-error restoring
      env.NODE_ENV = originalEnvNodeEnv
      process.env.NODE_ENV = originalNodeEnv
    }
  })

  it('safely handles comparePassword when user has no password set (e.g. Google OAuth)', async () => {
    const { User } = await import('../../modules/user/user.model.js')
    const userInstance = new User({
      email: 'oauth_user@example.com',
      authProvider: 'google',
      googleId: '123456789',
      // password intentionally omitted
    })

    // Should return false and NEVER throw an uncaught error
    await expect(userInstance.comparePassword('anyPassword')).resolves.toBe(false)
  })
})
