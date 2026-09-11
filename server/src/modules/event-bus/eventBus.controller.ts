import { Request, Response } from 'express'
import {
  DomainEventModel,
  DeadLetterEventModel,
  SagaInstanceModel,
  ProcessedEventModel,
} from './eventBus.model.js'
import { eventBus } from './eventBus.service.js'

const getParam = (param: string | string[] | undefined): string => {
  if (Array.isArray(param)) return param[0] || ''
  return param || ''
}

// ─── Domain Events ───────────────────────────────────────────────────────────
export const getEvents = async (req: Request, res: Response): Promise<void> => {
  try {
    const { eventType, aggregateId, correlationId, page = '1', limit = '20' } = req.query
    const filter: Record<string, unknown> = {}

    if (eventType) filter.eventType = eventType
    if (aggregateId) filter.aggregateId = aggregateId
    if (correlationId) filter.correlationId = correlationId

    const p = parseInt(page as string, 10)
    const l = parseInt(limit as string, 10)

    const events = await DomainEventModel.find(filter)
      .sort({ timestamp: -1 })
      .skip((p - 1) * l)
      .limit(l)

    const total = await DomainEventModel.countDocuments(filter)

    res.json({
      success: true,
      data: events,
      pagination: { page: p, limit: l, total, pages: Math.ceil(total / l) },
    })
  } catch (err: any) {
    res.status(500).json({ success: false, message: err.message })
  }
}

export const getEventById = async (req: Request, res: Response): Promise<void> => {
  try {
    const id = getParam(req.params.id)
    const event = await DomainEventModel.findOne({ $or: [{ eventId: id }, { _id: id }] })
    if (!event) {
      res.status(404).json({ success: false, message: 'Event not found' })
      return
    }
    res.json({ success: true, data: event })
  } catch (err: any) {
    res.status(500).json({ success: false, message: err.message })
  }
}

export const replayEvent = async (req: Request, res: Response): Promise<void> => {
  try {
    const id = getParam(req.params.id)
    await eventBus.replay(id)
    res.json({ success: true, message: `Event ${id} replayed successfully` })
  } catch (err: any) {
    res.status(400).json({ success: false, message: err.message })
  }
}

// ─── Dead-Letter Queues (DLQ) ────────────────────────────────────────────────
export const getDeadLetters = async (req: Request, res: Response): Promise<void> => {
  try {
    const { status = 'PENDING' } = req.query
    const deadLetters = await DeadLetterEventModel.find({ status })
      .sort({ createdAt: -1 })
      .limit(100)
    res.json({ success: true, data: deadLetters })
  } catch (err: any) {
    res.status(500).json({ success: false, message: err.message })
  }
}

export const replayDeadLetter = async (req: Request, res: Response): Promise<void> => {
  try {
    const id = getParam(req.params.id)
    const dlq = await DeadLetterEventModel.findById(id)
    if (!dlq) {
      res.status(404).json({ success: false, message: 'Dead letter record not found' })
      return
    }

    await eventBus.publish({
      eventId: dlq.eventId,
      eventType: dlq.eventType,
      correlationId: dlq.correlationId,
      payload: dlq.payload,
    })

    dlq.status = 'REPLAYED'
    await dlq.save()

    res.json({ success: true, message: 'Dead letter event replayed successfully' })
  } catch (err: any) {
    res.status(500).json({ success: false, message: err.message })
  }
}

export const discardDeadLetter = async (req: Request, res: Response): Promise<void> => {
  try {
    const id = getParam(req.params.id)
    const dlq = await DeadLetterEventModel.findByIdAndUpdate(
      id,
      { status: 'DISCARDED' },
      { new: true },
    )
    res.json({ success: true, message: 'Dead letter event discarded', data: dlq })
  } catch (err: any) {
    res.status(500).json({ success: false, message: err.message })
  }
}

// ─── Saga Management ─────────────────────────────────────────────────────────
export const getSagas = async (_req: Request, res: Response): Promise<void> => {
  try {
    const sagas = await SagaInstanceModel.find().sort({ startedAt: -1 }).limit(50)
    res.json({ success: true, data: sagas })
  } catch (err: any) {
    res.status(500).json({ success: false, message: err.message })
  }
}

export const getSagaById = async (req: Request, res: Response): Promise<void> => {
  try {
    const id = getParam(req.params.id)
    const saga = await SagaInstanceModel.findOne({ $or: [{ sagaId: id }, { _id: id }] })
    if (!saga) {
      res.status(404).json({ success: false, message: 'Saga instance not found' })
      return
    }
    res.json({ success: true, data: saga })
  } catch (err: any) {
    res.status(500).json({ success: false, message: err.message })
  }
}

// ─── Health & Metrics ────────────────────────────────────────────────────────
export const getEventSystemHealth = async (_req: Request, res: Response): Promise<void> => {
  try {
    const [totalEvents, pendingDlq, activeSagas, processedCount] = await Promise.all([
      DomainEventModel.countDocuments(),
      DeadLetterEventModel.countDocuments({ status: 'PENDING' }),
      SagaInstanceModel.countDocuments({ status: { $in: ['STARTED', 'IN_PROGRESS'] } }),
      ProcessedEventModel.countDocuments(),
    ])

    res.json({
      success: true,
      data: {
        status: pendingDlq > 10 ? 'DEGRADED' : 'HEALTHY',
        metrics: {
          totalEventsEmitted: totalEvents,
          processedEventsCount: processedCount,
          pendingDeadLetters: pendingDlq,
          activeSagas,
        },
      },
    })
  } catch (err: any) {
    res.status(500).json({ success: false, message: err.message })
  }
}
