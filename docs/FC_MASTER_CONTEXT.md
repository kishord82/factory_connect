# ═══════════════════════════════════════════════════════════════════════════════
# FACTORYCONNECT — MASTER CONTEXT PROMPT
# ═══════════════════════════════════════════════════════════════════════════════
# 
# PURPOSE: This is the SINGLE SOURCE OF TRUTH for the entire FactoryConnect
# architecture. If Claude's memory refreshes, paste this document to restore
# complete context. Every decision, feature, pattern, and requirement from
# the full design conversation is captured here.
#
# VERSION: 8.0 FINAL — Triple AI Reviewed (Claude + Gemini + ChatGPT × 2 rounds)
# CORRECTIONS: 21 applied (5 Gemini + 10 ChatGPT R1 + 6 ChatGPT R2)
# DATE: April 2026
# AUTHOR: Kishor Dama (Architect) + Claude (Co-Architect)
# ═══════════════════════════════════════════════════════════════════════════════

## WHAT IS FACTORYCONNECT

FactoryConnect (FC) is a multi-tenant SaaS integration middleware platform that
connects Indian SME factory ERP systems (Tally Prime, Zoho Books, SAP Business One)
to global buyer procurement systems (Walmart EDI X12/AS2, SAP Ariba cXML, Coupa REST).

FC is NOT the source of truth — the factory ERP is the master. FC is a GUARANTEED
DELIVERY middleware that ensures 100% message delivery between factory and buyer,
retains data for compliance/resync, and provides self-healing operations.

## PLATFORM PHILOSOPHY

1. AI-POWERED INTELLIGENT PLATFORM — learns, adapts, operates autonomously
2. EVERYTHING IS PREFERENCES — FC builds all features, factory enables what they want
3. SELF-HEALING — agent fixes itself, 40+ deterministic failure patterns
4. SELF-OPERATING — factory runs everything from portal (query, export, import, resync)
5. SELF-SUSTAINING — one training + ops manual, zero ongoing support tickets
6. GUARANTEED DELIVERY — once FC accepts a message (HTTP 201), it WILL be delivered
7. DESIGN GLOBAL, BUILD INDIA — architecture supports any country via config, not code
8. BUILD EVERYTHING, TOGGLE ON/OFF — factory never hears "coming soon"
9. EMPOWER THE ECOSYSTEM — Tally consultants are distribution partners, not bypassed
10. LOW BASE PRICE — competitors can't undercut because FC infra cost is near zero

## FACTORY TYPES SERVED

Type 1: FACTORY WITH ERP + INTEGRATION (automated)
  Tally → Bridge Agent → FC → EDI → Buyer. Zero manual work.

Type 2: FACTORY WITH ERP, NO INTEGRATION YET (semi-manual)
  Factory exports from Tally → uploads to FC → EDI → Buyer.

Type 3: FACTORY WITH NO ERP (fully manual)
  Factory uses FC portal as operational system. Manual data entry.
  FC sends EDI to buyer. Buyer can't tell the difference.

Type 4: MICRO FACTORY (white glove)
  FC ops does everything on factory's behalf via "Act As" impersonation.
  Factory just manufactures and ships. FC handles all digital operations.

---

## 10 ARCHITECTURE DECISIONS (ALL RESOLVED)

D1: EDI ENGINE — DATA-DRIVEN SPEC ENGINE
  JSON spec maps per buyer (walmart-855.spec.json, walmart-856.spec.json).
  Generic EdiBuilder reads config. New buyer = 2 days config, not code.
  x12-parser for inbound. Stedi as Phase 2 swap path.

D2: AS2 TRANSPORT — OpenAS2 Java sidecar (Docker container)
  + Opossum circuit breakers (trip 60%, half-open 5 min).
  Battle-tested Java AS2 for S/MIME signing, encryption, MDN.

D3: WORKFLOW — BullMQ + Saga Coordinator + Transactional Outbox + Worker Heartbeat
  No Temporal. Outbox poller 5s. Saga poller 60s.
  Worker claims saga step before processing. Stale heartbeat → re-enqueue.

