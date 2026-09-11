import { Router } from 'express'
import { authenticate } from '../middlewares/auth.middleware.js'
import { messageLimiter } from '../middlewares/rateLimiter.middleware.js'
import * as msgCtrl from '../modules/messaging/messaging.controller.js'

const router = Router()

// Conversations
router.post('/conversations', authenticate, msgCtrl.startConversation)
router.get('/conversations', authenticate, msgCtrl.listConversations)
router.get('/conversations/:id', authenticate, msgCtrl.getConversation)
router.get('/unread-count', authenticate, msgCtrl.getUnreadCount)

// Messages
router.post('/messages', authenticate, messageLimiter, msgCtrl.sendMessage)
router.get('/messages/:conversationId', authenticate, msgCtrl.getMessages)
router.put('/messages/:id', authenticate, msgCtrl.editMessage)
router.delete('/messages/:id', authenticate, msgCtrl.deleteMessage)

export default router
