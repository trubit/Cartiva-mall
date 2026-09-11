# Shipping, Fulfillment & Delivery Service Documentation (Phase 38)

## Overview

The TrusonShopp Mall Shipping & Fulfillment Service manages the physical logistics lifecycle after an order is confirmed. It provides:

1. **Domain Isolation**: Order Service owns order lifecycles and totals, Inventory Service owns physical stock movements, and Shipping/Fulfillment Service owns packages, carrier dispatch, and delivery tracking.
2. **Controlled Fulfillment Lifecycle**: Manages order packing, warehouse routing, and fulfillment status (`PENDING` -> `READY` -> `PROCESSING` -> `PACKED` -> `SHIPPED` -> `DELIVERED`).
3. **Carrier Abstraction Layer**: Standardized carrier integration (`CarrierAdapter`) for DHL, FedEx, UPS, and Local Couriers, generating labels, tracking numbers, and delivery estimates.
4. **Realtime Customer Tracking**: Realtime WebSocket notifications (`shipment:updated`), buyer notifications, and domain event emissions (`shipment.created`, `shipment.updated`, `shipment.delivered`, `shipment.failed`).

---

## Domain Models & Architecture

```
                       API GATEWAY
                            │
                            ▼
              SHIPPING / FULFILLMENT SERVICE
                            │
             ┌──────────────┼──────────────┐
             ▼              ▼              ▼
       Fulfillment DB     Redis        Event Bus
             │                             │
             ▼                             ▼
       Shipment Records             Domain Events
```

### Shipment Lifecycle States

```text
    Fulfillment Ready
           │
           ▼
     LABEL_CREATED ───► READY_FOR_PICKUP ───► PICKED_UP
                                                    │
                                                    ▼
    DELIVERED ◄─── OUT_FOR_DELIVERY ◄─── IN_TRANSIT
        │
        ▼
 (Confirmed Delivery)
```