D4: MULTI-TENANCY — ROW-LEVEL SECURITY from Day 1
  SET LOCAL app.current_tenant. Single schema. No migration ever.
  Both Gemini AND ChatGPT independently recommended this.

D5: BUYER SPECS — VAN partnership + direct buyer EDI team engagement
  Buyer spec = JSON config uploaded to spec engine.

D6: AI MAPPING — 3-Layer LLM fallback
  L1 Claude (Haiku primary, Sonnet for complex) → L2 Gemini/GPT → L3 Local trained model.
  ALL calls logged (prompt+response) for L3 training.
  Error-code-only to LLM for diagnostics (zero factory data sent to AI).

D7: EDIFACT — Deferred Phase 2. Spec engine supports EDIFACT maps when ready.

D8: DATA DELETION — 90-day soft-delete + legal hold.
  Dual-threshold retention: purge when days >= config OR size >= config (first reached).
  Factory configures 7-90 days + 500MB-20GB. Audit log never deleted.
  7-day warning before purge. Pricing based on retention tier.

D9: INFRASTRUCTURE — OCI free tier → paid at 3 customers → AWS at 200+ factories.
  Capacity-triggered graduation. Zero OCI-specific service lock-in.
  Everything in Docker containers. Migration to any cloud in 2 hours.

D10: SOURCE MODE — Agent (adaptive polling + HWM reconciliation + OTP bootstrap)
  + Webhook (HMAC) + API-Poll + Claim Check (>256KB → MinIO).

---

## 21 ENTERPRISE PATTERNS

1.  Row-Level Security (RLS) — all tenant tables
2.  Transactional Outbox — atomic domain + event writes
3.  Saga Coordinator — 15-state order lifecycle with SLA deadlines
4.  Worker Heartbeat — claim before process, stale detection
5.  Circuit Breaker (Opossum) — per buyer AS2 endpoint
6.  Data-Driven Spec Engine — JSON spec maps per buyer
7.  Claim Check — payloads >256KB → MinIO, URI in queue
8.  OTP Bootstrap — activation token → CSR → Vault PKI → cert
9.  High-Water Mark Reconciliation — daily hash comparison
10. Field-Level Encryption — PAN/GSTIN as Vault Transit ciphertext
11. PII Log Interceptor — regex scrub before any log write
12. Adaptive Polling — 5/10/15/30 min based on CPU+RAM+Tally latency
13. Deterministic Diagnostics — 40+ failure patterns, rules engine
14. 3-Layer LLM Fallback — Claude → Gemini/GPT → Local trained
15. Idempotent Receiver — X-Idempotency-Key + Redis lock + DB unique
16. Exponential Backoff + Jitter — ±30% random on all retries
17. Immutable Audit Log — hash-chain SHA-256, no UPDATE/DELETE
18. Sidecar Pattern — OpenAS2 Java alongside Node.js workers
19. Strangler Fig — old agent runs until new passes health check
20. Data Minimization — agent pulls only mapping-config fields
21. Capacity-Triggered Graduation — OCI free → paid thresholds

---

## COMPLETE TECH STACK (NON-NEGOTIABLE)

Runtime: Node.js 22 LTS + TypeScript 5 strict mode
Package Manager: pnpm 9.x workspaces
API: Express.js 5
Database: PostgreSQL 16 + RLS + PgBouncer (raw SQL with pg — NO ORM)
Migrations: dbmate (NOT Flyway, NOT Prisma)
Validation: Zod 3.x
Queue: BullMQ 5 + Redis 7
Auth: Keycloak 24 + MFA mandatory (TOTP)
Secrets: HashiCorp Vault single-node + Transit engine
Logging: Pino 9.x + PII redaction transport
Proxy: Caddy 2.x (auto-SSL)
EDI Outbound: Custom data-driven spec engine (JSON spec maps)
EDI Inbound: x12-parser (stream-based)
AS2: OpenAS2 Docker sidecar + Opossum circuit breakers
Mapping: JSONata 2.x
AI: Claude API (Haiku/Sonnet) + fallback LLM + local model
Frontend: React 19 + Vite 6 + shadcn/ui + TanStack Table
Testing: Vitest + Supertest
Container: Docker Compose for OCI Ampere A1 (ARM64)
Monitoring: Grafana + Prometheus + Loki
Notifications: Novu v2 (self-hosted) + Gupshup WhatsApp
Object Storage: MinIO (S3-compatible)
DNS + SSL + WAF: Cloudflare free tier

