/* ==========================================================================
   CARTIVA MALL — PRODUCTION SERVICE WORKER
   Version: 1.0.0
   Design Rules:
   - Zero leakage of authenticated, financial, admin, or seller state.
   - Cache-first for static immutable assets & fonts.
   - Network-first with offline fallback for HTML navigations.
   - Stale-while-revalidate for public product catalog reads.
   - Absolute bypass for mutating requests (POST/PUT/PATCH/DELETE) and sensitive APIs.
   ========================================================================== */

const CACHE_VERSION = 'cartiva-v1.0.0';
const STATIC_CACHE = `cartiva-static-${CACHE_VERSION}`;
const DYNAMIC_CACHE = `cartiva-dynamic-${CACHE_VERSION}`;

const PRECACHE_ASSETS = [
  '/',
  '/index.html',
  '/offline.html',
  '/manifest.webmanifest',
  '/favicon.svg',
  '/icons/icon-192.svg',
  '/icons/icon-512.svg',
  '/icons/icon-maskable-512.svg'
];

// Sensitive endpoints that MUST NEVER be stored in the service worker cache
const SENSITIVE_API_PATTERNS = [
  /\/api\/v1\/auth\//i,
  /\/api\/v1\/payment\//i,
  /\/api\/v1\/checkout\//i,
  /\/api\/v1\/order\//i,
  /\/api\/v1\/orders\//i,
  /\/api\/v1\/seller\//i,
  /\/api\/v1\/admin\//i,
  /\/api\/v1\/iam\//i,
  /\/api\/v1\/profile\//i,
  /\/api\/v1\/godmode\//i,
  /\/api\/v1\/messaging\//i,
  /\/api\/v1\/finance\//i,
  /\/api\/v1\/risk\//i,
  /\/webhooks\//i,
  /\/socket\.io\//i
];

/* ─── INSTALL EVENT ────────────────────────────────────────────────────────── */
self.addEventListener('install', (event) => {
  event.waitUntil(
    caches
      .open(STATIC_CACHE)
      .then((cache) => cache.addAll(PRECACHE_ASSETS))
      .then(() => self.skipWaiting())
      .catch((err) => {
        // Precache error should not break service worker registration
        console.warn('[SW] Precache non-fatal error:', err);
      })
  );
});

/* ─── ACTIVATE EVENT (Cache Cleanup) ───────────────────────────────────────── */
self.addEventListener('activate', (event) => {
  const currentCaches = [STATIC_CACHE, DYNAMIC_CACHE];
  event.waitUntil(
    caches
      .keys()
      .then((cacheNames) =>
        Promise.all(
          cacheNames.map((cacheName) => {
            if (!currentCaches.includes(cacheName)) {
              return caches.delete(cacheName);
            }
          })
        )
      )
      .then(() => self.clients.claim())
  );
});

/* ─── FETCH EVENT ──────────────────────────────────────────────────────────── */
self.addEventListener('fetch', (event) => {
  const req = event.request;
  const url = new URL(req.url);

  // 1. Never intercept non-GET requests (mutations, payment submissions, uploads)
  if (req.method !== 'GET') {
    return;
  }

  // 1b. Never intercept local development requests or Vite HMR modules
  if (
    url.hostname === 'localhost' ||
    url.hostname === '127.0.0.1' ||
    url.pathname.includes('/@') ||
    url.pathname.startsWith('/src/') ||
    url.pathname.endsWith('.tsx') ||
    url.pathname.endsWith('.ts') ||
    url.searchParams.has('t')
  ) {
    return;
  }

  // 2. Never intercept chrome-extension or cross-origin third-party auth/payment gateways
  if (url.origin !== self.location.origin) {
    // Only cache static Google Fonts
    if (url.origin === 'https://fonts.googleapis.com' || url.origin === 'https://fonts.gstatic.com') {
      event.respondWith(
        caches.match(req).then((cached) => {
          if (cached) return cached;
          return fetch(req).then((response) => {
            if (response.status === 200) {
              const clone = response.clone();
              caches.open(STATIC_CACHE).then((cache) => cache.put(req, clone));
            }
            return response;
          });
        })
      );
    }
    return;
  }

  // 3. Strict bypass for all sensitive / authenticated / mutating endpoints
  for (const pattern of SENSITIVE_API_PATTERNS) {
    if (pattern.test(url.pathname)) {
      return; // Fall through to standard network fetch — never cache
    }
  }

  // 4. HTML Navigation requests (Page loads, routing) -> Network-first with offline fallback
  if (req.mode === 'navigate') {
    event.respondWith(
      fetch(req)
        .then((response) => {
          if (response.status === 200) {
            const clone = response.clone();
            caches.open(STATIC_CACHE).then((cache) => cache.put(req, clone));
          }
          return response;
        })
        .catch(async () => {
          const cached = await caches.match(req);
          if (cached) return cached;
          const offlineFallback = await caches.match('/offline.html');
          return offlineFallback || new Response('Offline', { status: 503, headers: { 'Content-Type': 'text/plain' } });
        })
    );
    return;
  }

  // 5. Static Assets (CSS, JS, Fonts, Images) -> Cache-first
  const isStaticAsset =
    url.pathname.startsWith('/assets/') ||
    url.pathname.endsWith('.js') ||
    url.pathname.endsWith('.css') ||
    url.pathname.endsWith('.svg') ||
    url.pathname.endsWith('.png') ||
    url.pathname.endsWith('.webp') ||
    url.pathname.endsWith('.woff2');

  if (isStaticAsset) {
    event.respondWith(
      caches.match(req).then((cached) => {
        if (cached) return cached;
        return fetch(req).then((response) => {
          if (response.status === 200) {
            const clone = response.clone();
            caches.open(STATIC_CACHE).then((cache) => cache.put(req, clone));
          }
          return response;
        });
      })
    );
    return;
  }

  // 6. Public Product & Catalog read requests -> Stale-While-Revalidate
  const isPublicCatalog =
    url.pathname.startsWith('/api/v1/products') ||
    url.pathname.startsWith('/api/v1/search') ||
    url.pathname.startsWith('/api/v1/category') ||
    url.pathname.startsWith('/api/v1/brand');

  if (isPublicCatalog) {
    event.respondWith(
      caches.open(DYNAMIC_CACHE).then(async (cache) => {
        const cached = await cache.match(req);
        const fetchPromise = fetch(req)
          .then((networkResponse) => {
            if (networkResponse.status === 200) {
              cache.put(req, networkResponse.clone());
            }
            return networkResponse;
          })
          .catch(() => cached);

        return cached || fetchPromise;
      })
    );
    return;
  }
});
