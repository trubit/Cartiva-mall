import { Router } from 'express'
import {
  listNotifications,
  getUnreadCount,
  markRead,
  markAllRead,
  deleteNotification,
  getPreferences,
  updatePreferences,
  registerDeviceToken,
  broadcastAdminNotification,
} from '../modules/notification/notification.controller.js'
import { authenticate, authorize } from '../middlewares/auth.middleware.js'

const router = Router()

router.use(authenticate)

router.get('/', listNotifications)
router.get('/unread', getUnreadCount)
router.get('/unread-count', getUnreadCount)
router.post('/read-all', markAllRead)
router.put('/read-all', markAllRead)
router.patch('/:id/read', markRead)
router.put('/:id/read', markRead)
router.delete('/:id', deleteNotification)

router.get('/preferences', getPreferences)
router.patch('/preferences', updatePreferences)
router.post('/device-tokens', registerDeviceToken)

router.post('/admin/broadcast', authorize('admin'), broadcastAdminNotification)

export default router
