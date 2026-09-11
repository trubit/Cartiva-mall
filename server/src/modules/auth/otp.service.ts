import crypto from 'crypto'
import { Otp, type IOtpDocument } from './otp.model.js'
import { AppError } from '../../middlewares/error.middleware.js'
import { sendEmailVerificationOtp, sendPasswordResetOtp } from '../../utils/email.js'
import { logger } from '../../utils/logger.js'
import type { OtpPurpose } from '../../../../src/shared/types/auth.types.js'

// OTP Config: 10 minutes expiry, 5 max attempts, 60s resend cooldown
const OTP_EXPIRATION_MS = 10 * 60 * 1000 // 10 minutes
const MAX_ATTEMPTS = 5
const RESEND_COOLDOWN_MS = 60 * 1000 // 60 seconds
const MAX_HOURLY_REQUESTS = 10

/**
 * Generates a cryptographically secure 6-digit integer string (100000 - 999999).
 */
export const generateSecureOtp = (): string => {
  const code = crypto.randomInt(100000, 1000000).toString()
  return code
}

/**
 * Computes a deterministic SHA-256 hash of the OTP code for zero-plaintext storage.
 */
export const hashOtp = (otp: string): string => {
  return crypto.createHash('sha256').update(otp.trim()).digest('hex')
}

interface RequestOtpParams {
  email: string
  purpose: OtpPurpose
  userId?: string
  firstName?: string
  ipAddress?: string
  userAgent?: string
}

/**
 * Requests and dispatches an OTP to the user's email via Brevo.
 * Enforces resend cooldowns, invalidates prior OTPs, and stores hashed code in DB.
 */
export const requestOtp = async (params: RequestOtpParams): Promise<void> => {
  const email = params.email.toLowerCase().trim()
  const now = new Date()

  // 1. Check for recent active OTP to enforce 60s cooldown
  const latestOtp = await Otp.findOne({
    email,
    purpose: params.purpose,
    usedAt: null,
  }).sort({ createdAt: -1 })

  if (latestOtp && latestOtp.resendCooldownUntil > now) {
    const secondsLeft = Math.ceil((latestOtp.resendCooldownUntil.getTime() - now.getTime()) / 1000)
    throw new AppError(
      `Please wait ${secondsLeft} second${secondsLeft === 1 ? '' : 's'} before requesting a new code.`,
      429,
    )
  }

  // 2. Hourly rate limit check (max 10 requests per hour per email + purpose)
  const oneHourAgo = new Date(now.getTime() - 60 * 60 * 1000)
  const recentCount = await Otp.countDocuments({
    email,
    purpose: params.purpose,
    createdAt: { $gte: oneHourAgo },
  })

  if (recentCount >= MAX_HOURLY_REQUESTS) {
    logger.warn('OTP request hourly limit exceeded', { email, purpose: params.purpose })
    throw new AppError('Too many code requests. Please try again in an hour.', 429)
  }

  // 3. Atomically invalidate any previous active/unused OTPs for this email and purpose
  await Otp.updateMany({ email, purpose: params.purpose, usedAt: null }, { $set: { usedAt: now } })

  // 4. Generate fresh 6-digit OTP and store SHA-256 hash
  const rawOtp = generateSecureOtp()
  const otpHash = hashOtp(rawOtp)
  const expiresAt = new Date(now.getTime() + OTP_EXPIRATION_MS)
  const resendCooldownUntil = new Date(now.getTime() + RESEND_COOLDOWN_MS)

  await Otp.create({
    userId: params.userId,
    email,
    purpose: params.purpose,
    otpHash,
    expiresAt,
    attemptCount: 0,
    maxAttempts: MAX_ATTEMPTS,
    usedAt: null,
    resendCooldownUntil,
    ipAddress: params.ipAddress,
    userAgent: params.userAgent,
  })

  logger.info('OTP_REQUESTED', {
    email,
    purpose: params.purpose,
    expiresAt,
  })

  // 5. Send real email delivery through Brevo
  try {
    if (params.purpose === 'EMAIL_VERIFICATION') {
      await sendEmailVerificationOtp(email, params.firstName || '', rawOtp)
    } else if (params.purpose === 'PASSWORD_RESET') {
      await sendPasswordResetOtp(email, params.firstName || '', rawOtp)
    } else {
      await sendEmailVerificationOtp(email, params.firstName || '', rawOtp)
    }
  } catch (err) {
    logger.error('Failed to deliver OTP email via Brevo', {
      email,
      purpose: params.purpose,
      error: (err as Error).message,
    })
    throw new AppError('Failed to send verification email. Please try again.', 500)
  }
}