ALL configurable via app_config table — ZERO hardcoded values.

---

## SECURITY ARCHITECTURE

ALWAYS ENFORCED (non-negotiable, factory cannot disable):
- RLS tenant isolation
- FLE for PII columns (Vault Transit)
- PII log redaction interceptor
- mTLS for Bridge Agent tunnel
- AS2 signing + encryption
- MFA for all portal logins
- Immutable audit log (hash-chain)
- Email restriction (data only to configured emails)
- Keycloak admin behind WAF with IP allowlisting

FACTORY-CONFIGURABLE (preferences):
- Export password protection (on/off, per PROD/UAT)
- Notification channels (WhatsApp, email, SMS, AI call, human call)
- Escalation preferences (channel order, wait times, quiet hours)
- Data retention thresholds (days + size)
- Feature toggles (which features are active)

DEFENSE IN DEPTH:
- WAF (Cloudflare) → Caddy (rate limit) → Zod (validation) → RLS (DB isolation)
  → FLE (column encryption) → PII interceptor (log scrub) → hash-chain audit

---

## RESYNC STATE MACHINE

REQUESTED → VALIDATED → APPROVED → QUEUED → IN_PROGRESS → COMPLETED
  ↓            ↓                                    ↓
REJECTED    DENIED                          PARTIAL_FAIL → REQUIRES_REVIEW

- Auto-approve: single transaction + UAT target
- Manual approve: bulk financial docs (810 invoice) to PROD
- Duplicate detection: warns before resending successful messages
- New idempotency keys + new EDI control numbers per resync
- UAT/PROD routing per factory's choice
- 6-month historical replay supported
- All resyncs audit-logged

---

## SELF-HEALING SYSTEM

7-LAYER HEALTH CHECK (every 2 minutes):
L1: OS (disk, memory, CPU, time, Tally process)
L2: Network (DNS, TCP, TLS, proxy, SSL inspection, cipher)
L3: Security (cert, HMAC, AV, file integrity)
L4: Persistence (SQLite, outbox depth, import dir)
L5: Tunnel (connected, latency, auth, fallback)
L6: Application (Tally response, mapping config)
L7: Version (agent version, binary hash, dependencies)

DETERMINISTIC RULES ENGINE: 40+ failure patterns
- Each pattern: signature (which probes fail) → root cause → fix chain
- NO LLM in diagnostic/auto-fix path
- Error-code-only to Claude for Tier 2 human-readable summaries

ADAPTIVE POLLING:
CPU < 50% → 5 min | 50-70% → 10 min | 70-85% → 15 min | >85% → 30 min | >95% → PAUSE

AI FIX SAFETY:
- Every fix: reversible, isolated, previewed (dry run), approved, logged
- Before-state + after-state captured
- Low risk: auto-approve | Medium: factory admin | High: FC ops
- One-click undo at any time
- Financial data always requires human approval

360° IMPACT ANALYSIS:
- Before any change: walk relationship_registry, build dependency tree
- Count all affected records across all related tables
- Check if data has been sent externally (BLOCKS_REVERT)
- Show recommendation: safe to revert / use return flow instead

RECORD HISTORY:
- Every INSERT/UPDATE/DELETE captured via PostgreSQL triggers
- old_record + new_record JSONB on every change
- FK references preserved for cascading revert
- Immutable history (REVOKE UPDATE, DELETE)

