# TrusonShopp Platform — Event System Documentation

## Architecture

TrusonShopp Mall uses an immutable Domain Event Store backed by MongoDB (`DomainEvent`), Redis PubSub, and BullMQ event queues.

---

## Domain Event Schema

Every event published to the Event Bus adheres to the following strict schema:

```json
{
  "eventId": "evt_123456789",
  "eventType": "order.created",
  "eventVersion": 1,
  "aggregateId": "ord_987654321",
  "aggregateType": "Order",
  "timestamp": "2026-08-12T19:00:00.000Z",
  "source": "order-service",
  "correlationId": "corr_abcdef123",
  "causationId": "cmd_checkout_999",
  "payload": {
    "orderId": "ord_987654321",
    "userId": "usr_111",
    "amount": 149.99
  }
}
```

---

## Reliability Controls

1. **Idempotency**: All event consumers check `ProcessedEvent` collection before execution.
2. **Dead-Letter Queue (DLQ)**: Permanently failed jobs after 3 retries are written to `DeadLetterEvent` for replay or discard via the Event Monitor UI.
3. **Saga Orchestration**: Distributed transactions (e.g. `OrderPaymentSaga`) track state in `SagaInstance` and execute compensating actions if a step fails.
4. **God-Mode AI Integration**: The God-Mode AI Economic Brain consumes all domain events to maintain its stability score and trigger real-time market rule adjustments.
