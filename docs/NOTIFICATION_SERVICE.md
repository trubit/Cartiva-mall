# Notification & Communication Service Documentation (Phase 39)

## Overview

The TrusonShopp Mall Notification Service provides a centralized, event-driven communication infrastructure supporting:

1. **Domain Isolation**: Notification Service strictly owns notification records, preferences, templates, device tokens, and delivery history. It does not query Order DB, Payment DB, Inventory DB, or User DB directly.
2. **Channel Abstractions**:
   - **In-App**: Persistent notifications with real-time Socket.IO sync (`notification:new`, `notification:unread_count`).
   - **Email**: `EmailProvider` wrapping Brevo REST API with Ethereal development fallback.
   - **Push**: `PushProvider` wrapping WebPush/FCM adapter with token masking & security.
   - **SMS**: `SMSProvider` wrapping carrier adapter with cost control.
3. **User Preferences**: Users can toggle preferences for order updates, shipping updates, marketing, and payment updates. **Security alerts are protected and cannot be disabled.**
4. **Templates & Injection Protection**: Reusable templates (`NotificationTemplate`) with safe string interpolation (`renderTemplate`) preventing executable code injection.
5. **Deduplication & Queues**: Asynchronous execution via BullMQ (`notification-dispatch-queue`) with exponential backoff, jitter, and idempotency protection.

---

## Architecture & Flow

```text
               DOMAIN SERVICES
                      │
                      ▼
                  EVENT BUS
                      │
                      ▼
            NOTIFICATION SERVICE
                      │
         ┌────────────┼────────────┐
         ▼            ▼            ▼
      In-App        Email         Push
      (Socket)     (Brevo)       (FCM)
```
