# CARTIVAL MALL — DEPLOYMENT, ARCHITECTURE & RECURRENCE PREVENTION

## 1. Executive Summary & Verified Root Causes

This document records the definitive root causes of production deployment issues on Render, Redis rate-limiting crashes, component lifecycle races, and CI pipeline failures, along with the permanent fixes implemented and automated regression guards.

---

### Root Cause 1: Homepage Returning HTTP 404 (`NOT_FOUND`)

- **Observed Behavior:** Deployed backend service returned `Endpoint GET / not found` (`code: "NOT_FOUND"`).
- **Verified Root Cause:**
  1. `server/src/app.ts` contained no static file middleware (`express.static`) and no root route handler (`/`), causing all GET requests to `/` to fall through all API routes into the terminal `notFound` middleware.
  2. `render.yaml` configured `cartiva-backend` to run `buildCommand: npm run build:server`, which solely compiled backend TypeScript into `dist/server/server/src/index.js` and never built the Vite React client into `dist/`.
  3. In `vite.config.ts`, `emptyOutDir` was not set to `false`, meaning if `vite build` ran after `tsc`, Vite purged `dist/server/`.
- **Durable Fix:**
  - Configured `vite.config.ts` with `build.emptyOutDir: false`.
  - Updated `package.json` `"build"` script to `"npm run build:client && npm run build:server"`.
  - Configured `render.yaml` backend `buildCommand` to `npm install --include=dev && npm run build`.
  - Configured `server/src/app.ts` with static asset serving (`express.static(dist)`) and an Express 5 compatible SPA catch-all middleware that serves `dist/index.html` for client routes while strictly returning JSON 404 for unknown `/api/*` and `/webhooks/*` endpoints.

---

### Root Cause 2: Redis Rate-Limiter `TypeError: unexpected reply from redis client`

- **Observed Behavior:** Production logs showed:
  ```
  express-rate-limit: async error during store initialization
  TypeError: unexpected reply from redis client
  ```
- **Verified Root Cause:**
  1. `rate-limit-redis` v5 invokes `sendCommand(['SCRIPT', 'LOAD', scriptText])` upon initialization and expects a string SHA response. It enforces:
     ```javascript
     if (typeof result !== 'string') throw new TypeError('unexpected reply from redis client')
     ```
  2. In `server/src/middlewares/rateLimiter.middleware.ts`, `sendCommand` had been wrapped in `.catch(() => null)`.
  3. `server/src/database/redis.ts` had configured `enableOfflineQueue: false` with `lazyConnect: true`. When `rateLimit(...)` initialized before `connectRedis()` was awaited, `client.call('SCRIPT', 'LOAD', ...)` was immediately rejected by `ioredis` because the offline queue was disabled.
  4. The `.catch(() => null)` converted this error into `null`. Because `typeof null !== 'string'`, `rate-limit-redis` threw `TypeError: unexpected reply from redis client`.
  5. The rejected promise was stored in `incrementScriptSha`, causing every subsequent request through the rate limiter to crash with the same `TypeError`.
- **Durable Fix:**
  - Removed `enableOfflineQueue: false` so that commands queued during startup/reconnect are safely buffered.
  - Implemented the standard, validated adapter:
    ```typescript
    sendCommand: (command: string, ...args: string[]) =>
      client.call(command, ...args) as Promise<RedisReply>
    ```
  - Implemented `ResilientRateLimitStore`: uses distributed `RedisStore` across application workers when Redis is ready; falls back gracefully to `MemoryStore` if Redis is offline or experiences transient errors; tracks `rateLimiterStatus.isDegraded = true` for `/ready` status; recovers automatically when Redis connectivity is restored.

---

### Root Cause 3: Component Lifecycle & "Redis not available — cache/socket-adapter layer disabled"

- **Observed Behavior:** Logs showed `Redis connected`, followed immediately by `Redis not available — cache/socket-adapter layer disabled`.
- **Verified Root Cause:**
  1. `server/src/database/redis.ts` unconditionally executed `await redis.connect()`.
  2. Because other subsystems or `ioredis` auto-connection listeners had already transitioned the client status to `'connecting'` or `'ready'`, calling `.connect()` threw `Error: Redis is already connecting/connected`.
  3. The catch block in `connectRedis()` caught this error and logged the misleading warning that the cache/socket-adapter layer was disabled.
