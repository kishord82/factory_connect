# FactoryConnect — Comprehensive Development Plan
### Phase 1: Sales Order Connector (Gold Standard)
**Date:** April 2, 2026 | **Author:** Kishor Dama + Claude (Co-Architect)

---

## 1. DOCUMENT TRIAGE — What to Keep vs Ignore

### KEEP (place in `docs/` folder of repo)

| Document | Why Keep | Rename To |
|----------|----------|-----------|
| FC_MASTER_CONTEXT_PROMPT.md | **Single source of truth** — paste into any Claude session to restore full context | `docs/FC_MASTER_CONTEXT.md` |
| FC_Blueprint_v8_FINAL.docx | **Latest blueprint** — triple AI-reviewed, 21 corrections, implementation-ready | `docs/FC_Blueprint_v8_FINAL.docx` |
| FC_Sprint1_Agent_Prompts_FINAL.md | **Sprint 1 implementation spec** — exact prompts for 3 agents with DDL, schemas, tests | `docs/FC_Sprint1_Agent_Prompts_FINAL.md` |
| FC_SalesOrder_Connector_Complete_Plan.md | **20-week execution plan** — 68 tests, 9 simulations, all 3 agents | `docs/FC_SalesOrder_Connector_Plan.md` |
| FC_Bridge_Agent_SelfHealing_Blueprint.docx | **Deep-dive reference** — agent internals not fully covered in v8 | `docs/FC_Bridge_Agent_SelfHealing.docx` |
| FC_Proactive_Support_Blueprint.docx | **Deep-dive reference** — escalation/calendar details beyond v8 summary | `docs/FC_Proactive_Support.docx` |
| FactoryConnect_EDI_X12_AS2_Blueprint_v3.docx | **EDI spec reference** — segment-level X12/AS2 details for spec engine | `docs/FC_EDI_X12_AS2_Blueprint.docx` |
| FactoryConnect_Modules.html | **Module matrix** — 27 modules across 6 layers, current vs future state | `docs/FC_Module_Blueprint.html` |
| *(generated)* | **Architecture decision history** — merged unique details from v4-v6 reviews | `docs/FC_Architecture_Decisions_History.md` |

### MERGE THEN ARCHIVE (unique details exist in older versions)

v8 is the master, but v5 and v6 contain implementation-level details that v8 only summarizes. Before archiving, these unique details should be merged into a single **`docs/FC_Architecture_Decisions_History.md`** reference file:

| Source | Unique Content to Extract |
|--------|--------------------------|
| v5 (Gemini review) | 5 Gemini corrections with severity + rationale; Saga coordinator table design details; Adaptive polling 5-step progression logic; 3-Layer LLM training loop concept; Certification roadmap with timelines + costs |
| v6 (ChatGPT review) | Transactional Outbox full SQL implementation; Circuit breaker Opossum params (trip 60%, half-open 5m, volumeThreshold:3); PII regex patterns for Pino (GSTIN/PAN/phone/email/Aadhaar/bank); Error-code-only LLM interface design; Claim Check MinIO integration pattern; Field-level encryption data classification schema |
| v4 | Original 10-decision framework with Alternatives Rejected + Tradeoffs Accepted |

### ARCHIVE (do NOT put in repo — content merged above)

| Document | Status |
|----------|--------|
| FC_Master_Blueprint_v4.docx | Superseded; unique decision rationale merged |
| FC_Master_Blueprint_v5.docx | Superseded; Gemini review details merged |
| FC_Master_Blueprint_v6_FINAL.docx | Superseded; ChatGPT review details merged |
| FC_Blueprint_v7_FINAL.docx | Fully superseded by v8 (no unique content) |
| FC_Sprint1_Agent_Prompts.md | Superseded by FINAL version |
| FactoryConnect_Modules_1.html | Earlier version of Modules.html |

---

## 2. REPO STRUCTURE — Phase1 Branch

```
factory_connect/                     (Phase1 branch)
├── docs/                            (8 reference documents from above)
├── factoryconnect/                  (monorepo root)
│   ├── pnpm-workspace.yaml
│   ├── package.json
│   ├── tsconfig.base.json
│   ├── .eslintrc.cjs
│   ├── .prettierrc
│   ├── .env.example
│   ├── Makefile                     (dev/build/test/lint/fmt targets)
│   ├── apps/
│   │   ├── api/                     (Agent 1: Core backend)
│   │   └── portal/                  (Agent 3: React frontend)
│   ├── packages/
│   │   ├── database/                (Agent 1: migrations, pool, pollers)
│   │   ├── shared/                  (Agent 1: Zod schemas, types, errors)
│   │   ├── observability/           (Agent 1: Pino, PII redactor, metrics)
│   │   ├── mapping-engine/          (Agent 1: JSONata + AI mapper)
│   │   └── edi-engine/              (Agent 1: spec engine + envelope builder)
│   ├── bridge-agent/                (Agent 2: standalone Node.js agent)
│   └── infra/
│       └── docker/                  (Docker Compose + Caddy + Keycloak)
└── README.md
```

---

## 3. PARALLEL WORKSTREAMS — 5 Independent Tracks

The work is split into **5 independent tracks** that can run in parallel from Week 1. Each track has zero dependency on others until integration points (marked with 🔗).

### TRACK A — Foundation & Database (Start First, Week 1-2)

This MUST start first because it produces `packages/shared` and `packages/database` that other tracks import.

| # | Task | Details | Output | Est |
|---|------|---------|--------|-----|
| A1 | Monorepo scaffolding | pnpm workspace, tsconfig.base, eslint, prettier, Makefile | Root config files | 2h |
| A2 | Docker Compose | PG16 + Redis7 + Keycloak24 + Vault + Caddy (ARM64) | `infra/docker/` | 3h |
| A3 | Migration 001: Foundation tables | 20+ tables with RLS, immutable audit_log, hash-chain trigger | `001_foundation.sql` | 6h |
| A4 | Migration 002: History triggers | Generic trigger for INSERT/UPDATE/DELETE on all tenant tables | `002_history_triggers.sql` | 3h |
| A5 | Migration 003: Feature system | feature_flags + app_config defaults | `003_feature_system.sql` | 2h |
| A6 | Migration 004: Partner system | partners + referrals + commission_ledger | `004_partner_system.sql` | 2h |
| A7 | Zod canonical schemas | CanonicalOrder, Shipment, Invoice + Address + LineItem | `packages/shared/` | 3h |
| A8 | Database pool + tenant context | pg Pool, setTenantContext, SET LOCAL | `packages/database/` | 2h |
| A9 | Observability package | Pino logger, PII redactor (GSTIN/PAN/phone/email/Aadhaar), metrics | `packages/observability/` | 3h |
| A10 | Tests: RLS, PII, audit hash-chain | TEST-001 through TEST-010 | 10 test cases | 4h |

