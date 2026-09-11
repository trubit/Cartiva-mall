# Product Service Documentation (Phase 31)

## Overview

The **Product Service** is an isolated microservice domain responsible for:

- Product Identity & Metadata (Title, Description, Price, Images, Tags, Attributes, SEO)
- Product Lifecycle State Machine (`DRAFT`, `PENDING_REVIEW`, `APPROVED`, `PUBLISHED`, `REJECTED`, `SUSPENDED`, `ARCHIVED`)
- Visibility Controls (`PUBLIC`, `PRIVATE`, `UNLISTED`, `ARCHIVED`)
- Category Hierarchy (`Category` model with circular relationship prevention)
- Brand System (`Brand` model with slug & logo metadata)
- Variant & SKU Management (`ProductVariant` model with unique SKU enforcement)
- Seller Ownership Authorization & IDOR Protection
- Domain Event Bus Publishing (`product.created`, `product.updated`, `product.published`, `variant.created`, `category.created`, `brand.created`)
- Redis Caching & Invalidation (`product:detail:{id}`, `categories:tree`, `brands:list`)

---

## Domain Architecture

```
Frontend / Clients
       ↓
  API Gateway
       ↓
  Product Service (/api/v1/products)
       ↓
 ┌─────────────┬──────────────┬──────────────────┐
 │             │              │                  │
Category     Brand     ProductVariant        Product
 Model       Model         Model              Model
       ↓       ↓              ↓                  ↓
 └─────────────┴──────────────┴──────────────────┘
                       ↓
                  MongoDB Layer
                       ↓
                   Event Bus
```

---

## API Endpoints

### Public Endpoints

- `GET /api/v1/products` - List products with filter, pagination & search
- `GET /api/v1/products/featured` - List featured products
- `GET /api/v1/products/categories` - Fetch category tree
- `GET /api/v1/products/brands` - Fetch active brands
- `GET /api/v1/products/slug/:slug` - Fetch product by slug
- `GET /api/v1/products/:id` - Fetch product details
- `GET /api/v1/products/:id/variants` - Fetch variants by product

### Seller Endpoints (Requires Auth & Seller/Admin Role)

- `POST /api/v1/products` - Create product
- `PATCH /api/v1/products/:id` - Update product (IDOR protected)
- `DELETE /api/v1/products/:id` - Delete/Archive product
- `POST /api/v1/products/:id/variants` - Add product variant & SKU
- `POST /api/v1/products/:id/submit` - Submit product for admin review
- `POST /api/v1/products/:id/publish` - Publish product

### Admin Endpoints (Requires Auth & Admin Role)

- `POST /api/v1/products/categories` - Create new category
- `POST /api/v1/products/brands` - Create new brand
- `POST /api/v1/products/:id/approve` - Approve submitted product
- `POST /api/v1/products/:id/reject` - Reject product
- `POST /api/v1/products/:id/suspend` - Suspend product
- `POST /api/v1/products/:id/archive` - Archive product
