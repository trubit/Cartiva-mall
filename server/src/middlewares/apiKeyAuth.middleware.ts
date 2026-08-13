import { Request, Response, NextFunction } from 'express'
import { authenticateApiKey } from '../modules/api-management/apiKey.service.js'

export interface ApiKeyContext {
  id: string
  userId: string
  applicationId?: string
  scopes: string[]
  environment: 'development' | 'staging' | 'production'
  rateLimitRequestsPerMin: number
}

declare global {
  namespace Express {
    interface Request {
      apiKey?: ApiKeyContext
    }
  }
}

/**
 * Middleware to authenticate requests using API keys and verify scopes
 */
export const requireApiKey = (requiredScope?: string) => {
  return async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const authHeader = req.headers['x-api-key'] || req.headers['authorization']
      let rawKey: string | undefined

      if (typeof authHeader === 'string') {
        if (authHeader.startsWith('Bearer ')) {
          rawKey = authHeader.substring(7).trim()
        } else {
          rawKey = authHeader.trim()
        }
      }

      if (!rawKey || !rawKey.startsWith('cartiva_')) {
        res.status(401).json({
          success: false,
          message: 'Invalid or missing API key format (must start with cartiva_)',
        })
        return
      }

      const keyContext = await authenticateApiKey(rawKey)
      if (!keyContext) {
        res.status(401).json({ success: false, message: 'API key is invalid, revoked, or expired' })
        return
      }

      // Verify scope if specified
      if (
        requiredScope &&
        !keyContext.scopes.includes(requiredScope) &&
        !keyContext.scopes.includes('*')
      ) {
        res.status(403).json({
          success: false,
          message: `Insufficient permissions. API key lacks required scope: '${requiredScope}'`,
          requiredScope,
          providedScopes: keyContext.scopes,
        })
        return
      }

      req.apiKey = keyContext
      next()
    } catch (err: any) {
      res
        .status(500)
        .json({ success: false, message: 'API key authentication error', error: err.message })
    }
  }
}
