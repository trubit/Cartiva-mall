import { Router } from 'express'
import { authenticate } from '../middlewares/auth.middleware.js'
import * as notifCtrl from '../modules/notification/notification.controller.js'

const router = Router()

router.get('/', authenticate, notifCtrl.listNotifications)
router.get('/unread', authenticate, notifCtrl.getUnreadCount)
router.put('/read-all', authenticate, notifCtrl.markAllRead)
router.put('/:id/read', authenticate, notifCtrl.markRead)
router.delete('/:id', authenticate, notifCtrl.deleteNotification)

export default router
