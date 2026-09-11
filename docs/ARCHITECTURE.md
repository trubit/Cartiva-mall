# TrusonShopp Platform — Architecture Documentation

## Overview

TrusonShopp Mall is an enterprise multi-vendor e-commerce platform built using Clean Architecture, SOLID design principles, and Event-Driven Architecture.

---

## High-Level System Architecture

```
Frontend (React 19 + Vite + MUI + Zustand + TanStack Query)
       │
       ▼
API Gateway Middleware (Express 5.x)
       │
   ┌───┴───────────────────────────┐
   ▼                               ▼
Authentication / IAM          REST API Routes (28 Modules)
(JWT + MFA + RBAC)                 │
                                   ▼
                        Domain & Application Services
                                   │
       ┌───────────────────────────┼───────────────────────────┐
       ▼                           ▼                           ▼
MongoDB (Mongoose 9.x)       Redis 7.2 (PubSub/Cache)    BullMQ Queue Cluster
                                   │                           │
                                   ▼                           ▼
                           Socket.IO Sockets           Event Bus & Workers
                                   │                           │
                                   └─────────────┬─────────────┘
                                                 ▼
                                        Saga Engine & Workflows
                                                 │
                                                 ▼
                                      God-Mode AI Core (Phase 29)
```

---

## Core Components

### 1. Presentation Layer (Client)

- **Framework**: React 19, TypeScript, Vite
- **UI Libraries**: Material UI v9, Bootstrap 5, React-Bootstrap
- **State Management**: Zustand for global UI/auth state, TanStack Query for server state
- **Real-Time**: Socket.IO client for live notifications and event monitor streaming

### 2. API Gateway & Controller Layer (Server)

- **Framework**: Express 5.x with ES Modules (`type: module`)
- **Middleware**: Rate Limiter (`express-rate-limit` + Redis), Helmet security headers, CORS, Compression, Morgan logging
- **Validation**: Zod schema validation across all API endpoints

### 3. Service & Domain Layer

- **Architecture**: Domain-Driven Design (DDD) with clean separation between Controllers, Services, Repositories, and Models
- **Transaction Management**: Saga Orchestrator for distributed multi-step operations (e.g. OrderPaymentSaga)

### 4. Data Layer

- **Primary Database**: MongoDB 7.0 with Mongoose ORM
- **Cache & Session**: Redis 7.2 with ioredis driver
- **Message Queue**: BullMQ workers for event bus, workflows, IAM compliance, webhooks, and God-Mode AI loop

### 5. God-Mode Commerce Core (Phase 29)

- **Autonomous Civilization Loop**: Real-time 5-phase loop (Observe → Simulate → Decide → Execute → Evolve)
- **Self-Evolving Rules**: Dynamic market rule engine with versioning, confidence scoring, and effectiveness feedback
