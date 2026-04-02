# ═══════════════════════════════════════════════════════════════
# FACTORYCONNECT — SPRINT 1 AGENT PROMPTS (FINAL)
# Updated with ALL decisions from complete architecture session
# ═══════════════════════════════════════════════════════════════
# START AGENT 1 FIRST. Share packages/shared with Agent 2+3.
# ═══════════════════════════════════════════════════════════════

---

# ╔═══════════════════════════════════════════════════════════╗
# ║  AGENT 1 — THE CORE                                      ║
# ║  Foundation + DB + API + Outbox + Saga + Feature Toggles  ║
# ╚═══════════════════════════════════════════════════════════╝

## CONTEXT FOR AGENT 1:

You are building FactoryConnect — a guaranteed delivery middleware connecting
Indian SME factory ERPs to global buyer systems (EDI X12/AS2, Ariba, Coupa).
The factory ERP is the source of truth. FC guarantees 100% message delivery.

## TECH STACK (NON-NEGOTIABLE):
- Node.js 22 LTS + TypeScript 5 strict (no any)
- pnpm 9.x workspaces
- Express.js 5
- PostgreSQL 16 (raw SQL with pg — NO Prisma/Drizzle/ORM)
- dbmate for migrations
- Zod 3.x for validation
- BullMQ 5 + Redis 7
- Keycloak 24 (MFA mandatory)
- Vault single-node (Transit engine for FLE)
- Pino 9.x (PII redaction transport)
- Caddy 2.x (reverse proxy)
- Vitest + Supertest
- Docker Compose for OCI Ampere A1 ARM64
- ALL values in app_config table — ZERO hardcoded values

## MONOREPO STRUCTURE:

factoryconnect/
├── pnpm-workspace.yaml
├── package.json
├── tsconfig.base.json (strict, paths)
├── .env.example
├── apps/
│   └── api/
│       └── src/
│           ├── index.ts (Express bootstrap)
│           ├── config.ts (Zod-validated env loader)
│           ├── middleware/
│           │   ├── auth.ts (JWT from Keycloak)
│           │   ├── tenant-context.ts (SET LOCAL app.current_tenant)
│           │   ├── validate.ts (Zod middleware)
│           │   ├── idempotency.ts (X-Idempotency-Key)
│           │   ├── feature-gate.ts (check feature_flags + factory preferences)
│           │   ├── correlation-id.ts (X-Correlation-ID)
│           │   └── error-handler.ts (structured FC_ERR codes)
│           ├── routes/
│           │   ├── orders.ts
│           │   ├── shipments.ts
│           │   ├── invoices.ts
│           │   ├── connections.ts
│           │   ├── resync.ts
│           │   ├── calendar.ts
│           │   ├── export.ts
│           │   └── admin/ (FC admin routes)
│           └── services/
│               ├── order-service.ts (outbox pattern)
│               ├── resync-service.ts (state machine)
│               ├── impact-analyzer.ts (360° dependency graph)
│               └── revert-service.ts (safe undo with before-state)
├── packages/
│   ├── database/
│   │   ├── dbmate/migrations/
│   │   │   ├── 001_foundation.sql (core tables + RLS)
│   │   │   ├── 002_history_triggers.sql (record history on all tables)
│   │   │   ├── 003_feature_system.sql (feature_flags + app_config)
│   │   │   └── 004_partner_system.sql (partners + commissions)
│   │   └── src/
│   │       ├── pool.ts (pg Pool)
│   │       ├── tenant.ts (setTenantContext)
│   │       ├── outbox-poller.ts (5-second poll)
│   │       └── saga-poller.ts (60-second poll + SLA + heartbeat)
│   ├── shared/
│   │   └── src/
│   │       ├── schemas/ (Zod: order, shipment, invoice, return, address, line-item)
│   │       ├── types/
│   │       └── errors/ (structured FC_ERR_* codes)
│   └── observability/
│       └── src/
│           ├── logger.ts (Pino + correlation_id)
│           ├── pii-redactor.ts (GSTIN, PAN, phone, email, Aadhaar regex)
│           └── metrics.ts (prom-client)
└── infra/docker/
    ├── docker-compose.yml (OCI optimized)
    ├── docker-compose.dev.yml
    ├── caddy/Caddyfile
    └── keycloak/realm-export.json (MFA required)

