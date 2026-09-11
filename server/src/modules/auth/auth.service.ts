import crypto from 'crypto'
import bcrypt from 'bcrypt'
import axios from 'axios'
import { OAuth2Client } from 'google-auth-library'
import { User } from '../user/user.model.js'
import { AppError } from '../../middlewares/error.middleware.js'
import { generateTokenPair, verifyRefreshToken } from '../../utils/jwt.js'
import { logger } from '../../utils/logger.js'
import * as otpService from './otp.service.js'
import type { IUserDocument } from '../user/user.model.js'
import type { RegisterCredentials } from '../../../../src/shared/types/auth.types.js'
import { ROLES } from '../../../../src/shared/constants/index.js'

const googleClient = new OAuth2Client(process.env.GOOGLE_CLIENT_ID)

// ─── Register ──────────────────────────────────────────────────────────────────
export const registerUser = async (data: RegisterCredentials): Promise<IUserDocument> => {
  const [emailExists, usernameExists] = await Promise.all([
    User.findOne({ email: data.email.toLowerCase().trim() }),
    User.findOne({ username: data.username.toLowerCase().trim() }),
  ])

  if (emailExists) throw new AppError('Email is already registered', 409)
  if (usernameExists) throw new AppError('Username is already taken', 409)

  const user = new User({
    firstName: data.firstName.trim(),
    lastName: data.lastName.trim(),
    username: data.username.toLowerCase().trim(),
    email: data.email.toLowerCase().trim(),
    password: data.password,
    phoneNumber: data.phoneNumber,
    role: data.role === 'seller' ? ROLES.SELLER : ROLES.USER,
    emailVerified: false,
  })

  await user.save()

  // Generate & dispatch 6-digit verification OTP via Brevo
  await otpService
    .requestOtp({
      email: user.email,
      userId: user._id.toString(),
      purpose: 'EMAIL_VERIFICATION',
      firstName: user.firstName,
    })
    .catch((err) => {
      logger.warn('Failed to send registration OTP email', {
        email: user.email,
        error: (err as Error).message,
      })
    })

  return user
}

// ─── Verify Email OTP ─────────────────────────────────────────────────────────
export const verifyEmailWithOtp = async (email: string, otp: string) => {
  const cleanEmail = email.toLowerCase().trim()
  const user = await User.findOne({ email: cleanEmail })
  if (!user) {
    throw new AppError('Account not found. Please check the email address or register.', 404)
  }

  if (user.emailVerified) {
    throw new AppError('Your email address is already verified. Please sign in.', 400)
  }

  // Verify OTP via secure OTP service
  await otpService.verifyOtp({
    email: cleanEmail,
    otp,
    purpose: 'EMAIL_VERIFICATION',
  })

  // Mark email as verified
  user.emailVerified = true
  user.emailVerificationToken = undefined
  user.emailVerificationExpires = undefined
  await user.save({ validateBeforeSave: false })

  // Generate token pair for immediate login
  const tokens = generateTokenPair({
    userId: user._id.toString(),
    email: user.email,
    role: user.role,
  })

  const hashedRefresh = crypto.createHash('sha256').update(tokens.refreshToken).digest('hex')

  await User.findByIdAndUpdate(user._id, {
    $push: {
      refreshTokens: {
        $each: [hashedRefresh],
        $slice: -5,
      },
    },
  })

  logger.info('EMAIL_VERIFIED_SUCCESSFULLY', { userId: user._id, email: user.email })

  return { user, tokens }
}

// ─── Resend Verification OTP ──────────────────────────────────────────────────
export const resendVerificationOtp = async (email: string): Promise<void> => {
  const cleanEmail = email.toLowerCase().trim()
  const user = await User.findOne({ email: cleanEmail })
  if (!user || user.emailVerified) {
    // Return silently to prevent account enumeration
    return
  }

  await otpService.requestOtp({
    email: cleanEmail,
    userId: user._id.toString(),
    purpose: 'EMAIL_VERIFICATION',
    firstName: user.firstName,
  })
}

// ─── Forgot Password (OTP Request) ────────────────────────────────────────────
export const forgotPassword = async (email: string): Promise<void> => {
  const cleanEmail = email.toLowerCase().trim()
  const user = await User.findOne({ email: cleanEmail })
  if (!user) {
    // Silent return to prevent account enumeration
    return
  }

  await otpService.requestOtp({
    email: cleanEmail,
    userId: user._id.toString(),
    purpose: 'PASSWORD_RESET',
    firstName: user.firstName,
  })
}

// ─── Verify Password Reset OTP ────────────────────────────────────────────────
export const verifyPasswordResetOtp = async (email: string, otp: string) => {
  const cleanEmail = email.toLowerCase().trim()
  return await otpService.verifyOtp({
    email: cleanEmail,
    otp,
    purpose: 'PASSWORD_RESET',
  })
}