interface VerifyOtpParams {
  email: string
  otp: string
  purpose: OtpPurpose
}

/**
 * Validates a submitted OTP against the secure database hash.
 * Enforces purpose isolation, expiration, attempt counting, and single-use invalidation.
 */
export const verifyOtp = async (
  params: VerifyOtpParams,
): Promise<{ success: boolean; otpRecord: IOtpDocument }> => {
  const email = params.email.toLowerCase().trim()
  const cleanOtp = params.otp.trim()

  if (!/^\d{6}$/.test(cleanOtp)) {
    throw new AppError('Verification code must be exactly 6 digits', 400)
  }

  // 1. Find the active, unexpired, unused OTP record
  const otpRecord = await Otp.findOne({
    email,
    purpose: params.purpose,
    usedAt: null,
    expiresAt: { $gt: new Date() },
  }).select('+otpHash')

  if (!otpRecord) {
    logger.warn('OTP_VERIFICATION_FAILED_NOT_FOUND_OR_EXPIRED', {
      email,
      purpose: params.purpose,
    })
    throw new AppError(
      'Verification code has expired or is invalid. Please request a new one.',
      400,
    )
  }

  // 2. Check if maximum attempts have been exceeded
  if (otpRecord.attemptCount >= otpRecord.maxAttempts) {
    otpRecord.usedAt = new Date() // invalidate permanently
    await otpRecord.save()
    logger.warn('OTP_MAX_ATTEMPTS_EXCEEDED', { email, purpose: params.purpose })
    throw new AppError(
      'Too many failed attempts. This code is now invalid. Please request a new one.',
      429,
    )
  }

  // 3. Compare hash with timing-safe comparison
  const submittedHash = hashOtp(cleanOtp)
  const storedHashBuffer = Buffer.from(otpRecord.otpHash, 'utf8')
  const submittedHashBuffer = Buffer.from(submittedHash, 'utf8')

  const isMatch =
    storedHashBuffer.length === submittedHashBuffer.length &&
    crypto.timingSafeEqual(storedHashBuffer, submittedHashBuffer)

  if (!isMatch) {
    // Atomically increment failed attempts
    otpRecord.attemptCount += 1
    const attemptsRemaining = Math.max(0, otpRecord.maxAttempts - otpRecord.attemptCount)

    if (attemptsRemaining === 0) {
      otpRecord.usedAt = new Date()
    }
    await otpRecord.save()

    logger.warn('OTP_VERIFICATION_FAILED_MISMATCH', {
      email,
      purpose: params.purpose,
      attemptsRemaining,
    })

    if (attemptsRemaining === 0) {
      throw new AppError(
        'Incorrect verification code. Maximum attempts exceeded. Please request a new code.',
        429,
      )
    }

    throw new AppError(
      `Incorrect verification code. ${attemptsRemaining} attempt${attemptsRemaining === 1 ? '' : 's'} remaining.`,
      400,
    )
  }

  // 4. Mark OTP as used atomically (cannot be replayed)
  otpRecord.usedAt = new Date()
  await otpRecord.save()

  logger.info('OTP_VERIFICATION_SUCCESS', {
    email,
    purpose: params.purpose,
  })

  return { success: true, otpRecord }
}
