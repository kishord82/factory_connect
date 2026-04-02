# FactoryConnect — Architecture Blueprint
### Consolidated Architecture Reference (from Blueprint v8.0 FINAL)
**Date:** April 2, 2026 | **Author:** Kishor Dama + Claude (Co-Architect)

---

## 1. WHAT IS FACTORYCONNECT

FactoryConnect (FC) is a multi-tenant SaaS integration middleware that connects Indian SME factory ERP systems (Tally Prime, Zoho Books, SAP Business One) to global buyer procurement systems (Walmart EDI X12/AS2, SAP Ariba cXML, Coupa REST).

FC is NOT the source of truth — the factory ERP is the master. FC is a GUARANTEED DELIVERY middleware that ensures 100% message delivery, retains data for compliance/resync, and provides self-healing operations.

---

## 2. PLATFORM PHILOSOPHY (10 Principles)

1. **AI-POWERED** — learns, adapts, operates autonomously
2. **EVERYTHING IS PREFERENCES** — FC builds all features, factory enables what they want
3. **SELF-HEALING** — agent fixes itself, 40+ deterministic failure patterns
4. **SELF-OPERATING** — factory runs everything from portal
5. **SELF-SUSTAINING** — one training + ops manual, zero ongoing support tickets
6. **GUARANTEED DELIVERY** — once FC accepts a message (HTTP 201), it WILL be delivered
7. **DESIGN GLOBAL, BUILD INDIA** — any country via config, not code
8. **BUILD EVERYTHING, TOGGLE ON/OFF** — factory never hears "coming soon"
9. **EMPOWER THE ECOSYSTEM** — Tally consultants are distribution partners
10. **LOW BASE PRICE** — competitors can't undercut (OCI free tier infra)

---

## 3. FACTORY TYPES SERVED

| Type | Description | How FC Works |
|------|-------------|-------------|
| Type 1 | Factory with ERP + Integration | Tally → Bridge Agent → FC → EDI → Buyer. Zero manual work. |
| Type 2 | Factory with ERP, no integration | Factory exports → uploads to FC → EDI → Buyer. |
| Type 3 | Factory with no ERP | FC portal IS the operational system. Manual data entry. |
| Type 4 | Micro factory (white glove) | FC ops does everything via "Act As" impersonation. |

---

## 4. TECH STACK (Non-Negotiable)

| Layer | Technology | Notes |
|-------|-----------|-------|
| Runtime | Node.js 22 LTS + TypeScript 5 strict | pnpm 9.x workspaces |
| API | Express.js 5 | Zod 3.x validation |
| Database | PostgreSQL 16 + RLS | Raw SQL with pg — NO ORM. dbmate migrations. |
| Queue | BullMQ 5 + Redis 7 | Outbox poller 5s, saga poller 60s |
| Auth | Keycloak 24 + MFA (TOTP) | Factory/admin/buyer realms |
| Secrets | HashiCorp Vault | Transit engine for FLE |
| Logging | Pino 9.x + PII redaction | Regex scrub before any log write |
| Proxy | Caddy 2.x | Auto-SSL |
| EDI | Custom spec engine + x12-parser | JSON spec maps per buyer |
| AS2 | OpenAS2 Docker sidecar | Opossum circuit breakers |
| Mapping | JSONata 2.x | AI-assisted via Claude API |
| AI | Claude API (Haiku/Sonnet) + fallback | 3-Layer LLM with caching |
| Frontend | React 19 + Vite 6 + shadcn/ui | TanStack Table, Zustand, i18n |
| Testing | Vitest + Supertest | Co-located tests |
| Container | Docker Compose | OCI Ampere A1 ARM64 |
| Monitoring | Grafana + Prometheus + Loki | Optional: Sentry for error tracking |
| Storage | MinIO (S3-compatible) | Claim check for >256KB payloads |
| DNS/SSL/WAF | Cloudflare free tier | Rate limiting at edge |

ALL configurable via `app_config` table — ZERO hardcoded values.

---

## 5. 10 ARCHITECTURE DECISIONS

| # | Decision | Choice | Key Rationale |
|---|----------|--------|---------------|
| D1 | EDI Engine | Data-driven spec engine | New buyer = 2 days config, not code |
| D2 | AS2 Transport | OpenAS2 sidecar + Opossum | Battle-tested Java AS2, don't rewrite |
| D3 | Workflow | BullMQ + Saga + Outbox | No Temporal — FC pipeline is fixed, not dynamic |
| D4 | Multi-tenancy | Row-Level Security | Single schema, guaranteed isolation |
| D5 | Buyer specs | VAN partnership + direct | Authoritative specs, not scraped |
| D6 | AI Mapping | 3-Layer LLM fallback | Claude → Gemini/GPT → local model |
| D7 | EDIFACT | Deferred Phase 2 | Spec engine already supports it |
| D8 | Data deletion | 90-day soft-delete + legal hold | Dual-threshold (days + size) |
| D9 | Infrastructure | OCI free → graduated | 0-2: free, 3: paid, 200+: AWS |
| D10 | Source mode | Agent + Webhook + API | Adaptive polling + HWM reconciliation |

