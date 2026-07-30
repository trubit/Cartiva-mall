import type { Request, Response, NextFunction } from 'express'
import { sendSuccess } from '../../utils/response.js'
import * as profileService from './profile.service.js'

export const getMe = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
  try {
    const user = await profileService.getProfile(req.user!.userId)
    sendSuccess(res, { user }, 'Profile fetched')
  } catch (err) {
    next(err)
  }
}

export const updateProfile = async (
  req: Request,
  res: Response,
  next: NextFunction,
): Promise<void> => {
  try {
    const user = await profileService.updateProfile(req.user!.userId, req.body)
    sendSuccess(res, { user }, 'Profile updated')
  } catch (err) {
    next(err)
  }
}

export const updateAddress = async (
  req: Request,
  res: Response,
  next: NextFunction,
): Promise<void> => {
  try {
    const user = await profileService.updateAddress(req.user!.userId, req.body)
    sendSuccess(res, { user }, 'Address updated')
  } catch (err) {
    next(err)
  }
}

export const uploadAvatar = async (
  req: Request,
  res: Response,
  next: NextFunction,
): Promise<void> => {
  try {
    if (!req.file) {
      res.status(400).json({ success: false, message: 'No image file provided' })
      return
    }
    const user = await profileService.uploadAvatar(req.user!.userId, req.file)
    sendSuccess(res, { user }, 'Avatar updated')
  } catch (err) {
    next(err)
  }
}

export const updateNotifications = async (
  req: Request,
  res: Response,
  next: NextFunction,
): Promise<void> => {
  try {
    const user = await profileService.updateNotificationSettings(req.user!.userId, req.body)
    sendSuccess(res, { user }, 'Notification settings updated')
  } catch (err) {
    next(err)
  }
}

export const deleteAccount = async (
  req: Request,
  res: Response,
  next: NextFunction,
): Promise<void> => {
  try {
    await profileService.deleteAccount(req.user!.userId, req.body.password)
    res.clearCookie('refresh_token')
    sendSuccess(res, null, 'Account deleted')
  } catch (err) {
    next(err)
  }
}
