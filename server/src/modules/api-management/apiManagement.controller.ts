import { Request, Response } from 'express'
import mongoose from 'mongoose'
import {
  ApiKey,
  DeveloperApplication,
  WebhookSubscription,
  WebhookDelivery,
  Integration,
  ApiUsage,
  ApiAuditLog,
} from './apiManagement.model.js'
import { generateApiKey, rotateApiKey, revokeApiKey } from './apiKey.service.js'
import {
  createWebhookSubscription,
  dispatchWebhookEvent,
  SUPPORTED_WEBHOOK_EVENTS,
  WebhookEventType,
} from './webhook.service.js'
import {
  checkIntegrationHealth,
  seedDefaultIntegrations,
  integrationRegistry,
} from './integration.service.js'
import { webhookDeliveryQueue } from '../../queue/webhook.queue.js'

// Helper for type-safe route param extraction
const getParam = (param: string | string[] | undefined): string => {
  if (Array.isArray(param)) return param[0] || ''
  return param || ''
}

// ─── Developer Applications ──────────────────────────────────────────────────
export const createApplication = async (req: Request, res: Response): Promise<void> => {
  try {
    const userId = (req as any).user.id
    const { name, description, environment, scopes } = req.body

    if (!name) {
      res.status(400).json({ success: false, message: 'Application name is required' })
      return
    }

    const app = await DeveloperApplication.create({
      name,
      description,
      ownerId: new mongoose.Types.ObjectId(userId),
      environment: environment || 'development',
      scopes: scopes || ['read:products'],
      status: 'active',
    })

    await ApiAuditLog.create({
      action: 'APP_CREATED',
      actorId: new mongoose.Types.ObjectId(userId),
      targetType: 'DeveloperApplication',
      targetId: app._id.toString(),
      details: { name, environment },
      ip: req.ip || '127.0.0.1',
    })

    res.status(201).json({ success: true, data: app })
  } catch (err: any) {
    res.status(500).json({ success: false, message: err.message })
  }
}

export const getApplications = async (req: Request, res: Response): Promise<void> => {
  try {
    const userId = (req as any).user.id
    const apps = await DeveloperApplication.find({ ownerId: userId, status: { $ne: 'archived' } })
    res.json({ success: true, data: apps })
  } catch (err: any) {
    res.status(500).json({ success: false, message: err.message })
  }
}

export const getApplicationById = async (req: Request, res: Response): Promise<void> => {
  try {
    const userId = (req as any).user.id
    const id = getParam(req.params.id)
    const app = await DeveloperApplication.findOne({ _id: id, ownerId: userId })
    if (!app) {
      res.status(404).json({ success: false, message: 'Application not found' })
      return
    }
    res.json({ success: true, data: app })
  } catch (err: any) {
    res.status(500).json({ success: false, message: err.message })
  }
}

export const updateApplication = async (req: Request, res: Response): Promise<void> => {
  try {
    const userId = (req as any).user.id
    const id = getParam(req.params.id)
    const app = await DeveloperApplication.findOneAndUpdate(
      { _id: id, ownerId: userId },
      req.body,
      { new: true },
    )
    if (!app) {
      res.status(404).json({ success: false, message: 'Application not found' })
      return
    }
    res.json({ success: true, data: app })
  } catch (err: any) {
    res.status(500).json({ success: false, message: err.message })
  }
}

export const deleteApplication = async (req: Request, res: Response): Promise<void> => {
  try {
    const userId = (req as any).user.id
    const id = getParam(req.params.id)
    const app = await DeveloperApplication.findOneAndUpdate(
      { _id: id, ownerId: userId },
      { status: 'archived' },
      { new: true },
    )
    if (!app) {
      res.status(404).json({ success: false, message: 'Application not found' })
      return
    }
    res.json({ success: true, message: 'Application archived successfully' })
  } catch (err: any) {
    res.status(500).json({ success: false, message: err.message })
  }
}

// ─── API Keys ─────────────────────────────────────────────────────────────────
export const createApiKeyHandler = async (req: Request, res: Response): Promise<void> => {
  try {
    const userId = (req as any).user.id
    const { name, applicationId, scopes, environment, expiresInDays, rateLimitRequestsPerMin } =
      req.body

    if (!name) {
      res.status(400).json({ success: false, message: 'Key name is required' })
      return
    }

    const result = await generateApiKey({
      name,
      userId,
      applicationId,
      scopes: scopes || ['read:products'],
      environment,
      expiresInDays,
      rateLimitRequestsPerMin,
      ip: req.ip,
      userAgent: req.headers['user-agent'],
    })

    res.status(201).json({
      success: true,
      message:
        'API Key generated successfully. Copy your secret key now! It will not be shown again.',
      data: {
        apiKey: result.apiKey,
        rawSecretKey: result.rawSecretKey,
      },
    })
  } catch (err: any) {
    res.status(500).json({ success: false, message: err.message })
  }
}

