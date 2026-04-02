# FactoryConnect — Sales Order Connector: Complete Design Document
### Phase 1: Gold Standard Connector (All Future Connectors Replicate This)
**Version:** 2.0 (Enhanced with AI Mapping Studio, Transform Rules, Sandbox, Catalog)
**Date:** April 2, 2026 | **Author:** Kishor Dama + Claude (Co-Architect)
**Source:** Blueprint v8.0 FINAL + Development Plan Enhancements

---

## 1. CONNECTOR OVERVIEW

The Sales Order Connector is the FIRST and gold-standard connector for FactoryConnect. It handles the complete order-to-cash cycle between Indian SME factories and global buyers.

**Supported Flows:**
- Outbound: PO Acknowledgment (EDI 855), ASN (EDI 856), Invoice (EDI 810)
- Inbound: Purchase Order (EDI 850) from buyer → factory ERP
- Future: PO Change (860), Returns, Credit Memo (replicate same patterns)

**Supported Sources (Factory ERPs):**
- Tally Prime (via Bridge Agent adaptive polling)
- Zoho Books (via webhook with HMAC verification)
- SAP Business One (via REST API, Phase 2)
- Generic REST (direct CanonicalOrder JSON submission)
- Manual Entry (via FC Portal — Type 3 factories)

**Supported Targets (Buyer Systems):**
- Walmart (EDI X12 via AS2)
- SAP Ariba (cXML via HTTPS, Phase 2)
- Coupa (REST API, Phase 2)
- Generic EDI (configurable spec maps)

---

## 2. DATA MODEL — Canonical Order

All source formats normalize to a single canonical model before any EDI generation.

```typescript
// packages/shared/schemas/canonical-order.ts
const CanonicalOrder = z.object({
  id: z.string().uuid(),
  factory_id: z.string().uuid(),
  buyer_id: z.string().uuid(),
  connection_id: z.string().uuid(),

  // Order identifiers
  buyer_po_number: z.string(),
  factory_order_number: z.string().optional(),
  order_date: z.string().datetime(),
  requested_ship_date: z.string().datetime().optional(),

  // Parties
  ship_to: Address,
  bill_to: Address,
  buyer_contact: Contact.optional(),

  // Line items
  line_items: z.array(CanonicalLineItem).min(1),

  // Financial
  currency: z.string().length(3),           // ISO 4217
  subtotal: z.number().nonnegative(),
  tax_amount: z.number().nonnegative(),
  tax_config: TaxConfig,                    // GST/CGST/SGST breakdown
  total_amount: z.number().nonnegative(),

  // Metadata
  source_type: z.enum(['tally', 'zoho', 'sap_b1', 'rest_api', 'manual']),
  source_raw_payload: z.string().optional(), // original XML/JSON (claim-checked if >256KB)
  mapping_config_version: z.number(),
  status: OrderStatus,
  created_at: z.string().datetime(),
});

const CanonicalLineItem = z.object({
  line_number: z.number().int().positive(),
  buyer_sku: z.string(),
  factory_sku: z.string(),
  description: z.string(),
  quantity_ordered: z.number().positive(),
  quantity_uom: z.string(),                 // EA, CS, PK
  unit_price: z.number().nonnegative(),
  line_total: z.number().nonnegative(),
  upc: z.string().length(12).optional(),    // UPC-12 for retail
  hsn_code: z.string().optional(),          // India HSN for GST
});
```

---

## 3. ORDER LIFECYCLE — 15-State Saga

```
PO_RECEIVED → PO_CONFIRMED → ACK_QUEUED → ACK_SENT → ACK_DELIVERED
  → SHIP_READY → ASN_QUEUED → ASN_SENT → ASN_DELIVERED
  → INVOICE_READY → INVOICE_QUEUED → INVOICE_SENT → INVOICE_DELIVERED
  → COMPLETED

Exception states:
  → FAILED (any step, with retry)
  → COMPENSATION_NEEDED (PO change while ASN in-flight)
```

