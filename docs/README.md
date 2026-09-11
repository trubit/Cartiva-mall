# CARTIVA MALL — TECHNICAL DOCUMENTATION REPOSITORY

Welcome to the comprehensive technical documentation for **Cartiva Mall (truson-shopping-mail)**. This directory contains detailed specifications, architecture diagrams, microservice runbooks, API contracts, and certification reports.

---

## Table of Contents

### 1. System Architecture & Standards

- [ARCHITECTURE.md](ARCHITECTURE.md) — Overall multi-tier system architecture and patterns.
- [API_GATEWAY.md](API_GATEWAY.md) — API Gateway, routing, rate limiting, and middleware layer.
- [API.md](API.md) — API endpoint specifications and contracts.
- [SERVICE_DEPENDENCY_GRAPH.md](SERVICE_DEPENDENCY_GRAPH.md) — Topological service dependencies and call graphs.
- [EVENTS.md](EVENTS.md) — Event-driven messaging schemas and Redis EventBus architecture.
- [WORKFLOWS.md](WORKFLOWS.md) — End-to-end transactional workflows and state machines.
- [ENVIRONMENT.md](ENVIRONMENT.md) — Environment variable specifications and configuration.
- [SECURITY.md](SECURITY.md) — Application security, JWT authentication, and fraud guardrails.

---

### 2. Microservice Specifications & Guides

- [AUTH & USER](SECURITY.md) — Authentication, OTP verification, and RBAC authorization.
- [CART_SERVICE.md](CART_SERVICE.md) — Guest & authenticated cart synchronization and price locking.
- [ORDER_SERVICE.md](ORDER_SERVICE.md) — Order lifecycle, state transitions, and cancellation flows.
- [PAYMENT_SERVICE.md](PAYMENT_SERVICE.md) — Paystack & Stripe gateway processing, webhook verification, and multi-seller splits.
- [PRODUCT_SERVICE.md](PRODUCT_SERVICE.md) — Catalog management, categories, brands, variants, and stock.
- [INVENTORY_SERVICE.md](INVENTORY_SERVICE.md) — Atomic inventory reservations, concurrency locking, and stock expiration queues.
- [SHIPPING_SERVICE.md](SHIPPING_SERVICE.md) — Admin fixed & tiered shipping calculations, carrier adapters, and tracking.
- [REVIEWS_SERVICE.md](REVIEWS_SERVICE.md) — Customer reviews, seller reputation scoring, and moderation.
- [SEARCH_SERVICE.md](SEARCH_SERVICE.md) — Search indexing, faceted filtering, and search analytics.
- [RECOMMENDATION_SERVICE.md](RECOMMENDATION_SERVICE.md) — Recommendation engines and personalized product suggestions.
- [NOTIFICATION_SERVICE.md](NOTIFICATION_SERVICE.md) — In-app alerts, email notifications (Brevo), and push preferences.
- [AI_BI_SERVICE.md](AI_BI_SERVICE.md) — Business intelligence dashboards and AI metrics processing.
- [RISK_SERVICE.md](RISK_SERVICE.md) — Real-time fraud detection, velocity checks, and risk scoring.
- [AUTONOMY_SERVICE.md](AUTONOMY_SERVICE.md) — Autonomous system guardrails and background workers.
- [OPTIMIZATION_SERVICE.md](OPTIMIZATION_SERVICE.md) — System performance optimizations and resource monitoring.
- [INTEGRATION_SERVICE.md](INTEGRATION_SERVICE.md) — Third-party webhooks, external developer APIs, and integrations.
- [WORKFLOW_SERVICE.md](WORKFLOW_SERVICE.md) — Saga orchestrator for distributed cross-service transactions.

---

### 3. Operations, Testing & Disaster Recovery

- [OPERATIONS.md](OPERATIONS.md) — Production operations, service health checks, and process management.
- [TESTING.md](TESTING.md) — Automated test suites, unit testing, integration testing, and E2E specs.
- [DISASTER_RECOVERY_RUNBOOK.md](DISASTER_RECOVERY_RUNBOOK.md) — Disaster recovery procedures, failover, backup, and restore runbooks.

---

### 4. Audit & Validation Reports

- [PHASE_30_AUDIT_REPORT.md](PHASE_30_AUDIT_REPORT.md) — Phase 30 comprehensive system audit.
- [PHASE_50_VALIDATION_REPORT.md](PHASE_50_VALIDATION_REPORT.md) — Phase 50 full-system concurrency, multi-tenant isolation & scale benchmark report.
- [PHASE_51_FINAL_AUDIT_REPORT.md](PHASE_51_FINAL_AUDIT_REPORT.md) — Phase 51 pre-deployment certification report.
- [SCALABILITY_REPORT.md](SCALABILITY_REPORT.md) — Production scale benchmarks and resilience report.
