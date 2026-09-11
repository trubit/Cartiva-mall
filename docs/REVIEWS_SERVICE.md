# Reviews, Ratings & Trust/Reputation Service

## Architecture Overview

The **Reviews, Ratings & Trust/Reputation Service** manages product reviews, customer ratings, verified purchase badges, review content moderation, helpfulness voting, review flagging/reports, and seller trust score calculations (`SellerReputation`).

```
                         CUSTOMER
                            │
                            ▼
                      API GATEWAY
                            │
                            ▼
                REVIEWS & TRUST SERVICE
                            │
       ┌────────────────────┼────────────────────┐
       ▼                    ▼                    ▼
    Reviews              Ratings             Moderation
       │                    │                    │
       └────────────────────┼────────────────────┘
                            │
                         MongoDB
                            │
       ┌────────────────────┼────────────────────┐
       ▼                    ▼                    ▼
     Redis               BullMQ             Analytics
                            ▲
                            │
                        EVENT BUS
                            ▲
          ┌─────────────────┼─────────────────┐
          │                 │                 │
          ▼                 ▼                 ▼
       Product            Order             User
       Service           Service           Service
```

---

## Domain Boundaries & Ownership

- **Reviews Service OWNS**:
  - Review records (`Review`) and review lifecycle states (`PENDING`, `PUBLISHED`, `REJECTED`, `HIDDEN`, `FLAGGED`, `DELETED`)
  - Seller trust scores & reputation metrics (`SellerReputation`)
  - Helpfulness votes (`helpfulVotes`) & Review reports (`ReviewReport`)
  - Content moderation queues & profanity/spam safety checks

- **Reviews Service DOES NOT OWN**:
  - Products (owned by Product Service)
  - Orders & Purchases (owned by Order Service)
  - User Profiles (owned by User Service)

---

## API Endpoints

| Method   | Endpoint                               | Access                | Description                                                                    |
| :------- | :------------------------------------- | :-------------------- | :----------------------------------------------------------------------------- |
| `GET`    | `/api/v1/reviews/product/:id`          | Public                | Returns paginated reviews for a product.                                       |
| `POST`   | `/api/v1/reviews/product/:id`          | Authenticated         | Submits or updates a customer review for a product with purchase verification. |
| `PUT`    | `/api/v1/reviews/:reviewId`            | Authenticated         | Updates an existing review.                                                    |
| `DELETE` | `/api/v1/reviews/:reviewId`            | Auth / Owner or Admin | Deletes a review and recalculates rating aggregates.                           |
| `POST`   | `/api/v1/reviews/:reviewId/vote`       | Authenticated         | Toggles helpfulness vote on a review.                                          |
| `POST`   | `/api/v1/reviews/:reviewId/report`     | Authenticated         | Flags a review for moderation.                                                 |
| `GET`    | `/api/v1/reviews/seller/:sellerId`     | Public                | Returns published customer reviews for a seller.                               |
| `GET`    | `/api/v1/reviews/reputation/:sellerId` | Public                | Returns trust score and rating distribution for a seller.                      |
| `GET`    | `/api/v1/reviews/admin/moderation`     | Admin                 | Returns flagged and pending reviews in the moderation queue.                   |
| `PATCH`  | `/api/v1/reviews/admin/moderation/:id` | Admin                 | Updates moderation status (`PUBLISHED`, `REJECTED`, `HIDDEN`, `DELETED`).      |

---

## Verified Purchase & Trust Score Calculation

1. **Purchase Verification**: When a customer submits a review, the backend queries the `Order` repository for completed orders containing the product. If found, `isVerified` is set to `true`.
2. **Automated Content Moderation**: Reviews containing promotional spam links or forbidden keywords are automatically marked `FLAGGED` or `PENDING` for human moderator review.
3. **Seller Trust Score Formula**:
   $$\text{TrustScore} = \min\left(100, \max\left(0, \text{Round}(\text{AvgRating} \times 20)\right)\right)$$