**Saga table:** `order_sagas`
| Column | Type | Purpose |
|--------|------|---------|
| order_id | FK → canonical_orders | Links to order |
| current_step | ENUM(15 states) | Current lifecycle position |
| step_deadline | TIMESTAMP | SLA breach time (from connection config) |
| locked_by | VARCHAR | Worker ID claiming this step |
| lock_expires | TIMESTAMP | Heartbeat expiry (+5 min) |
| retry_count | INT | Retries on current step |
| compensation_needed | BOOLEAN | PO change detected |
| compensation_reason | VARCHAR | Why compensation needed |

**Saga poller** runs every 60 seconds:
1. Check `step_deadline < NOW()` → SLA breach alert
2. Check `lock_expires < NOW() AND locked_by IS NOT NULL` → stale heartbeat, re-enqueue
3. Check `compensation_needed = true` → notify factory

---

## 4. TRANSACTIONAL OUTBOX PATTERN

Every business operation writes domain data + outbox event in a single DB transaction.

```
confirmOrder(orderId):
  BEGIN;
    UPDATE canonical_orders SET status = 'CONFIRMED';
    INSERT INTO outbox (event_type: 'ORDER_CONFIRMED', aggregate_id: orderId);
    UPDATE order_sagas SET current_step = 'ACK_QUEUED', step_deadline = NOW() + SLA;
    INSERT INTO audit_log (action: 'CONFIRM', ...);
  COMMIT;
```

**Outbox poller** (every 5 seconds):
1. `SELECT * FROM outbox WHERE processed_at IS NULL ORDER BY created_at LIMIT 100`
2. Dispatch to BullMQ with job ID = outbox UUID (idempotent)
3. `UPDATE outbox SET processed_at = NOW()`

---

## 5. EDI GENERATION — Data-Driven Spec Engine

No hardcoded EDI generation. A generic `EdiSpecEngine` reads JSON spec maps.

**Spec map structure** (e.g., `walmart-855.spec.json`):
```json
{
  "transaction_set": "855",
  "buyer": "WALMART",
  "version": "004010",
  "segments": [
    {
      "id": "BAK",
      "elements": [
        { "position": 1, "value": "AC" },
        { "position": 2, "source": "order.buyer_po_number" },
        { "position": 3, "source": "order.order_date", "transform": "toEdiDate" }
      ]
    },
    {
      "id": "PO1",
      "loop": "line_items",
      "elements": [
        { "position": 1, "source": "line.buyer_sku" },
        { "position": 2, "source": "line.quantity_ordered" },
        { "position": 3, "source": "line.quantity_uom" },
        { "position": 4, "source": "line.unit_price" },
        { "position": 6, "value": "UP" },
        { "position": 7, "source": "line.upc" }
      ]
    }
  ],
  "validation_rules": [
    { "rule": "CTT_COUNT_MATCHES_PO1_COUNT" },
    { "rule": "SE_COUNT_MATCHES_SEGMENT_COUNT" },
    { "rule": "ISA_RECEIVER_PADDED_15" }
  ]
}
```

**Envelope builder** (shared across all buyers):
- ISA/IEA: interchange level, sender/receiver IDs padded to 15 chars
- GS/GE: functional group, version code
- ST/SE: transaction set, segment count
- Control number sequencer: guaranteed unique, never duplicated

**Phase 1 specs:**
- `walmart-855.spec.json` — PO Acknowledgment
- `walmart-856.spec.json` — ASN with HL hierarchy (S→O→P→I)
- `walmart-810.spec.json` — Invoice with TDS totals

---

## 6. AS2 TRANSPORT — OpenAS2 Sidecar

```
[BullMQ Worker] → writes .edi file → [/data/as2/outbox/{connection}/{msg}.edi]
    ↓
[OpenAS2 Docker container] → picks up → signs (SHA-256) → encrypts (AES-256) → HTTPS POST
    ↓
[Buyer AS2 endpoint] → returns MDN
    ↓
[OpenAS2] → writes MDN → FC parses → updates message_log + saga
```