## MIGRATION 001: Foundation Tables

CREATE ALL of these with RLS where noted:

SHARED (no RLS):
- factories (factory_id, legal_name, gstin_encrypted, pan_encrypted, preferences JSONB, status)
- buyers (buyer_id, name, country_code, system_type, protocol)
- connections (connection_id, factory_id, buyer_id, source_mode, system_type, protocol,
    buyer_endpoint, credentials JSONB, tax_config JSONB, currency_config JSONB,
    barcode_config JSONB, partial_shipment_allowed, sla configs, status)
- app_config (config_key PK, config_value JSONB, description)
- feature_flags (flag_name PK, is_enabled, description)

RLS-PROTECTED:
- canonical_orders (all order fields + idempotency_key UNIQUE)
- canonical_order_line_items (order_id FK + all line item fields)
- canonical_shipments (order_id FK + carrier, tracking, ship_date)
- shipment_packs (shipment_id FK + sscc_barcode, items, weight)
- canonical_invoices (order_id FK + invoice fields + tax fields)
- canonical_returns (order_id FK + return fields — built, toggle OFF)
- item_master (factory_id + connection_id + factory_sku + buyer_sku mapping)
- rate_cards (factory_id + connection_id + sku + agreed_price + effective dates)
- outbox (aggregate_type, aggregate_id, event_type, payload, status)
- order_sagas (15 states + step_deadline + locked_by + lock_expires + compensation)
- message_log (direction, message_type, status, payload, idempotency_key)
- resync_requests (resync_type, status 9-state machine, approval chain)
- resync_items (per-message tracking within bulk resync)
- calendar_entries (7 sources, suppress_alerts flag)
- ai_fix_log (error_id, fix_query, before_state, after_state, risk_level, status)
- webhook_subscriptions (factory_id, event_type, target_url, secret_key)

IMMUTABLE:
- audit_log (hash-chain, REVOKE UPDATE/DELETE, trigger prevents modification)

HISTORY:
- record_history (table_name, record_id, operation, old_record JSONB, new_record JSONB,
    fk_references JSONB, changed_by, change_reason, correlation_id)
  IMMUTABLE — REVOKE UPDATE/DELETE

PARTNER:
- partners (partner_type, commission_config JSONB, status)
- partner_referrals (partner_id, factory_id, referral_code)
- commission_ledger (partner_id, factory_id, period, amount, status)

AI:
- llm_cache (cache_key, prompt_hash, response, hit_count)
- llm_usage_log (task, model, prompt_tokens, response_tokens, cost_usd, factory_id)
- relationship_registry (parent_table, child_table, cascade_impact)

CONFIG:
- impersonation_sessions (fc_operator_id, factory_id, started_at, actions_performed)

## MIGRATION 002: History Triggers

Create a GENERIC trigger function that works on ANY table:
- Captures INSERT/UPDATE/DELETE
- Stores old_record + new_record as JSONB
- Reads changed_by from session: current_setting('app.current_user')
- Reads change_reason from session: current_setting('app.change_reason')
- Reads correlation_id from session: current_setting('app.correlation_id')
- Extracts FK references from record
- Attach trigger to ALL tenant-scoped tables

## MIGRATION 003: Feature System

INSERT default feature_flags (all functional = true, preferences = true, coming-soon = false)
INSERT default app_config values (outbox_poll_interval, saga_poll_interval,
  circuit_breaker_threshold, retry_attempts, retention_warning_days, ai_budget, etc.)

