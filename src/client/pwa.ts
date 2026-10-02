/**
 * Cartiva Mall PWA Service Worker Registration
 */

export function registerServiceWorker(): void {
  if (typeof window === 'undefined' || !('serviceWorker' in navigator)) {
    return
  }

  // In development mode, unregister any active service worker and purge caches
  // to ensure Vite HMR and live code changes are immediately visible.
  if (import.meta.env.DEV) {
    navigator.serviceWorker.getRegistrations().then((registrations) => {
      for (const registration of registrations) {
        registration.unregister()
      }
    })
    if ('caches' in window) {
      caches.keys().then((keys) => {
        for (const key of keys) {
          caches.delete(key)
        }
      })
    }
    return
  }

  // Register on window load in production to not compete with critical rendering resources
  window.addEventListener('load', () => {
    navigator.serviceWorker
      .register('/sw.js')
      .then((registration) => {
        // Check for updates periodically
        registration.addEventListener('updatefound', () => {
          const installingWorker = registration.installing
          if (!installingWorker) return

          installingWorker.addEventListener('statechange', () => {
            if (installingWorker.state === 'installed') {
              if (navigator.serviceWorker.controller) {
                // New content available; will be used on next page visit
                console.info('[PWA] New version installed and ready.')
              } else {
                console.info('[PWA] Content cached for offline use.')
              }
            }
          })
        })
      })
      .catch((error) => {
        // Non-fatal — PWA fallback allows app to function as normal SPA
        console.warn('[PWA] Service worker registration failed:', error)
      })
  })
}