**🔗 Dependency gate:** Once A7 (schemas) + A8 (database) complete → Tracks B, C, D, E can begin.

**Estimated total: ~30 hours**

---

### TRACK B — API & Workflow Engine (Week 2-6)

| # | Task | Details | Output | Est |
|---|------|---------|--------|-----|
| B1 | Express.js 5 bootstrap | Config loader (Zod-validated env), health endpoint | `apps/api/src/index.ts` | 2h |
| B2 | Auth middleware | JWT verification via Keycloak, extract factory_id/role | `middleware/auth.ts` | 3h |
| B3 | Tenant context middleware | SET LOCAL app.current_tenant + current_user + correlation_id | `middleware/tenant-context.ts` | 2h |
| B4 | Validation + idempotency middleware | Zod middleware, X-Idempotency-Key + Redis lock + DB unique | `middleware/validate.ts`, `idempotency.ts` | 3h |
| B5 | Error handler + correlation ID | Structured FC_ERR codes, X-Correlation-ID injection | `middleware/error-handler.ts` | 2h |
| B6 | Feature gate middleware | requireFeature() — platform flag + factory preference check | `middleware/feature-gate.ts` | 2h |
| B7 | Order routes + service | POST/GET orders, confirmOrder with transactional outbox (4 writes in 1 tx) | `routes/orders.ts`, `services/order-service.ts` | 5h |
| B8 | Shipment routes + service | POST/GET shipments, triggers 856 via outbox | `routes/shipments.ts` | 3h |
| B9 | Invoice routes + service | POST/GET invoices, triggers 810 via outbox | `routes/invoices.ts` | 3h |
| B10 | Connection routes | CRUD connections, status management | `routes/connections.ts` | 2h |
| B11 | Resync service + routes | 9-state resync state machine, auto/manual approve, duplicate detection | `routes/resync.ts`, `services/resync-service.ts` | 5h |
| B12 | Outbox poller | 5-second poll, dispatch to BullMQ, idempotent | `packages/database/outbox-poller.ts` | 3h |
| B13 | Saga coordinator + poller | 15-state lifecycle, SLA breach detection, stale heartbeat recovery, 60s poll | `packages/database/saga-poller.ts` | 5h |
| B14 | Impact analyzer | Walk relationship_registry, build dependency tree, check BLOCKS_REVERT | `services/impact-analyzer.ts` | 4h |
| B15 | Revert service | Read before_state from record_history, validate FKs, execute in tx | `services/revert-service.ts` | 3h |
| B16 | Calendar + escalation routes | Calendar CRUD (7 sources), escalation rules | `routes/calendar.ts` | 3h |
| B17 | Export/Import routes | Bidirectional data exchange, password-protected ZIP | `routes/export.ts` | 3h |
| B18 | Admin routes | FC admin: factory list, Act As impersonation, feature flags | `routes/admin/` | 4h |
| B19 | Tests: API + workflow | TEST-011 through TEST-020 | 10 test cases | 5h |
| B20 | **Real-time notification engine** | WebSocket server (Socket.IO) for push notifications to portal. Events: order status change, SLA breach warning, connection health change, saga step completion, mapping update applied, sandbox test result ready. Per-tenant rooms (RLS-aware). Fallback to SSE for restricted networks. Store unread notifications in `notifications` table. | `services/notification-service.ts` | 5h |
| B21 | **Multi-channel alert service** | **3 channels with phased rollout:** **Email (default, enabled Day 1):** Nodemailer + configurable SMTP. Triggered by: SLA breach, connection down >30min, daily digest (orders processed, errors, pending actions). Templates stored in DB (editable by factory). **SMS (built but feature-flagged OFF):** Twilio/MSG91 (Indian provider). Provider interface ready, templates built, awaiting contract + template approval to enable. **WhatsApp (built but feature-flagged OFF):** WhatsApp Business API integration via provider interface. Rich message templates with buttons (e.g., "View Order" deep-link). Awaiting Meta Business verification + template approval to enable. **Architecture:** All 3 channels share one `NotificationDispatcher` with channel-specific adapters behind a common `NotificationChannel` interface. `notification_templates` table: template_id, channel (email/sms/whatsapp), event_type, subject, body_template (Handlebars), language, status (draft/approved/active). `notification_preferences` per user: channel toggles + quiet hours. Feature flag: `sms_notifications_enabled`, `whatsapp_notifications_enabled` — flip to ON after contracts signed. Enable after E2E simulation passes. | `services/alert-service.ts` | 7h |
| B22 | **Rate limiter + API quota** | Per-factory rate limits: 100 req/min API, 1000 req/day sandbox. Per-plan quotas (Free: 50 orders/month, Starter: 500, Growth: 5000, Enterprise: unlimited). Redis sliding window. Returns `X-RateLimit-Remaining` header. 429 with retry-after. Admin can override per factory. | `middleware/rate-limiter.ts` | 3h |
| B23 | **API documentation (OpenAPI/Swagger)** | Auto-generated OpenAPI 3.1 spec from Zod schemas. Swagger UI at `/docs`. Interactive "Try It" for sandbox mode APIs. Per-factory API key generation for REST adapter factories. Code samples in Node.js, Python, cURL. Versioned: `/v1/docs`. | `routes/api-docs.ts` | 4h |
| B24 | **Webhook outbound engine** | Factory registers webhook URLs for events (order.created, shipment.sent, invoice.generated, error.occurred, sla.breached). FC sends signed POST (HMAC-SHA256) with retry (3 attempts, exponential backoff). Webhook log with response codes. "Test Webhook" button. Supports filtering by event type + buyer. | `services/webhook-service.ts` | 5h |
| B25 | **Pre-dispatch validation engine** | Before any EDI/cXML leaves FC: validate all required fields present, field formats correct (date, numeric, string length), business rules (line item totals = order total, valid UPC/EAN, DUNS/GLN format). Returns structured validation errors with field path + fix suggestion. Blocks dispatch if critical errors. Warnings for non-critical. Per-buyer validation rule sets (Walmart is stricter than others). | `services/validation-engine.ts` | 5h |
| B26 | **Analytics + reporting engine** | Aggregate metrics: orders/day, avg processing time, error rate, SLA compliance %, top error codes, orders by buyer, orders by status. Time-series data stored in `analytics_daily` table (materialized by cron). Export as CSV/PDF. Feeds the dashboard charts + FC admin reporting. | `services/analytics-service.ts` | 5h |