For full alternatives-rejected and tradeoffs-accepted, see `FC_Architecture_Decisions_History.md`.

---

## 6. 21 ENTERPRISE PATTERNS

| # | Pattern | Where Used |
|---|---------|-----------|
| 1 | Row-Level Security (RLS) | All tenant tables |
| 2 | Transactional Outbox | Atomic domain + event writes |
| 3 | Saga Coordinator (15-state) | Order lifecycle with SLA |
| 4 | Worker Heartbeat | Claim before process, stale detection |
| 5 | Circuit Breaker (Opossum) | Per buyer AS2 endpoint |
| 6 | Data-Driven Spec Engine | JSON spec maps per buyer |
| 7 | Claim Check | Payloads >256KB → MinIO URI |
| 8 | OTP Bootstrap | Activation → CSR → Vault PKI → cert |
| 9 | HWM Reconciliation | Daily hash comparison |
| 10 | Field-Level Encryption | PAN/GSTIN via Vault Transit |
| 11 | PII Log Interceptor | Regex scrub before any log |
| 12 | Adaptive Polling | 5/10/15/30 min based on CPU+RAM |
| 13 | Deterministic Diagnostics | 40+ failure patterns, rules engine |
| 14 | 3-Layer LLM Fallback | Claude → Gemini/GPT → Local |
| 15 | Idempotent Receiver | X-Idempotency-Key + Redis + DB |
| 16 | Exponential Backoff + Jitter | ±30% on all retries |
| 17 | Immutable Audit Log | Hash-chain SHA-256, no UPDATE/DELETE |
| 18 | Sidecar Pattern | OpenAS2 alongside Node.js |
| 19 | Strangler Fig | Old agent runs until new passes health |
| 20 | Data Minimization | Agent pulls only mapping fields |
| 21 | Capacity-Triggered Graduation | OCI free → paid thresholds |

---

## 7. SECURITY ARCHITECTURE

### Always Enforced (non-negotiable):
- RLS tenant isolation
- FLE for PII columns (Vault Transit)
- PII log redaction interceptor
- mTLS for Bridge Agent tunnel
- AS2 signing + encryption
- MFA for all portal logins
- Immutable audit log (hash-chain)
- Email restriction (data only to configured emails)

### Defense in Depth:
```
WAF (Cloudflare) → Caddy (rate limit) → Zod (validation)
  → RLS (DB isolation) → FLE (column encryption)
  → PII interceptor (log scrub) → hash-chain audit
```

### Data Flow Security (20+ boundaries):
- **Inbound:** Agent tunnel (mTLS), webhooks (HMAC), REST API (JWT), buyer AS2 (signature verify)
- **Outbound:** Buyer AS2 (S/MIME), factory file-drop (tunnel), email (restricted list + ZIP), Claude API (PII scrubbed)
- **Rules:** Email only to verified addresses. WhatsApp/SMS = order reference only. Claude = error code only. Logs = zero PII.

---

## 8. 3-AGENT ARCHITECTURE

### Agent 1 — Core (Cloud)
- Monorepo: `apps/api/` + `packages/`
- Database + RLS + migrations
- API + middleware (auth, tenant-context, validation, idempotency, feature-gate)
- Outbox poller + saga coordinator
- Mapping engine + AI mapper
- EDI spec engine + envelope builder
- BullMQ pipeline workers
- OpenAS2 sidecar management

### Agent 2 — Bridge (Factory Windows PC)
- Standalone Node.js agent compiled to .exe
- Tally XML client + adaptive polling
- Local SQLite queue (encrypted, WAL mode)
- WebSocket tunnel (mTLS, HMAC signing)
- 7-layer health probes (35+ probes)
- Rules engine (40+ deterministic patterns)
- Auto-fix executor
- OTP bootstrap + cert management
- HWM reconciliation
- Auto-upgrade with rollback

### Agent 3 — Portal (Cloud)
- React 19 SPA
- Keycloak integration + MFA
- Dashboard, orders, saga timeline
- AI Mapping Studio (upload, analyze, drag-drop, chat, export)
- Sandbox test console
- Connector catalog
- Calendar + escalation
- Settings + admin console
- i18n (English + Hindi)

---

## 9. DATABASE SCHEMA (Key Tables)

### Core:
`factories`, `buyers`, `connections`, `canonical_orders`, `canonical_order_line_items`, `canonical_shipments`, `shipment_packs`, `canonical_invoices`, `canonical_returns`

### Workflow:
`outbox`, `order_sagas`, `message_log`, `routing_rules`

### Security:
`audit_log` (hash-chain, immutable), `record_history` (before/after triggers on every table)

### AI:
`llm_cache`, `llm_usage_log`, `ai_fix_log`, `mapping_configs`, `notification_templates`

### Support:
`calendar_entries`, `operational_profile`, `escalation_rules`, `escalation_log`

### Resync:
`resync_requests`, `resync_items`

### Config:
`app_config`, `feature_flags`, `relationship_registry`

### Partner:
`partners`, `partner_referrals`, `commission_ledger`

### Catalog:
`connector_catalog`, `connector_requests`

