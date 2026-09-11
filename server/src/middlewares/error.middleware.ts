import type { Request, Response, NextFunction } from 'express'
import { logger } from '../utils/logger.js'

export class AppError extends Error {
  constructor(
    public message: string,
    public statusCode: number = 500,
    public errors?: Record<string, string>,
    public code?: string,
  ) {
    super(message)
    this.name = 'AppError'
    Error.captureStackTrace(this, this.constructor)
  }
}

export const notFound = (req: Request, res: Response): void => {
  const requestId = res.getHeader('X-Request-ID') as string | undefined
  const correlationId = res.getHeader('X-Correlation-ID') as string | undefined

  res.status(404).json({
    success: false,
    message: 'Route not found',
    error: {
      code: 'NOT_FOUND',
      message: `Endpoint ${req.method} ${req.path} not found`,
      requestId,
      correlationId,
    },
  })
}

export const errorHandler = (
  err: unknown,
  req: Request,
  res: Response,
  _next: NextFunction,
): void => {
  const requestId = res.getHeader('X-Request-ID') as string | undefined
  const correlationId = res.getHeader('X-Correlation-ID') as string | undefined

  if (err instanceof AppError) {
    res.status(err.statusCode).json({
      success: false,
      message: err.message,
      errors: err.errors,
      error: {
        code: err.code || getErrorCodeForStatus(err.statusCode),
        message: err.message,
        requestId,
        correlationId,
      },
    })
    return
  }

  if (err instanceof Error && err.name === 'ValidationError') {
    res.status(422).json({
      success: false,
      message: err.message,
      error: {
        code: 'VALIDATION_ERROR',
        message: err.message,
        requestId,
        correlationId,
      },
    })
    return
  }

  if (err instanceof Error && err.name === 'CastError') {
    res.status(400).json({
      success: false,
      message: 'Invalid ID format',
      error: {
        code: 'INVALID_ID',
        message: 'Invalid ID format',
        requestId,
        correlationId,
      },
    })
    return
  }

  const message = err instanceof Error ? err.message : String(err)
  const stack = err instanceof Error ? err.stack : undefined
  logger.error('Unhandled error', { message, stack, path: req.path, method: req.method })

  res.status(500).json({
    success: false,
    message: 'Internal server error',
    error: {
      code: 'INTERNAL_SERVER_ERROR',
      message: 'An unexpected internal error occurred.',
      requestId,
      correlationId,
    },
  })
}

function getErrorCodeForStatus(status: number): string {
  switch (status) {
    case 400:
      return 'BAD_REQUEST'
    case 401:
      return 'UNAUTHENTICATED'
    case 403:
      return 'UNAUTHORIZED'
    case 404:
      return 'NOT_FOUND'
    case 409:
      return 'CONFLICT'
    case 422:
      return 'UNPROCESSABLE_ENTITY'
    case 429:
      return 'TOO_MANY_REQUESTS'
    case 502:
      return 'BAD_GATEWAY'
    case 503:
      return 'SERVICE_UNAVAILABLE'
    case 504:
      return 'GATEWAY_TIMEOUT'
    default:
      return 'INTERNAL_SERVER_ERROR'
  }
}
