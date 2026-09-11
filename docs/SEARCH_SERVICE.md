# Search, Discovery & Product Indexing Service Documentation (Phase 40)

## Overview

The TrusonShopp Mall Search & Discovery Service provides full-text product search, faceted filtering, autocomplete suggestions, relevance ranking, and event-driven index synchronization. It guarantees:

1. **Domain Isolation**: Product Service remains the authoritative source of truth for product data, and Inventory Service remains authoritative for stock counts. Search Service strictly owns derived search index documents (`ProductSearchIndex`), query scoring, autocomplete caches, and analytics.
2. **Full-Text & Faceted Search**: Supports compound query matching with filters (`category`, `brand`, `minPrice`, `maxPrice`, `minRating`, `inStockOnly`, `sellerId`) and sorting (`relevance`, `price_asc`, `price_desc`, `rating`, `newest`, `popular`).
3. **Autocomplete & Analytics**: Redis-cached prefix suggestions (`getSuggestions`) and query analytics tracking popular searches & zero-result terms.
4. **Event-Driven Indexing & Rebuilding**: Asynchronous BullMQ worker (`product-indexing-queue`) updating search indexes on product/inventory changes, plus zero-downtime admin reindex API (`POST /api/v1/search/admin/reindex`).

---

## Domain Architecture & Search Flow

```text
                        CLIENT / FRONTEND
                               │
                               ▼
                          API GATEWAY
                               │
                               ▼
                         SEARCH SERVICE
                               │
                ┌──────────────┼──────────────┐
                ▼              ▼              ▼
          Search DB          Redis        Analytics
          (Full-Text)      (Cache)        (Query Stats)
```
