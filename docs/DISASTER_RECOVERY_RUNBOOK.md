# TrusonShopp Mall — Disaster Recovery & Operational Runbook

## 1. Recovery Point Objective (RPO) & Recovery Time Objective (RTO)

| System Category               | RPO Target    | RTO Target     | Recovery Strategy                                            |
| :---------------------------- | :------------ | :------------- | :----------------------------------------------------------- |
| **Financial & Payment Data**  | `< 1 minute`  | `< 15 minutes` | MongoDB Continuous Oplog Replication & Point-In-Time Restore |
| **Orders & Inventory**        | `< 5 minutes` | `< 30 minutes` | Automated hourly backups + replica set failover              |
| **Product Catalog & Content** | `< 1 hour`    | `< 1 hour`     | Daily snapshot restore + Redis cache repopulation            |
| **Logs & Analytics Data**     | `< 24 hours`  | `< 4 hours`    | Asynchronous log streaming & cold storage restore            |

---

## 2. Disaster Recovery Playbooks

### Playbook A: Primary MongoDB Outage

1. **Symptoms**: API returns HTTP 503 on `/ready`, MongoDB connection error logs in `server/src/database/mongoose.ts`.
2. **Diagnostics**: Run `docker compose exec mongodb mongosh --eval "rs.status()"`.
3. **Mitigation**:
   - Primary election triggers automatically in MongoDB Replica Set within 10–15 seconds.
   - If standalone: restore latest backup using `mongorestore --drop --gzip --archive=/backups/latest.gz`.
4. **Verification**: Verify `/ready` returns HTTP 200 OK with `mongodb: "ok"`.

### Playbook B: Redis Outage or Corruption

1. **Symptoms**: Session velocity degradation, cache miss spikes, rate-limit fallback warnings.
2. **Diagnostics**: Run `redis-cli ping`.
3. **Mitigation**:
   - Restart Redis container: `docker compose restart redis`.
   - Domain services operate in graceful degradation mode (falling back directly to MongoDB for catalog queries).
4. **Verification**: Verify `redis-cli ping` returns `PONG`.

### Playbook C: Third-Party Payment Provider Outage (Paystack/Stripe)

1. **Symptoms**: Payment authorization timeouts, circuit breaker `PaymentGateway` enters `OPEN` state.
2. **Diagnostics**: Inspect circuit breaker status at `/api/v1/admin/readiness`.
3. **Mitigation**:
   - Circuit breaker automatically trips to `OPEN`, preventing request flooding and returning immediate user-friendly fallback messages.
   - Allow half-open probe requests once provider restores service.
4. **Verification**: Verify circuit breaker transitions to `CLOSED` after consecutive probe successes.

---

## 3. Incident Escalation Matrix

| Severity             | Threshold                                                  | Escalation Target            | Response Window       |
| :------------------- | :--------------------------------------------------------- | :--------------------------- | :-------------------- |
| **SEV-1 (Critical)** | Payment/Order failure rate > 5% or total API outage        | SRE Lead & On-Call Architect | Immediate (< 15 mins) |
| **SEV-2 (High)**     | Single microservice degraded or database secondary offline | Senior Backend Engineer      | < 1 hour              |
| **SEV-3 (Moderate)** | Non-critical cache offline, analytics refresh delay        | SRE / DevOps                 | < 4 hours             |
