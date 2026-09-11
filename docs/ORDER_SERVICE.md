# Order Service Documentation (Phase 33)

## Overview

The **Order Service** is an isolated domain microservice responsible for:

- Order Lifecycle State Machine (`PENDING`, `CONFIRMED`, `PROCESSING`, `SHIPPED`, `OUT_FOR_DELIVERY`, `DELIVERED`, `CANCELLED`, `RETURNED`, `REFUNDED`)
- Status Transition Engine with strictly enforced allowed transition rules (`validateStatusTransition`)
- Fulfillment Status Separation (`unfulfilled`, `partially_fulfilled`, `fulfilled`, `cancelled`)
- Immutable Historical Snapshots:
  - Product Snapshot (`productId`, `variantId`, `sku`, `title`, `sellerId`, `selectedAttributes`, `unitPrice`, `currency`)
  - Price Snapshot (`unitPrice`, `quantity`, `lineSubtotal`, `discountAmount`, `taxAmount`, `shippingFee`, `grandTotal`)
  - Address Snapshot (`fullName`, `phone`, `street`, `addressLine2`, `city`, `state`, `postalCode`, `country`, `deliveryInstructions`)
- Multi-Seller Item Boundary & Data Isolation (sellers see only items belonging to their catalog)
- Order Creation Idempotency Key handling (`x-idempotency-key` prevention of duplicate order creation)
- Order History Timeline logging (`history` array containing actor, status, timestamp, reason, correlation ID)
- Domain Event Bus Publishing (`order.created`, `order.confirmed`, `order.processing`, `order.shipped`, `order.delivered`, `order.cancelled`, `order.return_requested`, `order.refunded`)
- Redis Caching & Invalidation (`order:detail:{id}`, `order:number:{orderNumber}`)
- Audit Logging & Reconciliation checks (`reconcileOrderState`)

---

## Domain Architecture

```
Frontend / Clients
       ↓
  API Gateway
       ↓
  Order Service (/api/v1/orders)
       ↓
  ┌──────────────────────────────────────────────────────────┐
  │                 Order Domain Boundary                    │
  │  - Order Creation & Idempotency Key                      │
  │  - Centralized Status Transition Engine                   │
  │  - Immutable Product, Price, Address Snapshots           │
  │  - Multi-Seller Item Isolation Filter                    │
  │  - History Timeline & Audit Logger                       │
  └────────────────────────────┬─────────────────────────────┘
                               │
       ┌───────────────────────┼───────────────────────┐
       ↓                       ↓                       ↓
  Product Service         Cart Service          Payment Service
(Catalog Validation)    (Cart Conversion)     (Status Sync & Saga)
       │                       │                       │
       └───────────────────────┼───────────────────────┘
                               ↓
                        MongoDB Layer
                               ↓
                           Event Bus
```

---

## API Endpoints

### Customer Endpoints

- `GET /api/v1/orders` - List user orders (supports filter, pagination)
- `GET /api/v1/orders/:id` - Fetch single order details
- `GET /api/v1/orders/number/:orderNumber` - Fetch order by human-readable order number
- `GET /api/v1/orders/:id/history` - Fetch order history timeline
- `GET /api/v1/orders/:id/items` - Fetch order item snapshots
- `GET /api/v1/orders/:id/track` - Fetch shipment tracking events
- `POST /api/v1/orders` - Idempotently create order from checkout session
- `POST /api/v1/orders/:id/cancel` / `PUT /api/v1/orders/:id/cancel` - Cancel order with business rule check
- `POST /api/v1/orders/:id/return` - Request return for delivered order

### Seller Endpoints (Requires Auth & Seller/Admin Role)

- `GET /api/v1/orders/seller` - Fetch seller orders (items filtered to seller-owned products only)
- `PATCH /api/v1/orders/:id/status` or `PUT /api/v1/orders/:id/status` - Advance order status (`processing`, `shipped`, `outForDelivery`, `delivered`)

### Admin Endpoints (Requires Auth & Admin Role)

- `GET /api/v1/orders/admin` - Fetch all orders across platform with search & filters
- `PATCH /api/v1/orders/admin/:id/status` - Override order status
- `PUT /api/v1/orders/:id/return/status` - Update return request status & trigger refund flow
