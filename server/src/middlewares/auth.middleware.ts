import type { Request, Response, NextFunction } from 'express'
import jwt from 'jsonwebtoken'
import crypto from 'crypto'
import { env } from '../config/env.js'
import { AppError } from './error.middleware.js'
import { cacheGet, cacheSet } from '../utils/cache.js'
import type { TokenPayload, UserRole } from '../../../src/shared/types/auth.types.js'

declare global {
  namespace Express {
    interface Request {
      user?: TokenPayload
    }
  }
}

async function verifyWithCache(token: string): Promise<TokenPayload> {
  const cacheKey = `jwt:${crypto.createHash('sha256').update(token).digest('hex').slice(0, 32)}`

  const cached = await cacheGet<TokenPayload>(cacheKey)
  if (cached) return cached

  let payload: TokenPayload
  try {
    payload = jwt.verify(token, env.JWT_ACCESS_SECRET, { algorithms: ['HS256'] }) as TokenPayload
  } catch (primaryErr) {
    if (env.JWT_PREVIOUS_SECRET) {
      payload = jwt.verify(token, env.JWT_PREVIOUS_SECRET, {
        algorithms: ['HS256'],
      }) as TokenPayload
    } else {
      throw primaryErr
    }
  }

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
    const tokenFromCookie = (req.cookies as Record<string, string> | undefined)?.access_token

    const token = tokenFromHeader ?? tokenFromCookie ?? null
    if (!token) throw new AppError('Authentication required', 401)

    const payload = await verifyWithCache(token)

    const isBlocked = await cacheGet<boolean>(`blocklist:user:${payload.userId}`)
    if (isBlocked) throw new AppError('Account has been deactivated', 401)

    req.user = payload

    // Propagate trusted internal identity context downstream
    req.headers['x-user-id'] = payload.userId
    req.headers['x-user-role'] = payload.role
    req.headers['x-service-identity'] = 'api-gateway'

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

export const hasPermission =
  (requiredPermission: string) =>
  (req: Request, _res: Response, next: NextFunction): void => {
    if (!req.user) return next(new AppError('Authentication required', 401))
    const userPermissions = req.user.permissions || []
    if (req.user.role !== 'admin' && !userPermissions.includes(requiredPermission)) {
      return next(new AppError('Forbidden: missing required permission', 403))
    }
    next()
  }

export const optionalAuthenticate = async (
  req: Request,
  _res: Response,
  next: NextFunction,
): Promise<void> => {
  try {
    const authHeader = req.headers.authorization
    const tokenFromHeader = authHeader?.startsWith('Bearer ') ? authHeader.slice(7) : null
    const tokenFromCookie = (req.cookies as Record<string, string> | undefined)?.access_token
    const token = tokenFromHeader ?? tokenFromCookie ?? null
    if (!token) return next()

    const payload = await verifyWithCache(token)
    const isBlocked = await cacheGet<boolean>(`blocklist:user:${payload.userId}`)
    if (!isBlocked) {
      req.user = payload
      req.headers['x-user-id'] = payload.userId
      req.headers['x-user-role'] = payload.role
      req.headers['x-service-identity'] = 'api-gateway'
    }
  } catch {
    // Ignore invalid tokens on optional auth routes
  }
  next()
}
