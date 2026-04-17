# ADR-004: Transactional Outbox Pattern for Reliable Messaging

**Status:** Accepted
**Date:** 2026-04-02
**Author:** Kishor Dama

## Context

When FactoryConnect processes an order, it must:
1. Write the order to `orders.canonical_orders`
2. Enqueue a message to the buyer's EDI/API endpoint
3. Update the saga state in `workflow.order_sagas`
4. Append an audit entry in `audit.audit_log`

If steps 1–4 are not atomic, partial failures create inconsistencies:
- Order written, but outbound message never sent → buyer never gets the order
- Message sent, but DB write failed → duplicate send on retry
- Saga state not updated → compensating transactions fail silently

The system must also handle cases where the EDI endpoint or buyer API is temporarily unavailable — orders must be queued and retried with backoff without data loss.

## Decision

Implement the **Transactional Outbox Pattern**:

All 4 writes happen in a single PostgreSQL transaction. The outbox table (`workflow.outbox`) acts as the durable message queue. A separate BullMQ poller reads from the outbox and delivers messages, marking them delivered only on success.

```sql
-- All 4 writes in one transaction (pseudocode)
BEGIN;
  INSERT INTO orders.canonical_orders (...) VALUES (...);
  INSERT INTO workflow.outbox (id, aggregate_id, event_type, payload, created_at)
    VALUES ($1, $2, 'ORDER_CREATED', $3, NOW());
  INSERT INTO workflow.order_sagas (order_id, current_step, step_deadline)
    VALUES ($4, 'PENDING_ACK', NOW() + INTERVAL '24 hours');
  INSERT INTO audit.audit_log (actor_id, action, resource_id, hash)
    VALUES ($5, 'ORDER_CREATED', $6, $7);
COMMIT;
```

The outbox poller (BullMQ worker) runs every 5 seconds and processes undelivered messages with exponential backoff (max 3 retries, then dead-letter queue).

## Alternatives Considered

| Approach | Why Rejected |
|----------|-------------|
| **Dual write (DB + queue directly)** | Not atomic — if the queue write fails after the DB write, the message is lost. If DB write fails after queue write, the message is a phantom. |
| **Event sourcing** | Massive complexity increase. FC's workflow is a fixed pipeline, not an arbitrary event stream. |
| **Temporal** | Requires dedicated Temporal cluster (~₹10K+/month). Team would need to learn Temporal's SDK and operational model. Overkill for a fixed-step pipeline. |
| **AWS Step Functions** | Vendor lock-in. Incompatible with OCI deployment strategy. Per-state-transition cost. |
| **Kafka + Debezium CDC** | Kafka cluster cost and operational complexity not justified at current scale. Debezium adds another moving part. |

## Consequences

**Positive:**
- At-most-once delivery per message guaranteed at the DB level.
- Retries are safe — the outbox entry exists until explicitly marked delivered.
- Buyer API being down doesn't lose the order — it waits in the outbox.
- The saga coordinator always has a consistent view of order state.
- Audit log is always complete — no fire-and-forget logging that could be lost.

**Negative:**
- Outbox table grows without cleanup — a background purge job is required (delete delivered rows older than 90 days).
- The poller adds 5-second delivery latency in the steady state (acceptable for EDI workflows).
- Dead-letter queue requires manual intervention to replay — needs an ops dashboard.

## Saga States (15)

`PENDING_ACK` → `ACK_RECEIVED` → `READY_TO_SHIP` → `ASN_SENT` → `SHIPPED` → `INVOICE_SENT` → `INVOICE_PAID` → `COMPLETE`

Plus compensation states: `CANCELLATION_REQUESTED` → `CANCELLATION_CONFIRMED`, and error states: `ACK_REJECTED`, `ASN_REJECTED`, `INVOICE_REJECTED`, `STALLED`, `DEAD_LETTERED`.

## References

- `docs/FC_Architecture_Decisions_History.md` — Decision D3, C1 (outbox SQL), G1 (saga table design), C12 (15 saga states)
- `apps/api/src/workers/outbox-poller.ts` — implementation
- `apps/api/src/services/saga-coordinator.ts` — saga state machine
- `CLAUDE.md` §8 (Key Patterns — Transactional Outbox, Saga Coordinator)