export const getApiKeysHandler = async (req: Request, res: Response): Promise<void> => {
  try {
    const userId = (req as any).user.id
    const keys = await ApiKey.find({ userId }).select('-apiKeyHash').sort({ createdAt: -1 })
    res.json({ success: true, data: keys })
  } catch (err: any) {
    res.status(500).json({ success: false, message: err.message })
  }
}

export const rotateApiKeyHandler = async (req: Request, res: Response): Promise<void> => {
  try {
    const userId = (req as any).user.id
    const id = getParam(req.params.id)

    const result = await rotateApiKey(id, userId, req.ip)
    res.json({
      success: true,
      message: 'API Key rotated successfully. Old key is revoked.',
      data: {
        apiKey: result.apiKey,
        rawSecretKey: result.rawSecretKey,
      },
    })
  } catch (err: any) {
    res.status(400).json({ success: false, message: err.message })
  }
}

export const revokeApiKeyHandler = async (req: Request, res: Response): Promise<void> => {
  try {
    const userId = (req as any).user.id
    const id = getParam(req.params.id)

    await revokeApiKey(id, userId, req.ip)
    res.json({ success: true, message: 'API key revoked successfully' })
  } catch (err: any) {
    res.status(400).json({ success: false, message: err.message })
  }
}

// ─── Webhooks ─────────────────────────────────────────────────────────────────
export const createWebhookHandler = async (req: Request, res: Response): Promise<void> => {
  try {
    const userId = (req as any).user.id
    const { url, events, description, applicationId } = req.body

    if (!url || !events || !Array.isArray(events)) {
      res.status(400).json({ success: false, message: 'URL and array of events are required' })
      return
    }

    const subscription = await createWebhookSubscription({
      userId,
      applicationId,
      url,
      events,
      description,
    })

    res.status(201).json({ success: true, data: subscription })
  } catch (err: any) {
    res.status(500).json({ success: false, message: err.message })
  }
}

export const getWebhooksHandler = async (req: Request, res: Response): Promise<void> => {
  try {
    const userId = (req as any).user.id
    const subs = await WebhookSubscription.find({ userId }).sort({ createdAt: -1 })
    res.json({ success: true, data: subs, supportedEvents: SUPPORTED_WEBHOOK_EVENTS })
  } catch (err: any) {
    res.status(500).json({ success: false, message: err.message })
  }
}

export const getWebhookByIdHandler = async (req: Request, res: Response): Promise<void> => {
  try {
    const userId = (req as any).user.id
    const id = getParam(req.params.id)
    const sub = await WebhookSubscription.findOne({ _id: id, userId })
    if (!sub) {
      res.status(404).json({ success: false, message: 'Webhook subscription not found' })
      return
    }
    res.json({ success: true, data: sub })
  } catch (err: any) {
    res.status(500).json({ success: false, message: err.message })
  }
}

export const updateWebhookHandler = async (req: Request, res: Response): Promise<void> => {
  try {
    const userId = (req as any).user.id
    const id = getParam(req.params.id)
    const sub = await WebhookSubscription.findOneAndUpdate({ _id: id, userId }, req.body, {
      new: true,
    })
    if (!sub) {
      res.status(404).json({ success: false, message: 'Webhook subscription not found' })
      return
    }
    res.json({ success: true, data: sub })
  } catch (err: any) {
    res.status(500).json({ success: false, message: err.message })
  }
}

export const deleteWebhookHandler = async (req: Request, res: Response): Promise<void> => {
  try {
    const userId = (req as any).user.id
    const id = getParam(req.params.id)
    await WebhookSubscription.deleteOne({ _id: id, userId })
    res.json({ success: true, message: 'Webhook subscription deleted successfully' })
  } catch (err: any) {
    res.status(500).json({ success: false, message: err.message })
  }
}

export const testWebhookHandler = async (req: Request, res: Response): Promise<void> => {
  try {
    const id = getParam(req.params.id)
    const { eventType } = req.body
    const sub = await WebhookSubscription.findById(id)
    if (!sub) {
      res.status(404).json({ success: false, message: 'Webhook subscription not found' })
      return
    }

    const testEvent = (eventType || sub.events[0] || 'order.created') as WebhookEventType
    const result = await dispatchWebhookEvent(testEvent, {
      test: true,
      timestamp: Date.now(),
      message: 'This is a test webhook payload from Cartiva API Platform',
    })

    res.json({ success: true, message: 'Test webhook queued successfully', data: result })
  } catch (err: any) {
    res.status(500).json({ success: false, message: err.message })
  }
}

export const getWebhookDeliveriesHandler = async (req: Request, res: Response): Promise<void> => {
  try {
    const id = getParam(req.params.id)
    const deliveries = await WebhookDelivery.find({ subscriptionId: id })
      .sort({ createdAt: -1 })
      .limit(50)
    res.json({ success: true, data: deliveries })
  } catch (err: any) {
    res.status(500).json({ success: false, message: err.message })
  }
}