**Estimated total: ~96 hours** (was ~62h, +34h for notifications/email/SMS/WhatsApp, rate limiting, API docs, webhooks, validation, analytics)

---

### TRACK C — Mapping + AI + EDI Engine (Week 3-10)

| # | Task | Details | Output | Est |
|---|------|---------|--------|-----|
| C1 | JSONata mapping engine | MappingConfig CRUD, transform functions (toDate, toEdiDate, etc.) | `packages/mapping-engine/` | 5h |
| C2 | AI mapper — Layer 1 (Claude) | Claude Haiku/Sonnet, PII scrubbing before call, confidence scores | `packages/ai-mapper/` | 5h |
| C3 | AI mapper — Layer 2 (fallback) | Configurable fallback LLM endpoint (Gemini/GPT) | L2 fallback | 3h |
| C4 | AI mapper — Layer 3 (local) | Placeholder + logging for future local model training | L3 stub + logging | 2h |
| C5 | LLM cache + usage tracking | Cache by prompt_hash, hit rate tracking, budget guardrails | `llm_cache` + `llm_usage_log` | 3h |
| C5b | Document analyzer service | Accept multi-file uploads (XML, JSON, CSV, PDF, Excel). Parse each format, extract all field names + sample values + data types. Return unified field inventory across all uploaded docs. | `packages/ai-mapper/document-analyzer.ts` | 6h |
| C5c | AI field description generator | For each discovered source field, AI generates: human-readable description, suggested canonical mapping, confidence score, suggested transform function. Batch all fields in one LLM call. | `packages/ai-mapper/field-describer.ts` | 4h |
| C5d | Chat-based mapping updater | API endpoint that accepts natural language mapping instructions. AI interprets the instruction → updates mapping config → returns updated mapping table. Supports: add, remove, rename, change transform. | `packages/ai-mapper/chat-mapper.ts` | 5h |
| C5e | Mapping version manager (backend) | Versioned mapping configs: each save = new version. Diff between versions. Rollback API. Active version flag. Draft → Review → Active workflow. Changes apply only to future transactions. | `packages/mapping-engine/version-manager.ts` | 4h |
| C5f | Mapping export service | Generate mapping report in JSON, CSV, or PDF. Include: source field, canonical field, transform, description, confidence, version, last modified. | `packages/mapping-engine/export-service.ts` | 3h |
| C5g | **Field transformation rules engine** | Core rules engine supporting: **Date format mapping** (DD/MM/YYYY → YYYY-MM-DD, configurable per customer), **Field concatenation** (A + B → X1, e.g., firstName + lastName → fullName, with configurable separator), **Field splitting** (source.field → X1 + X2 using delimiter/position), **Value mapping** (source value "1" → CDM "X1", value "2" → CDM "X2", static lookup tables), **Conditional rules** (IF fieldA = "X" THEN map to Y ELSE map to Z), **Arithmetic** (qty × unitPrice → lineTotal), **Default/fallback values** (if source empty → use default). Rules stored as JSON configs per mapping. | `packages/mapping-engine/transform-rules.ts` | 8h |
| C5h | **Rule builder API** | CRUD endpoints for transform rules: create rule, attach to mapping field, reorder priority, test rule against sample data, validate rule syntax. Each rule has: sourceFields[], operator, params, targetField, priority, enabled flag. | `packages/mapping-engine/rule-builder.ts` | 5h |
| C5i | **Rule execution pipeline** | Execute rules in priority order per field during transform. Pipeline: raw value → apply rules chain → validate output type → write to canonical. Supports chaining (output of rule 1 = input of rule 2). Logs each rule execution for audit. | `packages/mapping-engine/rule-executor.ts` | 5h |
| C6 | Source adapters: Tally | Parse Tally SALESORDER XML → apply mapping → CanonicalOrder | Tally adapter | 4h |
| C7 | Source adapters: Zoho | Verify HMAC, parse Zoho SO JSON → mapping → CanonicalOrder | Zoho adapter | 3h |
| C8 | Source adapters: Generic REST | Validate API key, accept CanonicalOrder JSON directly | REST adapter | 2h |
| C9 | Routing engine | resolveConnection(factory_id, buyer_identifier) → Connection | Routing service | 2h |
| C10 | Data-driven EDI spec engine | Generic EdiSpecEngine reads JSON spec maps per buyer | `packages/edi-engine/` | 8h |
| C11 | EDI envelope builder | ISA/GS/GE/IEA generation, control number sequencer (never duplicate) | Envelope builder | 4h |
| C12 | Walmart 855 spec | walmart-855.spec.json (PO Acknowledgment) | First spec map | 4h |
| C13 | Walmart 856 spec | walmart-856.spec.json (ASN with HL hierarchy S→O→P→I) | Second spec map | 5h |
| C14 | Walmart 810 spec | walmart-810.spec.json (Invoice with TDS totals) | Third spec map | 4h |
| C15 | Inbound EDI 850 parser | x12-parser → route to factory → mapping → create order | 850 inbound | 5h |
| C16 | OpenAS2 sidecar | Docker container, shared volume, MDN handling (sync + async) | `infra/docker/openas2/` | 5h |
| C17 | Circuit breaker (Opossum) | Per-connection, trip at 60%, half-open at 5 min | Circuit breaker | 3h |
| C18 | BullMQ pipeline jobs | SEND_PO_ACK, SEND_ASN, SEND_INVOICE, PROCESS_INBOUND_850 | BullMQ workers | 6h |
| C19 | Worker heartbeat | Claim saga step before processing, release on crash | Heartbeat logic | 3h |
| C20 | DLQ + retry | Exponential backoff 5s/30s/5m/30m/2h, DLQ after 5 failures | DLQ handling | 3h |
| C21 | Tests: Mapping + EDI | TEST-A1-101 through TEST-A1-229 | 29 test cases | 8h |
| C22 | **Sandbox test harness — API endpoint** | Dedicated `/sandbox/test` REST endpoint. Factory sends a real input payload (JSON/XML) → system runs full pipeline in sandbox mode: parse → apply mapping → apply transform rules → generate canonical → generate EDI output. Returns **step-by-step result** at each stage: raw input, mapped fields, transformed fields, canonical output, final EDI/cXML. No actual dispatch to buyer — all output is captured and returned. Sandbox flag on connection config (`mode: sandbox | uat | production`). | `services/sandbox-test-service.ts` | 6h |
| C23 | **Sandbox comparison engine** | Compare sandbox output against expected output. Factory uploads expected EDI/canonical → engine diffs field-by-field: matched, mismatched, missing, extra. Generates comparison report with pass/fail per field. Supports bulk test: run N sample payloads, show aggregate pass rate. | `services/sandbox-comparator.ts` | 5h |
| C24 | **Sandbox test suite manager** | Save test payloads as reusable test cases per connection. Factory builds a test suite: input + expected output pairs. "Run All Tests" → executes suite, shows results. Regression testing: re-run after any mapping/rule change to verify nothing broke. | `services/sandbox-test-suite.ts` | 4h |
| C25 | **Mock buyer responder** | Simulates buyer responses in sandbox: mock 997 (FA), mock 855 response for inbound 850 tests. Configurable response templates per buyer spec. Allows factory to test full round-trip without real buyer credentials. | `services/mock-buyer-responder.ts` | 4h |
| C26 | **Connector catalog registry** | `connector_catalog` table: connector_id, name, type (source/target), protocol (EDI X12, cXML, REST, EDIFACT), supported_flows[] (Sales Order, Purchase Order, ASN, Invoice, Returns, Credit Memo), status (available/coming_soon/beta), sample_payload per flow, description, icon_url. Seed with all FC connectors: Tally Prime, Zoho Books, SAP B1, Generic REST (sources) + Walmart EDI, SAP Ariba, Coupa, Generic EDI (targets). API: `GET /catalog/connectors`, `GET /catalog/connectors/:id/flows`, `GET /catalog/connectors/:id/flows/:flow/sample`. Public endpoint — no auth needed for catalog browsing. | `services/connector-catalog.ts` | 5h |
| C27 | **Sandbox flow simulator** | Given a selected source connector + target connector + flow type from catalog → auto-load sample payload + sample mapping + sample rules → run full sandbox pipeline → show result. Factory picks from dropdown: "Tally Prime → Walmart (Sales Order 850→855→856→810)" → system runs the demo flow end-to-end with mock data. No credentials needed. Shows what FC can do before the factory subscribes. | `services/sandbox-flow-simulator.ts` | 5h |

