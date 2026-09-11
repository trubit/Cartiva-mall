# Payment Service Documentation (Phase 34)

## Overview

The **Payment Service** is an isolated domain microservice responsible for:

- Dual Payment Provider Integration (**Paystack** and **Stripe**)
- Payment Lifecycle Machine (`PENDING`, `PROCESSING`, `AUTHORIZED`, `CAPTURED`, `COMPLETED`, `FAILED`, `CANCELLED`, `REFUNDED`, `PARTIALLY_REFUNDED`)
- Server-Side Financial Verification: NEVER trusting client-submitted prices, totals, or status flags
- Paystack Transaction Initialization, Verification, HMAC SHA512 Webhook processing (`/webhooks/paystack`), and Refunds
- Stripe PaymentIntent Creation, Confirmation, Signature Webhook processing (`/webhooks/stripe`), and Refunds
- Webhook Deduplication & Idempotency using Redis 48-hour cache keys
- Safe Minor-Unit Calculations & Integer rounding (`Math.round(amount * 100)`)
- Domain Event Bus Publishing (`payment.created`, `payment.authorized`, `payment.captured`, `payment.succeeded`, `payment.failed`, `payment.refunded`)
- Audit Records & Security Logging without sensitive card details, credentials, or keys
- Payment State Reconciliation Helper (`reconcilePaymentState`)

---

## Domain Architecture

```
Frontend / Clients
       ↓
  API Gateway
       ↓
  Payment Service (/api/v1/payment)
       ↓
  ┌──────────────────────────────────────────────────────────┐
  │                Payment Service Domain                    │
  │  - Paystack Provider Integration                         │
  │  - Stripe Provider Integration                           │
  │  - Authoritative Amount Verification against Order DB    │
  │  - Dual Webhook Signature Verifiers & Idempotency        │
  │  - Full & Partial Refund Processing Engine               │
  └────────────────────────────┬─────────────────────────────┘
                               │
       ┌───────────────────────┴───────────────────────┐
       ↓                                               ↓
Paystack API / Webhook                           Stripe API / Webhook
(HMAC SHA512 Signature)                        (HMAC SHA256 Signature)
       │                                               │
       └───────────────────────┬───────────────────────┘
                               ↓
                        MongoDB Layer
                               ↓
                           Event Bus
```

---

## API Endpoints

### Public / Capability Endpoints

- `GET /api/v1/payment/providers` - Fetch supported providers & active payment capabilities

### Protected Customer Endpoints

- `GET /api/v1/payment/history` - Fetch user payment history with pagination
- `GET /api/v1/payment/:id` - Fetch payment details by ID or paymentIntentId
- `POST /api/v1/payment/paystack/initialize` - Initialize Paystack transaction for an order
- `POST /api/v1/payment/paystack/verify` - Verify Paystack payment transaction after popup
- `POST /api/v1/payment/stripe/create-intent` - Create Stripe PaymentIntent for an order
- `POST /api/v1/payment/stripe/confirm` - Confirm Stripe payment after client completion
- `POST /api/v1/payment/refund` - Request full or partial order refund

### Server-to-Server Webhook Endpoints (Unauthenticated, Signature Verified)

- `POST /webhooks/paystack` - Paystack event webhook receiver (raw JSON body)
- `POST /webhooks/stripe` - Stripe event webhook receiver (raw JSON body)
