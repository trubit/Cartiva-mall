import {
  getCircuitBreaker,
  withRetry,
  withTimeout,
  CircuitBreakerOpenError,
  TimeoutError,
} from './resilience.js'
import { AppError } from '../middlewares/error.middleware.js'
import { logger } from './logger.js'

export interface GatewayClientOptions {
  serviceName: string
  timeoutMs?: number
  retries?: number
  isMutating?: boolean
}

export async function executeWithResilience<T>(
  action: () => Promise<T>,
  options: GatewayClientOptions,
): Promise<T> {
  const { serviceName, timeoutMs = 5000, retries = 0, isMutating = false } = options
  const breaker = getCircuitBreaker(serviceName)

  if (breaker.isOpen()) {
    throw new AppError(
      `Downstream service '${serviceName}' is currently unavailable (circuit open)`,
      503,
    )
  }

  const maxAttempts = isMutating ? 1 : Math.max(1, retries + 1)

  try {
    return await breaker.fire(() =>
      withRetry(() => withTimeout(action(), timeoutMs, `Service '${serviceName}'`), {
        maxAttempts,
        initialDelayMs: 100,
        maxDelayMs: 2_000,
        factor: 2,
        jitterFactor: 0.25,
        onRetry: (err, attempt, nextDelayMs) => {
          logger.warn(
            `Gateway retry attempt ${attempt} for service '${serviceName}' in ${nextDelayMs}ms`,
            { error: err instanceof Error ? err.message : err },
          )
        },
      }),
    )
  } catch (err) {
    if (err instanceof CircuitBreakerOpenError) {
      throw new AppError(
        `Downstream service '${serviceName}' is currently unavailable (circuit open)`,
        503,
      )
    }
    if (err instanceof TimeoutError) {
      throw new AppError(`Gateway timeout calling service '${serviceName}'`, 504)
    }
    if (err instanceof AppError) {
      throw err
    }
    throw new AppError(
      `Service '${serviceName}' request failed: ${err instanceof Error ? err.message : String(err)}`,
      502,
    )
  }
}
