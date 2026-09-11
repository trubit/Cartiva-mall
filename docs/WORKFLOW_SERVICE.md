# Workflow Orchestration & Business Automation Engine

## Architecture Overview

The **Workflow Orchestration & Business Automation Engine** coordinates multi-step business workflows (`Workflow`), step executions (`WorkflowExecution`), trigger events, action registries, retries, timeouts, human approval states (`WorkflowApproval`), and compensation sagas without replacing core domain microservice owners.

```
                       ┌───────────────┐
                       │  API GATEWAY  │
                       └───────┬───────┘
                               │
                               ▼
                  ┌────────────────────────┐
                  │ AUTOMATION ENGINE       │
                  ├────────────────────────┤
                  │ Trigger Engine          │
                  │ Workflow Engine         │
                  │ Condition Engine        │
                  │ Action Executor          │
                  │ Scheduler               │
                  │ Retry Manager            │
                  │ Compensation Manager     │
                  │ Execution Manager        │
                  └───────────┬────────────┘
                              │
                ┌─────────────┼──────────────┐
                ▼             ▼              ▼
              Redis         MongoDB        BullMQ
                              │
                              ▼
                          EVENT BUS
                              ▲
        ┌────────┬───────────┼──────────┬───────────┐
        ▼        ▼           ▼          ▼           ▼
      Order   Payment     Inventory   Shipping   Notification
      Service  Service     Service     Service     Service
```

---

## Domain Boundaries & Ownership

- **Automation Engine ORCHESTRATES**:
  - Event triggers, step transitions, retries, and action dispatching.
  - Execution tracking (`WorkflowExecution`) and audit logging (`WorkflowAudit`).

- **Automation Engine DOES NOT OWN**:
  - Users, Orders, Payments, Products, Inventory, Reviews, or Risk records. Domain services remain authoritative for their data.

---

## Controlled Workflow & Execution States

- **Workflow States**: `draft`, `active`, `paused`, `disabled`, `archived`
- **Execution States**: `PENDING`, `RUNNING`, `WAITING`, `COMPLETED`, `FAILED`, `CANCELLED`, `COMPENSATING`, `COMPENSATED`, `TIMED_OUT`