**Circuit breaker** (per connection, Opossum):
- Trip at 60% failure rate (minimum 3 requests in 1-minute window)
- Half-open after 5 minutes — send test message
- Test succeeds → close circuit → drain queued messages
- Messages stay in queue during CIRCUIT_OPEN — zero loss

---

## 7. AI MAPPING STUDIO (Enhanced)

### 7.1 Document Upload & Analysis
Factory uploads source documents (XML, JSON, CSV, PDF, Excel) → system:
1. Parses each format, extracts field names + sample values + data types
2. Returns unified field inventory across all uploaded docs
3. AI generates: human-readable description, suggested canonical mapping, confidence score, suggested transform

### 7.2 Visual Mapping Editor
- Split-pane: source fields (left) ↔ canonical fields (right)
- Draw lines between fields (drag-drop)
- Color-coded: green (high confidence ≥0.8), yellow (needs review 0.5-0.8), red (unmapped <0.5)
- Transform function picker per mapping

### 7.3 Chat-Based Refinement
- Embedded chat: "map VOUCHERNUMBER to buyer_po_number" or "ignore NARRATION field"
- AI interprets → updates mapping config → preview in real-time
- Chat history preserved per mapping config

### 7.4 Versioning & Export
- Each save = new version (v1, v2, v3...)
- Diff between versions, rollback to any version
- Draft → Review → Active workflow
- Export as JSON, CSV, or PDF report
- Changes apply to future transactions only

### 7.5 3-Layer LLM Architecture
```
Request → Check llm_cache (by prompt_hash)
  → Cache HIT (87%+ target) → return cached response
  → Cache MISS → Layer 1: Claude Haiku (primary)
    → Confidence ≥ 0.8 → cache + return
    → Confidence < 0.8 OR failure → Layer 2: Gemini/GPT (fallback)
      → Success → cache + return
      → Failure → Layer 3: Local model (stub, future training)
        → Return with requires_human_review = true

ALL calls logged to llm_usage_log for L3 training data.
PII scrubbed BEFORE any LLM call (sample values anonymized).
Error diagnostics: error_code + language ONLY to Claude — ZERO factory data.
```

---

## 8. FIELD TRANSFORMATION RULES ENGINE

Beyond simple field-to-field mapping, FC supports complex transformation rules:

### 8.1 Supported Rule Types
| Rule Type | Example | Config |
|-----------|---------|--------|
| Date Format | `DD/MM/YYYY → YYYY-MM-DD` | `{ source_format, target_format }` |
| Concatenation | `firstName + lastName → fullName` | `{ fields[], separator }` |
| Splitting | `address → street, city, state` | `{ delimiter, positions[] }` |
| Value Mapping | `1 → "ACTIVE", 2 → "INACTIVE"` | `{ lookup_table: { "1": "ACTIVE", "2": "INACTIVE" } }` |
| Conditional | `IF uom = "DOZ" THEN qty × 12` | `{ condition, then_value, else_value }` |
| Arithmetic | `qty × unit_price → line_total` | `{ operator, operands[] }` |
| Default | `IF empty THEN "EA"` | `{ default_value }` |

### 8.2 Rule Execution Pipeline
```
Raw source value
  → Rule 1 (highest priority): e.g., Date Format
  → Rule 2: e.g., Value Mapping
  → Rule 3: e.g., Default
  → Validate output type
  → Write to canonical field
```
Rules execute in priority order. Output of Rule N = input of Rule N+1 (chaining).
Each rule execution logged for audit.

### 8.3 Rule Storage
```json
{
  "field_mapping_id": "uuid",
  "rules": [
    {
      "rule_id": "uuid",
      "type": "date_format",
      "priority": 1,
      "params": { "source_format": "DD/MM/YYYY", "target_format": "YYYY-MM-DD" },
      "enabled": true
    },
    {
      "type": "value_map",
      "priority": 2,
      "params": { "lookup": { "KG": "LB", "DOZ": "EA" } },
      "enabled": true
    }
  ]
}
```

