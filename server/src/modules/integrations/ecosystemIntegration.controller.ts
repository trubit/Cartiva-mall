import type { Request, Response, NextFunction } from 'express'
import {
  registerIntegration,
  onboardPartner,
  rotatePartnerKey,
  registerWebhook,
  verifyWebhookSignature,
  dispatchWebhook,
  retryDeadLetterDelivery,
  listIntegrations,
  listWebhooks,
  listDeliveries,
  listPartners,
} from './ecosystemIntegration.service.js'
import { sendSuccess, sendCreated } from '../../utils/response.js'

export const getIntegrations = async (
  _req: Request,
  res: Response,
  next: NextFunction,
): Promise<void> => {
  try {
    sendSuccess(res, await listIntegrations(), 'Integrations fetched')
  } catch (err) {
    next(err)
  }
}

export const createIntegration = async (
  req: Request,
  res: Response,
  next: NextFunction,
): Promise<void> => {
  try {
    sendCreated(res, await registerIntegration(req.body), 'Integration registered')
  } catch (err) {
    next(err)
  }
}

export const getPartners = async (
  _req: Request,
  res: Response,
  next: NextFunction,
): Promise<void> => {
  try {
    sendSuccess(res, await listPartners(), 'Partners fetched')
  } catch (err) {
    next(err)
  }
}

export const createPartner = async (
  req: Request,
  res: Response,
  next: NextFunction,
): Promise<void> => {
  try {
    sendCreated(res, await onboardPartner(req.body), 'Partner onboarded')
  } catch (err) {
    next(err)
  }
}

export const rotateCredentials = async (
  req: Request,
  res: Response,
  next: NextFunction,
): Promise<void> => {
  try {
    sendSuccess(
      res,
      await rotatePartnerKey(req.params['id'] as string),
      'Partner credentials rotated',
    )
  } catch (err) {
    next(err)
  }
}

export const getWebhooks = async (
  _req: Request,
  res: Response,
  next: NextFunction,
): Promise<void> => {
  try {
    sendSuccess(res, await listWebhooks(), 'Webhooks fetched')
  } catch (err) {
    next(err)
  }
}

export const createWebhook = async (
  req: Request,
  res: Response,
  next: NextFunction,
): Promise<void> => {
  try {
    sendCreated(res, await registerWebhook(req.body), 'Webhook endpoint registered')
  } catch (err) {
    next(err)
  }
}

export const testWebhook = async (
  req: Request,
  res: Response,
  next: NextFunction,
): Promise<void> => {
  try {
    sendSuccess(res, await dispatchWebhook(req.body), 'Webhook test event dispatched')
  } catch (err) {
    next(err)
  }
}

export const verifySignature = async (
  req: Request,
  res: Response,
  next: NextFunction,
): Promise<void> => {
  try {
    const { rawBody, signature, secret, timestamp } = req.body as {
      rawBody: string
      signature: string
      secret: string
      timestamp?: string
    }
    const isValid = verifyWebhookSignature(rawBody, signature, secret, timestamp)
    sendSuccess(res, { isValid }, 'Webhook signature verification complete')
  } catch (err) {
    next(err)
  }
}

export const getDeliveries = async (
  _req: Request,
  res: Response,
  next: NextFunction,
): Promise<void> => {
  try {
    sendSuccess(res, await listDeliveries(), 'Webhook deliveries fetched')
  } catch (err) {
    next(err)
  }
}

export const retryDelivery = async (
  req: Request,
  res: Response,
  next: NextFunction,
): Promise<void> => {
  try {
    sendSuccess(
      res,
      await retryDeadLetterDelivery(req.params['id'] as string),
      'Dead-letter delivery retried',
    )
  } catch (err) {
    next(err)
  }
}