## KEY MIDDLEWARE:

tenant-context.ts:
- Extract factory_id from JWT → SET LOCAL app.current_tenant
- Also SET LOCAL app.current_user, app.change_reason, app.correlation_id

feature-gate.ts:
- requireFeature(flagName) → check platform flag + factory preference
- Platform disabled → 404 "Feature not available"
- Factory disabled → 403 "Feature not enabled for your account"

## KEY SERVICES:

order-service.ts — confirmOrder():
  ONE transaction: UPDATE order + UPDATE saga + INSERT outbox + INSERT audit
  All 4 succeed or all 4 rollback.

impact-analyzer.ts:
  Walk relationship_registry. Build dependency tree.
  Count affected records. Check external sends (BLOCKS_REVERT).
  Return: can_revert, blocking_records, recommendation.

revert-service.ts:
  Read before_state from record_history. Validate FK references.
  Execute revert in transaction. Log revert as new history entry.

## TESTS (Agent 1):
TEST-001: RLS — Factory A cannot see Factory B
TEST-002: Idempotency — duplicate returns cached
TEST-003: Outbox atomicity — DB fail = no outbox entry
TEST-004: Saga creation — new order creates saga
TEST-005: Saga SLA breach detection
TEST-006: Saga heartbeat — stale lock re-enqueues
TEST-007: Audit hash-chain integrity
TEST-008: Audit immutability — UPDATE/DELETE blocked
TEST-009: PII redactor — GSTIN/PAN/phone scrubbed
TEST-010: Vault FLE — GSTIN encrypted, ADMIN decrypts
TEST-011: MFA required — login without TOTP fails
TEST-012: Feature gate — disabled feature returns 404
TEST-013: Record history — INSERT captured with new_record
TEST-014: Record history — UPDATE captured with old+new
TEST-015: Impact analysis — order with shipment shows BLOCKS_REVERT
TEST-016: Impact analysis — fresh order shows SAFE_TO_REVERT
TEST-017: Revert — UPDATE reverted using old_record
TEST-018: Revert — blocked when external message exists
TEST-019: app_config — all values loaded, zero hardcoded
TEST-020: Correlation ID — propagated through entire request chain

## DEFINITION OF DONE (Agent 1 Sprint 1):
[ ] pnpm install runs clean
[ ] docker compose up boots all services on ARM64
[ ] dbmate up creates all tables with RLS + history triggers
[ ] POST /api/v1/orders creates order+saga+outbox atomically
[ ] Duplicate idempotency_key returns cached response
[ ] RLS: Factory A cannot see Factory B data
[ ] Outbox poller dispatches within 5 seconds
[ ] All logs pass PII redactor
[ ] Feature gate blocks disabled features
[ ] Record history captures all mutations
[ ] Impact analyzer builds correct dependency tree
[ ] All 20 tests pass
[ ] TypeScript zero errors strict mode

---

# ╔═══════════════════════════════════════════════════════════╗
# ║  AGENT 2 — THE BRIDGE                                    ║
# ║  Agent + Tunnel + Self-Healing + Adaptive Polling         ║
# ╚═══════════════════════════════════════════════════════════╝

## CONTEXT: Bridge Agent runs on factory Windows machine.
Polls Tally locally. Pushes through secure tunnel. Self-heals.

## TECH STACK:
- Node.js 22 LTS + TypeScript 5 strict
- better-sqlite3 (encrypted, WAL mode)
- ws (WebSocket), undici (HTTP)
- fast-xml-parser (Tally XML)
- node-os-utils (CPU/RAM monitoring)
- pkg (compile to .exe)
- Vitest

