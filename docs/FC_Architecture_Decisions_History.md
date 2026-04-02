# FactoryConnect — Architecture Decisions History
### Merged from Blueprint v4, v5 (Gemini Review), v6 (ChatGPT Review), v8 FINAL
**Date:** April 2, 2026 | **Author:** Kishor Dama + Claude (Co-Architect)

---

## PURPOSE

This document preserves unique implementation-level details from earlier blueprint versions (v4, v5, v6) that v8 FINAL only summarizes. It serves as a deep reference when implementing specific patterns. v8 remains the single source of truth for architecture decisions; this document is supplementary.

---

## 1. ORIGINAL 10-DECISION FRAMEWORK (from v4)

Each architecture decision was evaluated with **Alternatives Rejected** and **Tradeoffs Accepted** before finalizing.

### D1: EDI Engine — Data-Driven Spec Engine
- **Alternatives Rejected:** Stedi (vendor lock-in, per-transaction cost), custom parser per buyer (N×M problem), EDIFACT-first (Indian buyers don't use it yet)
- **Tradeoffs Accepted:** JSON spec maps require manual creation per buyer (~2 days), but eliminate code changes. Spec validation is runtime-only, no compile-time schema checking.
- **Decision Rationale:** New buyer = 2 days config, not weeks of code. Spec engine is buyer-agnostic — same engine handles X12, cXML, and future EDIFACT.

### D2: AS2 Transport — OpenAS2 Sidecar
- **Alternatives Rejected:** Native Node.js AS2 (no mature library), Mendelson AS2 (GPL license), commercial AS2 gateway (cost)
- **Tradeoffs Accepted:** Java sidecar adds ~200MB memory, requires JVM. But OpenAS2 is battle-tested for S/MIME signing/encryption/MDN — critical for Walmart compliance.
- **Decision Rationale:** AS2 is a solved problem. Don't re-implement cryptographic signing in Node.js when OpenAS2 handles it correctly.

### D3: Workflow — BullMQ + Saga + Outbox (No Temporal)
- **Alternatives Rejected:** Temporal (complex ops, requires dedicated cluster), AWS Step Functions (vendor lock-in), custom event sourcing (complexity vs team size)
- **Tradeoffs Accepted:** Saga coordinator is custom code (~500 lines). No visual workflow editor. But BullMQ is simple, Redis-backed, and the team knows it.
- **Decision Rationale:** FC's workflow is a fixed pipeline (PO→ACK→ASN→Invoice), not dynamic branching. BullMQ + outbox + saga is sufficient and operationally simple.

### D4: Multi-Tenancy — Row-Level Security
- **Alternatives Rejected:** Schema-per-tenant (migration nightmare at 200+ factories), application-level filtering (bug = data leak), separate databases (cost prohibitive)
- **Tradeoffs Accepted:** RLS adds ~5% query overhead. Requires discipline: every query must SET LOCAL tenant. But both Gemini AND ChatGPT independently recommended this approach.
- **Decision Rationale:** Single schema, single migration, mathematically guaranteed isolation. Security is in the database, not the application.

### D5: Buyer Specs — VAN Partnership + Direct Engagement
- **Alternatives Rejected:** Scraping public spec docs (incomplete), buying from third parties (expensive, outdated)
- **Tradeoffs Accepted:** Requires direct relationship with each buyer's EDI team or their VAN. Slower to onboard first buyer, but specs are authoritative.

### D6: AI Mapping — 3-Layer LLM Fallback
- **Alternatives Rejected:** Single LLM (single point of failure), manual-only mapping (slow, not scalable), rule-based auto-mapping (brittle)
- **Tradeoffs Accepted:** Claude API cost (~₹1,500/month), latency for complex mappings. But 87%+ cache hit rate minimizes actual API calls.
- **Decision Rationale:** AI suggests, human confirms. 3 layers ensure mapping never stops: Claude → Gemini/GPT → local model.

### D7: EDIFACT — Deferred to Phase 2
- **Tradeoffs Accepted:** European buyers can't be served until Phase 2. But spec engine architecture already supports EDIFACT maps — zero architecture change when ready.

### D8: Data Deletion — 90-Day Soft-Delete + Legal Hold
- **Alternatives Rejected:** Immediate hard delete (compliance risk), unlimited retention (storage cost), factory-uncontrolled retention (regulatory exposure)
- **Tradeoffs Accepted:** Dual-threshold (days + size) adds complexity. But gives factories control over their data while meeting DPDP Act requirements.

### D9: Infrastructure — OCI Free Tier → Graduated
- **Alternatives Rejected:** AWS from day 1 (₹15K+/month minimum), Hetzner (no India region), self-hosted (ops burden)
- **Tradeoffs Accepted:** OCI free tier has capacity limits. But 4 OCPU + 24GB RAM handles 50 factories easily. Graduation thresholds are pre-defined.
- **Graduation Path:** 0-2 → OCI free | 3 → OCI paid PG+Redis | 50 → full OCI paid | 200+ → evaluate AWS Mumbai

### D10: Source Mode — Agent-Based (Primary)
- **Alternatives Rejected:** Webhook-only (Tally doesn't support webhooks), API-poll-only (requires cloud-accessible endpoint), VPN tunnel (complex for SMEs)
- **Tradeoffs Accepted:** Windows agent adds installation complexity. But adaptive polling + self-healing + auto-upgrade makes it operationally invisible.

---

## 2. GEMINI REVIEW CORRECTIONS (from v5)

Gemini independently reviewed v4 and recommended 5 corrections, all accepted:

### Correction G1: Saga Coordinator Table Design
- **Original:** saga stored in order table as status field
- **Gemini recommendation:** Dedicated `order_sagas` table with: current_step (ENUM of 15 states), step_deadline, locked_by, lock_expires, retry_count, compensation_needed
- **Severity:** HIGH — saga state mixed with business data creates query complexity
- **Resolution:** Adopted. Separate `order_sagas` table with FK to `canonical_orders`

### Correction G2: Adaptive Polling 5-Step Progression
- **Original:** simple high/low polling intervals
- **Gemini recommendation:** 5-step CPU-based progression:
  ```
  CPU < 50%  → 5 min interval
  50-70%     → 10 min interval
  70-85%     → 15 min interval
  >85%       → 30 min interval
  >95%       → PAUSE polling entirely
  ```
- **Severity:** MEDIUM — prevents agent from impacting factory operations
- **Resolution:** Adopted. Added RAM + Tally response latency as additional signals.

### Correction G3: 3-Layer LLM Training Loop
- **Original:** L3 local model mentioned but not detailed
- **Gemini recommendation:** Every L1/L2 call logged with: prompt_hash, full response, model, latency, confidence scores, human_override (if any). This log becomes training data for L3.
- **Severity:** MEDIUM — without logging, L3 can never be trained
- **Resolution:** Adopted. `llm_usage_log` table with all fields. L3 training pipeline is Phase 2.

### Correction G4: Certification Roadmap Timelines + Costs
- **Original:** certifications mentioned without timeline
- **Gemini recommendation:** Specific milestones:
  - Month 0: DPDP + security.txt + privacy policy + StartupIndia DPIIT (₹0)
  - Month 4: VAPT (CERT-In) + GS1 India (₹50K-1L)
  - Month 12: ISO 27001 (₹6L-10L)
  - Month 18: Drummond AS2 certification (₹2L-3L)
  - Year 2+: SOC 2 Type II (₹13L-25L, only when US buyer requires)
- **Resolution:** Adopted exactly as recommended.

### Correction G5: RLS Endorsement
- **Gemini independently confirmed:** RLS is the correct multi-tenancy approach for FC's scale and security requirements. No corrections needed on D4.

---

## 3. CHATGPT REVIEW CORRECTIONS (from v6 — 2 Rounds, 16 Corrections)

### Round 1 (10 Corrections)

#### Correction C1: Transactional Outbox — Full SQL Implementation
```sql
-- Atomic: domain write + outbox event in single transaction
BEGIN;
  INSERT INTO canonical_orders (...) VALUES (...) RETURNING id;
  INSERT INTO outbox (
    aggregate_type, aggregate_id, event_type, payload, created_at
  ) VALUES (
    'ORDER', :order_id, 'ORDER_CONFIRMED', :payload, NOW()
  );
  INSERT INTO order_sagas (order_id, current_step, step_deadline)
  VALUES (:order_id, 'ACK_QUEUED', NOW() + INTERVAL '2 hours');
  INSERT INTO audit_log (action, entity_type, entity_id, new_record, hash)
  VALUES ('CONFIRM', 'ORDER', :order_id, :payload, :computed_hash);
COMMIT;
-- 4 writes in 1 transaction — all succeed or all fail
```
**Key principle:** If domain write succeeds, outbox entry ALWAYS exists. Outbox poller (5s) picks up and dispatches to BullMQ.

#### Correction C2: Circuit Breaker Opossum Parameters
```typescript
const breaker = new CircuitBreaker(sendAS2, {
  timeout: 30000,           // 30s per attempt
  errorThresholdPercentage: 60,  // trip at 60% failure
  resetTimeout: 300000,      // half-open after 5 min
  volumeThreshold: 3,        // minimum 3 requests before tripping
  rollingCountTimeout: 60000, // 1-minute rolling window
  rollingCountBuckets: 6,    // 10-second buckets
});
// Per-connection instance — one buyer down doesn't affect others
```

#### Correction C3: PII Regex Patterns for Pino Interceptor
```typescript
const PII_PATTERNS = [
  { name: 'GSTIN',   regex: /\d{2}[A-Z]{5}\d{4}[A-Z]{1}[A-Z\d]{1}[Z]{1}[A-Z\d]{1}/g },
  { name: 'PAN',     regex: /[A-Z]{5}\d{4}[A-Z]{1}/g },
  { name: 'Phone',   regex: /(\+91|0)?[6-9]\d{9}/g },
  { name: 'Email',   regex: /[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}/g },
  { name: 'Aadhaar', regex: /\d{4}\s?\d{4}\s?\d{4}/g },
  { name: 'Bank',    regex: /\d{9,18}/g },  // Matches account numbers
];
// Applied as Pino transport — ALL log output passes through
// Replacement: "[REDACTED:GSTIN]", "[REDACTED:PAN]", etc.
```

#### Correction C4: Error-Code-Only LLM Interface
- **Original:** vague about what data goes to Claude for diagnostics
- **ChatGPT recommendation:** ONLY send error code + language. Never factory data, never stack traces, never PII.
  ```typescript
  // What goes to Claude:
  { error_code: "FC_ERR_TLS_HANDSHAKE_FAIL", language: "en" }
  // What comes back:
  { summary: "SSL/TLS handshake failed...", steps: ["Check certificate expiry..."] }
  ```
- **Resolution:** Adopted. Zero factory data in any LLM call for diagnostics.

#### Correction C5: Claim Check MinIO Integration
```typescript
// In tunnel message handler:
if (payload.length > CLAIM_CHECK_THRESHOLD) {  // 256KB
  const uri = await minio.putObject('claims', `${messageId}.json`, payload);
  tunnelMessage.payload = null;
  tunnelMessage.claim_uri = uri;
} else {
  tunnelMessage.payload = payload;  // inline for small messages
}
```
**Bridge agent side:** If `claim_uri` present, fetch from MinIO before processing.

#### Correction C6: Field-Level Encryption Data Classification
```
ALWAYS ENCRYPTED (Vault Transit, pii-key):
  - GSTIN number
  - PAN number
  - Bank account number
  - IFSC code
  - Aadhaar number (if ever collected)

NEVER ENCRYPTED (business operational data):
  - Order amounts, quantities, dates
  - Product descriptions, SKUs
  - Buyer/factory names (public business info)
  - Shipping addresses (needed for labels)

CLASSIFICATION RULE: If the field uniquely identifies a person or
enables financial fraud → encrypt. If it's business operational data
visible on invoices/shipping labels → don't encrypt.
```

#### Corrections C7-C10: Additional Clarifications
- **C7:** Webhook HMAC verification must use timing-safe comparison (`crypto.timingSafeEqual`)
- **C8:** Redis connection should use Sentinel for HA in production (Phase 2)
- **C9:** All API responses should include `X-Correlation-ID` header for tracing
- **C10:** Feature flag evaluation order: platform flag first, then factory preference

### Round 2 (6 Corrections)

#### Correction C11: Outbox Poller Idempotency
- Outbox poller must handle duplicate dispatch: BullMQ job ID = outbox entry UUID. If job already exists, skip.

#### Correction C12: Saga Deadline Calculation
- Step deadlines should be calculated from connection-level SLA config, not hardcoded. Each buyer can have different SLA windows.

#### Correction C13: Audit Log Hash Chain Verification
```sql
-- Verify hash chain integrity:
SELECT a.id, a.hash,
  encode(sha256(
    a.action || a.entity_type || a.entity_id::text ||
    a.new_record::text || COALESCE(prev.hash, 'GENESIS')
  ), 'hex') AS computed_hash,
  CASE WHEN a.hash = computed_hash THEN 'VALID' ELSE 'TAMPERED' END
FROM audit_log a
LEFT JOIN audit_log prev ON prev.id = a.id - 1;
```

#### Correction C14: Calendar Holiday Overlap Resolution
- When multiple calendar sources provide conflicting data (e.g., Google says working, factory API says holiday), use priority: manual portal entry > factory API > Google Calendar > iCal > system holidays.

#### Correction C15: Escalation De-duplication
- If factory is already in an active escalation for the same connection, don't start a new one. Update the existing escalation's step instead.

#### Correction C16: Record History Trigger Template
```sql
CREATE OR REPLACE FUNCTION record_history_trigger() RETURNS trigger AS $$
BEGIN
  INSERT INTO record_history (
    table_name, record_id, operation, old_record, new_record,
    changed_by, tenant_id, correlation_id
  ) VALUES (
    TG_TABLE_NAME,
    COALESCE(NEW.id, OLD.id),
    TG_OP,
    CASE WHEN TG_OP IN ('UPDATE','DELETE') THEN row_to_json(OLD) END,
    CASE WHEN TG_OP IN ('INSERT','UPDATE') THEN row_to_json(NEW) END,
    current_setting('app.current_user', true),
    current_setting('app.current_tenant', true),
    current_setting('app.correlation_id', true)
  );
  RETURN COALESCE(NEW, OLD);
END;
$$ LANGUAGE plpgsql;
-- Apply to ALL tenant tables:
-- CREATE TRIGGER trg_history AFTER INSERT OR UPDATE OR DELETE ON <table>
--   FOR EACH ROW EXECUTE FUNCTION record_history_trigger();
```

---

## 4. CROSS-REVIEW CONSENSUS

Both Gemini and ChatGPT independently agreed on:
1. **RLS is correct** for FC's multi-tenancy model
2. **BullMQ + Saga is sufficient** — Temporal is overkill for FC's fixed pipeline
3. **OpenAS2 sidecar is the right call** — don't rewrite AS2 in Node.js
4. **3-Layer LLM with logging** — essential for future L3 training
5. **Feature flags with dual level** (platform + factory) — correct pattern
6. **Immutable audit log with hash chain** — compliance requirement for EDI

---

*This document preserves implementation-level details from the v4→v5→v6 review cycle. For architecture decisions, always refer to v8 FINAL as the single source of truth.*