**Estimated total: ~149 hours** (was ~80h, +22h AI Mapping Studio, +18h Transform Rules, +19h Sandbox Test Harness, +10h Connector Catalog)

---

### TRACK D — Bridge Agent (Week 2-12)

| # | Task | Details | Output | Est |
|---|------|---------|--------|-----|
| D1 | Bridge agent scaffold | Node.js 22 + TS strict, config loader, entry point | `bridge-agent/` | 2h |
| D2 | Tally XML client | HTTP POST to localhost:9000, fast-xml-parser, 15s timeout | `poller/tally-client.ts` | 3h |
| D3 | Tally XML parser | Extract only mapping-config fields (data minimization) | `poller/tally-xml-parser.ts` | 3h |
| D4 | Adaptive polling engine | 5/10/15/30 min based on CPU+RAM+Tally latency, PAUSE at 95% | `poller/adaptive-poller.ts` | 4h |
| D5 | Local SQLite queue | Encrypted, WAL mode, survives restart/power failure | `queue/local-queue.ts` | 3h |
| D6 | Queue drainer | Sends queued messages through tunnel, marks sent | `queue/queue-drainer.ts` | 2h |
| D7 | WebSocket tunnel client | mTLS + cert pinning, HMAC signing, heartbeat 30s | `tunnel/tunnel-client.ts` | 5h |
| D8 | Reconnect strategy | Exponential backoff 1s→30s max, ±30% jitter | `tunnel/reconnect-strategy.ts` | 2h |
| D9 | OTP bootstrap | Activation token → CSR → Vault PKI → cert → DPAPI store | `security/otp-bootstrap.ts` | 4h |
| D10 | Cert manager | mTLS cert lifecycle, auto-renew 90-day certs | `security/cert-manager.ts` | 3h |
| D11 | Windows credential store | DPAPI integration for storing secrets | `security/credential-store.ts` | 2h |
| D12 | Health orchestrator | Run all 7-layer probes every 2 min | `health/health-orchestrator.ts` | 3h |
| D13 | Health probes L1-L7 | 35+ probes across OS, Network, Security, Persistence, Tunnel, App, Version | `health/probes/` (7 files) | 10h |
| D14 | Rules engine | 40+ deterministic failure patterns with signatures + fix chains | `health/rules-engine.ts` | 6h |
| D15 | Auto-fix executor | DNS flush, alt DNS, port scan, proxy detect, cert renew, etc. | `health/auto-fix-executor.ts` | 5h |
| D16 | Diagnostic bundle | 15 files, PII scrubbed, encrypted ZIP | `diagnostics/bundle-creator.ts` | 3h |
| D17 | HWM reconciliation | Daily hash of last 100 vouchers, mismatch → partial sync | `diagnostics/reconciliation.ts` | 4h |
| D18 | File-drop: Tally XML writer | Canonical → Tally import XML, atomic write (.tmp → rename) | `file-drop/tally-xml-writer.ts` | 3h |
| D19 | Import monitor | Detect Tally file pickup, ack back to FC Cloud | `file-drop/import-monitor.ts` | 2h |
| D20 | Auto-upgrade system | 22-step lifecycle, config migration chain, rollback on any failure | Auto-upgrader | 6h |
| D21 | Agent Hub (server-side) | WebSocket server in apps/api that terminates agent tunnels | `apps/api/agent-hub/` | 5h |
| D22 | Claim check | Payloads >256KB → MinIO URI in tunnel message | Claim check | 2h |
| D23 | pkg build to .exe | Compile to single Windows executable | Build config | 2h |
| D24 | Tests: Bridge agent | TEST-A2-001 through TEST-A2-212 | 24 test cases | 8h |