### Master Data:
`item_master`, `rate_cards`, `webhook_subscriptions`, `barcode_configs`

ALL tenant-scoped tables have RLS. ALL tables have history triggers. ALL configurable values in `app_config` or JSONB columns.

---

## 10. RESYNC STATE MACHINE

```
REQUESTED → VALIDATED → APPROVED → QUEUED → IN_PROGRESS → COMPLETED
  ↓            ↓                                    ↓
REJECTED    DENIED                          PARTIAL_FAIL → REQUIRES_REVIEW
```

- Auto-approve: single transaction + UAT target
- Manual approve: bulk financial docs to PROD
- New idempotency keys + new EDI control numbers per resync
- 6-month historical replay supported

---

## 11. SELF-HEALING SYSTEM

### 7-Layer Health Check (every 2 minutes):
L1: OS | L2: Network | L3: Security | L4: Persistence | L5: Tunnel | L6: Application | L7: Version

### Deterministic Rules Engine:
40+ failure patterns, each with: signature (which probes fail) → root cause → fix chain.
NO LLM in diagnostic/auto-fix path. Error-code-only to Claude for human-readable summaries.

### AI Fix Safety:
Every fix: reversible, isolated, previewed (dry run), approved, logged.
Low risk → auto-approve | Medium → factory admin | High → FC ops.

---

## 12. PROACTIVE SUPPORT

### Operational Calendar (7 sources):
System preloaded, portal UI, email template, iCal feed, Google Calendar, factory API, WhatsApp reply.

### Silence Detection (7-question decision tree):
Holiday? → Business hours? → Weekly off? → Maintenance? → Agent offline? → Within baseline? → Beyond threshold?
Only if all NO and beyond threshold → true anomaly alert.

### Graduated Escalation (5 steps):
WhatsApp (0 min) → Email (60 min) → SMS (120 min) → AI Bot Call (4 hr) → Human Call (8 hr).
Factory controls: channels, order, wait times, quiet hours, language.

---

## 13. FEATURE TOGGLE SYSTEM

**Platform level** (FC admin): `feature_flags` table — globally enable/disable.
**Factory level** (preferences): JSONB on factory — per-factory toggle.

**Functional features (ALWAYS ON):** receive PO, send ACK/ASN/Invoice, partial shipments, tax mapping, multi-currency, item master, returns, transaction visibility, resync, export/import.

**Preference features (factory toggles):** password on exports, notification channels, webhooks, anomaly detection, analytics, export watermarking, chargeback tracking.

---

## 14. GLOBAL-READY ARCHITECTURE

Every country-specific value is JSONB on connection table:
```json
// India
{ "tax_config": {"type":"GST","components":["CGST","SGST"],"rate":18} }
// Indonesia (zero code changes)
{ "tax_config": {"type":"PPN","rate":11,"tax_id_field":"npwp"} }
```
Entering a new country = upload config. Factory is live.

---

## 15. INFRASTRUCTURE & COSTS

| Resource | Provider | Cost |
|----------|----------|------|
| Compute (4 OCPU, 24GB) | OCI free tier | ₹0 |
| Storage (200GB block + 20GB object) | OCI free tier | ₹0 |
| Claude API (Haiku) | Anthropic | ~₹1,500/month |
| WhatsApp | Gupshup | ₹500-1,000/month |
| Email | Amazon SES | ₹0 (free tier) |
| DNS/SSL/WAF | Cloudflare | ₹0 (free tier) |
| **Total** | | **~₹2,750/month** |

**Break even:** 1 factory on Starter plan (₹5,000/month).

---

## 16. PRICING MODEL

| Tier | Orders/Month | Price |
|------|-------------|-------|
| Starter | ≤50 | ₹5,000/month |
| Growth | ≤200 | ₹12,000/month |
| Business | ≤500 | ₹25,000/month |
| Enterprise | ≤1,000 | ₹40,000/month |
| Unlimited | Custom | Custom |

Extras: +₹2,000/additional buyer, +₹50/GB extended retention.

---

## 17. PARTNER & REFERRAL SYSTEM

**Partner types:** Tally Consultant, CA Firm, ERP Implementor, SI, Reseller, Referral Individual, Factory Referrer.

**Commission models (configurable per partner):** Revenue share, profit share, fixed per factory, bill credit, free months, one-time referral, milestone bonus, tiered revenue share.

---

## 18. CERTIFICATION ROADMAP

| When | Certification | Cost |
|------|--------------|------|
| Month 0 | DPDP + security.txt + privacy policy + StartupIndia DPIIT | ₹0 |
| Month 4 | VAPT (CERT-In) + GS1 India | ₹50K-1L |
| Month 12 | ISO 27001 | ₹6L-10L |
| Month 18 | Drummond AS2 | ₹2L-3L |
| Year 2+ | SOC 2 Type II | ₹13L-25L (only when US buyer requires) |

---

*This document is the consolidated architecture reference. For implementation tasks, see `FC_Development_Plan.md`. For connector-specific design, see `FC_SalesOrder_Connector_Design.md`. For decision history and code-level details from reviews, see `FC_Architecture_Decisions_History.md`.*
