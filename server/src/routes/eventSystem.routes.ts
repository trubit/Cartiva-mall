import { Router } from 'express'
import { authenticate } from '../middlewares/auth.middleware.js'
import {
  getEvents,
  getEventById,
  replayEvent,
  getDeadLetters,
  replayDeadLetter,
  discardDeadLetter,
  getSagas,
  getSagaById,
  triggerOrderSagaDemo,
  getEventSystemHealth,
} from '../modules/event-bus/eventBus.controller.js'

const router = Router()

router.use(authenticate)

// Events
router.get('/events', getEvents)
router.get('/events/:id', getEventById)
router.post('/events/:id/replay', replayEvent)

// Dead-Letter Queues
router.get('/dead-letters', getDeadLetters)
router.post('/dead-letters/:id/replay', replayDeadLetter)
router.delete('/dead-letters/:id', discardDeadLetter)

// Sagas
router.get('/sagas', getSagas)
router.get('/sagas/:id', getSagaById)
router.post('/sagas/trigger-demo', triggerOrderSagaDemo)

// System Health & Metrics — router is mounted at /event-system so path is just /health
router.get('/health', getEventSystemHealth)

export default router
