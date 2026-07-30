import type { Request, Response, NextFunction } from 'express'
import { z } from 'zod'
import { AppError } from './error.middleware.js'

type ValidateTarget = 'body' | 'query' | 'params'

export const validate =
  (schema: z.ZodTypeAny, target: ValidateTarget = 'body') =>
  (req: Request, _res: Response, next: NextFunction): void => {
    const result = schema.safeParse(req[target])
    if (result.success) {
      if (target === 'query') {
        // Express 5: req.query is a configurable getter — override it on the instance
        Object.defineProperty(req, 'query', {
          value: result.data,
          writable: true,
          configurable: true,
          enumerable: true,
        })
      } else {
        req[target] = result.data
      }
      return next()
    }
    const issues = result.error.issues ?? []
    const errors = Object.fromEntries(
      issues.map((e) => [
        (e.path as (string | number)[]).map(String).join('.') || 'value',
        e.message,
      ]),
    )
    next(new AppError('Validation failed', 422, errors))
  }
