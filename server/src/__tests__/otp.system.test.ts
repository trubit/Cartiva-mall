import { describe, it, expect, beforeEach, vi } from 'vitest'
import crypto from 'crypto'
import { generateSecureOtp, hashOtp, requestOtp, verifyOtp } from '../modules/auth/otp.service.js'
import { Otp } from '../modules/auth/otp.model.js'
import * as emailUtils from '../utils/email.js'

// Mock Brevo email delivery
vi.mock('../utils/email.js', () => ({
  sendEmailVerificationOtp: vi.fn().mockResolvedValue(undefined),
  sendPasswordResetOtp: vi.fn().mockResolvedValue(undefined),
  sendEmail: vi.fn().mockResolvedValue(undefined),
}))

describe('Production OTP Authentication System', () => {
  const testEmail = 'production.test@cartiva.com'

  beforeEach(async () => {
    await Otp.deleteMany({ email: testEmail })
    vi.clearAllMocks()
  })

  describe('1. Cryptographic Generation & Zero-Plaintext Storage', () => {
    it('generates strictly 6-digit integer strings', () => {
      for (let i = 0; i < 100; i++) {
        const otp = generateSecureOtp()
        expect(otp).toHaveLength(6)
        expect(/^\d{6}$/.test(otp)).toBe(true)
        const num = parseInt(otp, 10)
        expect(num).toBeGreaterThanOrEqual(100000)
        expect(num).toBeLessThan(1000000)
      }
    })

    it('hashes OTP with SHA-256 for zero-plaintext storage', () => {
      const code = '748291'
      const hash = hashOtp(code)
      const expectedHash = crypto.createHash('sha256').update(code).digest('hex')
      expect(hash).toBe(expectedHash)
      expect(hash).not.toBe(code)
    })
  })

  describe('2. OTP Request & Brevo Email Dispatch', () => {
    it('dispatches email via Brevo and creates hashed database record', async () => {
      await requestOtp({
        email: testEmail,
        purpose: 'EMAIL_VERIFICATION',
        firstName: 'Alex',
      })

      expect(emailUtils.sendEmailVerificationOtp).toHaveBeenCalledTimes(1)
      const callArgs = vi.mocked(emailUtils.sendEmailVerificationOtp).mock.calls[0]
      expect(callArgs[0]).toBe(testEmail)
      expect(callArgs[1]).toBe('Alex')
      const dispatchedOtp = callArgs[2]
      expect(dispatchedOtp).toMatch(/^\d{6}$/)

      // Verify DB record
      const record = await Otp.findOne({
        email: testEmail,
        purpose: 'EMAIL_VERIFICATION',
        usedAt: null,
      }).select('+otpHash')
      expect(record).toBeDefined()
      expect(record!.otpHash).toBe(hashOtp(dispatchedOtp))
      expect(record!.attemptCount).toBe(0)
      expect(record!.maxAttempts).toBe(5)
    })

    it('enforces 60-second cooldown on immediate re-requests', async () => {
      await requestOtp({
        email: testEmail,
        purpose: 'EMAIL_VERIFICATION',
        firstName: 'Alex',
      })

      // Immediate second request must trigger 429
      await expect(
        requestOtp({
          email: testEmail,
          purpose: 'EMAIL_VERIFICATION',
          firstName: 'Alex',
        }),
      ).rejects.toThrow(/Please wait \d+ second/)
    })

    it('invalidates prior active OTPs when a new valid OTP is requested', async () => {
      await requestOtp({
        email: testEmail,
        purpose: 'EMAIL_VERIFICATION',
        firstName: 'Alex',
      })

      // Simulate cooldown expiry
      await Otp.updateMany(
        { email: testEmail },
        { $set: { resendCooldownUntil: new Date(Date.now() - 1000) } },
      )

      await requestOtp({
        email: testEmail,
        purpose: 'EMAIL_VERIFICATION',
        firstName: 'Alex',
      })

      const activeRecords = await Otp.find({
        email: testEmail,
        purpose: 'EMAIL_VERIFICATION',
        usedAt: null,
      })
      expect(activeRecords).toHaveLength(1)
    })
  })

  describe('3. Purpose Isolation', () => {
    it('prevents using an EMAIL_VERIFICATION OTP for PASSWORD_RESET', async () => {
      await requestOtp({
        email: testEmail,
        purpose: 'EMAIL_VERIFICATION',
        firstName: 'Alex',
      })

      const callArgs = vi.mocked(emailUtils.sendEmailVerificationOtp).mock.calls[0]
      const dispatchedOtp = callArgs[2]

      await expect(
        verifyOtp({
          email: testEmail,
          otp: dispatchedOtp,
          purpose: 'PASSWORD_RESET',
        }),
      ).rejects.toThrow(/expired or is invalid/)
    })
  })

  describe('4. Attempt Limiting & Invalidation', () => {
    it('decrements remaining attempts on incorrect code entry', async () => {
      await requestOtp({
        email: testEmail,
        purpose: 'EMAIL_VERIFICATION',
        firstName: 'Alex',
      })

      await expect(
        verifyOtp({
          email: testEmail,
          otp: '000000',
          purpose: 'EMAIL_VERIFICATION',
        }),
      ).rejects.toThrow(/4 attempts remaining/)

      const record = await Otp.findOne({ email: testEmail, purpose: 'EMAIL_VERIFICATION' })
      expect(record!.attemptCount).toBe(1)
    })

    it('permanently locks and invalidates OTP after 5 failed attempts', async () => {
      await requestOtp({
        email: testEmail,
        purpose: 'EMAIL_VERIFICATION',
        firstName: 'Alex',
      })

      for (let i = 0; i < 4; i++) {
        await expect(
          verifyOtp({
            email: testEmail,
            otp: '000000',
            purpose: 'EMAIL_VERIFICATION',
          }),
        ).rejects.toThrow(/attempt/)
      }

      // 5th failed attempt -> locked out
      await expect(
        verifyOtp({
          email: testEmail,
          otp: '000000',
          purpose: 'EMAIL_VERIFICATION',
        }),
      ).rejects.toThrow(/Maximum attempts exceeded/)

      const record = await Otp.findOne({ email: testEmail, purpose: 'EMAIL_VERIFICATION' })
      expect(record!.usedAt).not.toBeNull()
    })
  })

  describe('5. Successful Single-Use Verification', () => {
    it('verifies correct OTP and atomically marks it as used', async () => {
      await requestOtp({
        email: testEmail,
        purpose: 'EMAIL_VERIFICATION',
        firstName: 'Alex',
      })

      const callArgs = vi.mocked(emailUtils.sendEmailVerificationOtp).mock.calls[0]
      const dispatchedOtp = callArgs[2]

      const result = await verifyOtp({
        email: testEmail,
        otp: dispatchedOtp,
        purpose: 'EMAIL_VERIFICATION',
      })

      expect(result.success).toBe(true)
      expect(result.otpRecord.usedAt).not.toBeNull()

      // Replay attempt must fail
      await expect(
        verifyOtp({
          email: testEmail,
          otp: dispatchedOtp,
          purpose: 'EMAIL_VERIFICATION',
        }),
      ).rejects.toThrow(/expired or is invalid/)
    })
  })
})
