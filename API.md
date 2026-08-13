# TrusonShopp Platform — API Documentation

## Base URL & Prefix

All REST API endpoints are prefixed with `/api/v1`.

---

## Response Format Standardization

### Success Response

```json
{
  "success": true,
  "data": { ... },
  "pagination": {
    "page": 1,
    "limit": 20,
    "total": 100,
    "pages": 5
  }
}
```

### Error Response

```json
{
  "success": false,
  "message": "Human-readable error explanation",
  "error": {
    "code": "UNAUTHORIZED | VALIDATION_ERROR | NOT_FOUND | SERVER_ERROR",
    "requestId": "uuid"
  }
}
```

---

## API Module Route Summary

| Prefix                    | Description                                | Auth Required  |
| ------------------------- | ------------------------------------------ | -------------- |
| `/api/v1/auth`            | Login, Register, Refresh, Logout, MFA      | Public / User  |
| `/api/v1/profile`         | User Profile, Addresses                    | User           |
| `/api/v1/products`        | Catalog, Search, Categories, Details       | Public / Admin |
| `/api/v1/cart`            | Cart Management                            | User           |
| `/api/v1/checkout`        | Order Checkout & Tax Calculation           | User           |
| `/api/v1/orders`          | Order Lifecycle & History                  | User / Admin   |
| `/api/v1/payment`         | Paystack/Stripe Payment Gateway & Webhooks | User           |
| `/api/v1/seller`          | Seller Onboarding & Dashboard              | Seller         |
| `/api/v1/admin`           | Global Admin Operations                    | Admin          |
| `/api/v1/inventory`       | Multi-Warehouse Stock Management           | Seller / Admin |
| `/api/v1/recommendations` | AI Recommendation Engine                   | Public / User  |
| `/api/v1/shipments`       | Logistics & Carrier Tracking               | User / Admin   |
| `/api/v1/returns`         | Returns, Refunds & Disputes                | User / Admin   |
| `/api/v1/vendors`         | Vendor Approvals & Payouts                 | Vendor / Admin |
| `/api/v1/finance`         | Double-Entry Accounting & Ledger           | Admin          |
| `/api/v1/analytics`       | Business Intelligence Metrics              | Admin          |
| `/api/v1/forecast`        | AI Demand & Sales Forecasting              | Admin          |
| `/api/v1/workflows`       | Automation Engine & BPM                    | Admin          |
| `/api/v1/iam`             | Compliance, Audit & Access Control         | Admin          |
| `/api/v1/developer`       | API Keys, Webhooks, Integrations           | Admin          |
| `/api/v1/event-system`    | Event Bus Explorer, DLQ & Saga Inspector   | Admin          |
| `/api/v1/godmode`         | AI Economic Brain & Civilization Control   | Admin          |
