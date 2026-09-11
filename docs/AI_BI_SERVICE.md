# AI-Powered Business Intelligence & Decision Support Service

## Architecture Overview

The **AI Business Intelligence & Decision Support Service** provides natural-language analytics querying, automated marketplace insight generation (`AiInsight`), anomaly analysis, executive summaries, confidence metrics, and user feedback tracking (`AiFeedback`) without rewriting or violating core domain boundaries.

```
                       ADMIN / SELLER
                              │
                              ▼
                         API GATEWAY
                              │
                              ▼
                  AI INTELLIGENCE SERVICE
                              │
          ┌───────────────────┼────────────────────┐
          ▼                   ▼                    ▼
   Analytics Engine      Insight Engine       AI Gateway
          │                   │                    │
          ▼                   ▼                    ▼
    Data Aggregation      Rules/Models        LLM Provider
          │                   │                    │
          └───────────────────┼────────────────────┘
                              │
                        Insight Store
                              │
                     ┌────────┴────────┐
                     ▼                 ▼
                   Redis             Queue

                              ▲
                              │
                          EVENT BUS
                              ▲
        ┌─────────┬───────────┼──────────┬───────────┐
        ▼         ▼           ▼          ▼           ▼
      Order    Payment     Product    Inventory    Reviews
      Service  Service     Service    Service      Service
```

---

## Domain Boundaries & Ownership

- **AI Intelligence Service OWNS**:
  - Derived AI insights & recommendations (`AiInsight`)
  - Natural-language query interface (`queryAnalytics`)
  - Insight status tracking & feedback (`AiFeedback`)

- **AI IS NOT THE SOURCE OF TRUTH**:
  - Orders, Payments, Inventory, User Identity, and Financial balances remain strictly owned by their respective microservices.
  - AI outputs are derived decision-support recommendations only.