- **Durable Fix:**
  - Guarded client connection calls:
    ```typescript
    if (redis.status === 'wait') pending.push(redis.connect())
    if (redisSub.status === 'wait') pending.push(redisSub.connect())
    ```
  - Added clean lifecycle hooks: `isRedisReady()`, `isRedisSubReady()`, and `disconnectRedis()` for graceful shutdown.

---

### Root Cause 4: GitHub Actions `npm ci` Sync Failure

- **Observed Behavior:** CI failed during `npm ci` with lockfile mismatch errors.
- **Verified Root Cause:** Dependencies added to `package.json` without updating the committed `package-lock.json`.
- **Durable Fix:** Synchronized `package-lock.json` via `npm install --package-lock-only` and verified clean `npm ci --dry-run`.

---

## 2. Production Architecture

```
                    ┌──────────────────────────┐
                    │      Client Browser      │
                    └────────────┬─────────────┘
                                 │
                 ┌───────────────┴───────────────┐
                 │                               │
        GET / (Static/SPA)            POST /api/v1/* (REST)
                 │                               │
                 ▼                               ▼
      ┌────────────────────┐          ┌────────────────────┐
      │ Express Static/SPA │          │  API Gateway & RL  │
      │   (dist/index.html)│          │ (ResilientStore)   │
      └────────────────────┘          └─────────┬──────────┘
                                                │
                                    ┌───────────┴───────────┐
                                    ▼                       ▼
                           ┌─────────────────┐    ┌──────────────────┐
                           │   Redis Cloud   │    │  In-Memory Fall- │
                           │  (Distributed)  │    │  back (Degraded) │
                           └─────────────────┘    └──────────────────┘
```

1. **Static Files & SPA Routing:**
   - Client assets (`dist/`) are served directly by Express.
   - Non-API routes serve `dist/index.html` to support client-side routing and browser refresh.
   - If `dist/index.html` is not yet built, `/` returns a JSON operational status (`200 OK`) instead of 404.
2. **API Isolation:**
   - Routes starting with `/api/`, `/webhooks/`, `/health`, and `/ready` are never intercepted by the SPA fallback.
   - Unknown `/api/*` endpoints strictly return structured JSON 404 (`code: "NOT_FOUND"`).
3. **Health & Readiness Endpoints:**
   - `/health`: Liveness probe. Returns HTTP 200 as long as Express is responsive; reports internal status of MongoDB, Redis, and RateLimiter.
   - `/ready`: Readiness probe. Returns HTTP 200 when all required dependencies (MongoDB, Redis, and RateLimiter) are healthy; returns HTTP 503 if any dependency is degraded.

---

## 3. Automated Regression Verification

The following automated test suites prevent regression:

| Test Suite              | File                                                     | Verifications                                                                                                                                                                                                                                                                                                                                     |
| :---------------------- | :------------------------------------------------------- | :------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| **Routing & Homepage**  | `server/src/__tests__/routes/homepageAndRouting.test.ts` | Root `/`, SPA client routes (`/products`), explicit `/health`, `/api/v1/health`, `/ready`, unknown `/api/v1/*` returning JSON 404, POST `/api/v1/*` returning JSON 404.                                                                                                                                                                           |
| **Redis Rate Limiting** | `server/src/__tests__/middleware/rateLimiter.test.ts`    | 1. `createRedisStore` initialization with validated `sendCommand`<br>2. Counter incrementation across multiple requests<br>3. Enforcement of 429 when limits are exceeded<br>4. Fault resilience & memory fallback during Redis errors<br>5. Multi-instance cluster synchronization sharing Redis counters<br>6. Exported rate limiters validity. |

### Running the Regression Tests

```bash
# Server tests including homepage, health, and rate limiter regression suites
npm run test:server -- server/src/__tests__/routes/homepageAndRouting.test.ts server/src/__tests__/middleware/rateLimiter.test.ts

# Client tests
npm run test:client

# Full build verification
npm run build
```

---

## 4. Troubleshooting Guide for Operators

1. **If `/` returns 404:**
   - Check if `dist/index.html` exists in the deployment container.
   - Verify `render.yaml` has `npm run build` (which compiles both client and server).
2. **If rate limiter logs degraded mode:**
   - Check Redis connectivity via `GET /ready` (returns 503 with `rateLimiter: "degraded"`).
   - Verify `REDIS_URL` credentials and TLS configuration.
   - Application remains protected via in-memory rate limiting until Redis reconnects.
3. **If CI fails at `npm ci`:**
   - Run `npm install --package-lock-only` to sync `package-lock.json` with `package.json`.
