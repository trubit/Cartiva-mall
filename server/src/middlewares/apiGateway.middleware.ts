import { Request, Response, NextFunction } from 'express'
import { v4 as uuidv4 } from 'uuid'
import { redis } from '../database/redis.js'
import { ApiUsage } from '../modules/api-management/apiManagement.model.js'

/**
 * API Gateway Middleware:
 * 1. Assigns X-Correlation-ID
 * 2. Enforces distributed Redis rate limiting per IP or API Key
 * 3. Records request analytics asynchronously
 */
export const apiGatewayMiddleware = async (
  req: Request,
  res: Response,
  next: NextFunction,
): Promise<void> => {
  const startTime = Date.now()

  // Correlation ID handling
  const correlationId = (req.headers['x-correlation-id'] as string) || uuidv4()
  req.headers['x-correlation-id'] = correlationId
  res.setHeader('X-Correlation-ID', correlationId)

  // Determine rate limit identifier (API key ID or client IP)
  const identifier = req.apiKey?.id ? `apikey:${req.apiKey.id}` : `ip:${req.ip || '127.0.0.1'}`
  const limit = req.apiKey?.rateLimitRequestsPerMin || 100 // default 100 req/min for IP

  const windowKey = `ratelimit:${identifier}:${Math.floor(Date.now() / 60000)}`

  try {
    const requests = await redis.incr(windowKey)
    if (requests === 1) {
      await redis.expire(windowKey, 65) // 65 second TTL
    }

    res.setHeader('X-RateLimit-Limit', limit.toString())
    res.setHeader('X-RateLimit-Remaining', Math.max(0, limit - requests).toString())

    if (requests > limit) {
      res.status(429).json({
        success: false,
        message: 'Rate limit exceeded. Too many requests.',
        retryAfterSeconds: 60,
      })
      return
    }
  } catch {
    // Fail-open on Redis errors to prevent blocking traffic
  }

  // Record analytics on response finish
  res.on('finish', () => {
    const duration = Date.now() - startTime
    const today = new Date().toISOString().split('T')[0]

    ApiUsage.create({
      apiKeyHash: req.apiKey?.id,
      applicationId: req.apiKey?.applicationId,
      userId: req.apiKey?.userId,
      endpoint: req.baseUrl + req.path,
      method: req.method,
      version: 'v1',
      statusCode: res.statusCode,
      responseTimeMs: duration,
      ip: req.ip || '127.0.0.1',
      date: today,
    }).catch(() => {})
  })

  next()
}