---

## PROACTIVE SUPPORT

OPERATIONAL CALENDAR: 7 sources
- System preloaded (national/state holidays)
- Portal UI entry
- Email template (Claude parses dates)
- iCal/ICS feed sync (every 6 hours)
- Google Calendar OAuth
- Factory's custom REST API (daily poll)
- WhatsApp reply ("holiday today" → auto-creates entry)

SILENCE DETECTION: 7-question decision tree
1. Holiday? 2. Business hours? 3. Weekly off? 4. Maintenance?
5. Agent offline? 6. Within baseline? 7. Beyond threshold?
Only if Q1-6 = NO and Q7 = YES → true anomaly alert.

GRADUATED ESCALATION: 5 steps
WhatsApp (0 min) → Email (60 min) → SMS (120 min) → AI Bot Call (4 hr) → Human Call (8 hr)
Factory controls: channels, order, wait times, quiet hours, language.
All notification channels are factory preferences (FC provisions, factory enables).

---

## FEATURE TOGGLE SYSTEM

PLATFORM LEVEL (FC admin): feature_flags table — globally enable/disable
FACTORY LEVEL (factory preference): preferences JSONB — per-factory toggle

FUNCTIONAL features (ALWAYS ON — cannot disable):
- Receive PO, send ACK/ASN/Invoice, partial shipments, tax mapping
- Multi-currency, item master, returns, rate cards, barcode labels
- Transaction visibility, resync, export/import

PREFERENCE features (factory toggles):
- Password on exports, email restrictions, notification channels
- Outbound webhooks, anomaly detection, analytics, export watermarking
- Scheduled maintenance window, chargeback tracking

---

## MANUAL OPERATIONS PORTAL (Type 3 Factory — No ERP)

Complete operational system in the portal:
- PO Inbox: see incoming POs, confirm/reject
- Product Catalog: add/manage products, auto-populate future orders
- Create Order: manual entry for orders
- Confirm PO: one-click, triggers EDI 855
- Production Tracker: status updates through manufacturing
- Create Shipment: carrier, tracking, SSCC, triggers EDI 856
- Print Labels: PDF barcode labels for each carton
- Create Invoice: auto-fill from order data, triggers EDI 810
- Returns: process buyer returns, credit memos
- Payment Tracker: which invoices paid/pending/disputed
- Transaction Log: sync status (success/failed/pending)
- Resync: single-click retry or bulk date-range resync
- Export/Import: bidirectional data exchange

FC ADMIN "ACT AS" IMPERSONATION:
- FC ops can operate on behalf of any factory
- Every action logged: "FC_OPS:email on behalf of factory:uuid"
- Factory sees all actions FC ops performed
- Impersonation sessions auto-expire after 2 hours
- Cannot access security settings while impersonating

---

## PARTNER & REFERRAL SYSTEM

PARTNER TYPES: Tally Consultant, CA Firm, ERP Implementor, System Integrator,
  Reseller, Referral Individual, Factory Referrer

COMMISSION ENGINE (fully configurable per partner):
- Revenue Share: X% of factory bill for Y months (or lifetime)
- Profit Share: X% of net revenue
- Fixed per Factory: ₹X/factory/month
- Bill Credit: ₹X off referrer's bill per referral
- Free Months: X months free for referred factory or referrer
- One-Time Referral: ₹X per activated factory
- Milestone Bonus: ₹X when reaching N referrals
- Tiered Revenue Share: % increases with more referrals

ALL CONFIGURABLE PER PARTNER. Non-technical marketing team manages from admin console.
Partner dashboard: factories, earnings, referral code, payout history.
Factory referral: share code, earn bill credit.

---

## AI TOKEN OPTIMIZATION