**Estimated total: ~91 hours**

---

### TRACK E — Portal UI (Week 2-14)

| # | Task | Details | Output | Est |
|---|------|---------|--------|-----|
| E1 | React 19 + Vite 6 scaffold | Tailwind v4 + shadcn/ui + Zustand + TanStack Query | `apps/portal/` | 3h |
| E2 | Keycloak integration | keycloak-js 25, MFA enforcement, JWT extraction | `lib/keycloak.ts` | 3h |
| E3 | App shell | Sidebar nav + header (user info + notification bell) + content area | `components/layout/` | 4h |
| E4 | Dashboard page | Stats cards (orders, connections, errors, health score), recent orders | `components/dashboard/` | 4h |
| E5 | Orders page | TanStack Table with filters (status, buyer, date range), pagination | `components/orders/OrdersPage.tsx` | 4h |
| E6 | Order detail | Full view with all fields, line items, addresses | `components/orders/OrderDetail.tsx` | 3h |
| E7 | Saga timeline | Horizontal PO→ACK→ASN→Invoice lifecycle, SLA badges, OVERDUE red | `components/orders/SagaTimeline.tsx` | 4h |
| E8 | PO inbox | Incoming POs, Confirm/Reject buttons, triggers EDI 855 | `components/po-inbox/` | 4h |
| E9 | Create shipment form | Carrier, tracking, SSCC, pack details → triggers 856 | `components/shipments/` | 4h |
| E10 | Create invoice form | Auto-fill from order, tax calc (GST/CGST/SGST) → triggers 810 | `components/invoices/` | 4h |
| E11 | Product catalog | CRUD for item master, factory_sku ↔ buyer_sku mapping | `components/products/` | 4h |
| E12 | Connections page | List all buyer connections with status badges (traffic lights) | `components/connections/ConnectionsPage.tsx` | 3h |
| E13 | Connection setup wizard | 7-step: Select buyer → IDs → AI mapping → Review → Test → SLA → Activate | `components/connections/SetupWizard.tsx` | 8h |
| E14 | AI Mapping Studio — Document Upload | Multi-document upload zone (drag-drop any format: XML, JSON, CSV, PDF, Excel). AI parses ALL uploaded docs to discover source fields. Progress indicator per file. | `components/mapping/DocumentUpload.tsx` | 6h |
| E14b | AI Mapping Studio — Field Analysis | AI analyzes source fields → shows Source Field ↔ Canonical Field table with: field name, data type, sample value, AI description of what the field means, confidence %, mapping status (mapped/unmapped/needs-review). Color-coded rows (green/yellow/red). | `components/mapping/FieldAnalysis.tsx` | 8h |
| E14c | AI Mapping Studio — Drag-Drop Editor | Visual drag-drop to manually override any AI suggestion. Split-pane: source fields (left) → canonical fields (right). Draw lines between fields. Transform function picker per mapping (toDate, toUpperCase, etc.). | `components/mapping/MappingEditor.tsx` | 8h |
| E14d | AI Mapping Studio — Chat Refinement | Embedded chat window where customer types natural language to update mappings (e.g., "map VOUCHERNUMBER to buyer_po_number" or "ignore the NARRATION field"). AI updates the mapping table in real-time. Chat history preserved per mapping config. | `components/mapping/MappingChat.tsx` | 10h |
| E14e | AI Mapping Studio — Export & Versioning | Download concluded mapping as JSON, CSV, or PDF report. Each save creates a new version (v1, v2, v3...). Version history with diff view. Customer can revert to any previous version. Active version clearly marked. | `components/mapping/MappingExport.tsx` | 5h |
| E14f | AI Mapping Studio — Dynamic Updates | Customer can reopen any saved mapping anytime to modify for future transactions. Changes apply to new transactions only (existing ones untouched). Approval workflow: draft → review → active. Notification when mapping is updated. | `components/mapping/MappingVersionManager.tsx` | 5h |
| E14g | **Field Transform Rules UI** | Visual rule builder per mapping field. Dropdown to pick rule type: Date Format, Concatenate, Split, Value Map, Conditional, Arithmetic, Default. Each rule type has its own config form (e.g., Date: source format + target format picker; Concat: select fields + separator; Value Map: editable lookup table with add/remove rows; Conditional: if/then/else builder). Drag to reorder rule priority. "Test Rule" button with live sample data preview. | `components/mapping/TransformRuleBuilder.tsx` | 10h |
| E14h | **Value Mapping Table UI** | Dedicated UI for static value lookups: source value column ↔ target value column. Add/remove/bulk-import rows. Search/filter. Used when customer says "value 1 = X1, value 2 = X2". Supports CSV import of lookup tables for large mappings. | `components/mapping/ValueMappingTable.tsx` | 5h |
| E14i | **Rule Test & Preview** | Test any transform rule chain against real sample data from uploaded documents. Shows: input value → rule 1 output → rule 2 output → final value. Highlights errors in red. Bulk test: run all rules against all sample rows, show pass/fail summary. | `components/mapping/RuleTestPreview.tsx` | 5h |
| E14j | **Sandbox Test Console** | After mapping + rules are finalized, factory pastes or uploads a real input payload (JSON/XML). Click "Run Sandbox Test" → shows **pipeline visualization**: Input → Parsed Fields → Mapped to Canonical → Transform Rules Applied → EDI/cXML Output. Each stage expandable with full field-level detail. Green checkmarks for success, red X for errors at each stage. Download output at any stage. | `components/sandbox/SandboxConsole.tsx` | 8h |
| E14k | **Sandbox Comparison View** | Side-by-side diff: "Expected Output" (uploaded by factory) vs "Actual Output" (from sandbox run). Field-by-field: ✅ match, ❌ mismatch, ⚠️ missing, ➕ extra. Summary bar: "42/45 fields matched (93%)". Click any mismatch to jump back to mapping editor to fix. | `components/sandbox/ComparisonView.tsx` | 6h |
| E14l | **Test Suite Manager UI** | Save input+expected pairs as named test cases. Group into test suites per connection/buyer. "Run All" button → progress bar → results grid (pass/fail per test case). Re-run after any mapping change for regression testing. Import/export test suites as JSON. | `components/sandbox/TestSuiteManager.tsx` | 5h |
| E14m | **Sandbox Dashboard** | Overview page for sandbox mode: total test runs, pass rate trend chart, last run results, quick-launch buttons per connection. Status badge per connection: "Ready for Production" (all tests pass) vs "Needs Attention" (failures exist). Gate: cannot promote to UAT/Production until sandbox pass rate = 100%. | `components/sandbox/SandboxDashboard.tsx` | 5h |
| E14n | **Connector & Flow Selector** | Dropdown at top of sandbox: **Step 1** — pick Source Connector (Tally Prime, Zoho Books, SAP B1, Generic REST) with logo icons. **Step 2** — pick Target Connector (Walmart EDI, SAP Ariba cXML, Coupa REST, Generic EDI). **Step 3** — pick Flow (Sales Order, Purchase Order, ASN, Invoice, Returns, Credit Memo). Dropdown shows available flows with green dot, coming-soon flows with grey dot + "Coming Soon" badge. Selected combo loads sample payload + sample mapping automatically. "Try It" button → runs sandbox simulator → shows full pipeline result. Acts as **product showcase**: factories see all connectors FC supports, try before they buy, and request new flows. | `components/sandbox/ConnectorFlowSelector.tsx` | 8h |
| E14o | **Connector Catalog Page** | Public-facing page (no login required): grid of all connectors with logos, descriptions, supported flows, protocol badges (EDI X12, cXML, REST). Click any connector → detail card with: supported flows, sample data formats, integration complexity rating, "Try in Sandbox" CTA button. Filter by: source/target, protocol, flow type. "Request a Connector" form for factories to submit interest in new connectors (stored in `connector_requests` table, visible in admin). | `components/catalog/ConnectorCatalog.tsx` | 8h |
| E14p | **Notification Center** | Bell icon in header with unread count badge. Dropdown panel: grouped by type (orders, connections, alerts, mapping). Click notification → navigates to relevant page. Mark read/unread, mark all read. **Notification preferences page:** per-event toggle matrix — rows = event types (SLA breach, connection down, order status, mapping updated, etc.), columns = channels (In-App ✅ always on, Email ✅ default on, SMS 🔒 greyed "Coming Soon", WhatsApp 🔒 greyed "Coming Soon"). SMS/WhatsApp columns become active when feature flags are enabled post-contract. Quiet hours config. Daily digest toggle (email only initially). **Template preview:** factory can preview what each notification looks like per channel before enabling. | `components/notifications/NotificationCenter.tsx` | 6h |
| E14q | **Analytics Dashboard** | Rich dashboard tab: orders/day line chart (7d/30d/90d), processing time histogram, SLA compliance gauge, error rate trend, top 5 error codes bar chart, orders by buyer pie chart. Date range picker. Export charts as PNG or data as CSV. Compare periods: "this month vs last month". | `components/analytics/AnalyticsDashboard.tsx` | 8h |
| E14r | **Webhook Manager UI** | CRUD for webhook endpoints: URL, secret, events to subscribe, active/paused toggle. Delivery log: timestamp, event, HTTP status, response time, payload preview. "Resend" button for failed deliveries. "Test" button sends sample event. | `components/settings/WebhookManager.tsx` | 4h |
| E14s | **Validation Results View** | Before any dispatch, show validation results: green (all pass), yellow (warnings), red (blocking errors). Expandable per-field validation: field name, expected format, actual value, error message, fix suggestion. "Fix & Retry" shortcut → jumps to relevant data entry. Per-buyer rule summary: "Walmart requires: UPC, DUNS, SSCC — you're missing: SSCC". | `components/orders/ValidationResults.tsx` | 5h |
| E14t | **API Explorer** | Embedded Swagger UI at `/docs` route in portal. Factory's API key management: generate, revoke, rotate keys. Usage stats per key. Code snippet generator: select endpoint → get copy-paste code in Node.js, Python, cURL, PHP. | `components/developer/ApiExplorer.tsx` | 5h |
| E14u | **Guided Troubleshooting Wizard** | When any error occurs anywhere in the portal, show a "Fix This" button. Opens a guided wizard: shows the error in plain English (not just FC_ERR codes), explains what happened, shows the exact field/payload that caused it, provides step-by-step fix instructions, "Apply Fix" button where possible (e.g., missing field → opens the form with that field highlighted). Powered by the deterministic diagnostics engine (40+ patterns). | `components/support/TroubleshootingWizard.tsx` | 6h |
| E15 | Resync page | Single retry, bulk resync, UAT/PROD routing, progress tracking | `components/resync/` | 4h |
| E16 | Export/Import page | Format picker, password config, bidirectional data exchange | `components/export/` | 3h |
| E17 | Calendar page | Monthly grid, color-coded (national/factory/maintenance), holiday form | `components/calendar/` | 5h |
| E18 | Barcode labels | SSCC-18 label preview + PDF print | `components/labels/` | 3h |
| E19 | Returns page | Return form, credit memo generation | `components/returns/` | 3h |
| E20 | Transaction log | Sync status, retry failed, filters by status/buyer/date | `components/transactions/` | 3h |
| E21 | Settings page | Security prefs, escalation config, feature toggles, retention config | `components/settings/` | 5h |
| E22 | Record history | Timeline of all mutations, before/after view, Revert button, Impact modal | `components/record-history/` | 5h |
| E23 | AI fix history | Fix timeline, Undo button, dry-run preview | `components/ai-fixes/` | 3h |
| E24 | Onboarding checklist | Interactive getting-started wizard for new factories | `components/onboarding/` | 3h |
| E25 | FC Admin: Factory list | All factories with health scores | `components/admin/FactoryList.tsx` | 3h |
| E26 | FC Admin: Act As | Impersonation with yellow banner, action logging, 2hr auto-expire | `components/admin/ActAsFactory.tsx` | 4h |
| E27 | FC Admin: Partner dashboard | Partners, commissions, referral codes, payout history | `components/admin/PartnerDashboard.tsx` | 4h |
| E28 | FC Admin: Token observatory | AI budget usage, cost by model/task, cache hit rate, optimization tips | `components/admin/AiOperations.tsx` | 4h |
| E29 | FC Admin: Feature flags | Global feature toggle admin | `components/admin/FeatureFlagAdmin.tsx` | 2h |
| E30 | FC Admin: DLQ viewer | Dead letter queue inspect, modify, replay | `components/admin/DLQViewer.tsx` | 3h |
| E31 | FC Admin: Agent fleet | Agent versions, health, upgrade status | `components/admin/AgentFleet.tsx` | 3h |
| E32 | i18n: English + Hindi | 50+ translation keys, language switcher | `i18n/en.json`, `hi.json` | 3h |
| E33 | Tests: Portal | TEST-A3-001 through TEST-A3-214 | 14 test cases | 6h |

