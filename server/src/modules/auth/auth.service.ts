import crypto from 'crypto'
import bcrypt from 'bcrypt'
import { User } from '../user/user.model.js'
import { AppError } from '../../middlewares/error.middleware.js'
import { generateTokenPair, verifyRefreshToken } from '../../utils/jwt.js'
import { sendVerificationEmail, sendPasswordResetEmail } from '../../utils/email.js'
import { logger } from '../../utils/logger.js'
import type { IUserDocument } from '../user/user.model.js'
import type { RegisterCredentials } from '../../../../src/shared/types/auth.types.js'
import { ROLES } from '../../../../src/shared/constants/index.js'

// ─── Register ──────────────────────────────────────────────────────────────────
export const registerUser = async (data: RegisterCredentials): Promise<IUserDocument> => {
  const [emailExists, usernameExists] = await Promise.all([
    User.findOne({ email: data.email }),
    User.findOne({ username: data.username }),
  ])

  if (emailExists) throw new AppError('Email is already registered', 409)
  if (usernameExists) throw new AppError('Username is already taken', 409)

  const user = new User({
    firstName: data.firstName,
    lastName: data.lastName,
    username: data.username.toLowerCase(),
    email: data.email.toLowerCase(),
    password: data.password,
    phoneNumber: data.phoneNumber,
    role: ROLES.USER, // never trust client-supplied role — seller promotion requires admin action
  })

  const verifyToken = user.createEmailVerificationToken()
  await user.save()

  await sendVerificationEmail(user.email, user.firstName, verifyToken).catch((err) => {
    logger.warn('Verification email failed to send', {
      email: user.email,
      error: (err as Error).message,
    })
  })

  return user
}

// ─── Login ────────────────────────────────────────────────────────────────────
export const loginUser = async (email: string, password: string) => {
  // Select only the fields needed for login — avoids loading 4 KB of profile data
  // (address, preferences, notificationSettings, etc.) for every login request.
  const user = await User.findOne({ email: email.toLowerCase() }).select(
    '+password +refreshTokens role isActive emailVerified firstName lastName',
  )

  if (!user || !(await user.comparePassword(password))) {
    throw new AppError('Invalid email or password', 401)
  }

  if (!user.isActive) throw new AppError('Your account has been deactivated', 403)
  if (!user.emailVerified) {
    throw new AppError(
      'Your email address is not verified. Please check your inbox and click the verification link, or request a new one.',
      403,
    )
  }

  // Fire-and-forget: silently upgrade the stored hash from cost 10 → 12.
  // Does not block the login response. Uses updateOne (not save) to bypass
  // the pre-save hook which would otherwise double-hash the already-hashed value.
  const currentRounds = bcrypt.getRounds(user.password)
  if (currentRounds < 12) {
    bcrypt
      .hash(password, 12)
      .then((upgraded) => User.updateOne({ _id: user._id }, { $set: { password: upgraded } }))
      .catch((err: unknown) =>
        logger.warn('bcrypt cost-factor upgrade failed', { userId: user._id, err }),
      )
  }

  const tokens = generateTokenPair({
    userId: user._id.toString(),
    email: user.email,
    role: user.role,
  })

  const hashedRefresh = crypto.createHash('sha256').update(tokens.refreshToken).digest('hex')

  // Atomic update: append the new token hash, keep only the last 5.
  // Uses findByIdAndUpdate so Mongoose does NOT run the bcrypt pre-save hook
  // and does NOT re-validate the full document — far cheaper than user.save().
  await User.findByIdAndUpdate(user._id, {
    $push: {
      refreshTokens: {
        $each: [hashedRefresh],
        $slice: -5, // keep the 5 most recent refresh tokens per account
      },
    },
  })

  return { user, tokens }
}

// ─── Logout ──────────────────────────────────────────────────────────────────
export const logoutUser = async (userId: string, refreshToken: string): Promise<void> => {
  const hashed = crypto.createHash('sha256').update(refreshToken).digest('hex')
  // Atomic pull — no need to load the document first
  await User.findByIdAndUpdate(userId, { $pull: { refreshTokens: hashed } })
}

