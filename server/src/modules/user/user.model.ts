import mongoose, { type Document } from 'mongoose'
import bcrypt from 'bcrypt'
import crypto from 'crypto'
import type { UserRole } from '../../../../src/shared/types/auth.types.js'
import { ROLES } from '../../../../src/shared/constants/index.js'

export interface IAddressDoc {
  country?: string
  state?: string
  city?: string
  street?: string
  postalCode?: string
}

export interface INotificationSettingsDoc {
  emailNotifications: boolean
  pushNotifications: boolean
  orderUpdates: boolean
  promotions: boolean
  newsletter: boolean
}

export interface IUserDocument extends Document {
  firstName: string
  lastName: string
  username: string
  email: string
  password?: string
  googleId?: string
  authProvider?: 'local' | 'google' | 'facebook'
  phoneNumber?: string
  bio?: string
  gender?: 'male' | 'female' | 'other' | 'prefer_not_to_say'
  dateOfBirth?: Date
  profileImage: string
  profileImagePublicId?: string
  address: IAddressDoc
  language: string
  preferences: Record<string, unknown>
  notificationSettings: INotificationSettingsDoc
  role: UserRole
  accountStatus: 'ACTIVE' | 'RESTRICTED' | 'BLOCKED' | 'SUSPENDED'
  restrictionReason?: string
  restrictedAt?: Date
  emailVerified: boolean
  emailVerificationToken?: string
  emailVerificationExpires?: Date
  resetPasswordToken?: string
  resetPasswordExpires?: Date
  refreshTokens: string[]
  isActive: boolean
  createdAt: Date
  updatedAt: Date
  comparePassword(candidate: string): Promise<boolean>
  createEmailVerificationToken(): string
  createPasswordResetToken(): string
}

const addressSchema = new mongoose.Schema<IAddressDoc>(
  {
    country: { type: String, trim: true, default: '' },
    state: { type: String, trim: true, default: '' },
    city: { type: String, trim: true, default: '' },
    street: { type: String, trim: true, default: '' },
    postalCode: { type: String, trim: true, default: '' },
  },
  { _id: false },
)

const notificationSchema = new mongoose.Schema<INotificationSettingsDoc>(
  {
    emailNotifications: { type: Boolean, default: true },
    pushNotifications: { type: Boolean, default: true },
    orderUpdates: { type: Boolean, default: true },
    promotions: { type: Boolean, default: false },
    newsletter: { type: Boolean, default: false },
  },
  { _id: false },
)

const userSchema = new mongoose.Schema<IUserDocument>(
  {
    firstName: { type: String, required: true, trim: true, maxlength: 50 },
    lastName: { type: String, required: true, trim: true, maxlength: 50 },
    username: {
      type: String,
      required: true,
      unique: true,
      lowercase: true,
      trim: true,
      maxlength: 30,
    },
    email: { type: String, required: true, unique: true, lowercase: true, trim: true },
    password: { type: String, select: false, minlength: 8 },
    googleId: { type: String, sparse: true, index: true },
    authProvider: { type: String, enum: ['local', 'google', 'facebook'], default: 'local' },
    phoneNumber: { type: String, trim: true },
    bio: { type: String, trim: true, maxlength: 500 },
    gender: { type: String, enum: ['male', 'female', 'other', 'prefer_not_to_say'] },
    dateOfBirth: { type: Date },
    profileImage: { type: String, default: '' },
    profileImagePublicId: { type: String, select: false },
    address: { type: addressSchema, default: () => ({}) },
    language: { type: String, default: 'en', maxlength: 10 },
    preferences: { type: mongoose.Schema.Types.Mixed, default: {} },
    notificationSettings: { type: notificationSchema, default: () => ({}) },
    role: { type: String, enum: Object.values(ROLES), default: ROLES.USER },
    accountStatus: {
      type: String,
      enum: ['ACTIVE', 'RESTRICTED', 'BLOCKED', 'SUSPENDED'],
      default: 'ACTIVE',
      index: true,
    },
    restrictionReason: { type: String, trim: true },
    restrictedAt: { type: Date },
    emailVerified: { type: Boolean, default: false },
    emailVerificationToken: { type: String, select: false },
    emailVerificationExpires: { type: Date, select: false },
    resetPasswordToken: { type: String, select: false },
    resetPasswordExpires: { type: Date, select: false },
    refreshTokens: { type: [String], select: false, default: [] },
    isActive: { type: Boolean, default: true },
  },
  {
    timestamps: true,
    toJSON: {
      transform: (_doc, ret: Record<string, unknown>) => {
        delete ret.password
        delete ret.emailVerificationToken
        delete ret.emailVerificationExpires
        delete ret.resetPasswordToken
        delete ret.resetPasswordExpires
        delete ret.refreshTokens
        delete ret.profileImagePublicId
        delete ret.__v
        return ret
      },
    },
  },
)

userSchema.index({ resetPasswordToken: 1 }, { sparse: true })
userSchema.index({ emailVerificationToken: 1 }, { sparse: true })
// Text index for admin listUsers search (email, username, firstName, lastName)
userSchema.index({ email: 'text', username: 'text', firstName: 'text', lastName: 'text' })

// Cost factor 10 = ~70 ms per hash (4× faster than 12 = ~300 ms).
// Still requires ~2^10 = 1024 iterations — more than sufficient against offline attacks.
// Native bcrypt offloads to the libuv thread pool so the event loop stays free.
userSchema.pre('save', async function () {
  if (!this.password || !this.isModified('password')) return
  this.password = await bcrypt.hash(this.password, 10)
})

userSchema.methods.comparePassword = async function (candidate: string): Promise<boolean> {
  return bcrypt.compare(candidate, this.password)
}

userSchema.methods.createEmailVerificationToken = function (): string {
  const raw = crypto.randomBytes(32).toString('hex')
  this.emailVerificationToken = crypto.createHash('sha256').update(raw).digest('hex')
  this.emailVerificationExpires = new Date(Date.now() + 24 * 60 * 60 * 1000)
  return raw
}

userSchema.methods.createPasswordResetToken = function (): string {
  const raw = crypto.randomBytes(32).toString('hex')
  this.resetPasswordToken = crypto.createHash('sha256').update(raw).digest('hex')
  this.resetPasswordExpires = new Date(Date.now() + 60 * 60 * 1000)
  return raw
}

export const User = mongoose.model<IUserDocument>('User', userSchema)
