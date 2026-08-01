import type { Request, Response, NextFunction } from 'express'
import { messagingService } from './messaging.service.js'
import { sendSuccess, sendCreated, sendNoContent } from '../../utils/response.js'

const intQ = (v: unknown, fallback: number) => {
  const s = Array.isArray(v) ? (v[0] as string) : (v as string | undefined)
  const n = parseInt(s ?? '', 10)
  return isNaN(n) ? fallback : n
}

export const startConversation = async (
  req: Request,
  res: Response,
  next: NextFunction,
): Promise<void> => {
  try {
    const { recipientId, productId, orderId, subject } = req.body as Record<string, string>
    const convo = await messagingService.getOrCreateConversation(
      req.user!.userId,
      recipientId,
      { productId, orderId, subject },
    )
    sendCreated(res, convo, 'Conversation ready')
  } catch (err) {
    next(err)
  }
}

export const listConversations = async (
  req: Request,
  res: Response,
  next: NextFunction,
): Promise<void> => {
  try {
    const data = await messagingService.listConversations(
      req.user!.userId,
      intQ(req.query.page, 1),
      intQ(req.query.limit, 20),
    )
    sendSuccess(res, data, 'Conversations')
  } catch (err) {
    next(err)
  }
}

export const getConversation = async (
  req: Request,
  res: Response,
  next: NextFunction,
): Promise<void> => {
  try {
    const data = await messagingService.getConversation(
      req.params['id'] as string,
      req.user!.userId,
    )
    sendSuccess(res, data, 'Conversation')
  } catch (err) {
    next(err)
  }
}

export const sendMessage = async (
  req: Request,
  res: Response,
  next: NextFunction,
): Promise<void> => {
  try {
    const { conversationId, content, type, imageUrl } = req.body as Record<string, string>
    const msg = await messagingService.sendMessage(
      conversationId,
      req.user!.userId,
      content,
      (type as 'text' | 'image') ?? 'text',
      imageUrl,
    )
    sendCreated(res, msg, 'Message sent')
  } catch (err) {
    next(err)
  }
}

export const getMessages = async (
  req: Request,
  res: Response,
  next: NextFunction,
): Promise<void> => {
  try {
    const data = await messagingService.getMessages(
      req.params['conversationId'] as string,
      req.user!.userId,
      intQ(req.query.page, 1),
      intQ(req.query.limit, 30),
    )
    sendSuccess(res, data, 'Messages')
  } catch (err) {
    next(err)
  }
}

export const editMessage = async (
  req: Request,
  res: Response,
  next: NextFunction,
): Promise<void> => {
  try {
    const { content } = req.body as { content: string }
    const msg = await messagingService.editMessage(
      req.params['id'] as string,
      req.user!.userId,
      content,
    )
    sendSuccess(res, msg, 'Message updated')
  } catch (err) {
    next(err)
  }
}

export const deleteMessage = async (
  req: Request,
  res: Response,
  next: NextFunction,
): Promise<void> => {
  try {
    await messagingService.deleteMessage(req.params['id'] as string, req.user!.userId)
    sendNoContent(res)
  } catch (err) {
    next(err)
  }
}
