# TrusonShopp Mall — Service Dependency Graph & SPOF Audit

## 1. System Architecture Inventory

```
                         CLIENT / FRONTEND (React SPA)
                                      │
                                      ▼
                            API GATEWAY (Express)
                                      │
                   ┌──────────────────┼──────────────────┐
                   ▼                  ▼                  ▼
             Auth Service       Domain Services      AI / Automation
             (JWT Zero-Trust)   (Product, Cart,      (AI BI, Workflow,
                                 Order, Payment,      Self-Optimization)
                                 Inventory, Risk,
                                 Shipping, Review)
                   │                  │                  │
                   └──────────────────┼──────────────────┘
                                      ▼
                      SHARED INFRASTRUCTURE LAYER
                   ┌──────────────────┼──────────────────┐
                   ▼                  ▼                  ▼
                MongoDB             Redis              BullMQ
            (Primary Store)    (Cache/Velocity)     (Async Queues)
```

---

## 2. Microservices Inventory & Event Subscriptions

| Service Name             | Responsibility                                             | Database Ownership               | Incoming APIs                 | Outgoing Events                          | Subscribed Events                                       |
| :----------------------- | :--------------------------------------------------------- | :------------------------------- | :---------------------------- | :--------------------------------------- | :------------------------------------------------------ |
| **API Gateway**          | Request routing, rate limiting, zero-trust auth middleware | None                             | `/api/v1/*`                   | None                                     | None                                                    |
| **Auth & IAM Service**   | User auth, RBAC, JWT, API Key management                   | `User`, `ApiKey`, `Role`         | `/api/v1/auth`, `/api/v1/iam` | `user.registered`, `user.login`          | None                                                    |
| **Product Service**      | Catalog, variants, categorization, stock checks            | `Product`, `Category`            | `/api/v1/products`            | `product.created`, `product.updated`     | `inventory.updated`                                     |
| **Cart Service**         | Cart state, items, guest cart merging                      | `Cart`                           | `/api/v1/cart`                | `cart.updated`, `cart.cleared`           | `order.created`                                         |
| **Order Service**        | Order creation, lifecycle, saga orchestration              | `Order`, `OrderItem`             | `/api/v1/orders`              | `order.created`, `order.completed`       | `payment.authorized`, `shipment.created`                |
| **Payment Service**      | Paystack/Stripe integration, idempotency, refunds          | `Payment`, `Transaction`         | `/api/v1/payment`             | `payment.authorized`, `payment.failed`   | `order.created`                                         |
| **Inventory Service**    | Stock reservation, reorder thresholds                      | `Inventory`                      | `/api/v1/inventory`           | `inventory.reserved`, `inventory.low`    | `order.created`, `order.cancelled`                      |
| **Shipping Service**     | Dispatch, tracking, delivery estimation                    | `Shipment`                       | `/api/v1/shipments`           | `shipment.created`, `shipment.delivered` | `order.paid`                                            |
| **Notification Service** | Multi-channel notifications (email/in-app)                 | `Notification`                   | `/api/v1/notifications`       | `notification.sent`                      | `order.created`, `payment.failed`, `shipment.delivered` |
| **Risk & Fraud Service** | Risk scoring engine, velocity checks, cases                | `RiskCase`, `RiskRule`           | `/api/v1/risk`                | `risk.flagged`, `risk.blocked`           | `order.created`, `payment.failed`                       |
| **AI BI Service**        | Analytics queries, insight generation                      | `AiInsight`, `AiFeedback`        | `/api/v1/ai-bi`               | `ai.insight_created`                     | `order.completed`, `analytics.updated`                  |
| **Workflow Engine**      | Automation step executions, saga retries                   | `Workflow`, `WorkflowExecution`  | `/api/v1/workflows`           | `workflow.started`, `workflow.completed` | `order.created`, `inventory.low`                        |
| **Optimization Engine**  | Operational parameter proposal & safe auto-apply           | `OptimizationTarget`, `Proposal` | `/api/v1/optimization`        | `optimization.applied`                   | `analytics.updated`                                     |

---

## 3. Single Point of Failure (SPOF) Analysis & Mitigations

| SPOF Component               | Risk Level | Single Instance Failure Impact                                    | Production Mitigation Strategy                                                                                  |
| :--------------------------- | :--------- | :---------------------------------------------------------------- | :-------------------------------------------------------------------------------------------------------------- |
| **MongoDB Database**         | `CRITICAL` | Read/Write operations fail across all domain services             | Deploy MongoDB Replica Set (1 Primary + 2 Secondaries) with automatic election and point-in-time oplog backups. |
| **Redis Cache & PubSub**     | `HIGH`     | Cache misses, rate limiter fallback, session velocity degradation | Deploy Redis Sentinel or Redis Cluster with replica nodes and graceful in-memory fallback to database.          |
| **BullMQ Worker Queue**      | `MEDIUM`   | Async jobs (emails, analytics processing) pause                   | Run multiple stateless queue worker instances; jobs persist in Redis until processed.                           |
| **Express API Gateway Node** | `HIGH`     | HTTP traffic unserved                                             | Run multiple API Gateway instances behind Nginx / AWS ALB with health checks (`/ready`).                        |
| **External Payment Gateway** | `CRITICAL` | Third-party API timeout or outage during checkout                 | Enforce 10s timeout, exponential backoff retries with jitter, and circuit breaker (`CLOSED` → `OPEN`).          |