**Estimated total: ~258 hours** (was ~130h, +34h AI Mapping Studio, +20h Transform Rules, +24h Sandbox Test, +16h Connector Catalog, +34h Notifications/Analytics/Webhooks/Validation/API Explorer/Troubleshooting)

---

## 4. EXECUTION TIMELINE — Gantt View

```
Week:  1  2  3  4  5  6  7  8  9  10 11 12 13 14 15 16 17 18 19 20 21 22 23 24 25 26
       ├──┤──┤──┤──┤──┤──┤──┤──┤──┤──┤──┤──┤──┤──┤──┤──┤──┤──┤──┤──┤──┤──┤──┤──┤──┤──┤

TRACK A [██████]                                                              ← Foundation (Week 1-2)
        🔗 schemas ready

TRACK B      [██████████████████████████████████]                             ← API + Workflow + Notifications + Webhooks + Validation + Analytics (Week 2-8)
TRACK C         [████████████████████████████████████████████]                 ← Mapping + AI + EDI + Transform Rules + Sandbox + Catalog (Week 3-12)
TRACK D      [████████████████████████████████████████]                        ← Bridge Agent (Week 2-12)
TRACK E      [████████████████████████████████████████████████████████████████] ← Portal UI full feature set (Week 2-18)

                                                                   [████████] ← E2E Integration (Week 19-22)
                                                                         [████████] ← Security + VAPT (Week 23-24)
                                                                               [████████] ← Production Deploy (Week 25-26)
```

