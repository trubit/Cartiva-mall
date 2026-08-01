import type { Request, Response, NextFunction } from 'express'
import { notificationService } from './notification.service.js'
import { sendSuccess, sendNoContent } from '../../utils/response.js'

const parseIntQ = (val: unknown, fallback: number) => {
  const raw = Array.isArray(val) ? (val[0] as string) : (val as string | undefined)
  const n = parseInt(raw ?? '', 10)
  return isNaN(n) ? fallback : n
}

export const listNotifications = async (
  req: Request,
  res: Response,
  next: NextFunction,
): Promise<void> => {
  try {
    const userId = req.user!.userId
    const page = parseIntQ(req.query.page, 1)
    const limit = Math.min(parseIntQ(req.query.limit, 20), 100)
    const data = await notificationService.list(userId, page, limit)
    sendSuccess(res, data, 'Notifications fetched')
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
    sendSuccess(res, { count }, 'Unread count')
  } catch (err) {
    next(err)
  }
}

export const markRead = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
  try {
    const id = req.params['id'] as string
    await notificationService.markRead(id, req.user!.userId)
    sendSuccess(res, null, 'Marked as read')
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
    sendSuccess(res, { count }, 'All marked as read')
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
    const id = req.params['id'] as string
    await notificationService.delete(id, req.user!.userId)
    sendNoContent(res)
  } catch (err) {
    next(err)
  }
}
