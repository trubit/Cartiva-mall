import crypto from 'crypto'
import mongoose from 'mongoose'
import { ApiKey, ApiAuditLog } from './apiManagement.model.js'
import { redis } from '../../database/redis.js'

export const AVAILABLE_SCOPES = [
  'read:products',
  'write:products',
  'read:orders',
  'write:orders',
  'read:inventory',
  'write:inventory',
  'read:customers',
  'read:analytics',
  'webhooks:manage',
] as const

export type ApiScope = (typeof AVAILABLE_SCOPES)[number]

/**
 * Hash raw API key using SHA-256
 */
export const hashApiKey = (rawKey: string): string => {
  return crypto.createHash('sha256').update(rawKey).digest('hex')
}

/**
 * Generate cryptographically secure API Key
 */
export const generateApiKey = async (params: {
  name: string
  userId: string
  applicationId?: string
  scopes: string[]
  environment?: 'development' | 'staging' | 'production'
  expiresInDays?: number
  rateLimitRequestsPerMin?: number
  ip?: string
  userAgent?: string
}) => {
  const envPrefix = params.environment === 'production' ? 'live' : 'test'
  const randomBytes = crypto.randomBytes(24).toString('hex')
  const rawKey = `cartiva_${envPrefix}_${randomBytes}`
  const keyPrefix = rawKey.substring(0, 15)
  const apiKeyHash = hashApiKey(rawKey)

  let expiresAt: Date | undefined
  if (params.expiresInDays && params.expiresInDays > 0) {
    expiresAt = new Date(Date.now() + params.expiresInDays * 86400000)
  }

  const apiKeyDoc = await ApiKey.create({
    apiKeyHash,
    keyPrefix,
    name: params.name,
    userId: new mongoose.Types.ObjectId(params.userId),
    applicationId: params.applicationId
      ? new mongoose.Types.ObjectId(params.applicationId)
      : undefined,
    scopes: params.scopes,
    environment: params.environment || 'development',
    status: 'active',
    expiresAt,
    rateLimitRequestsPerMin: params.rateLimitRequestsPerMin || 60,
  })

  // Audit log
  await ApiAuditLog.create({
    action: 'API_KEY_CREATED',
    actorId: new mongoose.Types.ObjectId(params.userId),
    targetType: 'ApiKey',
    targetId: apiKeyDoc._id.toString(),
    details: { name: params.name, scopes: params.scopes, environment: params.environment },
    ip: params.ip || '127.0.0.1',
    userAgent: params.userAgent,
  })

  return {
    apiKey: apiKeyDoc,
    rawSecretKey: rawKey, // Only returned once!
  }
}

/**
 * Authenticate incoming raw API key
 */
export const authenticateApiKey = async (rawKey: string) => {
  const apiKeyHash = hashApiKey(rawKey)

  // Check Redis cache first
  const cacheKey = `apikey:auth:${apiKeyHash}`
  try {
    const cached = await redis.get(cacheKey)
    if (cached) {
      const parsed = JSON.parse(cached)
      ApiKey.updateOne(
        { apiKeyHash },
        { $inc: { usageCount: 1 }, $set: { lastUsedAt: new Date() } },
      ).catch(() => {})
      return parsed
    }
  } catch {
    // Fail-open on Redis errors; continue to MongoDB lookup
  }

  const keyDoc = await ApiKey.findOne({ apiKeyHash, status: 'active' })
  if (!keyDoc) return null

  if (keyDoc.expiresAt && keyDoc.expiresAt.getTime() < Date.now()) {
    keyDoc.status = 'expired'
    await keyDoc.save()
    return null
  }

  // Update stats
  keyDoc.usageCount += 1
  keyDoc.lastUsedAt = new Date()
  await keyDoc.save()

  const payload = {
    id: keyDoc._id.toString(),
    userId: keyDoc.userId.toString(),
    applicationId: keyDoc.applicationId?.toString(),
    scopes: keyDoc.scopes,
    environment: keyDoc.environment,
    rateLimitRequestsPerMin: keyDoc.rateLimitRequestsPerMin,
  }

  // Cache for 60 seconds
  try {
    await redis.set(cacheKey, JSON.stringify(payload), 'EX', 60)
  } catch {
    // Fail-open
  }

  return payload
}

/**
 * Rotate an existing API key
 */
export const rotateApiKey = async (keyId: string, userId: string, ip?: string) => {
  const existingDoc = await ApiKey.findOne({ _id: keyId, userId, status: 'active' })
  if (!existingDoc) throw new Error('API key not found or inactive')

  // Revoke old key
  existingDoc.status = 'revoked'
  existingDoc.revokedAt = new Date()
  await existingDoc.save()

  // Evict cache
  try {
    await redis.del(`apikey:auth:${existingDoc.apiKeyHash}`)
  } catch {
    // Fail-open
  }

  // Generate replacement key
  const newKey = await generateApiKey({
    name: `${existingDoc.name} (Rotated)`,
    userId,
    applicationId: existingDoc.applicationId?.toString(),
    scopes: existingDoc.scopes,
    environment: existingDoc.environment,
    rateLimitRequestsPerMin: existingDoc.rateLimitRequestsPerMin,
    ip,
  })

  // Audit log
  await ApiAuditLog.create({
    action: 'API_KEY_ROTATED',
    actorId: new mongoose.Types.ObjectId(userId),
    targetType: 'ApiKey',
    targetId: keyId,
    details: { newKeyId: newKey.apiKey._id.toString() },
    ip: ip || '127.0.0.1',
  })

  return newKey
}

/**
 * Revoke API Key
 */
export const revokeApiKey = async (keyId: string, userId: string, ip?: string) => {
  const keyDoc = await ApiKey.findOne({ _id: keyId, userId })
  if (!keyDoc) throw new Error('API key not found')

  keyDoc.status = 'revoked'
  keyDoc.revokedAt = new Date()
  await keyDoc.save()

  try {
    await redis.del(`apikey:auth:${keyDoc.apiKeyHash}`)
  } catch {
    // Fail-open
  }

  await ApiAuditLog.create({
    action: 'API_KEY_REVOKED',
    actorId: new mongoose.Types.ObjectId(userId),
    targetType: 'ApiKey',
    targetId: keyId,
    ip: ip || '127.0.0.1',
  })

  return keyDoc
}