7 STRATEGIES:
1. Cache everything (87%+ hit rate target, never ask same question twice)
2. Right-size model (Haiku default, Sonnet only when Haiku confidence < 0.7)
3. Minimize input tokens (strip whitespace, abbreviate, short keys)
4. Limit output tokens (max_tokens per task, concise format)
5. Batch calls (all fields in one call, not per-field)
6. Prompt caching (Anthropic built-in for system prompts)
7. L3 local model (trained from production logs, free for common patterns)

BUDGET GUARDRAILS:
- 0-80%: normal operation, best model per task
- 80-100%: force Haiku for all tasks, alert FC ops
- 100%+: cache-only mode, no new LLM calls, factory operations continue

TOKEN OBSERVATORY DASHBOARD:
- Budget usage %, projected month-end spend
- Cost by model, by task, by factory
- Cache hit rate + savings
- Token efficiency trends
- L3 readiness progress
- Optimization suggestions
- Daily cost trend chart
- LLM call log (filterable)

---

## DATA FLOW SECURITY (20+ boundaries)

INBOUND: Agent tunnel (mTLS), webhooks (HMAC), file upload (password check),
  REST API (JWT), buyer AS2 (signature verify), Ariba (SharedSecret), calendar (OAuth)

OUTBOUND: Buyer AS2 (S/MIME sign+encrypt), Ariba (SharedSecret), factory file-drop
  (tunnel), Zoho webhook (OAuth), email (restricted list + password ZIP), portal download
  (password ZIP), WhatsApp (minimal data — reference only), SMS (zero order data),
  Claude API (PII scrubbed), monitoring (PII redacted)

RULE: Email data ONLY to factory-configured verified emails. ALWAYS ON. Not optional.
RULE: WhatsApp/SMS contain order reference ONLY, never amounts/products.
RULE: Claude receives error code ONLY, never factory data.
RULE: Logs contain ZERO PII after Pino interceptor.

---

## GLOBAL-READY ARCHITECTURE (config not code)

Every country-specific value is JSONB on connection table:
- tax_config: {"type":"GST","components":["CGST","SGST"],"rate":18}
- currency_config: {"factory_currency":"INR","buyer_currency":"USD","mode":"MANUAL"}
- barcode_config: {"format":"SSCC18","gs1_prefix":"890"}

Entering Indonesia = new config:
  tax_config: {"type":"PPN","rate":11,"tax_id_field":"npwp"}
  currency_config: {"factory_currency":"IDR","buyer_currency":"USD"}
  barcode_config: {"format":"GS1-128","gs1_prefix":"899"}
  
Zero code changes. Upload config. Factory is live.

---

## INFRASTRUCTURE & COSTS

