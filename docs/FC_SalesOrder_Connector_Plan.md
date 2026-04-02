# ═══════════════════════════════════════════════════════════════════════════
# FACTORYCONNECT — SALES ORDER CONNECTOR
# 100% End-to-End Implementation Plan
# Parallel Execution Across 3 Claude Code Agents
# With Complete Test Cases & Simulations
# ═══════════════════════════════════════════════════════════════════════════
#
# Based on: Blueprint v8.0 FINAL (Triple AI Reviewed, 21 Enterprise Patterns)
# Scope: COMPLETE Sales Order flow — every source, every target, every state
# Goal: Gold standard connector that ALL future connectors replicate
#
# ═══════════════════════════════════════════════════════════════════════════

---

# EXECUTION TIMELINE — VISUAL

# Week:  1  2  3  4  5  6  7  8  9  10 11 12 13 14 15 16 17 18 19 20
#        ├──┤──┤──┤──┤──┤──┤──┤──┤──┤──┤──┤──┤──┤──┤──┤──┤──┤──┤──┤──┤
# AGENT1 [FOUNDATION][MAPPING+AI ][EDI SPEC ENGINE ][BULLMQ+AS2 PIPELINE]
# AGENT2 [BRIDGE+TUNNEL         ][SELF-HEAL+DIAG  ][INBOUND EDI 850    ]
# AGENT3 [PORTAL FOUNDATION     ][MAPPING UI+CONN ][SUPPORT+CALENDAR   ]
#        ├──┤──┤──┤──┤──┤──┤──┤──┤──┤──┤──┤──┤──┤──┤──┤──┤──┤──┤──┤──┤
# INTEGRATION TESTING ───────────────────────────────────────────>[E2E SIM]
# SECURITY ──────────────────────────────────────────────────────>[VAPT  ]

---

# ╔═══════════════════════════════════════════════════════════════════════╗
# ║  PHASE 1: FOUNDATION (Weeks 1-4)                                     ║
# ║  All 3 agents work in parallel on their foundations                   ║
# ╚═══════════════════════════════════════════════════════════════════════╝

## AGENT 1 — WEEKS 1-4: Core Foundation + Canonical Model

### Week 1-2: Monorepo + Database + Auth
- pnpm monorepo with apps/api, packages/database, packages/shared, packages/observability
- PostgreSQL 16 with RLS (all tenant tables)
- dbmate migration 001_foundation.sql (factories, buyers, connections, canonical_orders,
  canonical_order_line_items, canonical_shipments, canonical_invoices, outbox, order_sagas,
  audit_log, message_log, mapping_configs, routing_rules, escalation_rules)
- Keycloak 24 with factoryconnect realm, MFA mandatory, factory/admin/buyer realms
- Vault single-node with Transit engine keys: pii-key, edi-payload-key
- Docker Compose optimized for OCI Ampere A1
- Caddy reverse proxy with auto-SSL

### Week 3-4: API + Middleware + Outbox + Saga
- Express.js 5 API with all middleware: auth, tenant-context, validate, idempotency,
  correlation-id, error-handler
- Zod schemas: CanonicalOrder, CanonicalShipment, CanonicalInvoice (SHARED with Agent 2+3)
- API routes:
  POST /api/v1/orders (create order from any source)
  GET  /api/v1/orders (list orders, RLS-filtered)
  GET  /api/v1/orders/:id (single order)
  POST /api/v1/orders/:id/confirm (factory confirms → triggers 855)
  POST /api/v1/shipments (create shipment → triggers 856)
  POST /api/v1/invoices (create invoice → triggers 810)
  GET  /api/v1/connections (list connections)
  POST /api/v1/connections (create connection)
- confirmOrder service with Transactional Outbox (4 writes in 1 tx)
- Outbox poller (5 seconds)
- Saga poller (60 seconds) with SLA breach detection + stale heartbeat recovery
- Audit log writer with SHA-256 hash chain
- PII redaction interceptor on Pino