### Parallelism Strategy

- **Week 1-2:** Track A runs alone (produces shared foundation)
- **Week 2+:** Tracks B, C, D, E all run in parallel
- **Week 19-22:** All tracks converge for 9 simulation scenarios + sandbox validation
- **Week 23-24:** Security hardening + VAPT across all tracks
- **Week 25-26:** OCI Free Tier deploy + first factory onboard

---

## 5. INTEGRATION TEST SCENARIOS (Week 15-16)

| # | Scenario | What It Validates |
|---|----------|-------------------|
| SIM-001 | Happy path: Tally → 855 → 856 → 810 → Complete | Full order-to-cash cycle, saga completion |
| SIM-002 | Inbound PO: Buyer 850 → FC → Tally import | Inbound EDI → file-drop → Tally pickup |
| SIM-003 | AS2 endpoint down → circuit breaker → recovery | Opossum trip/half-open/close, zero message loss |
| SIM-004 | Agent offline 7 days → reconnect → HWM reconciliation | Tunnel recovery, partial sync, eventual consistency |
| SIM-005 | Factory holiday → silence suppression | Calendar + decision tree = zero false alerts |
| SIM-006 | PO Change while ASN in-flight | Saga conflict detection, compensation flagging |
| SIM-007 | Worker crash mid-processing | Heartbeat recovery, no stuck orders, no duplicate EDI |
| SIM-008 | Single transaction resync | New control number, new idempotency key, no duplicate |
| SIM-009 | Bulk resync to UAT (500 messages) | Progress tracking, UAT routing, throughput |

---

## 6. TEST SUMMARY

| Track | Unit Tests | Integration Tests | Total |
|-------|-----------|-------------------|-------|
| A: Foundation | 10 | — | 10 |
| B: API + Workflow | 10 | — | 10 |
| C: Mapping + EDI | 29 | — | 29 |
| D: Bridge Agent | 24 | — | 24 |
| E: Portal | 14 | — | 14 |
| Integration | — | 9 simulations | 9 |
| Security | — | 22 VAPT cases | 22 |
| **TOTAL** | **87** | **31** | **118** |

---

## 7. HOUR ESTIMATES BY TRACK

| Track | Hours | Can Run In Parallel? |
|-------|-------|---------------------|
| A: Foundation & Database | ~30h | Starts first (Week 1-2) |
| B: API + Workflow + Notifications + Webhooks + Validation + Analytics | ~96h | Yes (after A7+A8) |
| C: Mapping + AI + EDI + Mapping Studio + Transform Rules + Sandbox + Catalog | ~149h | Yes (after A7+A8) |
| D: Bridge Agent | ~91h | Yes (after A7) |
| E: Portal UI (full feature set) | ~258h | Yes (after A7) |
| Integration Testing | ~40h | After B+C+D+E |
| Security + VAPT | ~30h | After integration |
| Production Deploy | ~20h | After security |
| **TOTAL** | **~714h** | |

**With 5 parallel tracks:** ~26 weeks calendar time
**With 3 parallel agents (as per blueprint):** ~26 weeks
**Solo developer (40h/week):** ~18 weeks effective coding (some tracks overlap)

---

## 8. RECOMMENDED SKILLS & TOOLS TO INSTALL

### For Faster Development with Claude Code

1. **Use 3 Claude Code sessions in parallel** — exactly as the Sprint 1 Agent Prompts describe. Paste the Master Context Prompt into each session first, then the agent-specific prompt.

2. **Recommended MCP servers to connect:**
   - **GitHub MCP** — for PR creation, code review, issue tracking
   - **PostgreSQL MCP** — for direct DB inspection during development
   - **Docker MCP** — for container management

3. **VS Code Extensions:**
   - ESLint + Prettier (auto-format on save)
   - Docker (container management)
   - PostgreSQL Explorer (query runner)
   - REST Client (API testing)
   - Tailwind CSS IntelliSense (portal development)

