import type { Request, Response, NextFunction } from 'express'
import { notificationService } from './notification.service.js'
import { sendSuccess, sendCreated, sendNoContent } from '../../utils/response.js'

export const listNotifications = async (
  req: Request,
  res: Response,
  next: NextFunction,
): Promise<void> => {
  try {
    const page = parseInt((req.query.page as string) ?? '1', 10)
    const limit = parseInt((req.query.limit as string) ?? '20', 10)
    const result = await notificationService.list(req.user!.userId, page, limit)
    sendSuccess(res, result.items, 'Notifications fetched', 200, {
      page: result.page,
      limit,
      total: result.total,
      totalPages: result.pages,
      hasNext: result.page < result.pages,
      hasPrev: result.page > 1,
    })
  } catch (err) {
    next(err)
  }
}

export const getUnreadCount = async (
  req: Request,
  res: Response,
  next: NextFunction,
): Promise<void> => {
  try {
    const count = await notificationService.getUnreadCount(req.user!.userId)
    sendSuccess(res, { unreadCount: count, count }, 'Unread count fetched')
  } catch (err) {
    next(err)
  }
}

export const markRead = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
  try {
    const notif = await notificationService.markRead(req.params['id'] as string, req.user!.userId)
    sendSuccess(res, notif, 'Notification marked read')
  } catch (err) {
    next(err)
  }
}

export const markAllRead = async (
  req: Request,
  res: Response,
  next: NextFunction,
): Promise<void> => {
  try {
    const count = await notificationService.markAllRead(req.user!.userId)
    sendSuccess(res, { updatedCount: count }, 'All notifications marked read')
  } catch (err) {
    next(err)
  }
}

export const deleteNotification = async (
  req: Request,
  res: Response,
  next: NextFunction,
): Promise<void> => {
  try {
    await notificationService.delete(req.params['id'] as string, req.user!.userId)
    sendNoContent(res)
  } catch (err) {
    next(err)
  }
}

export const getPreferences = async (
  req: Request,
  res: Response,
  next: NextFunction,
): Promise<void> => {
  try {
    const prefs = await notificationService.getPreferences(req.user!.userId)
    sendSuccess(res, prefs, 'Preferences fetched')
  } catch (err) {
    next(err)
  }
}

export const updatePreferences = async (
  req: Request,
  res: Response,
  next: NextFunction,
): Promise<void> => {
  try {
    const updated = await notificationService.updatePreferences(
      req.user!.userId,
      req.body.preferences,
    )
    sendSuccess(res, updated, 'Preferences updated')
  } catch (err) {
    next(err)
  }
}

export const registerDeviceToken = async (
  req: Request,
  res: Response,
  next: NextFunction,
): Promise<void> => {
  try {
    const tokenDoc = await notificationService.registerDeviceToken(
      req.user!.userId,
      req.body.deviceId,
      req.body.platform,
      req.body.pushToken,
    )
    sendCreated(res, tokenDoc, 'Device token registered')
  } catch (err) {
    next(err)
  }
}

export const broadcastAdminNotification = async (
  req: Request,
  res: Response,
  next: NextFunction,
): Promise<void> => {
  try {
    const result = await notificationService.broadcastAdminNotification(req.user!.userId, req.body)
    sendCreated(res, result, 'Broadcast initiated')
  } catch (err) {
    next(err)
  }
}