### TESTS (Agent 1, Phase 1):
```
TEST-A1-001: RLS isolation — Factory A cannot see Factory B orders
TEST-A1-002: Idempotency — duplicate POST returns cached response, no double-write
TEST-A1-003: Outbox atomicity — if DB write fails, outbox entry not created
TEST-A1-004: Outbox atomicity — if DB write succeeds, outbox entry ALWAYS created
TEST-A1-005: Saga creation — new order creates saga with PO_RECEIVED step
TEST-A1-006: Saga SLA — saga poller detects overdue step_deadline
TEST-A1-007: Saga heartbeat — stale lock_expires triggers re-enqueue
TEST-A1-008: Audit hash chain — each row's hash includes previous row's hash
TEST-A1-009: Audit immutability — UPDATE/DELETE on audit_log raises exception
TEST-A1-010: PII redactor — GSTIN, PAN, phone, email scrubbed from all log output
TEST-A1-011: Vault FLE — GSTIN stored encrypted, only ADMIN role decrypts
TEST-A1-012: MFA — Keycloak login without TOTP returns 403
```

---

## AGENT 2 — WEEKS 1-4: Bridge Agent + Tunnel

### Week 1-2: Bridge Agent Core
- Node.js 22 project: bridge-agent/
- Tally XML client (HTTP POST to localhost:9000)
- Tally XML parser (fast-xml-parser → extract SALESORDER vouchers)
- Adaptive polling engine (5/10/15/30 min based on CPU+RAM+Tally latency)
- Local SQLite queue (encrypted, WAL mode, survives restart)
- Data minimization: only pull fields from mapping_config
- Config loader (JSON file with env overrides)

### Week 3-4: Tunnel + Bootstrap + Security
- WebSocket tunnel client (ws library, mTLS, cert pinning)
- Reconnect with exponential backoff + ±30% jitter
- HMAC-SHA256 message signing for all tunnel messages
- OTP bootstrap flow: activation token → CSR → Vault PKI → cert → store in DPAPI
- Windows Credential Manager integration (DPAPI)
- Agent Hub service (server-side): WebSocket server in apps/api that terminates
  agent tunnels, verifies mTLS, routes messages

### TESTS (Agent 2, Phase 1):
```
TEST-A2-001: Tally XML client sends valid request, parses SALESORDER response
TEST-A2-002: Adaptive poller: CPU 60% → interval becomes 10 min
TEST-A2-003: Adaptive poller: CPU 96% → polling PAUSED
TEST-A2-004: Adaptive poller: CPU drops to 50% → polling RESUMES at 5 min
TEST-A2-005: SQLite queue: enqueue 100 messages, restart process, all 100 still pending
TEST-A2-006: Tunnel connects with mTLS, heartbeat every 30s
TEST-A2-007: Tunnel cert pin mismatch → connection rejected
TEST-A2-008: Reconnect jitter: 100 reconnects have delay variance > 20%
TEST-A2-009: OTP bootstrap: valid token → cert issued → token invalidated
TEST-A2-010: OTP bootstrap: expired token → rejected
TEST-A2-011: OTP bootstrap: reused token → rejected
TEST-A2-012: Data minimization: agent pulls only 5 configured fields, not all 30 Tally fields
```

---

## AGENT 3 — WEEKS 1-4: Portal Foundation

### Week 1-2: React App + Auth + Layout
- React 19 + Vite 6 + Tailwind + shadcn/ui
- Keycloak integration with MFA enforcement
- AppShell: sidebar nav, header with user info + notification bell
- Dashboard page: stats cards (orders, connections, errors, health score)
- i18n: English + Hindi (50+ translation keys)

### Week 3-4: Orders + Saga + Calendar
- Orders page: table with filters (status, buyer, date range)
- Order detail: full view with all fields
- Saga Timeline component: PO → ACK → ASN → Invoice visual
- Connections page: list all buyer connections with status badges
- Calendar page: monthly grid, color-coded entries
- Holiday form: add holiday with type, dates, suppress_alerts flag
- Settings page: escalation preferences form

### TESTS (Agent 3, Phase 1):
```
TEST-A3-001: Keycloak login redirects unauthenticated users
TEST-A3-002: MFA required — login without TOTP fails
TEST-A3-003: Dashboard renders 4 stats cards with correct data
TEST-A3-004: Orders table renders 10 rows with correct columns
TEST-A3-005: Saga Timeline shows all 10 states with correct icons
TEST-A3-006: Saga Timeline: overdue step shows red OVERDUE badge
TEST-A3-007: Calendar grid renders holidays with correct colors
TEST-A3-008: Holiday form validates required fields before submit
TEST-A3-009: Escalation config saves preferences correctly
TEST-A3-010: Hindi translation switches all visible text
```

---

# ╔═══════════════════════════════════════════════════════════════════════╗
# ║  PHASE 2: MAPPING + AI (Weeks 5-8)                                  ║
# ╚═══════════════════════════════════════════════════════════════════════╝

