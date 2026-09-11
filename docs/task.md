# Microservices Architecture Implementation Plan (Phases 31 - 40)

- [x] **Phase 31: Product Service Isolation & Domain Enrichment** <!-- id: 31 -->
  - [x] Create Category model (`category.model.ts`) with parent-child hierarchy support <!-- id: 31-1 -->
  - [x] Create Brand model (`brand.model.ts`) with slug indexing <!-- id: 31-2 -->
  - [x] Create ProductVariant model (`variant.model.ts`) with unique SKU indexing <!-- id: 31-3 -->
  - [x] Refactor Product model (`product.model.ts`) with lifecycle status enums & SEO fields <!-- id: 31-4 -->
  - [x] Update Product Service & Controller for lifecycle state machine & IDOR protection <!-- id: 31-5 -->
  - [x] Add Domain Event Publishing for Product domain <!-- id: 31-6 -->
  - [x] Document Product Service in `PRODUCT_SERVICE.md` <!-- id: 31-7 -->

- [x] **Phase 32: Cart Service Isolation & Guest Cart Merging** <!-- id: 32 -->
  - [x] Enrich Cart model (`cart.model.ts`) with guest `sessionId` and status machine <!-- id: 32-1 -->
  - [x] Update Cart Service & Controller for live price revalidation & guest cart merging (`/api/v1/cart/merge`) <!-- id: 32-2 -->
  - [x] Add Domain Event Publishing for Cart domain <!-- id: 32-3 -->
  - [x] Document Cart Service in `CART_SERVICE.md` <!-- id: 32-4 -->
  - [x] Create integration test suite `server/src/__tests__/phase31_32.test.ts` <!-- id: 32-5 -->

- [ ] **Phase 33: Order Service Isolation & State Machine** <!-- id: 33 -->
  - [ ] Implement Order state machine (`PENDING`, `PAYMENT_PENDING`, `PAID`, `PROCESSING`, `SHIPPED`, `DELIVERED`, `CANCELLED`, `REFUNDED`)
  - [ ] Implement Order Item snapshotting (protecting historical order pricing)
  - [ ] Add Idempotent Order Creation & Saga transaction event emission
  - [ ] Document Order Service in `ORDER_SERVICE.md`

- [ ] **Phase 34: Payment & Checkout Service Isolation** <!-- id: 34 -->
  - [ ] Implement Multi-Provider Payment Gateway Strategy (Stripe, PayPal, Razorpay)
  - [ ] Webhook signature validation & idempotency registry
  - [ ] Payment state machine & auto-refunds on cancellation
  - [ ] Document Payment Service in `PAYMENT_SERVICE.md`

- [ ] **Phase 35: Identity, Auth & Role-Based Security Service (IAM)** <!-- id: 35 -->
  - [ ] Isolate IAM Service domain
  - [ ] Implement JWT Rotation, Refresh Token Store, & Session Revocation
  - [ ] Multi-Factor Authentication (TOTP) & Fine-Grained RBAC Rules
  - [ ] Document IAM Service in `IAM_SERVICE.md`

- [ ] **Phase 36: Vendor / Seller Service Isolation** <!-- id: 36 -->
  - [ ] Vendor Onboarding workflow (`KYC_PENDING`, `APPROVED`, `SUSPENDED`)
  - [ ] Payout calculations & commission rules engine
  - [ ] Vendor analytics & inventory management isolation
  - [ ] Document Vendor Service in `VENDOR_SERVICE.md`

- [ ] **Phase 37: Logistics, Shipping & Fulfillment Service** <!-- id: 37 -->
  - [ ] Shipping Provider integrations (DHL, FedEx, UPS mockup/drivers)
  - [ ] Tracking Number generator & Webhook status polling
  - [ ] Warehouse location routing logic
  - [ ] Document Shipping Service in `SHIPPING_SERVICE.md`

- [ ] **Phase 38: Notifications & Communication Microservice** <!-- id: 38 -->
  - [ ] Multi-Channel Provider (Email via Nodemailer/SendGrid, SMS via Twilio, Push notifications)
  - [ ] Template engine & Event Bus listener for async dispatching
  - [ ] Document Notification Service in `NOTIFICATION_SERVICE.md`

- [ ] **Phase 39: Analytics, Forecasting & Recommendation Engine** <!-- id: 39 -->
  - [ ] Clickstream & View tracking pipeline
  - [ ] Real-time demand forecasting model
  - [ ] Personalization & product recommendation service
  - [ ] Document Analytics Service in `ANALYTICS_SERVICE.md`

- [ ] **Phase 40: API Gateway & Service Mesh Orchestration** <!-- id: 40 -->
  - [ ] Centralized API Gateway router with Rate Limiting & Auth Delegation
  - [ ] Circuit Breaker pattern with fallback responses
  - [ ] Unified GraphQL / OpenAPI gateway documentation
  - [ ] Document API Gateway in `GATEWAY_SERVICE.md`
