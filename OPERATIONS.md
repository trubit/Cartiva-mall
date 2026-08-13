# TrusonShopp Platform — Operations & SRE Guide

## System Monitoring & Operations

### Health Check Endpoint

- **URL**: `GET /health`
- **Response**: Database connectivity status (MongoDB + Redis)

```json
{
  "success": true,
  "message": "Cartiva API is running",
  "checks": {
    "mongodb": "ok",
    "redis": "ok"
  }
}
```

---

## Background Worker Processes

The backend process automatically initializes 5 BullMQ worker pools with graceful in-process fallbacks:

1. **Workflow Worker**: Executes asynchronous workflow steps.
2. **IAM Worker**: Generates compliance and access audit reports.
3. **Webhook Worker**: Delivers outgoing webhooks to registered third-party endpoints.
4. **EventBus Worker**: Processes domain event subscriptions.
5. **GodMode Worker**: Executes the 30-second Autonomous Civilization Loop.

---

## Log Management

- Structured JSON logging using Winston.
- HTTP access logs using Morgan (`dev` format in local development, `combined` format in production).
- Sensitive headers and credentials sanitized before logging.