## STRUCTURE:
bridge-agent/
├── src/
│   ├── index.ts
│   ├── config.ts
│   ├── poller/
│   │   ├── adaptive-poller.ts (5/10/15/30 min + PAUSE at 95% CPU)
│   │   ├── tally-client.ts (HTTP POST localhost:9000)
│   │   └── tally-xml-parser.ts (extract only mapping-config fields)
│   ├── tunnel/
│   │   ├── tunnel-client.ts (WebSocket + mTLS + cert pinning)
│   │   ├── message-signer.ts (HMAC-SHA256)
│   │   └── reconnect-strategy.ts (exponential backoff ±30% jitter)
│   ├── queue/
│   │   ├── local-queue.ts (SQLite outbox, survives restart)
│   │   └── queue-drainer.ts (sends through tunnel)
│   ├── security/
│   │   ├── credential-store.ts (Windows DPAPI)
│   │   ├── otp-bootstrap.ts (token → CSR → Vault cert)
│   │   └── cert-manager.ts (auto-renew 90-day certs)
│   ├── health/
│   │   ├── health-orchestrator.ts (7 layers, every 2 min)
│   │   ├── probes/ (layer1-os.ts through layer7-version.ts)
│   │   ├── rules-engine.ts (40+ patterns)
│   │   └── auto-fix-executor.ts
│   ├── diagnostics/
│   │   ├── bundle-creator.ts (15 files, encrypted ZIP)
│   │   └── reconciliation.ts (HWM daily hash comparison)
│   └── file-drop/
│       ├── tally-xml-writer.ts (canonical → Tally import XML)
│       └── import-monitor.ts (detect Tally pickup)

## KEY FEATURES:
- Adaptive polling: CPU/RAM/Tally-latency driven intervals
- Data minimization: pull ONLY mapping-config fields from Tally
- OTP bootstrap: activation token → CSR → Vault PKI signed cert
- HWM reconciliation: daily hash of 100 vouchers, mismatch → partial sync
- Rules engine: 40+ deterministic failure patterns
- Claim check: payloads >256KB → MinIO URI

## TESTS (Agent 2):
TEST-021: Adaptive poller adjusts to CPU levels
TEST-022: Tally XML client parses SALESORDER
TEST-023: SQLite queue survives restart
TEST-024: Tunnel mTLS + cert pin verification
TEST-025: Reconnect jitter measurable (>20% variance)
TEST-026: OTP bootstrap: valid/expired/reused token handling
TEST-027: Data minimization: only configured fields extracted
TEST-028: Rules engine: 10 starter patterns match correctly
TEST-029: HWM: matching hashes = no sync
TEST-030: HWM: mismatched hashes = partial sync triggered

---

# ╔═══════════════════════════════════════════════════════════╗
# ║  AGENT 3 — THE PORTAL                                    ║
# ║  Dashboard + Manual Ops + Admin Console + Support         ║
# ╚═══════════════════════════════════════════════════════════╝

## CONTEXT: React portal serving ALL factory types (ERP, no ERP, micro).
Also FC Admin console for ops, partner management, AI monitoring.

## TECH STACK:
- React 19 + Vite 6
- shadcn/ui + Radix + Tailwind v4
- Zustand (global state) + TanStack Query (server)
- React Hook Form + Zod resolver
- TanStack Table v8
- keycloak-js 25.x
- Vitest + React Testing Library

