import { CircuitBreaker, CircuitBreakerOpenError, withRetry, withTimeout } from './resilience.js'
import { logger } from './logger.js'
import { AppError } from '../middlewares/error.middleware.js'

// ─── Per-service circuit breaker instances (module singletons) ────────────────

export const brevoBreaker = new CircuitBreaker({
  name: 'Brevo',
  failureThreshold: 3,
  successThreshold: 2,
  halfOpenTimeout: 120_000,
  volumeThreshold: 5,
})

export const cloudinaryBreaker = new CircuitBreaker({
  name: 'Cloudinary',
  failureThreshold: 3,
  successThreshold: 2,
  halfOpenTimeout: 60_000,
  volumeThreshold: 5,
})

export const paystackBreaker = new CircuitBreaker({
  name: 'Paystack',
  failureThreshold: 5,
  successThreshold: 2,
  halfOpenTimeout: 30_000,
  volumeThreshold: 10,
})

// ─── shouldRetry helper ───────────────────────────────────────────────────────

const isRetryableHttpError = (err: unknown): boolean => {
  if (err instanceof Error) {
    if (/4\d\d/.test(err.message) && !/429/.test(err.message)) return false
    return true
  }
  return false
}

// ─── Composed call wrappers ───────────────────────────────────────────────────

const BREVO_TIMEOUT_MS = 15_000
const CLOUDINARY_UPLOAD_TIMEOUT_MS = 60_000
const CLOUDINARY_DELETE_TIMEOUT_MS = 10_000
const PAYSTACK_TIMEOUT_MS = 15_000

export async function callBrevo<T>(fn: () => Promise<T>): Promise<T> {
  try {
    return await brevoBreaker.fire(() =>
      withRetry(() => withTimeout(fn(), BREVO_TIMEOUT_MS, 'Brevo'), {
        maxAttempts: 3,
        initialDelayMs: 1_000,
        maxDelayMs: 8_000,
        factor: 2,
        jitterFactor: 0.3,
        shouldRetry: isRetryableHttpError,
        onRetry: (err, attempt, ms) =>
          logger.warn(`Brevo email retry attempt ${attempt} in ${ms}ms`, {
            error: err instanceof Error ? err.message : err,
          }),
      }),
    )
  } catch (err) {
    if (err instanceof CircuitBreakerOpenError) {
      logger.error('Brevo circuit breaker OPEN — email not sent', { error: err.message })
      return undefined as T
    }
    throw err
  }
}

export async function callCloudinaryUpload<T>(fn: () => Promise<T>): Promise<T> {
  try {
    return await cloudinaryBreaker.fire(() =>
      withRetry(() => withTimeout(fn(), CLOUDINARY_UPLOAD_TIMEOUT_MS, 'Cloudinary upload'), {
        maxAttempts: 2,
        initialDelayMs: 2_000,
        maxDelayMs: 10_000,
        factor: 2,
        jitterFactor: 0.3,
        shouldRetry: isRetryableHttpError,
        onRetry: (err, attempt, ms) =>
          logger.warn(`Cloudinary upload retry attempt ${attempt} in ${ms}ms`, {
            error: err instanceof Error ? err.message : err,
          }),
      }),
    )
  } catch (err) {
    if (err instanceof CircuitBreakerOpenError) {
      throw new AppError('Image service is temporarily unavailable. Please try again shortly.', 503)
    }
    throw err
  }
}

export async function callCloudinaryDelete<T>(fn: () => Promise<T>): Promise<T> {
  try {
    return await cloudinaryBreaker.fire(() =>
      withTimeout(fn(), CLOUDINARY_DELETE_TIMEOUT_MS, 'Cloudinary delete'),
    )
  } catch (err) {
    logger.warn('Cloudinary delete failed (non-fatal)', {
      error: err instanceof Error ? err.message : err,
    })
    return undefined as T
  }
}

export async function callPaystack<T>(fn: () => Promise<T>, operationName = 'Paystack'): Promise<T> {
  try {
    return await paystackBreaker.fire(() =>
      withRetry(() => withTimeout(fn(), PAYSTACK_TIMEOUT_MS, operationName), {
        maxAttempts: 3,
        initialDelayMs: 500,
        maxDelayMs: 5_000,
        factor: 2,
        jitterFactor: 0.3,
        shouldRetry: isRetryableHttpError,
        onRetry: (err, attempt, ms) =>
          logger.warn(`Paystack retry attempt ${attempt} in ${ms}ms`, {
            error: err instanceof Error ? err.message : err,
          }),
      }),
    )
  } catch (err) {
    if (err instanceof CircuitBreakerOpenError) {
      throw new AppError('Payment service is temporarily unavailable. Please try again shortly.', 503)
    }
    throw err
  }
}

// ─── Health / status ──────────────────────────────────────────────────────────

export const getCircuitBreakerStatus = () => [
  brevoBreaker.getStatus(),
  cloudinaryBreaker.getStatus(),
  paystackBreaker.getStatus(),
]
