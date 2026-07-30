import type { Request, Response, NextFunction } from 'express'
import jwt from 'jsonwebtoken'
import crypto from 'crypto'
import { env } from '../config/env.js'
import { AppError } from './error.middleware.js'
import { cacheGet, cacheSet } from '../utils/cache.js'
import type { TokenPayload, UserRole } from '../../../src/shared/types/auth.types.js'

declare global {
  // eslint-disable-next-line @typescript-eslint/no-namespace
  namespace Express {
    interface Request {
      user?: TokenPayload
    }
  }
}

// Cache verified JWT payloads so the same token is only decoded once per minute.
// Key: first 16 bytes of SHA-256(token) — enough entropy to avoid collisions
// without storing the full sensitive token in Redis.
// TTL: min(60 s, token's remaining lifetime) — we use a fixed 60 s because the
// access token already expires in 15 min, so stale entries self-evict quickly.
async function verifyWithCache(token: string): Promise<TokenPayload> {
  const cacheKey = `jwt:${crypto.createHash('sha256').update(token).digest('hex').slice(0, 32)}`

  const cached = await cacheGet<TokenPayload>(cacheKey)
  if (cached) return cached

  // jwt.verify is sync and fast (~0.1 ms for HS256) but caching eliminates
  // repeated work for the same long-lived token hitting many endpoints in a session.
  const payload = jwt.verify(token, env.JWT_ACCESS_SECRET) as TokenPayload

  // TTL = min(60 s, remaining token lifetime).
  // Without this cap a token expiring in 5 s would be cached as "valid" for 60 s after
  // jwt.verify already rejected the next call — closing the post-expiry grace window.
  const nowSecs = Math.floor(Date.now() / 1000)
  const remainingSecs = payload.exp ? Math.max(1, payload.exp - nowSecs) : 60
  const cacheTtl = Math.min(60, remainingSecs)
  await cacheSet(cacheKey, payload, cacheTtl)
  return payload
}

export const authenticate = async (
  req: Request,
  _res: Response,
  next: NextFunction,
): Promise<void> => {
  try {
    const authHeader = req.headers.authorization
    const tokenFromHeader = authHeader?.startsWith('Bearer ') ? authHeader.slice(7) : null

    const token = tokenFromHeader
    if (!token) throw new AppError('Authentication required', 401)

    const payload = await verifyWithCache(token)

    // Reject tokens belonging to deactivated accounts without waiting for
    // the token to expire. The blocklist is written by admin.toggleUserActive.
    const isBlocked = await cacheGet<boolean>(`blocklist:user:${payload.userId}`)
    if (isBlocked) throw new AppError('Account has been deactivated', 401)

    req.user = payload
    next()
  } catch (err) {
    if (err instanceof AppError) return next(err)
    next(new AppError('Invalid or expired token', 401))
  }
}

export const authorize =
  (...roles: UserRole[]) =>
  (req: Request, _res: Response, next: NextFunction): void => {
    if (!req.user) return next(new AppError('Authentication required', 401))
    if (!roles.includes(req.user.role)) return next(new AppError('Access denied', 403))
    next()
  }