OCI FREE TIER:
- Ampere A1: 4 OCPU, 24 GB RAM (VM #1: 3 OCPU/18GB, VM #2: 1 OCPU/6GB)
- AMD Micro: 2 VMs × 1/8 OCPU, 1 GB (Vault, overflow)
- Block Storage: 200 GB
- Object Storage: 20 GB
- Data Egress: 10 TB/month
- Load Balancer: 1 free
- Total OCI cost: ₹0/month

EXTERNAL SERVICES:
- Claude API (Haiku): ~₹1,500/month
- Gupshup WhatsApp: ₹500-1,000/month
- Amazon SES: ₹0 (free tier)
- Cloudflare: ₹0 (free tier)
- Domain + code signing: ~₹250/month

TOTAL: ~₹2,750/month running cost
TOTAL TO FIRST CUSTOMER: ~₹85,000 (6 months dev)
BREAK EVEN: 1 factory on Starter plan (₹5,000/month)

GRADUATION THRESHOLDS:
- 0-2 customers: OCI free tier
- 3 customers: PostgreSQL + Redis → OCI paid
- 50 factories: full OCI paid stack
- 200+ factories: evaluate AWS Mumbai

---

## PRICING MODEL

Usage-based tiers by order volume:
- Tier 1: ≤50 orders/month → ₹5,000/month
- Tier 2: ≤200 orders/month → ₹12,000/month
- Tier 3: ≤500 orders/month → ₹25,000/month
- Tier 4: ≤1,000 orders/month → ₹40,000/month
- Tier 5: Unlimited → Custom

Extras:
- Additional buyer: ₹2,000/buyer/month
- Extended retention: ₹50/GB/month beyond plan
- Managed operations (FC does it for them): premium

---

## CERTIFICATION ROADMAP

Month 0:  DPDP + security.txt + privacy policy + StartupIndia DPIIT (₹0)
Month 4:  VAPT (CERT-In) + GS1 India (₹50K-1L)
Month 12: ISO 27001 (₹6L-10L)
Month 18: Drummond AS2 certification (₹2L-3L)
Year 2+:  SOC 2 Type II (₹13L-25L, only when US buyer requires)

---

## EXECUTION STRATEGY

3 PARALLEL CLAUDE CODE AGENTS:
- Agent 1 (Core): Monorepo, DB+RLS, API, outbox, saga, EDI spec engine, AI mapper
- Agent 2 (Bridge): Tally agent, tunnel, self-healing, auto-upgrade, file-drop
- Agent 3 (Portal): React dashboard, manual ops, calendar, escalation, admin console

Agent 1 starts FIRST (produces shared schemas). Then Agent 2+3 start in parallel.

20 WEEKS to complete Sales Order Connector (first connector, gold standard).
68 test cases + 9 simulation scenarios + 22 security test cases.
All future connectors replicate the patterns established by Sales Order.

GO-TO-MARKET:
- Developer portal with sandbox (self-evaluation)
- Tally consultant partner program (10-25% revenue share)
- Factory owner referrals (₹2,000 bill credit)
- Voice AI agent for outbound sales
- WhatsApp bot for operations
- FC Certified badge (after 100 error-free orders)

---

## SIMULATION SCENARIOS (9 total)

SIM-001: Happy path (Tally → 855 → 856 → 810 → Complete)
SIM-002: Inbound PO (Buyer 850 → FC → Tally import)
SIM-003: AS2 endpoint down (circuit breaker trip/recover)
SIM-004: Agent offline 7 days (reconnect + HWM reconciliation)
SIM-005: Factory holiday (silence suppression, zero false alerts)
SIM-006: PO Change while ASN in-flight (saga conflict detection)
SIM-007: Worker crash (heartbeat recovery, zero stuck orders)
SIM-008: Single transaction resync (new control number, no duplicate)
SIM-009: Bulk resync to UAT (500 messages, progress tracking)

---

## VAPT CHECKLIST (Sprint 30)

Domain 1 - IAM: MFA bypass, JWT forging, Vault least-privilege, session invalidation
Domain 2 - API/Network: BOLA via RLS, SQLi/XSS on mapping UI, rate limit stress
Domain 3 - Bridge Agent: OTP entropy, DPAPI extraction, tunnel impersonation, MITM
Domain 4 - Data Privacy: PII log audit, unsigned AS2 rejection, circuit breaker injection

---

## KEY DATABASE TABLES

Core: factories, buyers, connections, canonical_orders, canonical_order_line_items,
  canonical_shipments, shipment_packs, canonical_invoices, canonical_returns
  
Workflow: outbox, order_sagas, message_log, routing_rules

Security: audit_log (hash-chain, immutable), record_history (before/after on every table)

AI: llm_cache, llm_usage_log, ai_fix_log, mapping_configs

Support: calendar_entries, operational_profile, escalation_rules, escalation_log

Resync: resync_requests, resync_items

Config: app_config, feature_flags, relationship_registry

Partner: partners, partner_referrals, commission_ledger

Master Data: item_master, rate_cards, webhook_subscriptions, barcode_configs

ALL tenant-scoped tables have RLS. ALL tables have history triggers.
ALL configurable values in app_config or JSONB columns.

---

# END OF MASTER CONTEXT PROMPT
# This document + the v8 Blueprint docx + Sprint 1 Agent Prompts + 
# Sales Order Connector Plan = COMPLETE implementation package.
