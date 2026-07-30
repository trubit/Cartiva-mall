# CARTIVA — SCALABILITY ISSUES REPORT

Generated: 2026-07-10
Target: Support 300,000+ concurrent users without crashing

This document lists every reason the current codebase will crash, slow down,
or behave incorrectly under high traffic. Issues are grouped by category and
ranked Critical → High → Medium in terms of impact.

──────────────────────────────────────────────────────────────────────────────
SECTION 1 — DATABASE ISSUES
──────────────────────────────────────────────────────────────────────────────

ISSUE 1.1 — MongoDB Connection Pool Too Small (CRITICAL)
File: server/src/database/mongodb.ts
Problem: mongoose.connect() is called with no pool options. The default
maxPoolSize is 5 connections. With 300,000 concurrent users, thousands of
requests queue behind 5 connections. A single slow query holds the entire
queue hostage.
Impact: Server becomes unresponsive under any meaningful load.
Fix: Set maxPoolSize: 100, minPoolSize: 10, socketTimeoutMS: 45000,
connectTimeoutMS: 10000.

ISSUE 1.2 — N+1 Query in Cart Sync (CRITICAL)
File: server/src/modules/cart/cart.service.ts, line 164
Problem: syncCart() loops over guest cart items and calls Product.findOne()
once per item inside the loop. A guest cart with 20 items fires 20
sequential database round trips before sending a single response.
Impact: Login cart merge is 20× slower than necessary. Under load this
compounds into hundreds of queued DB calls.
Fix: Batch all product IDs into one Product.find({ \_id: { $in: ids } }) call.

ISSUE 1.3 — No MongoDB Transaction in Order Creation (CRITICAL)
File: server/src/modules/order/order.service.ts, line 52
Problem: createOrder() performs 7 independent database writes: Stripe
PaymentIntent, Order insert, Order metadata update, Payment record,
Coupon usage increment, Checkout session update, Cart clear. If the
process crashes or the network drops between any two of these writes,
the database is left in a permanently inconsistent state. Examples:

- Order inserted but cart not cleared (duplicate order possible)
- Coupon counter incremented but order not created (coupon wasted)
- Payment record missing but order exists (support nightmare)
  Impact: Data corruption under any failure scenario.
  Fix: Wrap the entire flow in a Mongoose multi-document transaction using
  mongoose.startSession() and session.withTransaction().

ISSUE 1.4 — Brand Filter Does a Full Collection Scan (HIGH)
File: server/src/modules/product/product.service.ts, line 12
Problem: brand filter uses new RegExp(filters.brand, 'i') — a
case-insensitive regex. RegExp queries cannot use a B-tree index.
MongoDB scans every document in the products collection for every
brand-filtered request.
Impact: Product listing performance degrades linearly as catalogue grows.
Fix: Normalize brand to lowercase on write; use exact string equality
on read. Add an index on brand.

ISSUE 1.5 — Sort by Popularity Uses an Unindexed Field (HIGH)
File: server/src/modules/product/product.service.ts, line 35
Problem: sort=popular returns { views: -1 } but the product schema has no
index on views. MongoDB performs a full in-memory sort of the entire
filtered result set on every request.
Impact: Slow "most popular" queries that degrade as product count grows.
Fix: Add productSchema.index({ views: -1 }).

ISSUE 1.6 — Per-Request Write to Increment View Counter (HIGH)
File: server/src/modules/product/product.service.ts, line 77
Problem: Every GET /products/:id runs findOneAndUpdate(..., { $inc: { views: 1 } }).
A popular product under traffic has hundreds of concurrent write operations
on the same document, creating write-lock contention.
Impact: Popular product pages slow down proportionally to traffic.
Fix: Buffer view counts in Redis (INCR) and flush to MongoDB periodically
via a background job.

ISSUE 1.7 — User Document Written on Every Product Page View (HIGH)
File: server/src/modules/dashboard/dashboard.service.ts, line 162
Problem: trackRecentProduct() reads the full user document, modifies the
recentlyViewed array, then saves it back on every product page view for
logged-in users. This is a read+write on the users collection for every
page view.
Impact: The users collection becomes a write bottleneck under traffic.
Fix: Move recently viewed history to a separate collection or use Redis.

ISSUE 1.8 — Unbounded $in Array from Seller Product IDs (HIGH)
File: server/src/modules/order/order.service.ts, line 407
server/src/modules/seller/seller.service.ts, line 60
Problem: Product.find({ sellerId }).distinct('\_id') loads ALL product IDs
for a seller with no limit, then passes the entire array into an $in
filter. A seller with 50,000 products sends a 50,000-element BSON array
on every order list or dashboard load.
Impact: Dashboard and order list pages slow down proportionally to
catalogue size.
Fix: Use a direct $lookup or filter by sellerId on the orders collection
directly instead of materializing all product IDs first.

