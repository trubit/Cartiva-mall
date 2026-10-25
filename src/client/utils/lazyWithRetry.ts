import { lazy, type ComponentType } from 'react'

const CHUNK_RETRY_KEY = 'cv_chunk_retry_timestamp'
const RETRY_WINDOW_MS = 15_000 // Allow one auto-reload every 15 seconds to prevent reload loops

/**
 * Resilient wrapper around React.lazy for dynamic module imports.
 * Automatically recovers from stale chunk errors ("Failed to fetch dynamically imported module"
 * or ChunkLoadError) caused by new server deployments, Vite HMR rebuilds, or temporary connection drops.
 */
export function lazyWithRetry<T extends ComponentType<any>>(
  factory: () => Promise<{ default: T }>,
) {
  return lazy(async () => {
    try {
      return await factory()
    } catch (error: unknown) {
      if (typeof window !== 'undefined') {
        const lastRetryStr = window.sessionStorage.getItem(CHUNK_RETRY_KEY)
        const lastRetry = lastRetryStr ? parseInt(lastRetryStr, 10) : 0
        const now = Date.now()

        // If we haven't auto-reloaded in the last 15s, reload the window to fetch fresh asset manifest
        if (!lastRetry || now - lastRetry > RETRY_WINDOW_MS) {
          window.sessionStorage.setItem(CHUNK_RETRY_KEY, String(now))
          window.location.reload()
          // Return an empty promise while reloading
          return new Promise<{ default: T }>(() => {})
        }
      }

      // If already reloaded recently, bubble the error to RouteErrorBoundary
      throw error
    }
  })
}

export default lazyWithRetry
