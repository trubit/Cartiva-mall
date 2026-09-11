# Recommendation, Personalization & Discovery Intelligence Service

## Architecture Overview

The **Recommendation Service** provides personalized product discovery, candidate generation, candidate ranking, similarity scoring, and fallback recommendations without violating domain boundaries.

```
                         CUSTOMER
                            │
                            ▼
                      API GATEWAY
                            │
                            ▼
              ┌──────────────────────────┐
              │ RECOMMENDATION SERVICE   │
              │                          │
              │ Candidate Generation     │
              │ Filtering                │
              │ Ranking                  │
              │ Personalization          │
              │ Fallbacks                │
              └────────────┬─────────────┘
                           │
            ┌──────────────┼──────────────┐
            ▼              ▼              ▼
         Redis        Feature Data     Analytics
            │              │              │
            └──────────────┼──────────────┘
                           ▲
                           │
                       EVENT BUS
                           ▲
       ┌───────────────────┼─────────────────────┐
       │          │        │        │             │
       ▼          ▼        ▼        ▼             ▼
    Product     Search    Cart     Order       Inventory
    Service     Service   Service  Service      Service
```

---

## Domain Boundaries & Ownership

- **Recommendation Service OWNS**:
  - Behavior event logging (`UserBehavior`)
  - Personalization candidate generation and deterministic ranking algorithms
  - Category and brand affinity scoring
  - Anonymous session tracking (`anonymousSessionId`)
  - Recommendation Redis caching (`rec:*` keys)
  - Recommendation fallbacks (trending/popular)

- **Recommendation Service DOES NOT OWN**:
  - Products (owned by Product Service)
  - Orders & Payments (owned by Order & Payment Services)
  - Inventory Stock (owned by Inventory Service)

---

## API Endpoints

| Method | Endpoint                                               | Access                 | Description                                                                          |
| :----- | :----------------------------------------------------- | :--------------------- | :----------------------------------------------------------------------------------- |
| `GET`  | `/api/v1/recommendations/home`                         | Public / Optional Auth | Returns bundle for homepage (best sellers, new arrivals, personalized for you).      |
| `GET`  | `/api/v1/recommendations/personalized`                 | Authenticated          | Returns personalized recommendations based on category affinity and viewing history. |
| `GET`  | `/api/v1/recommendations/similar/:productId`           | Public                 | Content-based recommendations matching category, brand, and price window.            |
| `GET`  | `/api/v1/recommendations/related/:productId`           | Public                 | Complementary product recommendations.                                               |
| `GET`  | `/api/v1/recommendations/frequently-bought/:productId` | Public                 | Co-purchase aggregation from historical order items.                                 |
| `GET`  | `/api/v1/recommendations/trending`                     | Public                 | 7-day interaction velocity scoring.                                                  |
| `GET`  | `/api/v1/recommendations/popular`                      | Public                 | Highest average rating and view counts.                                              |
| `GET`  | `/api/v1/recommendations/recently-viewed`              | Public / Session       | Redis-backed recent viewing history.                                                 |
| `POST` | `/api/v1/recommendations/behavior`                     | Public / Auth          | Asynchronous interaction event tracking.                                             |

---

## Candidate Ranking & Fallbacks

1. **Filtering Layer**: Removes unpublished (`status != PUBLISHED`), out-of-stock (`stockQuantity <= 0`), or deleted products.
2. **Ranking Layer**: Applies composite scoring based on popularity score, rating score, freshness score, and user category affinity.
3. **Cold-Start Fallback**: New or anonymous users receive high-rated trending/popular products automatically without requiring login.