ISSUE 1.9 — Admin Search Does Full Collection Scan (HIGH)
File: server/src/modules/admin/admin.service.ts, line 134
Problem: listUsers() uses $regex on firstName and lastName with no index.
listAllProducts() uses $regex on title and brand with no dedicated index.
These perform full collection scans on every admin search.
Impact: Admin pages become increasingly unusable as user/product counts grow.
Fix: Add a MongoDB text index for search fields; use $text queries.

ISSUE 1.10 — Admin Aggregations Scan the Entire Orders Collection (HIGH)
File: server/src/modules/admin/admin.service.ts, line 479
Problem: The orderFulfillment aggregation has no $match stage and groups
across the entire orders collection. getStats() fires 10 parallel queries
including Order.aggregate() with no filter.
Impact: These calls consume all MongoDB resources and slow every other query.
Fix: Add date-range $match stages to limit documents scanned. Cache results.

ISSUE 1.11 — No TTL Index on Notifications (MEDIUM)
File: server/src/modules/notification/notification.model.ts
Problem: Notifications are never automatically deleted. A busy user
accumulates thousands of notification documents indefinitely.
Impact: Collection grows without bound, slowing all notification queries.
Fix: Add notificationSchema.index({ createdAt: 1 }, { expireAfterSeconds:
7776000 }) to auto-delete notifications after 90 days.

──────────────────────────────────────────────────────────────────────────────
SECTION 2 — CACHING ISSUES
──────────────────────────────────────────────────────────────────────────────

ISSUE 2.1 — Redis Is Connected But Never Used (CRITICAL)
File: server/src/database/redis.ts
Problem: The ioredis client is initialized and exported, but it is never
imported in any service file. Zero caching occurs anywhere in the
application. Every request hits MongoDB directly, even for data that
never changes (featured products, product detail pages, category lists).
Impact: MongoDB handles 100% of read traffic that could be cached.
Under 300K users, MongoDB is destroyed by read-only traffic.
Fix: Implement a cache utility and add Redis caching to hot endpoints.

ISSUE 2.2 — No Cache on Product Listings or Detail Pages (CRITICAL)
File: server/src/modules/product/product.service.ts
Problem: getProducts(), getProductById(), and getFeaturedProducts() all
hit MongoDB on every request. Featured products are identical for every
user and change only when an admin edits them. Product detail pages
are identical for all users visiting the same product.
Impact: The highest-traffic endpoints generate the most database load.
Fix: Cache getProducts() results for 30 seconds, getFeaturedProducts()
for 5 minutes, getProductById() for 2 minutes, keyed on query parameters.

ISSUE 2.3 — Seller Dashboard Runs 9 Aggregations Per Load, No Cache (HIGH)
File: server/src/modules/seller/seller.service.ts, line 82
Problem: getSellerDashboard() fires 9 parallel MongoDB aggregation pipelines
on every page load. Dashboard stats change at most every few minutes.
Impact: Heavy dashboard users multiply MongoDB load by 9 per visit.
Fix: Cache dashboard data in Redis for 60 seconds per seller ID.

ISSUE 2.4 — Admin Analytics Runs 10+ Aggregations Per Call, No Cache (HIGH)
File: server/src/modules/admin/admin.service.ts, lines 51 and 362
Problem: getStats() fires 10 parallel queries; getPlatformAnalytics() fires
8 cross-collection aggregations. Both are called on every admin page load.
Impact: Admin pages can take down MongoDB for all other users.
Fix: Cache admin stats for 2 minutes; cache platform analytics for 5 minutes.

──────────────────────────────────────────────────────────────────────────────
SECTION 3 — MEMORY ISSUES
──────────────────────────────────────────────────────────────────────────────

ISSUE 3.1 — File Uploads Buffered Entirely in RAM (CRITICAL)
File: server/src/middlewares/upload.middleware.ts, line 8
Problem: multer.memoryStorage() holds every byte of every uploaded file
in the Node.js heap. uploadProductImages allows 8 files × 5 MB = 40 MB
per request. With 50 concurrent uploads, that is 2 GB of heap from
uploads alone, causing Out-Of-Memory crashes.
Impact: Any upload traffic causes OOM and process crashes.
Fix: Switch to multer disk storage using the OS temp directory, then
stream the file to Cloudinary from disk instead of from memory.

