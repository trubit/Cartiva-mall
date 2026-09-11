# Inventory & Stock Management Service Documentation (Phase 37)

## Overview

The TrusonShopp Mall Inventory Service provides an authoritative, highly concurrent stock management engine. It guarantees:

1. **Authoritative Stock Boundaries**: Inventory Service strictly owns stock quantities (`availableQuantity`, `reservedQuantity`, `soldQuantity`, `damagedQuantity`), while Product Service owns product metadata.
2. **Atomic Oversell Protection**: Stock reservations use atomic conditional updates (`availableQuantity >= requestedQuantity`), preventing race conditions and negative stock quantities under high concurrency.
3. **Reservation Expiration Lifecycle**: Temporary stock reservations (`ACTIVE` -> `CONFIRMED` / `RELEASED` / `EXPIRED`) with background expiration worker processing.
4. **Append-Only Movement Ledger**: Full audit history tracking stock movements (`in`, `out`, `transfer`, `adjustment`, `reservation`, `release`, `sold`, `damaged`, `returned`).
5. **Event-Driven Architecture**: Emits domain events (`inventory.stock_reserved`, `inventory.stock_released`, `inventory.stock_confirmed`, `inventory.low_stock`, `inventory.out_of_stock`, `inventory.adjusted`, `inventory.reservation_expired`).

---

## Domain Architecture & Flow

```
                      CUSTOMER CHECKOUT
                              │
                              ▼
                        ORDER SERVICE
                              │
                              ▼
                      INVENTORY SERVICE
                              │
               ┌──────────────┼──────────────┐
               ▼              ▼              ▼
         Inventory DB       Redis        Event Bus
               │                             │
               ▼                             ▼
       Inventory Ledger               Domain Events
```

### Stock Reservation Lifecycle

```text
       Order / Checkout
              │
              ▼
   Reserve Stock (Atomic) ──────► ACTIVE Reservation (15 min TTL)
              │                               │
       ┌──────┴──────┐                        │
       ▼             ▼                        ▼
   Payment       Payment              Reservation Expired
   Success       Failure             (Background Worker)
       │             │                        │
       ▼             ▼                        ▼
 Confirm Stock  Release Stock           Release Stock
(reserved->sold) (reserved->available) (reserved->available)
```

---

## State Transition Rules

| Operation                    | Previous State | Target State | Stock Effect                                                  |
| :--------------------------- | :------------- | :----------- | :------------------------------------------------------------ |
| `reserveStock`               | `available`    | `ACTIVE`     | `availableQuantity -= q`, `reservedQuantity += q`             |
| `releaseReservation`         | `ACTIVE`       | `RELEASED`   | `reservedQuantity -= q`, `availableQuantity += q`             |
| `confirmReservation`         | `ACTIVE`       | `CONFIRMED`  | `reservedQuantity -= q`, `quantity -= q`, `soldQuantity += q` |
| `processExpiredReservations` | `ACTIVE`       | `EXPIRED`    | `reservedQuantity -= q`, `availableQuantity += q`             |