---

## 9. SANDBOX TEST HARNESS

### 9.1 Connection Modes
Every connection has a mode: `sandbox | uat | production`
- **Sandbox:** Full pipeline runs, output captured but NOT dispatched to buyer
- **UAT:** Dispatched to buyer's test endpoint
- **Production:** Dispatched to buyer's live endpoint

### 9.2 Sandbox Test Flow
```
Factory sends input payload (JSON/XML)
  → POST /sandbox/test
  → Parse (show parsed fields)
  → Apply mapping (show mapped fields)
  → Apply transform rules (show transformed fields)
  → Generate canonical (show canonical output)
  → Generate EDI/cXML (show final output)
  → Return step-by-step result (NO dispatch)
```

### 9.3 Comparison Engine
- Factory uploads expected output
- Engine diffs field-by-field: ✅ match, ❌ mismatch, ⚠️ missing, ➕ extra
- Summary: "42/45 fields matched (93%)"
- Click mismatch → jump to mapping editor to fix

### 9.4 Test Suite Manager
- Save input + expected output pairs as named test cases
- Group into test suites per connection/buyer
- "Run All" → results grid (pass/fail per case)
- Re-run after any mapping change = regression testing
- Import/export test suites as JSON

### 9.5 Mock Buyer Responder
- Simulates buyer responses: mock 997 (FA), mock 855 for inbound 850
- No real buyer credentials needed
- Full round-trip testing in sandbox

### 9.6 Promotion Gate
**Cannot promote sandbox → UAT → production until:**
- All test cases pass (100% pass rate)
- Pre-dispatch validation passes (all required fields, correct formats)
- Factory admin explicitly approves promotion

---

## 10. CONNECTOR & FLOW CATALOG

### 10.1 Catalog Registry
Public-facing (no login required) catalog of all FC connectors:
- Source connectors: Tally Prime, Zoho Books, SAP B1, Generic REST
- Target connectors: Walmart EDI, SAP Ariba, Coupa, Generic EDI
- Each connector: supported flows, protocol, sample data, status (available/coming_soon/beta)

### 10.2 Flow Selector
3-step dropdown: Source → Target → Flow
- Available flows: green dot
- Coming soon: grey dot + "Coming Soon" badge
- Selected combo auto-loads sample payload + mapping

### 10.3 Try Before You Buy
"Try It" button → runs sandbox simulator with mock data → shows full pipeline result
- Zero credentials needed
- Product showcase for upselling additional connectors

### 10.4 Connector Request
"Request a Connector" form → stored in `connector_requests` table → visible in admin
- Tracks demand for future connectors

---

## 11. PRE-DISPATCH VALIDATION

Before any EDI/cXML leaves FC:

```
Validation layers:
1. Required fields check (buyer-specific)
2. Format validation (date, numeric, string length)
3. Business rules (line totals = order total, valid UPC/EAN)
4. Buyer-specific rules (Walmart: DUNS required, SSCC-18 required)
5. Referential integrity (buyer_sku exists in item_master)
```

**Result:**
- All pass → dispatch
- Warnings → dispatch with notification
- Critical errors → BLOCK dispatch, show fix suggestions

**Per-buyer rule sets:** Walmart is stricter than generic EDI buyers.

---

## 12. NOTIFICATION SYSTEM

### 12.1 Channels (Phased Rollout)
| Channel | Day 1 | Post-Contract |
|---------|-------|---------------|
| In-App (WebSocket) | ✅ ON | ✅ ON |
| Email (Nodemailer/SMTP) | ✅ ON (default) | ✅ ON |
| SMS (Twilio/MSG91) | 🔒 Built, feature-flagged OFF | Flip flag after contract |
| WhatsApp (Business API) | 🔒 Built, feature-flagged OFF | Flip flag after Meta verification |