ISSUE 3.2 — Socket.IO State Is In-Process Only (CRITICAL)
File: server/src/sockets/index.ts, line 6
Problem: let io: SocketServer | null = null is module-level, single-process
state. No @socket.io/redis-adapter is configured. In any multi-node
deployment (PM2 cluster, Docker Swarm, Kubernetes), emitToUser() only
reaches users connected to the same Node.js process. Users on other
nodes silently miss all real-time notifications.
Impact: Real-time order confirmations and payment notifications fail for
any user on a different process than the one handling their payment.
Fix: Add the @socket.io/redis-adapter with separate pub/sub Redis clients.

──────────────────────────────────────────────────────────────────────────────
SECTION 4 — CONCURRENCY ISSUES
──────────────────────────────────────────────────────────────────────────────

ISSUE 4.1 — Socket Room Join Has No Authentication (CRITICAL)
File: server/src/sockets/index.ts, line 21
Problem: socket.on('join:user', (userId) => { socket.join('user:' + userId) })
The only check is that userId is a 24-character string (a valid ObjectId
format). Any WebSocket client can join any user's private room and receive
all real-time order updates, payment confirmations, and security alerts
for that user.
Impact: Privacy breach. Any user can eavesdrop on any other user's
payment and order events.
Fix: Verify the socket's JWT token before allowing room joins. Compare
the token's userId to the requested room.

ISSUE 4.2 — bcryptjs Runs on the Main Event Loop Thread (HIGH)
File: server/src/modules/user/user.model.ts, line 125
Problem: The bcryptjs package is pure JavaScript and runs on the main
V8 thread (not the libuv thread pool). bcrypt.hash(password, 12) with
cost factor 12 is CPU-intensive. Under concurrent registration or
password-change traffic, bcrypt work blocks request handling.
Impact: High registration traffic stalls all other requests.
Fix: Replace bcryptjs with native bcrypt (which uses the libuv thread pool).

ISSUE 4.3 — Duplicate Order Race Condition (HIGH)
File: server/src/modules/order/order.service.ts, line 57
Problem: Two concurrent requests from the same user can both pass the
checkout session validation check before either has updated the session
status. Both requests then create an order from the same checkout session.
Impact: Users can be charged twice for the same order.
Fix: Use Checkout.findOneAndUpdate({ status: 'pending', ... },
{ $set: { status: 'processing' } }) as an atomic state transition guard
before creating the order.

ISSUE 4.4 — Stripe Refund Has No Idempotency Key (HIGH)
File: server/src/modules/payment/payment.service.ts
Problem: getStripe().refunds.create({ payment_intent, amount }) does not
pass an idempotencyKey. If the network times out and the call is retried,
or if the webhook fires concurrently, a duplicate refund can be issued.
Impact: Users receive double refunds; financial loss.
Fix: Pass idempotencyKey: 'refund-' + orderId to refunds.create().

ISSUE 4.5 — Stripe Webhook Has No Event Deduplication (HIGH)
File: server/src/modules/payment/payment.service.ts, line 30
Problem: Stripe guarantees at-least-once delivery and may send the same
event multiple times. The payment_intent.succeeded handler is partly
protected by a paymentStatus != paid check, but charge.refunded and
payment_intent.processing have no idempotency guard and will re-execute
on retry.
Impact: Duplicate notifications, double status updates, data inconsistency.
Fix: Before processing any webhook event, check if event.id has already
been seen in Redis. Store processed event IDs with a short TTL.

──────────────────────────────────────────────────────────────────────────────
SECTION 5 — RATE LIMITING ISSUES
──────────────────────────────────────────────────────────────────────────────

ISSUE 5.1 — Rate Limiter Counts Per Process, Not Per IP Globally (CRITICAL)
File: server/src/middlewares/rateLimiter.middleware.ts
Problem: express-rate-limit defaults to an in-memory MemoryStore. Each
Node.js process maintains its own counter. With 4 processes (PM2 cluster),
an attacker can make 4 × 200 = 800 requests per 15 minutes while each
process sees only 200. The authLimiter (10/15min) becomes 40 globally.
Impact: Brute-force protection and abuse prevention are completely bypassed
in any multi-process or multi-node deployment.
Fix: Use rate-limit-redis with the existing ioredis client so counters
are shared across all processes and nodes.

ISSUE 5.2 — No Rate Limit on Expensive Search Endpoints (HIGH)
File: server/src/routes/product.routes.ts
Problem: GET /products, GET /products/search, and GET /products/category/:id
are protected only by the global 200-request/15-minute limiter. Each
request triggers a full-text MongoDB search + countDocuments.
Impact: A single user can fire 200 expensive search queries in 15 minutes.
Fix: Add a stricter per-route limiter (30 req/minute) on search endpoints.