## AGENT 1 — WEEKS 5-8: Mapping Engine + AI Mapper + Inbound Sources

### Week 5-6: Mapping Engine
- JSONata-based mapping engine in packages/mapping-engine/
- MappingConfig table CRUD (version, status, rules JSONB)
- Transform functions: toDate, toEdiDate(YYYYMMDD), toUpperCase, trim,
  toDecimal(precision), padLeft, lookup(table), validateGSTIN, validateUPC12
- Apply mapping: raw Tally JSON → CanonicalOrder

### Week 7-8: AI Mapper (3-Layer LLM)
- AI mapping service in packages/ai-mapper/
- Layer 1: Claude API (Haiku 4.5) — primary
- Layer 2: configurable fallback LLM endpoint (Gemini/GPT) — if L1 fails
- Layer 3: placeholder for local model (logged data for future training)
- PII scrubbing BEFORE any LLM call (anonymize sample values)
- Prompt: system prompt with canonical model schema + rules
- Response: JSON array of { source_field, canonical_field, confidence, transform }
- Confidence < 0.8 → requires_human_review = true
- ALL calls logged: prompt hash, response, model, latency, confidence scores
- Manual mapping fallback: API endpoint for drag-drop UI

### Inbound Source Adapters (Week 7-8):
- Tally adapter: parse Tally SALESORDER XML → apply mapping → CanonicalOrder
- Zoho webhook adapter: verify HMAC, parse Zoho SO JSON → apply mapping → CanonicalOrder
- Generic REST adapter: validate API key, accept CanonicalOrder JSON directly
- Routing engine: resolveConnection(factory_id, buyer_identifier) → Connection

### TESTS (Agent 1, Phase 2):
```
TEST-A1-101: JSONata mapping: Tally VOUCHERNUMBER → order.buyer_po_number
TEST-A1-102: JSONata mapping: Tally DATE → order.order_date (format conversion)
TEST-A1-103: Transform toEdiDate: "2026-04-15" → "20260415"
TEST-A1-104: Transform validateUPC12: "01234567890" passes, "123" fails
TEST-A1-105: AI mapper: Claude returns suggestions with confidence scores
TEST-A1-106: AI mapper: PII scrubbed — no GSTIN/PAN in prompt sent to Claude
TEST-A1-107: AI mapper: L1 fails → L2 fallback fires
TEST-A1-108: AI mapper: all calls logged with prompt hash + response
TEST-A1-109: Tally adapter: full SALESORDER XML → valid CanonicalOrder
TEST-A1-110: Zoho adapter: webhook with valid HMAC → CanonicalOrder
TEST-A1-111: Zoho adapter: invalid HMAC → 401 rejected
TEST-A1-112: Routing: ISA receiver ID "FACTORYID" resolves to correct factory
TEST-A1-113: Routing: unknown identifier → 404
```

---

## AGENT 2 — WEEKS 5-8: Self-Healing + Diagnostics + File-Drop

### Week 5-6: Full 7-Layer Self-Healing
- Health orchestrator: runs all probes every 2 minutes
- All 7 layers fully implemented (L1-L7) with 35+ probes
- Rules engine: 40+ failure patterns with signatures + fix chains
- Auto-fix executor: DNS flush, alt DNS, port scan, proxy detect, SSL inspection
  detect, corporate CA import, cert renew, SQLite rebuild, log rotate
- Diagnostic bundle creator (15 files, encrypted ZIP)
- Error-code-only LLM interface (only error code + language to Claude)

### Week 7-8: File-Drop Inbound + HWM Reconciliation
- Canonical → Tally XML writer (for PO import into Tally)
- Atomic file write (.tmp → rename) to Tally import directory
- Import monitor: detect when Tally processes file (file disappears)
- Ack back to FC Cloud through tunnel
- Verification poll: confirm voucher exists in Tally after import
- High-water mark reconciliation: daily hash of last 100 vouchers
  Cloud sends RECONCILE_REQUEST → agent replies with hash → mismatch = partial sync

