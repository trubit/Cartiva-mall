# Cart Service Documentation (Phase 32)

## Overview

The **Cart Service** is an isolated microservice domain responsible for:

- Shopping Cart State & Item Collections (`Cart` model)
- Guest (`sessionId`) & Authenticated (`userId`) Cart Isolation
- Cart Lifecycle Machine (`ACTIVE`, `CHECKOUT_PENDING`, `CONVERTED`, `ABANDONED`, `EXPIRED`)
- Authoritative Price & Purchasable Status Revalidation against Product Service
- Minor-Unit Safe Financial Calculation (`subtotal`, `discountAmount`, `taxAmount`, `shippingCost`, `grandTotal`)
- Guest Cart Merge (`POST /api/v1/cart/merge`) into Authenticated User Cart
- Object-Level Authorization & IDOR Protection
- Domain Event Bus Publishing (`cart.created`, `cart.item_added`, `cart.item_updated`, `cart.item_removed`, `cart.cleared`, `cart.merged`)
- Redis Caching & Invalidation (`cart:user:{userId}`, `cart:session:{sessionId}`)

---

## Domain Architecture

```
Frontend / Clients
       ↓
  API Gateway (with Header / JWT Extraction)
       ↓
  Cart Service (/api/v1/cart)
       ↓
 ┌────────────────────────┐
 │   Cart Domain State    │
 │ (userId / sessionId)   │
 └───────────┬────────────┘
             │ (live price revalidation)
             ↓
     Product Service
             ↓
        Event Bus
```

---

## API Endpoints

### Cart Management

- `GET /api/v1/cart` - Fetch user or guest cart
- `GET /api/v1/cart/count` - Fetch cart item count
- `POST /api/v1/cart/items` or `POST /api/v1/cart/add` - Add item to cart
- `PATCH /api/v1/cart/items/:itemId` or `PUT /api/v1/cart/update/:productId` - Update item quantity
- `DELETE /api/v1/cart/items/:itemId` or `DELETE /api/v1/cart/remove/:productId` - Remove item
- `DELETE /api/v1/cart` or `DELETE /api/v1/cart/clear` - Clear cart
- `POST /api/v1/cart/merge` - Merge guest session cart into authenticated user cart (Requires Auth)