### 12.2 Event Types
- Order status change (PO received, confirmed, shipped, invoiced, completed)
- SLA breach warning (approaching deadline)
- Connection health change (circuit breaker, agent offline)
- Mapping update applied
- Sandbox test result ready
- Daily digest (orders processed, errors, pending actions)

### 12.3 Architecture
All channels share `NotificationDispatcher` → routes to `NotificationChannel` adapters.
Templates in `notification_templates` table: template_id, channel, event_type, body (Handlebars), language.
Feature flags: `sms_notifications_enabled`, `whatsapp_notifications_enabled`.

---

## 13. API & WEBHOOKS

### 13.1 REST API (for REST adapter factories)
- Auto-generated OpenAPI 3.1 spec from Zod schemas
- Swagger UI at `/docs` with interactive "Try It"
- Per-factory API key generation
- Code samples: Node.js, Python, cURL, PHP

### 13.2 Webhook Outbound
Factory registers webhook URLs for events:
- `order.created`, `shipment.sent`, `invoice.generated`
- `error.occurred`, `sla.breached`, `connection.status_changed`
- HMAC-SHA256 signed payloads
- 3 retries with exponential backoff
- Delivery log with response codes

### 13.3 Rate Limiting
- Per-factory: 100 req/min API, 1000 req/day sandbox
- Per-plan quotas: Free (50 orders/month), Starter (500), Growth (5000), Enterprise (unlimited)
- Redis sliding window, `X-RateLimit-Remaining` header
- 429 response with `Retry-After`

---

## 14. ANALYTICS & REPORTING

- Orders/day, avg processing time, error rate, SLA compliance %
- Top error codes, orders by buyer, orders by status
- Time-series in `analytics_daily` table (materialized by cron)
- Export as CSV/PDF
- Compare periods: "this month vs last month"

---

## 15. BRIDGE AGENT (Factory-Side)

### 15.1 Adaptive Polling
```
CPU < 50%  → 5 min  | 50-70% → 10 min | 70-85% → 15 min
>85%       → 30 min | >95%   → PAUSE
```
Additional signals: RAM usage, Tally response latency.

### 15.2 Self-Healing (7-Layer, 40+ Patterns)
| Layer | Probes | Examples |
|-------|--------|---------|
| L1: OS | Disk, memory, CPU, time sync, Tally process | Low disk → alert at 20%, critical at 5% |
| L2: Network | DNS, TCP, TLS, proxy, SSL inspection, cipher | Corporate proxy → auto-detect + configure |
| L3: Security | Cert expiry, HMAC, AV interference, file integrity | Cert expiring → auto-renew via Vault PKI |
| L4: Persistence | SQLite, outbox depth, import dir | SQLite locked → rebuild WAL |
| L5: Tunnel | Connected, latency, auth, fallback | Tunnel down → reconnect with backoff |
| L6: Application | Tally response, mapping config | Tally port changed → scan 9001-9010 |
| L7: Version | Agent version, binary hash, dependencies | Outdated → auto-upgrade with rollback |

### 15.3 Data Minimization
Agent pulls ONLY fields listed in mapping_config. If mapping says 5 fields, agent extracts 5 from Tally's 30+ fields. Zero extra data leaves the factory.

---

## 16. SECURITY ARCHITECTURE

### Always Enforced (non-negotiable):
- RLS tenant isolation on all queries
- Field-level encryption for PII (Vault Transit)
- PII log redaction (Pino interceptor with regex patterns)
- mTLS for Bridge Agent tunnel
- AS2 S/MIME signing + encryption
- MFA for all portal logins (Keycloak TOTP)
- Immutable audit log (SHA-256 hash chain)
- Email data only to factory-configured verified addresses

### Defense in Depth:
```
WAF (Cloudflare) → Caddy (rate limit) → Zod (validation)
  → RLS (DB isolation) → FLE (column encryption)
  → PII interceptor (log scrub) → hash-chain audit
```

