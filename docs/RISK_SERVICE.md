# Fraud Detection, Risk & Trust Intelligence Service

## Architecture Overview

The **Risk Service** provides transaction risk assessment, velocity checks, normalized risk scoring (`0–100`), decision policy execution (`ALLOW`, `REVIEW`, `STEP_UP`, `RESTRICT`, `BLOCK`), fraud case management (`RiskCase`), and customer appeal workflows without becoming a single point of failure.

```
                         CUSTOMER
                            │
                            ▼
                      API GATEWAY
                            │
                            ▼
                      RISK SERVICE
                            │
        ┌───────────────────┼────────────────────┐
        ▼                   ▼                    ▼
   Risk Engine         Case Manager         Risk Analytics
        │                   │                    │
        ▼                   ▼                    ▼
     Rules              Manual Review         Metrics
        │
        ▼
   Risk Signals
        │
        ▼
     Redis/DB
        ▲
        │
     EVENT BUS
        ▲
        │
 ┌──────┼─────────┬──────────┬──────────┬────────────┐
 ▼      ▼         ▼          ▼          ▼            ▼
User  Payment    Order    Reviews   Inventory    Shipping
```

---

## Domain Boundaries & Ownership

- **Risk Service OWNS**:
  - Risk assessment & scoring pipelines (`evaluateRisk`)
  - Velocity counter logic (payment failures, rapid ordering, review spikes)
  - Fraud cases (`RiskCase`) and audit trails (`RiskAudit`)
  - Customer appeals (`submitCustomerAppeal`)

- **Risk Service DOES NOT OWN**:
  - Users, Orders, Payments, Products, Reviews, or Inventory. Those remain authoritative in their respective domain microservices.

---

## Controlled Risk Levels & Decisions

| Risk Score   | Risk Level | Decision Policy      | Actions / Escalation                                                           |
| :----------- | :--------- | :------------------- | :----------------------------------------------------------------------------- |
| **0 – 30**   | `LOW`      | `ALLOW`              | Standard traffic permitted without intervention.                               |
| **31 – 60**  | `MEDIUM`   | `REVIEW`             | Flagged for async review; transaction proceeds.                                |
| **61 – 85**  | `HIGH`     | `STEP_UP`            | Requires step-up verification (e.g. re-authentication). Case opened.           |
| **86 – 100** | `CRITICAL` | `RESTRICT` / `BLOCK` | High risk action restricted. Mandatory admin review & customer appeal enabled. |

---

## Fail-Safe Resilience & Fail-Open Fallback

If Redis or Database infrastructure encounters temporary degradation during an API assessment, the Risk Service executes a **controlled fail-open fallback** (`ALLOW` decision with reason `FAIL_OPEN_FALLBACK`). Legitimate customer transactions and checkouts are never blocked due to risk service outages.
