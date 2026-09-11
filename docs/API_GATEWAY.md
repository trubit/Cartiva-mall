# API Gateway & Inter-Service Communication Documentation (Phase 35 & 36)

## Overview

The TrusonShopp Mall API Gateway provides a hardened, centralized entry point for web, mobile, admin, and seller clients. It enforces:

1. **Controlled Routing & Service Discovery**: Standardized API v1 routes (`/api/v1/products`, `/api/v1/cart`, `/api/v1/orders`, `/api/v1/payment`, `/api/v1/inventory`, `/api/v1/auth`, etc.).
2. **Zero-Trust Identity Propagation**: Strips untrusted client-supplied identity headers (`X-User-Id`, `X-User-Role`, `X-Service-Identity`) and injects verified identity claims after JWT validation.
3. **Traceability & Correlation**: Assigns and propagates `X-Request-ID` and `X-Correlation-ID` headers across all service boundaries, workers, and logs.
4. **Resilience & Fault Tolerance**:
   - Distributed Redis-backed Rate Limiting (`X-RateLimit-Limit`, `X-RateLimit-Remaining`, `X-RateLimit-Reset`).
   - Downstream Circuit Breaker (`CLOSED`, `OPEN`, `HALF_OPEN`) with fast 503 fallback to prevent retry storms.
   - Exponential Backoff & Jitter retry strategy for safe/idempotent GET operations.
5. **Security & Data Integrity**:
   - Dual **Paystack** & **Stripe** raw body webhook verification (`/webhooks/paystack` and `/webhooks/stripe`).
   - Strict JWT claim verification with key rotation support (`JWT_ACCESS_SECRET`, `JWT_PREVIOUS_SECRET`).
   - Rate limit enforcement & security event audit logging (`SecurityEvent` model).

---

## Service Architecture & Route Mappings

```
                         CLIENTS (Web / Mobile / Admin)
                                   │
                                   ▼
                         ┌───────────────────┐
                         │    API GATEWAY    │
                         │                   │
                         │ Auth & Identity   │
                         │ Rate Limiting     │
                         │ Circuit Breaker   │
                         │ Request Tracing   │
                         └─────────┬─────────┘
                                   │
      ┌──────────────┬─────────────┼─────────────┬──────────────┐
      ▼              ▼             ▼             ▼              ▼
   PRODUCT          CART         ORDER        PAYMENT       INVENTORY
   SERVICE        SERVICE       SERVICE       SERVICE        SERVICE
      │              │             │             │              │
      ▼              ▼             ▼             ▼              ▼
  Product DB      Cart DB       Order DB     Payment DB    Inventory DB
                                                 │
                                                 ├────────► PAYSTACK
                                                 └────────► STRIPE
```

### Route Table

| Route Prefix        | Domain Service    | Description                                                   |
| :------------------ | :---------------- | :------------------------------------------------------------ |
| `/api/v1/auth`      | Auth Service      | Customer, Seller, and Admin authentication & token refresh    |
| `/api/v1/products`  | Product Service   | Product catalog, categories, search, recommendations          |
| `/api/v1/cart`      | Cart Service      | Shopping cart state management                                |
| `/api/v1/orders`    | Order Service     | Order creation, listing, status updates, tracking, returns    |
| `/api/v1/payment`   | Payment Service   | Dual Paystack & Stripe intent creation, verification, refunds |
| `/api/v1/inventory` | Inventory Service | Stock management & allocation                                 |
| `/api/v1/seller`    | Seller Hub        | Seller product management, orders, payouts                    |
| `/api/v1/admin`     | Admin Dashboard   | System administration & user management                       |

---

## Health & Readiness Endpoints

- `GET /health`: Liveness probe verifying server process responsiveness.
- `GET /ready`: Readiness probe verifying connectivity to MongoDB, Redis, and internal dependencies.

---

## Security Policies & Error Normalization

### Standardized Error Format

```json
{
  "success": false,
  "message": "Rate limit exceeded. Too many requests.",
  "error": {
    "code": "RATE_LIMIT_EXCEEDED",
    "message": "Rate limit exceeded. Too many requests.",
    "requestId": "e9b23f21-729f-4f81-80a5-812e9b986e10",
    "correlationId": "e9b23f21-729f-4f81-80a5-812e9b986e10",
    "retryAfterSeconds": 60
  }
}
```

### Payment Webhooks Preservation

Both Stripe (`/webhooks/stripe`) and Paystack (`/webhooks/paystack`) webhooks bypass standard JSON body parsing to preserve raw buffer payloads required for HMAC SHA-256 and SHA-512 signature verification.
