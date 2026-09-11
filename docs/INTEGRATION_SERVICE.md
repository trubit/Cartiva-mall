# Phase 49 — Hyper Ecosystem & Cross-Platform Integration

## 1. Overview & Architecture

Phase 49 establishes the **Hyper Ecosystem & Cross-Platform Integration Layer** for **TrusonShopp Mall**. It provides a secure, versioned, rate-limited, observable, and fault-tolerant integration gateway connecting:

- Internal Truson microservices & future platform products
- External partner systems, third-party logistics & payment providers
- Webhook subscribers & third-party developer applications

```
                          TRUSONSHOPP
                               │
                        API GATEWAY & BUS
                               │
               ┌───────────────┼───────────────┐
               ▼               ▼               ▼
          REST API         EVENT BUS       WEBHOOKS
         (v1/v2 Scopes)   (Event Contracts) (HMAC SHA-256)
               │               │               │
               └───────────────┼───────────────┘
                               ▼
                        ZERO-TRUST LAYER
                        (Rate Limits, CB,
                        Replay Protection)
                               │
               ┌───────────────┼───────────────┐
               ▼               ▼               ▼
            INTERNAL        PARTNERS        EXTERNAL
            SERVICES        SERVICES          APPS
```

---

## 2. Zero-Trust Security & Integration Contracts

### Scopes & Allowed Permissions

All ecosystem requests are bounded to explicit scopes:

- `products:read`, `products:write`
- `orders:read`, `orders:create`
- `inventory:read`, `inventory:write`
- `analytics:read`
- `webhooks:manage`

### Cryptographic Webhook Security

Outbound webhooks feature:

- Cryptographic HMAC-SHA256 signatures (`X-Truson-Signature: v1=<hash>`).
- Timestamp-based replay protection (rejects requests > 5 mins old).
- Exponential backoff retries with jitter & dead-letter queue routing (`dead_letter`).

### Rate Limiting & Circuit Breakers

- Configurable requests per minute rate limits.
- Circuit breaker state transitions (`CLOSED` → `OPEN` → `HALF_OPEN`) preventing failing external services from degrading core marketplace operations.

---

## 3. API Reference

- `GET /api/v1/integrations` — Lists registered ecosystem integrations.
- `POST /api/v1/integrations` — Registers new integration.
- `GET /api/v1/integrations/partners` — Lists partner accounts.
- `POST /api/v1/integrations/partners` — Onboards partner with API key generation.
- `POST /api/v1/integrations/partners/:id/rotate` — Rotates API key secret.
- `GET /api/v1/integrations/webhooks` — Lists registered webhook endpoints.
- `POST /api/v1/integrations/webhooks` — Registers webhook endpoint.
- `POST /api/v1/integrations/webhooks/test` — Dispatches test event with HMAC signature.
- `POST /api/v1/integrations/webhooks/verify` — Verifies HMAC signature & replay timestamp.
- `GET /api/v1/integrations/webhooks/deliveries` — Queries webhook delivery logs.
- `POST /api/v1/integrations/webhooks/deliveries/:id/retry` — Retries dead-letter delivery.