// ─── Reset Password with OTP ──────────────────────────────────────────────────
export const resetPasswordWithOtp = async (
  email: string,
  otp: string,
  newPassword: string,
): Promise<void> => {
  const cleanEmail = email.toLowerCase().trim()
  const user = await User.findOne({ email: cleanEmail }).select('+password +refreshTokens')

  if (!user) {
    throw new AppError('Unable to reset password. Please check your details.', 400)
  }

  // 1. Verify and consume OTP for PASSWORD_RESET purpose
  await otpService.verifyOtp({
    email: cleanEmail,
    otp,
    purpose: 'PASSWORD_RESET',
  })

  // 2. Set new password (bcrypt pre-save hook will hash it)
  user.password = newPassword
  user.resetPasswordToken = undefined
  user.resetPasswordExpires = undefined
  user.refreshTokens = [] // revoke all existing active sessions
  await user.save()

  logger.info('PASSWORD_RESET_COMPLETED', { userId: user._id, email: user.email })
}

// ─── Login ────────────────────────────────────────────────────────────────────
export const loginUser = async (email: string, password: string) => {
  const cleanEmail = email.toLowerCase().trim()
  const user = await User.findOne({ email: cleanEmail }).select(
    '+password +refreshTokens role isActive emailVerified firstName lastName',
  )

  if (!user || !(await user.comparePassword(password))) {
    throw new AppError('Invalid email or password', 401)
  }

  if (!user.isActive) throw new AppError('Your account has been deactivated', 403)
  if (!user.emailVerified) {
    // Automatically trigger a fresh OTP if unverified
    await otpService
      .requestOtp({
        email: user.email,
        userId: user._id.toString(),
        purpose: 'EMAIL_VERIFICATION',
        firstName: user.firstName,
      })
      .catch(() => {})

    throw new AppError(
      'Your email is not verified. We have sent a 6-digit verification code to your inbox.',
      403,
    )
  }

  // Upgrade bcrypt cost factor if needed
  if (user.password) {
    const currentRounds = bcrypt.getRounds(user.password)
    if (currentRounds < 12) {
      bcrypt
        .hash(password, 12)
        .then((upgraded) => User.updateOne({ _id: user._id }, { $set: { password: upgraded } }))
        .catch((err: unknown) =>
          logger.warn('bcrypt cost-factor upgrade failed', { userId: user._id, err }),
        )
    }
  }

  const tokens = generateTokenPair({
    userId: user._id.toString(),
    email: user.email,
    role: user.role,
  })

  const hashedRefresh = crypto.createHash('sha256').update(tokens.refreshToken).digest('hex')

  await User.findByIdAndUpdate(user._id, {
    $push: {
      refreshTokens: {
        $each: [hashedRefresh],
        $slice: -5,
      },
    },
  })

  return { user, tokens }
}

// ─── Logout ──────────────────────────────────────────────────────────────────
export const logoutUser = async (userId: string, refreshToken: string): Promise<void> => {
  const hashed = crypto.createHash('sha256').update(refreshToken).digest('hex')
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

  await User.findByIdAndUpdate(user._id, {
    $pull: { refreshTokens: hashed },
  })
  await User.findByIdAndUpdate(user._id, {
    $push: { refreshTokens: { $each: [newHashed], $slice: -5 } },
  })

  return { user, tokens }
}

// ─── Token-Based Reset Password (Backward Compatibility) ───────────────────────
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

// ─── Token-Based Verify Email (Backward Compatibility) ─────────────────────────
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

// ─── Resend Verification Email (Backward Compatibility) ─────────────────────────
export const resendVerificationEmail = async (email: string): Promise<void> => {
  return resendVerificationOtp(email)
}

// ─── Get Current User ─────────────────────────────────────────────────────────
export const getCurrentUser = async (userId: string): Promise<IUserDocument> => {
  const user = await User.findById(userId)
  if (!user) throw new AppError('User not found', 404)
  return user
}