ISSUE 5.3 — No Rate Limit on Image Upload Endpoint (HIGH)
File: server/src/routes/product.routes.ts
Problem: POST /products/upload-images accepts 8 × 5MB = 40MB per request
with only the global 200-req/15-min limit. An attacker or misbehaving
client can repeatedly exhaust memory and Cloudinary API quota.
Impact: OOM crashes and Cloudinary quota exhaustion.
Fix: Add a strict per-route limiter (10 req/hour) on upload endpoints.

ISSUE 5.4 — No Rate Limit on Seller/Admin Dashboard Aggregations (HIGH)
File: server/src/routes/seller.routes.ts, server/src/routes/admin.routes.ts
Problem: getSellerDashboard() (9 aggregations) and getPlatformAnalytics()
(8 aggregations) have no per-route rate limit beyond the global 200/15min.
Impact: A few sellers refreshing dashboards repeatedly can overwhelm MongoDB.
Fix: Add a per-route limiter (10 req/minute) on analytics/dashboard routes.

──────────────────────────────────────────────────────────────────────────────
SECTION 6 — CONNECTION ISSUES
──────────────────────────────────────────────────────────────────────────────

ISSUE 6.1 — Redis Permanently Dies After One Reconnect Failure (HIGH)
File: server/src/database/redis.ts, line 11
Problem: retryStrategy: (times) => { if (times >= 1) return null }
After one failed reconnect attempt, ioredis gives up permanently. A brief
Redis blip (restart, network hiccup) causes the Redis client to enter a
dead state for the rest of the process lifetime.
Impact: After any Redis interruption, caching, rate limiting, and socket
pub/sub all stop working until the Node process restarts.
Fix: Implement exponential backoff: return Math.min(times \* 200, 5000)
to retry up to many times with increasing delays.

ISSUE 6.2 — Paystack Creates a New HTTP Client on Every API Call (LOW)
File: server/src/modules/payment/paystack.service.ts, line 14
Problem: function client() { return axios.create(...) } creates a fresh
Axios instance (and HTTP adapter) on every Paystack API call. This
prevents HTTP keep-alive connection reuse.
Impact: Minor: slightly higher latency on Paystack calls.
Fix: Create the Axios instance once at module load.

──────────────────────────────────────────────────────────────────────────────
SECTION 7 — ERROR HANDLING ISSUES
──────────────────────────────────────────────────────────────────────────────

ISSUE 7.1 — No Graceful Shutdown Handler (CRITICAL)
File: server/src/index.ts
Problem: The process has no SIGTERM or SIGINT handler. In Kubernetes, Docker
Swarm, or any container orchestrator, a rolling deploy sends SIGTERM before
killing a container. Without graceful shutdown, all in-flight requests are
abruptly terminated, pending database writes are abandoned, and users see
connection reset errors during every deploy.
Impact: Every deployment causes a brief outage for active users.
Fix: Add process.on('SIGTERM', ...) and process.on('SIGINT', ...) handlers
that call httpServer.close() and drain the MongoDB connection pool.

ISSUE 7.2 — No uncaughtException or unhandledRejection Handlers (CRITICAL)
File: server/src/index.ts
Problem: Node.js 15+ crashes the process on unhandled promise rejections.
There are no process.on('uncaughtException') or process.on('unhandledRejection')
handlers. Errors in async paths outside Express error handler crash the
process silently or with minimal logs.
Impact: Any unexpected async error brings down the entire server.
Fix: Add both handlers to log the error and attempt a graceful exit.

ISSUE 7.3 — Stock Deduction Failure Is Silently Swallowed (HIGH)
File: server/src/modules/payment/payment.service.ts, line 119
server/src/modules/payment/paystack.service.ts, line 143
Problem: Product.bulkWrite(...).catch(err => logger.warn(...)) — if stock
reduction fails (partially or fully), inventory is not decremented but the
order is already confirmed as paid. No retry, no alert, no rollback.
Impact: Inventory overselling. Products appear in stock when they are not.
Fix: Log and alert on stock reduction failure. Add a retry mechanism or
a reconciliation job.

ISSUE 7.4 — Health Endpoint Always Returns OK (HIGH)
File: server/src/app.ts, line 59
Problem: GET /health always returns { success: true } regardless of whether
MongoDB is connected or Redis is available. Load balancers routing to this
endpoint receive 200 OK even when the server cannot serve requests.
Impact: Load balancers keep routing traffic to broken instances.
Fix: Check mongoose.connection.readyState === 1 and optionally ping Redis
before returning success.