### TESTS (Agent 2, Phase 2):
```
TEST-A2-101: Rules engine: TLS_FAIL + TCP_PASS + DNS_PASS → SSL_INSPECTION pattern
TEST-A2-102: Rules engine: TCP_FAIL + DNS_PASS → PORT_BLOCKED pattern
TEST-A2-103: Rules engine: DNS_FAIL → NO_DNS pattern
TEST-A2-104: Auto-fix: DNS failure → flush DNS → try Google 8.8.8.8 → success
TEST-A2-105: Auto-fix: Tally port 9000 fail → scan 9001-9010 → find on 9001
TEST-A2-106: Diagnostic bundle: 15 files created, PII scrubbed, ZIP encrypted
TEST-A2-107: File-drop: canonical order → valid Tally XML in import dir
TEST-A2-108: File-drop: atomic write (.tmp then rename, no partial files)
TEST-A2-109: Import monitor: detects file pickup within 60 seconds
TEST-A2-110: HWM reconciliation: matching hashes → no sync needed
TEST-A2-111: HWM reconciliation: mismatched hashes → partial sync triggered
TEST-A2-112: HWM reconciliation: agent offline 7 days → full catch-up sync
```

---

## AGENT 3 — WEEKS 5-8: Mapping UI + Connection Wizard

### Week 5-6: Visual Mapping UI
- AI-suggested mapping view: source field ↔ canonical field with confidence %
- Drag-and-drop field mapping (manual override)
- Color coding: green (high confidence), yellow (needs review), red (unmapped)
- Test button: paste sample Tally XML → see canonical output → see EDI preview
- Save mapping config (version + approval chain)

### Week 7-8: Connection Setup Wizard
- 7-step wizard: Select buyer → Enter factory IDs → AI field mapping →
  Review mappings → Test connection → Configure SLA → Activate