// ─── Refresh Tokens ────────────────────────────────────────────────────────────
export const refreshTokens = async (refreshToken: string) => {
  let payload
  try {
    payload = verifyRefreshToken(refreshToken)
  } catch {
    throw new AppError('Invalid or expired refresh token', 401)
  }

  const hashed = crypto.createHash('sha256').update(refreshToken).digest('hex')
  const user = await User.findById(payload.userId).select(
    '+refreshTokens role email firstName lastName',
  )

  if (!user || !(user.refreshTokens ?? []).includes(hashed)) {
    throw new AppError('Refresh token not recognized', 401)
  }

  const tokens = generateTokenPair({
    userId: user._id.toString(),
    email: user.email,
    role: user.role,
  })
  const newHashed = crypto.createHash('sha256').update(tokens.refreshToken).digest('hex')

  // $pull and $push on the same field in one update conflicts in MongoDB —
  // filter out old token then push new one using $set to avoid the path conflict.
  await User.findByIdAndUpdate(user._id, {
    $pull: { refreshTokens: hashed },
  })
  await User.findByIdAndUpdate(user._id, {
    $push: { refreshTokens: { $each: [newHashed], $slice: -5 } },
  })

  return { user, tokens }
}

// ─── Forgot Password ──────────────────────────────────────────────────────────
export const forgotPassword = async (email: string): Promise<void> => {
  const user = await User.findOne({ email: email.toLowerCase() })
  if (!user) return // Silent — don't reveal if email exists

  const resetToken = user.createPasswordResetToken()
  await user.save({ validateBeforeSave: false })

  await sendPasswordResetEmail(user.email, user.firstName, resetToken).catch(async () => {
    user.resetPasswordToken = undefined
    user.resetPasswordExpires = undefined
    await user.save({ validateBeforeSave: false })
  })
}

// ─── Reset Password ───────────────────────────────────────────────────────────
export const resetPassword = async (token: string, newPassword: string): Promise<void> => {
  const hashed = crypto.createHash('sha256').update(token).digest('hex')

  const user = await User.findOne({
    resetPasswordToken: hashed,
    resetPasswordExpires: { $gt: new Date() },
  }).select('+resetPasswordToken +resetPasswordExpires +refreshTokens')

  if (!user) throw new AppError('Reset token is invalid or has expired', 400)

  user.password = newPassword
  user.resetPasswordToken = undefined
  user.resetPasswordExpires = undefined
  user.refreshTokens = []
  await user.save()
}

// ─── Verify Email ─────────────────────────────────────────────────────────────
export const verifyEmail = async (token: string): Promise<void> => {
  const hashed = crypto.createHash('sha256').update(token).digest('hex')

  const user = await User.findOne({
    emailVerificationToken: hashed,
    emailVerificationExpires: { $gt: new Date() },
  }).select('+emailVerificationToken +emailVerificationExpires')

  if (!user) throw new AppError('Verification link is invalid or has expired', 400)

  user.emailVerified = true
  user.emailVerificationToken = undefined
  user.emailVerificationExpires = undefined
  await user.save({ validateBeforeSave: false })
}

// ─── Resend Verification Email ────────────────────────────────────────────────
export const resendVerificationEmail = async (email: string): Promise<void> => {
  const user = await User.findOne({ email: email.toLowerCase() })
  if (!user || user.emailVerified) return

  const token = user.createEmailVerificationToken()
  await user.save({ validateBeforeSave: false })

  await sendVerificationEmail(user.email, user.firstName, token).catch((err) => {
    logger.warn('Resend verification email failed', {
      email: user.email,
      error: (err as Error).message,
    })
  })
}

// ─── Get Current User ─────────────────────────────────────────────────────────
export const getCurrentUser = async (userId: string): Promise<IUserDocument> => {
  const user = await User.findById(userId)
  if (!user) throw new AppError('User not found', 404)
  return user
}