## STRUCTURE:
apps/portal/src/
├── App.tsx (Router + Keycloak provider)
├── lib/ (keycloak.ts, api-client.ts, query-client.ts)
├── stores/ (auth-store.ts)
├── components/
│   ├── layout/ (AppShell, Sidebar, Header)
│   ├── dashboard/ (StatsCards, RecentOrders, ConnectionHealth traffic lights)
│   ├── orders/ (OrdersPage, OrderDetail, SagaTimeline)
│   ├── po-inbox/ (incoming POs, Confirm/Reject buttons)
│   ├── shipments/ (CreateShipment form, carrier+tracking+SSCC)
│   ├── invoices/ (CreateInvoice, auto-fill from order, tax calc)
│   ├── products/ (ProductCatalog CRUD, item master)
│   ├── connections/ (ConnectionsPage, ConnectionCard, SetupWizard)
│   ├── mapping/ (AI mapping UI, drag-drop, confidence badges)
│   ├── resync/ (ResyncPage, single retry, bulk resync, UAT/PROD)
│   ├── export/ (ExportPage, format picker, password config)
│   ├── calendar/ (CalendarGrid, HolidayForm)
│   ├── labels/ (BarcodePreview, PrintLabels PDF)
│   ├── returns/ (ReturnForm, credit memo)
│   ├── transactions/ (TransactionLog, sync status, filters)
│   ├── settings/ (SecurityPrefs, EscalationConfig, FeatureToggles, RetentionConfig)
│   ├── record-history/ (HistoryTimeline, RevertButton, ImpactAnalysis modal)
│   ├── onboarding/ (InteractiveChecklist, GettingStarted)
│   ├── admin/ (FC Admin Console)
│   │   ├── FactoryList.tsx (all factories, health scores)
│   │   ├── ActAsFactory.tsx (impersonation with yellow banner)
│   │   ├── PartnerDashboard.tsx (partners, commissions, referral codes)
│   │   ├── CommissionConfig.tsx (per-partner deal editor)
│   │   ├── AiOperations.tsx (token observatory dashboard)
│   │   ├── FeatureFlagAdmin.tsx (global feature toggle)
│   │   ├── DLQViewer.tsx (dead letter queue inspect/replay)
│   │   └── AgentFleet.tsx (agent versions, health, upgrades)
│   └── ai-fixes/ (AiFixHistory, UndoButton, DryRunPreview)

## KEY SCREENS:
1. PO Inbox: factory confirms/rejects incoming POs (triggers 855)
2. Create Shipment: enter carrier, tracking, SSCC (triggers 856)
3. Create Invoice: auto-fill from order, tax (triggers 810)
4. Product Catalog: manage SKUs, auto-populate future orders
5. Transaction Log: sync status, retry failed, bulk resync
6. Saga Timeline: visual PO→ACK→ASN→Invoice lifecycle
7. Calendar: holidays, suppress alerts
8. AI Fix History: see fixes, undo button, impact analysis
9. Record History: every change with before/after, revert option
10. FC Admin: impersonation, partners, AI costs, feature flags

## TESTS (Agent 3):
TEST-031: Keycloak MFA enforced
TEST-032: PO Inbox renders with Confirm/Reject actions
TEST-033: Saga Timeline all 10+ states with correct icons
TEST-034: Transaction Log filters by status/buyer/date
TEST-035: Calendar renders holidays with colors
TEST-036: Feature toggle: disabled features hidden from UI
TEST-037: Record History timeline shows all mutations
TEST-038: Impact Analysis modal shows 360° dependency tree
TEST-039: AI Fix: undo button triggers revert
TEST-040: FC Admin: Act As shows yellow banner + correct factory data

---

# ═══════════════════════════════════════════════════════════════
# SPRINT 1 DEFINITION OF DONE — ALL 3 AGENTS
# ═══════════════════════════════════════════════════════════════

[ ] Docker compose up boots full stack on ARM64
[ ] All migrations run (foundation + history + features + partners)
[ ] API accepts orders with RLS isolation
[ ] Outbox dispatches within 5 seconds
[ ] Saga tracks lifecycle with SLA detection
[ ] Record history captures all mutations across all tables
[ ] Feature flags control feature visibility
[ ] PII redacted from all logs
[ ] Bridge Agent polls Tally with adaptive intervals
[ ] Tunnel connects with mTLS + cert pinning
[ ] Portal renders with MFA login
[ ] PO Inbox shows incoming POs with Confirm button
[ ] Saga Timeline visualizes order lifecycle
[ ] FC Admin console accessible with impersonation
[ ] All 40 tests pass
[ ] TypeScript zero errors strict mode everywhere
