import { logger } from './logger.js'

// ─── Delay ────────────────────────────────────────────────────────────────────

export const delay = (ms: number): Promise<void> =>
  new Promise((resolve) => setTimeout(resolve, ms))

// ─── Jitter ───────────────────────────────────────────────────────────────────
// Spreads retry storms by randomising the base delay ±jitterFactor (0–1).
// e.g. withJitter(1000, 0.25) → anywhere in [750, 1250]

export const withJitter = (ms: number, jitterFactor = 0.25): number => {
  const spread = ms * jitterFactor
  return ms - spread + Math.random() * spread * 2
}

// ─── Timeout ──────────────────────────────────────────────────────────────────
// Races a promise against a deadline. Clears the timer on both win and loss
// so it leaves no dangling handles or unhandled rejections.

export const withTimeout = <T>(promise: Promise<T>, ms: number, name = 'operation'): Promise<T> =>
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

export class TimeoutError extends Error {
  readonly name = 'TimeoutError'
  constructor(message: string) {
    super(message)
  }
}

// ─── Retry with exponential backoff + jitter ──────────────────────────────────
// Formula: delay = min(initialDelayMs × factor^(attempt−1), maxDelayMs) ± jitter
// e.g. attempts 1→2→3 with defaults: ~200ms → ~400ms → ~800ms (±25%)

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
    initialDelayMs = 200,
    maxDelayMs = 10_000,
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

// ─── Circuit Breaker ──────────────────────────────────────────────────────────
// CLOSED  → normal operation; failures counted
// OPEN    → all calls rejected immediately until halfOpenTimeout elapses
// HALF_OPEN → one probe call allowed; success → CLOSED, failure → OPEN again

export class CircuitBreakerOpenError extends Error {
  readonly name = 'CircuitBreakerOpenError'
  constructor(service: string) {
    super(`Circuit breaker [${service}] is OPEN — service unavailable, try again shortly`)
  }
}

export type CircuitState = 'CLOSED' | 'OPEN' | 'HALF_OPEN'

export interface CircuitBreakerOptions {
  name: string
  failureThreshold?: number  // consecutive failures before opening (default 5)
  successThreshold?: number  // successes in HALF_OPEN before closing (default 2)
  halfOpenTimeout?: number   // ms to stay OPEN before allowing a probe (default 60_000)
  volumeThreshold?: number   // minimum calls before the breaker can open (default 10)
}

const STATE_CLOSED = 0
const STATE_OPEN = 1
const STATE_HALF_OPEN = 2

export class CircuitBreaker {
  private state = STATE_CLOSED
  private failures = 0
  private successes = 0
  private totalCalls = 0
  private lastFailureAt = 0
  private readonly opts: Required<CircuitBreakerOptions>

  constructor(opts: CircuitBreakerOptions) {
    this.opts = {
      failureThreshold: 5,
      successThreshold: 2,
      halfOpenTimeout: 60_000,
      volumeThreshold: 10,
      ...opts,
    }
  }

  async fire<T>(fn: () => Promise<T>): Promise<T> {
    if (this.state === STATE_OPEN) {
      const elapsed = Date.now() - this.lastFailureAt
      if (elapsed < this.opts.halfOpenTimeout) {
        throw new CircuitBreakerOpenError(this.opts.name)
      }
      // Timeout elapsed → probe with a single call
      this.state = STATE_HALF_OPEN
      this.successes = 0
    }

    this.totalCalls++
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
    if (this.state === STATE_HALF_OPEN) {
      this.successes++
      if (this.successes >= this.opts.successThreshold) {
        this.state = STATE_CLOSED
        this.totalCalls = 0
        logger.info(`Circuit breaker [${this.opts.name}] CLOSED — service recovered`)
      }
    }
  }

  private recordFailure() {
    this.failures++
    this.lastFailureAt = Date.now()

    if (this.state === STATE_HALF_OPEN) {
      // Probe failed — reopen immediately
      this.state = STATE_OPEN
      logger.warn(`Circuit breaker [${this.opts.name}] OPEN — probe failed, backing off`)
      return
    }

    if (
      this.state === STATE_CLOSED &&
      this.totalCalls >= this.opts.volumeThreshold &&
      this.failures >= this.opts.failureThreshold
    ) {
      this.state = STATE_OPEN
      logger.error(
        `Circuit breaker [${this.opts.name}] OPEN — ${this.failures} failures in ${this.totalCalls} calls`,
      )
    }
  }

  getStatus(): { name: string; state: CircuitState; failures: number; totalCalls: number } {
    const stateMap: Record<number, CircuitState> = {
      [STATE_CLOSED]: 'CLOSED',
      [STATE_OPEN]: 'OPEN',
      [STATE_HALF_OPEN]: 'HALF_OPEN',
    }
    return {
      name: this.opts.name,
      state: stateMap[this.state],
      failures: this.failures,
      totalCalls: this.totalCalls,
    }
  }

  reset() {
    this.state = STATE_CLOSED
    this.failures = 0
    this.successes = 0
    this.totalCalls = 0
    this.lastFailureAt = 0
  }
}
