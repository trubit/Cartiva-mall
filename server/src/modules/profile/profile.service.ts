import { User } from '../user/user.model.js'
import { AppError } from '../../middlewares/error.middleware.js'
import { uploadImagePath, deleteImage, isCloudinaryConfigured } from '../../config/cloudinary.js'
import type { IAddressDoc, INotificationSettingsDoc } from '../user/user.model.js'

export interface UpdateProfileData {
  firstName?: string
  lastName?: string
  username?: string
  phoneNumber?: string
  bio?: string
  gender?: 'male' | 'female' | 'other' | 'prefer_not_to_say'
  dateOfBirth?: string
  language?: string
}

export const getProfile = async (userId: string) => {
  const user = await User.findById(userId)
  if (!user) throw new AppError('User not found', 404)
  return user
}

export const updateProfile = async (userId: string, data: UpdateProfileData) => {
  if (data.username) {
    const existing = await User.findOne({
      username: data.username.toLowerCase(),
      _id: { $ne: userId },
    })
    if (existing) throw new AppError('Username already taken', 409)
  }

  const updateData: Record<string, unknown> = { ...data }
  if (data.dateOfBirth) updateData.dateOfBirth = new Date(data.dateOfBirth)

  const user = await User.findByIdAndUpdate(
    userId,
    { $set: updateData },
    { returnDocument: 'after', runValidators: true },
  )
  if (!user) throw new AppError('User not found', 404)
  return user
}

export const updateAddress = async (userId: string, address: IAddressDoc) => {
  const user = await User.findByIdAndUpdate(
    userId,
    { $set: { address } },
    { returnDocument: 'after', runValidators: true },
  )
  if (!user) throw new AppError('User not found', 404)
  return user
}

export const uploadAvatar = async (userId: string, file: Express.Multer.File) => {
  if (!isCloudinaryConfigured()) {
    throw new AppError(
      'Image upload requires Cloudinary configuration. Set CLOUDINARY_CLOUD_NAME, CLOUDINARY_API_KEY, and CLOUDINARY_API_SECRET in .env',
      503,
    )
  }

  const userWithPublicId = await User.findById(userId).select('+profileImagePublicId')
  if (!userWithPublicId) throw new AppError('User not found', 404)

  // Upload fresh image (always new public_id), then delete old one
  const { url, publicId } = await uploadImagePath(file.path, 'cartiva/avatars')

  if (userWithPublicId.profileImagePublicId) {
    await deleteImage(userWithPublicId.profileImagePublicId).catch(() => null)
  }

  const user = await User.findByIdAndUpdate(
    userId,
    { $set: { profileImage: url, profileImagePublicId: publicId } },
    { returnDocument: 'after' },
  )
  if (!user) throw new AppError('User not found', 404)
  return user
}

export const updateNotificationSettings = async (
  userId: string,
  settings: Partial<INotificationSettingsDoc>,
) => {
  const update = Object.fromEntries(
    Object.entries(settings).map(([k, v]) => [`notificationSettings.${k}`, v]),
  )

  const user = await User.findByIdAndUpdate(
    userId,
    { $set: update },
    { returnDocument: 'after', runValidators: true },
  )
  if (!user) throw new AppError('User not found', 404)
  return user
}

export const deleteAccount = async (userId: string, password: string) => {
  const user = await User.findById(userId).select('+password +profileImagePublicId')
  if (!user) throw new AppError('User not found', 404)

  const valid = await user.comparePassword(password)
  if (!valid) throw new AppError('Incorrect password', 401)

  if (user.profileImagePublicId && isCloudinaryConfigured()) {
    await deleteImage(user.profileImagePublicId).catch(() => null)
  }

  await User.findByIdAndUpdate(userId, {
    $set: { isActive: false, email: `deleted_${Date.now()}_${user.email}` },
    $unset: { refreshTokens: 1 },
  })
}