- Buyer library: browse/search global buyers, or add new
- Buyer config spec form (from original design: Sections A-H)
- Connection status badges: DRAFT → CONFIGURED → TESTING → ACTIVE
- AS2 certificate upload UI (buyer's public cert)

### TESTS (Agent 3, Phase 2):
```
TEST-A3-101: Mapping UI renders source and canonical fields side by side
TEST-A3-102: AI suggestions show confidence badges (green/yellow/red)
TEST-A3-103: Drag-drop overrides AI suggestion and saves correctly
TEST-A3-104: Test button: Tally XML → canonical JSON displayed correctly
TEST-A3-105: Connection wizard: all 7 steps complete without error
TEST-A3-106: Connection wizard: step 5 (test) sends test message to sandbox
TEST-A3-107: Buyer library: search returns matching buyers
TEST-A3-108: Buyer config form validates all required fields
```

---

# ╔═══════════════════════════════════════════════════════════════════════╗
# ║  PHASE 3: EDI ENGINE + AS2 DISPATCH (Weeks 9-14)                    ║
# ╚═══════════════════════════════════════════════════════════════════════╝

## AGENT 1 — WEEKS 9-14: EDI Spec Engine + OpenAS2 + BullMQ Pipeline

### Week 9-10: Data-Driven EDI Spec Engine
- Generic EdiSpecEngine that reads JSON spec maps
- EdiEnvelopeBuilder: ISA/GS/GE/IEA generation (shared across all buyers)
- Buyer spec map structure: segment_rules, hl_hierarchy, validation_rules
- FIRST BUYER SPEC: walmart-855.spec.json, walmart-856.spec.json, walmart-810.spec.json
- Validation: each generated EDI checked against buyer's validation_rules
- EDI control number sequencer (ISA, GS, ST control numbers, never duplicate)

### Week 11-12: OpenAS2 Sidecar + Circuit Breaker
- Docker container: OpenAS2 with shared volume for EDI files
- Worker writes EDI to /data/as2/outbox/{connection_id}/{message_id}.edi
- OpenAS2 picks up, signs (SHA-256), encrypts (AES-256), sends via HTTPS
- MDN handling: synchronous MDN → parse → update message_log
- Async MDN endpoint: POST /inbound/edi/mdn
- Opossum circuit breaker: per-connection, trip at 60%, half-open at 5 min
- Cert loading from Vault (factory private key, buyer public cert)

### Week 13-14: Complete BullMQ Pipeline
- Job: SEND_PO_ACK — load order → spec engine generates 855 → AS2 dispatch
- Job: SEND_ASN — load shipment → spec engine generates 856 → AS2 dispatch
- Job: SEND_INVOICE — load invoice → spec engine generates 810 → AS2 dispatch
- Job: PROCESS_INBOUND_850 — parse EDI 850 → map to canonical → create order + saga
- Worker heartbeat: claim saga step before processing, release on crash
- Retry: exponential backoff 5s/30s/5m/30m/2h (5 attempts)
- Dead letter: after 5 failures → DLQ table → escalation P2
- Saga updates: each job completes → update order_sagas current_step + timestamps

### Week 13-14 (continued): Inbound EDI 850
- POST /inbound/edi/as2 — OpenAS2 receives, verifies signature, decrypts, writes to inbox
- Worker picks up → x12-parser parses 850 → routing engine finds factory → mapping → create order
- Route to factory via tunnel → file-drop to Tally import dir

### TESTS (Agent 1, Phase 3):
```
TEST-A1-201: Spec engine: walmart-855.spec.json → valid EDI 855 string
TEST-A1-202: Spec engine: walmart-856.spec.json → valid EDI 856 with HL hierarchy
TEST-A1-203: Spec engine: walmart-810.spec.json → valid EDI 810 with TDS totals
TEST-A1-204: EDI 855: BAK segment has correct PO number and date
TEST-A1-205: EDI 855: PO1 line count matches CTT count
TEST-A1-206: EDI 855: SE segment count matches actual segment count
TEST-A1-207: EDI 856: HL hierarchy levels correct (S→O→P→I)
TEST-A1-208: EDI 856: MAN segment has valid 18-digit SSCC
TEST-A1-209: EDI 856: TD5 segment has carrier SCAC + tracking number
TEST-A1-210: EDI 810: BIG has invoice date + PO reference
TEST-A1-211: EDI 810: TDS total matches sum of IT1 line_totals
TEST-A1-212: ISA envelope: sender/receiver IDs padded to 15 chars
TEST-A1-213: ISA envelope: control number unique, never duplicated
TEST-A1-214: OpenAS2: EDI file written to outbox → picked up within 10s
TEST-A1-215: OpenAS2: signed + encrypted message sent to test AS2 endpoint
TEST-A1-216: OpenAS2: synchronous MDN received and parsed
TEST-A1-217: Circuit breaker: 3 failures → circuit OPEN → no more dispatches
TEST-A1-218: Circuit breaker: after 5 min → half-open → test dispatch
TEST-A1-219: Circuit breaker: test succeeds → circuit CLOSED → drain queue
TEST-A1-220: BullMQ SEND_PO_ACK: order CONFIRMED → 855 generated → dispatched → saga ACK_SENT
TEST-A1-221: BullMQ SEND_ASN: shipment DISPATCHED → 856 generated → dispatched → saga ASN_SENT
TEST-A1-222: BullMQ SEND_INVOICE: invoice SENT → 810 generated → dispatched → saga INVOICE_SENT
TEST-A1-223: BullMQ retry: transport failure → retry at 5s → 30s → 5m
TEST-A1-224: BullMQ DLQ: 5 failures → message in dead_letter_queue → escalation triggered
TEST-A1-225: Worker heartbeat: worker claims saga → crashes → poller re-enqueues within 5 min
TEST-A1-226: Inbound 850: valid EDI → parsed → canonical order created → saga started
TEST-A1-227: Inbound 850: invalid ISA sender → rejected with 400
TEST-A1-228: Inbound 850: unsigned AS2 → rejected before decryption
TEST-A1-229: No PII in any EDI 855/856/810 output (no GSTIN, PAN, bank details)
```

---

## AGENT 2 — WEEKS 9-14: Auto-Upgrade + Production Hardening

### Week 9-10: Auto-Upgrade System
- 22-step upgrade lifecycle: pre-flight → backup → download → verify signature →
  config migration → pre-install check → install → post-install check → finalize
- Config migration chain: v1.0→v1.1→v1.2→v2.0 (each version transforms config)
- Rollback at ANY step failure
- Strangler fig: old version runs until new passes E2E health check

### Week 11-12: Production Hardening
- All 7 layers complete with auto-fix for all 40+ patterns
- Windows installer (.exe) with setup wizard + pairing code
- Pre-install checks: Windows version, disk space, .NET, port available, internet
- Post-install checks: service registered, running, creds stored, tunnel connected, Tally reachable
- System tray icon with status, diagnostics, export bundle, check updates, settings

### Week 13-14: Claim Check + Monitoring
- Claim check pattern: payloads > 256KB → MinIO, URI in tunnel message
- Agent-side metrics: poll count, success rate, queue depth, tunnel uptime
- Push metrics through tunnel to FC Cloud Prometheus endpoint
- Agent version reporting for fleet dashboard

### TESTS (Agent 2, Phase 3):
```
TEST-A2-201: Auto-upgrade: download + verify signature → success
TEST-A2-202: Auto-upgrade: invalid signature → download rejected
TEST-A2-203: Auto-upgrade: config migration v1.0→v2.0 → all fields preserved
TEST-A2-204: Auto-upgrade: post-install health check fails → full rollback
TEST-A2-205: Auto-upgrade: successful upgrade → old version backup retained 7 days
TEST-A2-206: Windows installer: pre-install checks all pass on Windows 10
TEST-A2-207: Windows installer: insufficient disk → abort with user-friendly message
TEST-A2-208: System tray: status updates when tunnel disconnects/reconnects
TEST-A2-209: Claim check: 500KB payload → stored in MinIO → URI in message
TEST-A2-210: Claim check: 100KB payload → sent inline (no MinIO)
TEST-A2-211: Agent metrics: poll_count increments correctly
TEST-A2-212: Agent metrics: pushed to Cloud within 2 minutes
```

---

## AGENT 3 — WEEKS 9-14: Proactive Support + Admin Dashboard

### Week 9-10: Proactive Support Engine
- Operational calendar: 7 sources (system, portal, email, iCal, Google, API, WhatsApp)
- Calendar sync service: iCal poll every 6 hours, Google Calendar OAuth, custom API daily
- Baseline learning engine: 14-day learning mode, hourly/daily volume patterns
- Silence detection: 7-question decision tree (every 30 minutes)

### Week 11-12: Graduated Escalation
- 5-step escalation: WhatsApp → Email → SMS → AI Bot Call → Human Call
- Escalation state machine: TRIGGERED → STEP1_SENT → ... → RESOLVED
- WhatsApp quick-reply: "holiday" → calendar update, "all good" → resolve
- SLA clock pause during calendar holidays
- Novu integration: multi-channel notification dispatch

### Week 13-14: Admin Dashboard + Fleet View
- FC Super Admin console: factory list, health scores, agent fleet status
- Agent fleet dashboard: version distribution, needs upgrade, active self-healing
- Escalation dashboard: active escalations, resolution stats, false alert rate
- Dead letter queue UI: inspect, modify, replay messages
- Health score calculation: uptime (25%), flow (25%), errors (20%), SLA (15%), escalation (15%)
- Buyer notification: factory closure notice → connected buyers

### TESTS (Agent 3, Phase 3):
```
TEST-A3-201: Calendar: system preloads national holidays for Maharashtra
TEST-A3-202: Calendar: iCal sync imports 5 holidays from URL
TEST-A3-203: Calendar: WhatsApp reply "holiday today" creates entry
TEST-A3-204: Baseline: after 14 days, avg_daily_txn and longest_gap calculated
TEST-A3-205: Silence detector: holiday today → alert SUPPRESSED
TEST-A3-206: Silence detector: outside business hours → alert SUPPRESSED
TEST-A3-207: Silence detector: within baseline gap → alert SUPPRESSED
TEST-A3-208: Silence detector: 4hr silence on working day → alert FIRED
TEST-A3-209: Escalation: WhatsApp sent first, email after 60 min if no response
TEST-A3-210: Escalation: factory replies "holiday" → calendar updated + resolved
TEST-A3-211: SLA clock: pauses during holiday, resumes on next working day
TEST-A3-212: DLQ UI: shows failed messages, replay button re-enqueues to outbox
TEST-A3-213: Health score: factory with 100% uptime + zero errors = score 100
TEST-A3-214: Health score: factory with 50% uptime = score ~50
```

---

# ╔═══════════════════════════════════════════════════════════════════════╗
# ║  PHASE 4: END-TO-END SIMULATION (Weeks 15-16)                       ║
# ║  All 3 agents converge for integration testing                       ║
# ╚═══════════════════════════════════════════════════════════════════════╝

## SIMULATION SCENARIOS — Complete Sales Order Lifecycle

### SIMULATION 1: Happy Path (Tally → EDI 855 → EDI 856 → EDI 810)
```
SIM-001: COMPLETE ORDER-TO-CASH CYCLE
Setup: Factory "Precision Mfg" connected to Buyer "Walmart" via AS2

Step 1: Bridge Agent polls Tally, finds new SALESORDER voucher
Step 2: Agent transforms to canonical, pushes through tunnel
Step 3: FC Cloud creates order + saga (PO_RECEIVED) + outbox event
Step 4: Factory owner confirms PO in portal
Step 5: Saga → ACK_QUEUED. Outbox → BullMQ SEND_PO_ACK job
Step 6: Worker: load order → spec engine → walmart-855.spec.json → EDI 855
Step 7: Worker writes EDI to OpenAS2 outbox
Step 8: OpenAS2 signs + encrypts + sends to sandbox AS2 endpoint
Step 9: Sandbox returns MDN "processed"
Step 10: Saga → ACK_SENT. Factory notified via WhatsApp.
Step 11: Factory creates shipment in portal (carrier, tracking, SSCC)
Step 12: Saga → ASN_QUEUED. Outbox → BullMQ SEND_ASN job
Step 13: Worker → walmart-856.spec.json → EDI 856 with HL hierarchy
Step 14: OpenAS2 sends → MDN received → Saga → ASN_SENT
Step 15: Factory creates invoice in portal
Step 16: Saga → INVOICE_QUEUED. Outbox → SEND_INVOICE job
Step 17: Worker → walmart-810.spec.json → EDI 810
Step 18: OpenAS2 sends → MDN received → Saga → INVOICE_SENT → COMPLETED

VERIFY: All 18 steps completed. Saga at COMPLETED. 3 EDI messages in message_log.
        Audit log has 18+ entries with unbroken hash chain.
        Zero PII in any log. All EDI validates against Walmart spec rules.
```

### SIMULATION 2: Buyer Sends PO (EDI 850 → Factory Tally)
```
SIM-002: INBOUND PO FROM BUYER
Step 1: Sandbox buyer sends EDI 850 to FC's AS2 endpoint
Step 2: OpenAS2 receives, verifies signature, decrypts
Step 3: x12-parser parses 850 → routing engine finds factory
Step 4: Mapping engine → canonical order created
Step 5: Saga created at PO_RECEIVED
Step 6: Command sent through tunnel to Bridge Agent
Step 7: Agent transforms canonical → Tally import XML
Step 8: Agent writes to Tally import directory (atomic)
Step 9: Tally processes file → agent detects pickup → ack back
Step 10: Factory owner sees new PO in portal

VERIFY: Order exists in DB. Tally has voucher. Saga at PO_RECEIVED.
```

### SIMULATION 3: AS2 Endpoint Down (Circuit Breaker)
```
SIM-003: BUYER AS2 ENDPOINT FAILURE
Step 1: Factory confirms PO → 855 job queued
Step 2: OpenAS2 sends → buyer endpoint returns timeout
Step 3: Retry 1 (5s), Retry 2 (30s), Retry 3 (5m) — all fail
Step 4: Circuit breaker TRIPS (3 consecutive failures)
Step 5: Message stays in queue with CIRCUIT_OPEN status
Step 6: Connection status updated to CIRCUIT_OPEN in DB
Step 7: Factory notified: "Buyer endpoint is down"
Step 8: After 5 minutes: circuit HALF-OPEN → test dispatch
Step 9: Test succeeds → circuit CLOSED → drain queued messages
Step 10: 855 finally delivered → saga updates

VERIFY: Circuit breaker tripped/recovered. No messages lost. Factory notified.
```

### SIMULATION 4: Bridge Agent Offline 7 Days
```
SIM-004: AGENT OFFLINE + RECONNECT + RECONCILIATION
Step 1: Agent goes offline (simulate: stop tunnel)
Step 2: 2 new POs arrive from buyer during offline period
Step 3: POs queued in FC Cloud (72-hour TTL on tunnel commands)
Step 4: Agent comes back online after 2 days
Step 5: Tunnel reconnects → FC pushes queued commands
Step 6: Agent imports POs into Tally
Step 7: Daily reconciliation: cloud sends hash → agent replies → match ✓

Alternative: Agent offline 7 days (beyond 72-hour TTL)
Step 4b: After 7 days, agent reconnects
Step 5b: Some commands expired. Reconciliation detects mismatch.
Step 6b: Partial sync: cloud sends specific missing voucher IDs
Step 7b: Agent re-syncs missing data

VERIFY: Zero data loss. All orders eventually consistent.
```

### SIMULATION 5: Factory Holiday + Silence Detection
```
SIM-005: HOLIDAY SUPPRESSION
Step 1: Factory adds "Diwali Week Off" Oct 20-24 in calendar
Step 2: Oct 20: no transactions flow. Silence detector runs.
Step 3: Question 1: "Is today in holiday calendar?" → YES → SUPPRESS
Step 4: No alert sent for 5 days
Step 5: Oct 25: factory comes back online. Transactions resume.
Step 6: Buyer notified: "Supplier back online"

VERIFY: Zero false alerts during holiday. Alert suppression logged.
```

### SIMULATION 6: PO Change While ASN In-Flight (Saga Conflict)
```
SIM-006: PO CHANGE RACE CONDITION
Step 1: Buyer sends PO 850. Factory confirms. 855 sent.
Step 2: Factory creates shipment. 856 ASN queued.
Step 3: WHILE 856 is dispatching: buyer sends PO Change (860)
Step 4: Saga poller detects: PO Change received after ASN sent
Step 5: Saga marked: compensation_needed = true, reason = PO_CHANGE_WHILE_ASN_INFLIGHT
Step 6: Factory notified: "Buyer changed PO after you shipped. Review needed."

VERIFY: Saga flags conflict. Factory notified. No silent data inconsistency.
```

### SIMULATION 7: Worker Crashes Mid-Processing (Saga-Outbox Heartbeat)
```
SIM-007: WORKER CRASH RECOVERY
Step 1: SEND_PO_ACK job picked up by worker
Step 2: Worker claims saga step (locked_by = worker-1, lock_expires = +5 min)
Step 3: Worker crashes (simulate: process.kill)
Step 4: 5 minutes pass. Lock expires.
Step 5: Saga poller detects stale heartbeat
Step 6: Poller releases lock, re-inserts into outbox
Step 7: Outbox poller dispatches new BullMQ job
Step 8: New worker picks up → completes successfully

VERIFY: Order not stuck. Saga recovered. No duplicate EDI sent (idempotency key).
```

---

# ╔═══════════════════════════════════════════════════════════════════════╗
# ║  PHASE 5: SECURITY + PRODUCTION DEPLOY (Weeks 17-20)                ║
# ╚═══════════════════════════════════════════════════════════════════════╝

## ALL AGENTS — WEEKS 17-18: Security Hardening
- VAPT: Run OWASP ZAP against all API endpoints
- VAPT: 4-domain checklist (IAM, API/Network, Bridge Agent, Data Privacy)
- RLS penetration: attempt cross-tenant data access
- FLE verification: confirm PAN/GSTIN only decryptable by ADMIN
- PII log audit: grep all log files for any unredacted PII
- Keycloak hardening: admin console behind Caddy IP allowlist

## ALL AGENTS — WEEKS 19-20: Production Deploy
- OCI Free Tier: provision Ampere A1 VMs + AMD micro VMs
- Docker Compose deployed to OCI
- dbmate migrations run on production PostgreSQL
- Keycloak realm imported with MFA
- Vault initialized with Transit keys
- Caddy configured with production domain + auto-SSL
- Sandbox AS2 endpoint configured for testing
- First factory onboarded (test account)
- First end-to-end simulation on production infrastructure

## FINAL DEFINITION OF DONE — Sales Order Connector 100%:
```
[ ] Tally → FC → EDI 855 → sandbox AS2 → MDN ✓
[ ] Tally → FC → EDI 856 → sandbox AS2 → MDN ✓
[ ] Tally → FC → EDI 810 → sandbox AS2 → MDN ✓
[ ] Buyer EDI 850 → FC → Tally import ✓
[ ] Zoho webhook → FC → EDI 855 ✓
[ ] Generic REST → FC → EDI 855 ✓
[ ] Saga tracks full lifecycle: PO → ACK → ASN → Invoice → Complete ✓
[ ] SLA breach detection + escalation ✓
[ ] PO Change conflict detection ✓
[ ] Circuit breaker: buyer down → queue → recover → drain ✓
[ ] Worker crash → saga heartbeat recovery → no stuck orders ✓
[ ] Agent offline 7 days → reconnect → HWM reconciliation → sync ✓
[ ] Holiday → silence suppressed → zero false alerts ✓
[ ] AI mapping: Claude suggests → human confirms → mapping saved ✓
[ ] All 7 simulation scenarios pass end-to-end ✓
[ ] VAPT: zero critical/high findings ✓
[ ] All 68 unit/integration tests pass ✓
[ ] Zero PII in any log, any EDI output, any API response (non-ADMIN) ✓
[ ] Running on OCI Free Tier at ₹2,750/month ✓
[ ] First factory onboarded on production ✓
```

---
# END OF SALES ORDER CONNECTOR IMPLEMENTATION PLAN
# Total: 20 weeks, 3 parallel agents, 68 tests, 7 simulations
# This connector becomes the GOLD STANDARD for all future connectors
---