---

## 17. TEST MATRIX

### Unit/Integration Tests: 87 cases
| Area | Test Range | Count |
|------|-----------|-------|
| Foundation (RLS, PII, audit) | TEST-001 to TEST-010 | 10 |
| API + Workflow | TEST-011 to TEST-020 | 10 |
| Mapping + EDI | TEST-A1-101 to TEST-A1-229 | 29 |
| Bridge Agent | TEST-A2-001 to TEST-A2-212 | 24 |
| Portal UI | TEST-A3-001 to TEST-A3-214 | 14 |

### E2E Simulation Scenarios: 9
| # | Scenario | Validates |
|---|----------|-----------|
| SIM-001 | Happy path: Tally → 855 → 856 → 810 → Complete | Full order-to-cash, saga completion |
| SIM-002 | Inbound PO: Buyer 850 → FC → Tally import | Inbound EDI → file-drop → Tally |
| SIM-003 | AS2 down → circuit breaker → recovery | Opossum trip/half-open/close, zero loss |
| SIM-004 | Agent offline 7 days → HWM reconciliation | Tunnel recovery, partial sync |
| SIM-005 | Factory holiday → silence suppression | Calendar + decision tree = zero false alerts |
| SIM-006 | PO Change while ASN in-flight | Saga conflict detection |
| SIM-007 | Worker crash mid-processing | Heartbeat recovery, no duplicate EDI |
| SIM-008 | Single transaction resync | New control number, new idempotency key |
| SIM-009 | Bulk resync to UAT (500 messages) | Progress tracking, throughput |

### Security Tests: 22 VAPT cases
- Domain 1 — IAM: MFA bypass, JWT forging, Vault least-privilege
- Domain 2 — API/Network: BOLA via RLS, SQLi/XSS, rate limit stress
- Domain 3 — Bridge Agent: OTP entropy, DPAPI extraction, tunnel MITM
- Domain 4 — Data Privacy: PII log audit, unsigned AS2 rejection

---

## 18. DEFINITION OF DONE

```
[ ] Tally → FC → EDI 855 → sandbox AS2 → MDN ✓
[ ] Tally → FC → EDI 856 → sandbox AS2 → MDN ✓
[ ] Tally → FC → EDI 810 → sandbox AS2 → MDN ✓
[ ] Buyer EDI 850 → FC → Tally import ✓
[ ] Zoho webhook → FC → EDI 855 ✓
[ ] Generic REST → FC → EDI 855 ✓
[ ] AI Mapping Studio: upload → analyze → map → chat refine → export ✓
[ ] Transform rules: date, concat, split, value map, conditional ✓
[ ] Sandbox: full pipeline test → comparison → test suite → 100% pass ✓
[ ] Connector catalog: browse → try → request ✓
[ ] Notifications: email default, SMS/WhatsApp feature-flagged ✓
[ ] Pre-dispatch validation: blocks errors, shows fix suggestions ✓
[ ] Saga tracks full lifecycle: PO → ACK → ASN → Invoice → Complete ✓
[ ] SLA breach detection + graduated escalation ✓
[ ] Circuit breaker: buyer down → queue → recover → drain ✓
[ ] Worker crash → heartbeat recovery → zero stuck orders ✓
[ ] Agent offline → reconnect → HWM reconciliation → sync ✓
[ ] Holiday → silence suppressed → zero false alerts ✓
[ ] All 87 unit tests + 9 simulations + 22 VAPT cases pass ✓
[ ] Zero PII in any log, EDI output, or API response ✓
[ ] Running on OCI Free Tier at ~₹2,750/month ✓
[ ] First factory onboarded on production ✓
```

---

*This connector becomes the GOLD STANDARD. Every future connector (Purchase Order, Returns, Credit Memo, Ariba cXML, Coupa REST, EDIFACT) replicates these patterns. New connector = JSON spec map + adapter config (~2 days), not weeks of code.*
