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

**Estimated total: ~62 hours**

---

### TRACK C — Mapping + AI + EDI Engine (Week 3-10)

| # | Task | Details | Output | Est |
|---|------|---------|--------|-----|
| C1 | JSONata mapping engine | MappingConfig CRUD, transform functions (toDate, toEdiDate, etc.) | `packages/mapping-engine/` | 5h |
| C2 | AI mapper — Layer 1 (Claude) | Claude Haiku/Sonnet, PII scrubbing before call, confidence scores | `packages/ai-mapper/` | 5h |
| C3 | AI mapper — Layer 2 (fallback) | Configurable fallback LLM endpoint (Gemini/GPT) | L2 fallback | 3h |
| C4 | AI mapper — Layer 3 (local) | Placeholder + logging for future local model training | L3 stub + logging | 2h |
| C5 | LLM cache + usage tracking | Cache by prompt_hash, hit rate tracking, budget guardrails | `llm_cache` + `llm_usage_log` | 3h |
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

**Estimated total: ~80 hours**

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
| E14 | Visual mapping UI | AI suggestions with confidence %, drag-drop override, test button | `components/mapping/` | 8h |
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

**Estimated total: ~130 hours**

---

## 4. EXECUTION TIMELINE — Gantt View

```
Week:  1  2  3  4  5  6  7  8  9  10 11 12 13 14 15 16 17 18 19 20
       ├──┤──┤──┤──┤──┤──┤──┤──┤──┤──┤──┤──┤──┤──┤──┤──┤──┤──┤──┤──┤

TRACK A [██████]                                          ← Foundation (Week 1-2)
        🔗 schemas ready

TRACK B      [████████████████████████]                   ← API + Workflow (Week 2-6)
TRACK C         [██████████████████████████████████]       ← Mapping + EDI (Week 3-10)
TRACK D      [████████████████████████████████████████]    ← Bridge Agent (Week 2-12)
TRACK E      [██████████████████████████████████████████████████] ← Portal (Week 2-14)

                                                 [████████] ← E2E Integration (Week 15-16)
                                                       [████████] ← Security + VAPT (Week 17-18)
                                                             [████████] ← Production Deploy (Week 19-20)
```

### Parallelism Strategy

- **Week 1-2:** Track A runs alone (produces shared foundation)
- **Week 2+:** Tracks B, C, D, E all run in parallel
- **Week 15-16:** All tracks converge for 9 simulation scenarios
- **Week 17-18:** Security hardening + VAPT across all tracks
- **Week 19-20:** OCI Free Tier deploy + first factory onboard

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
| B: API & Workflow | ~62h | Yes (after A7+A8) |
| C: Mapping + AI + EDI | ~80h | Yes (after A7+A8) |
| D: Bridge Agent | ~91h | Yes (after A7) |
| E: Portal UI | ~130h | Yes (after A7) |
| Integration Testing | ~40h | After B+C+D+E |
| Security + VAPT | ~30h | After integration |
| Production Deploy | ~20h | After security |
| **TOTAL** | **~483h** | |

**With 5 parallel tracks:** ~20 weeks calendar time (as designed)
**With 3 parallel agents (as per blueprint):** ~20 weeks
**Solo developer (40h/week):** ~12 weeks effective coding (some tracks overlap)

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

### Workflow Tips

- **Start every Claude Code session** by pasting `FC_MASTER_CONTEXT.md` — this restores full architecture context
- **Agent 1 must complete Tasks A1-A9** before Agent 2 and 3 can begin — the shared schemas are the contract
- **Run `make test` after every change** — the Makefile should have targets for each package
- **Use feature branches** per track: `Phase1/track-a-foundation`, `Phase1/track-b-api`, etc.

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