// ─── Google OAuth Authentication ──────────────────────────────────────────────
export const authenticateGoogleUser = async (
  credentialOrCode: string,
  role?: string,
): Promise<{ user: IUserDocument; accessToken: string; refreshToken: string }> => {
  let googleUser: {
    googleId: string
    email: string
    firstName: string
    lastName: string
    picture?: string
    emailVerified: boolean
  } | null = null

  const clientId = process.env.GOOGLE_CLIENT_ID || process.env.VITE_GOOGLE_CLIENT_ID

  // Strategy 1: Verify as ID Token (Google Identity Services GIS JWT credential)
  try {
    const ticket = await googleClient.verifyIdToken({
      idToken: credentialOrCode,
      audience: [
        process.env.GOOGLE_CLIENT_ID || '',
        process.env.VITE_GOOGLE_CLIENT_ID || '',
      ].filter(Boolean),
    })
    const payload = ticket.getPayload()
    if (payload && payload.email) {
      googleUser = {
        googleId: payload.sub,
        email: payload.email.toLowerCase().trim(),
        firstName: payload.given_name || payload.name || 'User',
        lastName: payload.family_name || '',
        picture: payload.picture || '',
        emailVerified: Boolean(payload.email_verified),
      }
    }
  } catch {
    // Strategy 2: Try Google UserInfo endpoint with Access Token
    try {
      const userInfoRes = await axios.get('https://www.googleapis.com/oauth2/v3/userinfo', {
        headers: { Authorization: `Bearer ${credentialOrCode}` },
        timeout: 5000,
      })
      if (userInfoRes.data && userInfoRes.data.email) {
        const data = userInfoRes.data
        googleUser = {
          googleId: data.sub,
          email: data.email.toLowerCase().trim(),
          firstName: data.given_name || data.name || 'User',
          lastName: data.family_name || '',
          picture: data.picture || '',
          emailVerified: Boolean(data.email_verified),
        }
      }
    } catch {
      // Strategy 3: Try Authorization Code exchange
      try {
        const client = new OAuth2Client(clientId, process.env.GOOGLE_CLIENT_SECRET, 'postmessage')
        const { tokens } = await client.getToken(credentialOrCode)
        if (tokens.id_token) {
          const ticket = await client.verifyIdToken({
            idToken: tokens.id_token,
            audience: clientId,
          })
          const payload = ticket.getPayload()
          if (payload && payload.email) {
            googleUser = {
              googleId: payload.sub,
              email: payload.email.toLowerCase().trim(),
              firstName: payload.given_name || payload.name || 'User',
              lastName: payload.family_name || '',
              picture: payload.picture || '',
              emailVerified: Boolean(payload.email_verified),
            }
          }
        } else if (tokens.access_token) {
          const userInfoRes = await axios.get('https://www.googleapis.com/oauth2/v3/userinfo', {
            headers: { Authorization: `Bearer ${tokens.access_token}` },
            timeout: 5000,
          })
          if (userInfoRes.data && userInfoRes.data.email) {
            const data = userInfoRes.data
            googleUser = {
              googleId: data.sub,
              email: data.email.toLowerCase().trim(),
              firstName: data.given_name || data.name || 'User',
              lastName: data.family_name || '',
              picture: data.picture || '',
              emailVerified: Boolean(data.email_verified),
            }
          }
        }
      } catch {
        // all strategies failed
      }
    }
  }

  if (!googleUser || !googleUser.email) {
    throw new AppError('Google authentication failed: invalid token or authorization code', 401)
  }

  // Find existing user by googleId or email
  let user = await User.findOne({
    $or: [{ googleId: googleUser.googleId }, { email: googleUser.email }],
  })

  if (user) {
    let modified = false
    if (!user.googleId) {
      user.googleId = googleUser.googleId
      user.authProvider = 'google'
      modified = true
    }
    if (!user.emailVerified && googleUser.emailVerified) {
      user.emailVerified = true
      modified = true
    }
    if (!user.profileImage && googleUser.picture) {
      user.profileImage = googleUser.picture
      modified = true
    }
    if (modified) {
      await user.save({ validateBeforeSave: false })
    }
  } else {
    // Generate unique username from name or email
    const baseUsername =
      (googleUser.email.split('@')[0] || 'user')
        .replace(/[^a-z0-9_]/gi, '')
        .toLowerCase()
        .slice(0, 20) || 'user'
    let username = baseUsername
    let counter = 1
    while (await User.findOne({ username })) {
      username = `${baseUsername.slice(0, 15)}_${Math.floor(1000 + Math.random() * 9000)}`
      counter++
      if (counter > 10) break
    }

    const selectedRole = role === 'seller' ? ROLES.SELLER : ROLES.USER

    user = new User({
      firstName: googleUser.firstName,
      lastName: googleUser.lastName || ' ',
      username,
      email: googleUser.email,
      googleId: googleUser.googleId,
      authProvider: 'google',
      profileImage: googleUser.picture || '',
      role: selectedRole,
      emailVerified: true, // Google emails are pre-verified
    })
    await user.save({ validateBeforeSave: false })
  }

  if (!user.isActive) {
    throw new AppError('Your account has been deactivated. Please contact support.', 403)
  }

  const { accessToken, refreshToken } = generateTokenPair({
    userId: user._id.toString(),
    email: user.email,
    role: user.role,
  })

  const hashedRefresh = crypto.createHash('sha256').update(refreshToken).digest('hex')
  user.refreshTokens = [...(user.refreshTokens || []).slice(-4), hashedRefresh]
  await user.save({ validateBeforeSave: false })

  return { user, accessToken, refreshToken }
}
