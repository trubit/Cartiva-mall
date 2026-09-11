import type { Request, Response, NextFunction } from 'express'
import { v4 as uuidv4 } from 'uuid'
import { redis } from '../database/redis.js'
import { ApiUsage } from '../modules/api-management/apiManagement.model.js'

/**
 * Header names that external clients MUST NOT spoof.
 * The gateway strips these on incoming external requests and re-attaches
 * trusted values after authentication.
 */
const SENSITIVE_INTERNAL_HEADERS = [
  'x-user-id',
  'x-user-role',
  'x-user-roles',
  'x-service-identity',
  'x-internal-token',
]

/**
 * Phase 35 API Gateway Middleware:
 * 1. Sanitizes and strips untrusted client-supplied identity headers.
 * 2. Assigns/validates X-Request-ID and X-Correlation-ID.
 * 3. Enforces distributed Redis rate limiting per IP / API key / Authenticated User.
 * 4. Normalizes gateway metadata headers.
 * 5. Logs request analytics asynchronously.
 */
export const apiGatewayMiddleware = async (
  req: Request,
  res: Response,
  next: NextFunction,
): Promise<void> => {
  const startTime = Date.now()

  // 1. Strip untrusted internal headers spoofed by external clients
  for (const header of SENSITIVE_INTERNAL_HEADERS) {
    delete req.headers[header]
  }

  // 2. Request ID & Correlation ID
  const existingRequestId = req.headers['x-request-id'] as string | undefined
  const requestId =
    existingRequestId && existingRequestId.length <= 128 ? existingRequestId : uuidv4()
  req.headers['x-request-id'] = requestId
  res.setHeader('X-Request-ID', requestId)

  const existingCorrelationId = req.headers['x-correlation-id'] as string | undefined
  const correlationId =
    existingCorrelationId && existingCorrelationId.length <= 128 ? existingCorrelationId : uuidv4()
  req.headers['x-correlation-id'] = correlationId
  res.setHeader('X-Correlation-ID', correlationId)

  // 3. Distributed Redis Rate Limiting
  const isDev = process.env.NODE_ENV !== 'production'
  const ip = req.ip || req.socket.remoteAddress || '127.0.0.1'
  const loopback = ['127.0.0.1', '::1', '::ffff:127.0.0.1']
  const isLoopback = loopback.some((l) => ip === l || ip.includes(l))

  const userIdentifier = req.user?.userId ? `user:${req.user.userId}` : null
  const apiKeyIdentifier = req.apiKey?.id ? `apikey:${req.apiKey.id}` : null
  const ipIdentifier = `ip:${ip}`

  const identifier = apiKeyIdentifier || userIdentifier || ipIdentifier
  const defaultLimit = isDev || isLoopback ? 100_000 : userIdentifier ? 1200 : 600
  const limit = req.apiKey?.rateLimitRequestsPerMin || defaultLimit

  const windowSeconds = 60
  const currentMinute = Math.floor(Date.now() / 60000)
  const windowKey = `ratelimit:${identifier}:${currentMinute}`

  try {
    const requests = await redis.incr(windowKey)
    if (requests === 1) {
      await redis.expire(windowKey, windowSeconds + 5)
    }

    const remaining = Math.max(0, limit - requests)
    const resetTime = (currentMinute + 1) * 60

    res.setHeader('X-RateLimit-Limit', limit.toString())
    res.setHeader('X-RateLimit-Remaining', remaining.toString())
    res.setHeader('X-RateLimit-Reset', resetTime.toString())

    if (requests > limit) {
      res.status(429).json({
        success: false,
        error: {
          code: 'RATE_LIMIT_EXCEEDED',
          message: 'Rate limit exceeded. Too many requests.',
          requestId,
          correlationId,
          retryAfterSeconds: 60,
        },
      })
      return
    }
  } catch {
    // Fail-open on Redis errors to prevent blocking traffic if Redis is temporarily unreachable
  }

  // 4. Analytics Logging on Finish
  res.on('finish', () => {
    const duration = Date.now() - startTime
    const today = new Date().toISOString().split('T')[0]

    ApiUsage.create({
      apiKeyHash: req.apiKey?.id,
      applicationId: req.apiKey?.applicationId,
      userId: req.user?.userId || req.apiKey?.userId,
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