4. **Dev Machine Setup:**
   ```bash
   # Required
   node --version    # Must be 22 LTS
   pnpm --version    # Must be 9.x
   docker --version  # Must support ARM64 images

   # Install global tools
   npm install -g dbmate vitest typescript
   ```

5. **For the Bridge Agent (Windows dev/test):**
   - Tally Prime installed (or mock server)
   - Windows 10/11 for DPAPI testing
   - pkg for .exe compilation

### Coding Standards (Enforced During Development)

1. **DRY Rule — No code block repeated more than 2 times:**
   - If any code block (logic, query pattern, validation, transform, API call, UI component pattern) appears **more than twice**, it MUST be extracted into a reusable function/utility/hook/component.
   - **Backend examples:**
     - DB query wrappers → `packages/database/query-helpers.ts` (e.g., `withTransaction()`, `findByTenant()`, `paginatedQuery()`)
     - Zod parse + error formatting → `packages/shared/validation.ts` (e.g., `parseOrThrow()`, `formatZodErrors()`)
     - Outbox event creation → `packages/database/outbox-helpers.ts` (e.g., `enqueueOutboxEvent(tx, type, payload)`)
     - BullMQ job dispatch pattern → `packages/shared/job-helpers.ts` (e.g., `dispatchJob(queue, type, data, opts)`)
     - Error response formatting → `packages/shared/errors.ts` (e.g., `throwFcError(code, message, details)`)
     - Audit log insertion → `packages/database/audit-helpers.ts` (e.g., `auditLog(tx, action, before, after)`)
     - Redis cache get/set with TTL → `packages/shared/cache-helpers.ts` (e.g., `cacheGetOrFetch(key, ttl, fetcher)`)
   - **Frontend examples:**
     - API fetch + loading + error state → custom hooks (e.g., `useApiQuery()`, `useApiMutation()`)
     - Form field + label + validation error → reusable `<FormField>` component
     - Table with filters + pagination + sort → reusable `<DataTable>` wrapper around TanStack Table
     - Status badge (green/yellow/red) → `<StatusBadge status={} />` component
     - Confirmation modal pattern → `<ConfirmDialog onConfirm={} message={} />`
     - Toast notifications → `useToast()` hook wrapping a single toast provider
     - Date formatting → `utils/date-format.ts` (e.g., `formatDate()`, `formatRelative()`, `toISODate()`)
   - **Where to put shared code:**
     - Cross-package backend utilities → `packages/shared/`
     - Database-specific helpers → `packages/database/`
     - Frontend shared components → `apps/portal/src/components/common/`
     - Frontend hooks → `apps/portal/src/hooks/`
     - Frontend utilities → `apps/portal/src/utils/`
   - **ESLint enforcement:** Add `no-duplicate-code` custom rule or use `eslint-plugin-sonarjs` with `no-duplicate-string` and `no-identical-functions` rules to catch violations automatically during `make lint`.

2. **Naming conventions:**
   - Files: `kebab-case.ts` (e.g., `order-service.ts`, `sandbox-test-service.ts`)
   - Classes/Types/Interfaces: `PascalCase` (e.g., `CanonicalOrder`, `MappingConfig`)
   - Functions/variables: `camelCase` (e.g., `createOrder()`, `tenantId`)
   - Constants: `UPPER_SNAKE_CASE` (e.g., `MAX_RETRY_COUNT`, `DEFAULT_POLL_INTERVAL_MS`)
   - DB tables/columns: `snake_case` (e.g., `order_lines`, `factory_id`)
   - API routes: `kebab-case` (e.g., `/api/v1/sandbox-test`, `/api/v1/mapping-config`)

3. **Function size:** No function longer than 50 lines. If it is, split into smaller single-responsibility functions.

4. **Error handling pattern:** Every thrown error uses `FcError` class with: error code (FC_ERR_xxx), HTTP status, user-friendly message, internal details. One pattern everywhere — no raw `throw new Error()`.

5. **TypeScript strict mode enforced:** `strict: true`, `noImplicitAny: true`, `noUnusedLocals: true`, `noUnusedParameters: true`. Zero `any` types — use `unknown` + type guards instead.

6. **Test co-location:** Tests live next to the code they test (e.g., `order-service.ts` → `order-service.test.ts`). Not in a separate `__tests__/` folder.

7. **Import ordering:** External packages → monorepo packages → relative imports. Enforced by `eslint-plugin-import`.

### Workflow Tips

- **Start every Claude Code session** by pasting `FC_MASTER_CONTEXT.md` — this restores full architecture context
- **Agent 1 must complete Tasks A1-A9** before Agent 2 and 3 can begin — the shared schemas are the contract
- **Run `make test` after every change** — the Makefile should have targets for each package
- **Use feature branches** per track: `Phase1/track-a-foundation`, `Phase1/track-b-api`, etc.
- **Run `make lint` before committing** — catches DRY violations, unused imports, type errors

---

## 9. REPO SETUP STEPS (Do This First)

```bash
# 1. Create repo structure
git checkout Phase1
mkdir -p docs

# 2. Copy the 8 KEEP documents into docs/
# (from the document triage table above)

# 3. Create initial monorepo scaffold
mkdir -p factoryconnect/{apps/{api,portal},packages/{database,shared,observability,mapping-engine,edi-engine},bridge-agent,infra/docker}

# 4. Initialize
cd factoryconnect
pnpm init
# Create pnpm-workspace.yaml, tsconfig.base.json, etc.

# 5. Commit foundation
git add .
git commit -m "chore: initial repo structure with docs and monorepo scaffold"
git push origin Phase1
```

---

## 10. WHAT COMES AFTER PHASE 1

Once the Sales Order Connector is the gold standard (all 118 tests pass, VAPT clean, first factory onboarded):

**Phase 2 — Additional Connectors (replicate patterns):**
- Purchase Order Connector
- Returns/Credit Memo Connector
- SAP Ariba cXML Connector
- Coupa REST Connector
- EDIFACT support (spec engine already supports it)

**Each new connector = ~2 days config** (JSON spec map + adapter), not weeks of code. That's the power of the data-driven spec engine.

---

*This plan is the single execution document. The Master Context Prompt + Blueprint v8 + this plan = everything needed to build FactoryConnect Phase 1.*
