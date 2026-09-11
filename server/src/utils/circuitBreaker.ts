import { getCircuitBreaker, type CircuitState as ResilienceCircuitState } from './resilience.js'

export enum CircuitState {
  CLOSED = 'CLOSED',
  OPEN = 'OPEN',
  HALF_OPEN = 'HALF_OPEN',
}

export function getCircuitState(serviceName: string): ResilienceCircuitState {
  return getCircuitBreaker(serviceName).getState()
}

export function recordSuccess(serviceName: string): void {
  getCircuitBreaker(serviceName).recordManualSuccess()
}

export function recordFailure(serviceName: string): void {
  getCircuitBreaker(serviceName).recordManualFailure()
}

export function resetCircuit(serviceName: string): void {
  getCircuitBreaker(serviceName).reset()
}