export const retryWebhookDeliveryHandler = async (req: Request, res: Response): Promise<void> => {
  try {
    const deliveryId = getParam(req.params.deliveryId)
    const delivery = await WebhookDelivery.findOne({ deliveryId })
    if (!delivery) {
      res.status(404).json({ success: false, message: 'Delivery log not found' })
      return
    }

    const sub = await WebhookSubscription.findById(delivery.subscriptionId)
    if (!sub) {
      res.status(404).json({ success: false, message: 'Associated subscription no longer exists' })
      return
    }

    delivery.status = 'pending'
    delivery.attempt += 1
    await delivery.save()

    await webhookDeliveryQueue.add('deliver-webhook', {
      deliveryId: delivery._id.toString(),
      url: sub.url,
      signature: delivery.signature,
      payload: delivery.payload,
      secret: sub.secret,
      attempt: delivery.attempt,
    })

    res.json({ success: true, message: 'Webhook retry job queued successfully', data: delivery })
  } catch (err: any) {
    res.status(500).json({ success: false, message: err.message })
  }
}

// ─── Integrations ─────────────────────────────────────────────────────────────
export const getIntegrationsHandler = async (_req: Request, res: Response): Promise<void> => {
  try {
    await seedDefaultIntegrations()
    const list = await Integration.find().sort({ name: 1 })
    res.json({ success: true, data: list, availableAdapters: integrationRegistry.listAdapters() })
  } catch (err: any) {
    res.status(500).json({ success: false, message: err.message })
  }
}

export const createIntegrationHandler = async (req: Request, res: Response): Promise<void> => {
  try {
    const { provider, name, category, configuration, environment } = req.body
    const integration = await Integration.create({
      provider,
      name,
      category,
      configuration: configuration || {},
      environment: environment || 'development',
      status: 'active',
      healthStatus: 'UNKNOWN',
    })
    res.status(201).json({ success: true, data: integration })
  } catch (err: any) {
    res.status(500).json({ success: false, message: err.message })
  }
}

export const testIntegrationHandler = async (req: Request, res: Response): Promise<void> => {
  try {
    const id = getParam(req.params.id)
    const updated = await checkIntegrationHealth(id)
    res.json({ success: true, data: updated })
  } catch (err: any) {
    res.status(500).json({ success: false, message: err.message })
  }
}

// ─── Analytics & Documentation ───────────────────────────────────────────────
export const getApiAnalyticsHandler = async (_req: Request, res: Response): Promise<void> => {
  try {
    const today = new Date().toISOString().split('T')[0]
    const usageDocs = await ApiUsage.find({ date: today }).limit(200)
    const totalRequests = usageDocs.reduce((acc, curr) => acc + curr.count, 0)
    const totalErrorRequests = usageDocs
      .filter((d) => d.statusCode >= 400)
      .reduce((acc, curr) => acc + curr.count, 0)
    const avgLatency = usageDocs.length
      ? usageDocs.reduce((acc, curr) => acc + curr.responseTimeMs, 0) / usageDocs.length
      : 0

    res.json({
      success: true,
      data: {
        today,
        totalRequests,
        errorRate: totalRequests > 0 ? (totalErrorRequests / totalRequests) * 100 : 0,
        avgLatencyMs: Math.round(avgLatency),
        recentLogs: usageDocs.slice(0, 20),
      },
    })
  } catch (err: any) {
    res.status(500).json({ success: false, message: err.message })
  }
}

export const getOpenApiSpecHandler = async (_req: Request, res: Response): Promise<void> => {
  const spec = {
    openapi: '3.0.3',
    info: {
      title: 'Cartiva Enterprise E-Commerce API',
      version: '1.0.0',
      description: 'API Management & Integration Platform for Cartiva Multi-Vendor Ecosystem',
    },
    servers: [{ url: '/api/v1', description: 'Production Gateway API v1' }],
    components: {
      securitySchemes: {
        ApiKeyAuth: {
          type: 'apiKey',
          in: 'header',
          name: 'X-API-Key',
        },
        BearerAuth: {
          type: 'http',
          scheme: 'bearer',
          bearerFormat: 'JWT',
        },
      },
    },
    paths: {
      '/products': {
        get: {
          summary: 'List Products',
          security: [{ ApiKeyAuth: [] }, { BearerAuth: [] }],
          responses: { '200': { description: 'Successful response' } },
        },
      },
      '/orders': {
        get: {
          summary: 'List Orders',
          security: [{ ApiKeyAuth: [] }, { BearerAuth: [] }],
          responses: { '200': { description: 'Successful response' } },
        },
      },
    },
  }
  res.json(spec)
}
