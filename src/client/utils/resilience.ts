// ─── Client-Side Resilience Utilities ─────────────────────────────────────────
// Provides Delay, Full Jitter, Timeouts, Exponential Backoff Retries, and Circuit Breakers for frontend API operations.

export const delay = (ms: number): Promise<void> =>
  new Promise((resolve) => setTimeout(resolve, ms))

export const withJitter = (ms: number, jitterFactor = 0.25): number => {
  const spread = ms * jitterFactor
  return Math.max(0, ms - spread + Math.random() * spread * 2)
}

export class TimeoutError extends Error {
  readonly name = 'TimeoutError'
  constructor(message: string) {
    super(message)
  }
}

export const withTimeout = <T>(promise: Promise<T>, ms: number, name = 'API request'): Promise<T> =>
  new Promise<T>((resolve, reject) => {
    const timer = setTimeout(() => {
      reject(new TimeoutError(`${name} timed out after ${ms}ms`))
    }, ms)
    promise.then(
      (val) => {
        clearTimeout(timer)
        resolve(val)
      },
      (err: unknown) => {
        clearTimeout(timer)
        reject(err)
      },
    )
  })

export interface RetryOptions {
  maxAttempts?: number
  initialDelayMs?: number
  maxDelayMs?: number
  factor?: number
  jitterFactor?: number
  shouldRetry?: (err: unknown, attempt: number) => boolean
  onRetry?: (err: unknown, attempt: number, nextDelayMs: number) => void
}

export async function withRetry<T>(
  fn: (attempt: number) => Promise<T>,
  options: RetryOptions = {},
): Promise<T> {
  const {
    maxAttempts = 3,
    initialDelayMs = 300,
    maxDelayMs = 5000,
    factor = 2,
    jitterFactor = 0.25,
    shouldRetry = () => true,
    onRetry,
  } = options

  let lastError: unknown

  for (let attempt = 1; attempt <= maxAttempts; attempt++) {
    try {
      return await fn(attempt)
    } catch (err) {
      lastError = err

      const isLast = attempt === maxAttempts
      if (isLast || !shouldRetry(err, attempt)) {
        throw err
      }

      const base = Math.min(initialDelayMs * Math.pow(factor, attempt - 1), maxDelayMs)
      const ms = Math.round(withJitter(base, jitterFactor))
      onRetry?.(err, attempt, ms)
      await delay(ms)
    }
  }

  throw lastError
}

// ─── Client-Side Circuit Breaker ──────────────────────────────────────────────

export class CircuitBreakerOpenError extends Error {
  readonly name = 'CircuitBreakerOpenError'
  constructor(service: string) {
    super(`Service [${service}] is temporarily unavailable. Please try again shortly.`)
  }
}

export type CircuitState = 'CLOSED' | 'OPEN' | 'HALF_OPEN'

export interface ClientCircuitBreakerOptions {
  name: string
  failureThreshold?: number // consecutive failures before opening (default 5)
  successThreshold?: number // successes in HALF_OPEN before closing (default 2)
  halfOpenTimeout?: number // ms to stay OPEN before probe (default 15_000)
}

export class ClientCircuitBreaker {
  private state: CircuitState = 'CLOSED'
  private failures = 0
  private successes = 0
  private lastFailureAt = 0
  private readonly opts: Required<ClientCircuitBreakerOptions>

  constructor(opts: ClientCircuitBreakerOptions) {
    this.opts = {
      failureThreshold: 5,
      successThreshold: 2,
      halfOpenTimeout: 15_000,
      ...opts,
    }
  }

  async fire<T>(fn: () => Promise<T>): Promise<T> {
    if (this.state === 'OPEN') {
      const elapsed = Date.now() - this.lastFailureAt
      if (elapsed < this.opts.halfOpenTimeout) {
        throw new CircuitBreakerOpenError(this.opts.name)
      }
      this.state = 'HALF_OPEN'
      this.successes = 0
    }

    try {
      const result = await fn()
      this.recordSuccess()
      return result
    } catch (err) {
      this.recordFailure()
      throw err
    }
  }

  private recordSuccess() {
    this.failures = 0
    if (this.state === 'HALF_OPEN') {
      this.successes++
      if (this.successes >= this.opts.successThreshold) {
        this.state = 'CLOSED'
      }
    }
  }

  private recordFailure() {
    this.failures++
    this.lastFailureAt = Date.now()

    if (this.state === 'HALF_OPEN') {
      this.state = 'OPEN'
      return
    }

    if (this.state === 'CLOSED' && this.failures >= this.opts.failureThreshold) {
      this.state = 'OPEN'
    }
  }

  getStatus() {
    return {
      name: this.opts.name,
      state: this.state,
      failures: this.failures,
    }
  }
}

export const mainApiCircuitBreaker = new ClientCircuitBreaker({
  name: 'CartivaAPI',
  failureThreshold: 5,
  successThreshold: 2,
  halfOpenTimeout: 15_000,
})