──────────────────────────────────────────────────────────────────────────────
SECTION 8 — MISSING INFRASTRUCTURE
──────────────────────────────────────────────────────────────────────────────

ISSUE 8.1 — No Cluster Mode — Single Process on N CPU Cores (CRITICAL)
File: server/src/index.ts, package.json
Problem: The application runs as a single Node.js process. On a 4-core
server, 3 cores are idle. CPU work (bcrypt, aggregation result processing)
blocks the entire server. No PM2 config, no cluster module usage.
Impact: Maximum throughput is limited to a single CPU thread.
Fix: Add a PM2 ecosystem config with cluster mode (instances: max) so
PM2 spawns one process per CPU core.

ISSUE 8.2 — No HTTP Request Timeout (HIGH)
File: server/src/index.ts
Problem: httpServer.timeout is not set. No timeout middleware is configured.
A slow MongoDB aggregation or a hung Stripe/Brevo/Cloudinary API call
holds the HTTP connection open indefinitely, consuming a file descriptor
and a connection pool slot.
Impact: Slow external dependencies cause connection exhaustion.
Fix: Set httpServer.timeout = 30000 (30 seconds).

ISSUE 8.3 — No Response Compression (MEDIUM)
File: server/src/app.ts
Problem: No compression middleware is registered. Large paginated product
listings, analytics responses, and notification arrays are sent as
uncompressed JSON over the wire.
Impact: Higher bandwidth costs, slower responses on slow connections.
Fix: Add the compression npm package as the first middleware.

ISSUE 8.4 — No HTTP Access Logs in Production (MEDIUM)
File: server/src/app.ts, line 56
Problem: if (env.isDev()) app.use(morgan('dev')) — HTTP access logs are
completely absent in production. There is no visibility into request rates,
response times, error status codes, or slow endpoints.
Impact: Cannot diagnose production performance issues or attacks.
Fix: Enable Morgan in production logging to stdout (combined format).

ISSUE 8.5 — Log Files Written to Container Filesystem (MEDIUM)
File: server/src/utils/logger.ts, line 19
Problem: In production, logs are written to logs/error.log and
logs/combined.log on the local filesystem. In containerized environments,
the container filesystem is ephemeral — all logs are lost when the
container restarts.
Impact: Lost audit trail; debugging production issues is impossible.
Fix: Remove file transports in production; write everything to stdout
and let the container runtime (Docker, Kubernetes) collect logs.

ISSUE 8.6 — No Background Job Queue (HIGH)
File: package.json (no Bull/BullMQ dependency)
Problem: Email sending (Brevo/Nodemailer), Cloudinary uploads, and stock
reconciliation all happen synchronously inside the HTTP request/response
cycle. A slow Brevo API call or a large Cloudinary upload delays every
response for that user. There is no queue to distribute work across nodes.
Impact: Slow third-party APIs make the entire API slow. Cannot scale
background work independently of the web layer.
Fix: Add BullMQ (backed by Redis) to queue email and upload jobs.
Process them in a separate worker process.

──────────────────────────────────────────────────────────────────────────────
PRIORITY SUMMARY — WHAT TO FIX FIRST
──────────────────────────────────────────────────────────────────────────────

Rank Issue Category Why it matters

---

1 8.1 Cluster/PM2 Single process wastes N-1 cores entirely
2 3.2 Socket.IO Redis Real-time fails in any multi-process setup
3 5.1 Rate limiter Redis Brute-force protection broken at scale
4 7.1 Graceful shutdown Every deploy drops active requests
5 7.2 uncaughtRejection Any async bug crashes the whole server
6 2.1 Redis caching MongoDB handles 100% of cacheable reads
7 3.1 Multer memory OOM crash under concurrent uploads
8 1.1 MongoDB pool size 5 connections for 300K users is fatal
9 6.1 Redis retry strategy One Redis blip → permanent dead client
10 4.1 Socket auth Privacy breach + security hole
11 1.2 N+1 in syncCart 20 DB calls per login cart merge
12 8.4 HTTP access logs Zero visibility into production traffic
13 8.2 Request timeout Slow deps cause connection exhaustion
14 8.3 Compression Free 70% bandwidth reduction on JSON APIs
15 1.11 Notification TTL Collection grows forever
16 1.5 views index Slow "popular" sort grows with catalogue
17 4.4 Refund idempotency Double refund risk on network retry

──────────────────────────────────────────────────────────────────────────────
END OF REPORT
──────────────────────────────────────────────────────────────────────────────
