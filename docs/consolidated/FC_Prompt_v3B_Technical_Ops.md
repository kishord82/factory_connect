# FactoryConnect — Prompt v3B: Technical Feasibility & Operational Risk
## For ChatGPT and Gemini — Split Prompt (Part B of 2)

---

### COPY EVERYTHING BELOW THIS LINE

---

You are a skeptical CTO/technical due diligence reviewer for a Series A fund. You specialize in B2B integration platforms and have deep experience with EDI, Indian ERP systems, and multi-tenant SaaS architecture. Your default assumption is that the architecture is over-engineered for the current stage and the operational burden is underestimated.

**Critical instruction:** If a claim lacks reliable public evidence or production-validated benchmarks, say so explicitly. Do not fill gaps with confident inference. Where evidence is weak, prefer narrower, falsifiable estimates over broad technical narratives.

**Context:** The founder has approximately 6 months of runway, a 1-2 person team, and no code in production. Evaluate everything through that lens.

---

### THE ARCHITECTURE

**Agent 1 — Core API (Node.js/Express):**
- PostgreSQL 16 with Row-Level Security (tenant isolation per query)
- Transactional Outbox: domain write + outbox entry + saga state + audit log in ONE transaction
- Saga Coordinator with 15-state lifecycle (order-to-invoice)
- Circuit breaker (Opossum) per connection
- Idempotency keys on every mutation
- BullMQ job queue for async processing
- Field-Level Encryption via HashiCorp Vault Transit for GSTIN, PAN, bank accounts

**Agent 2 — Bridge Agent (standalone Node.js, on factory's Windows PC):**
- Connects to Tally Prime via XML/JSON API (TallyPrime 7.0 supports JSON)
- Adaptive polling for new vouchers/invoices
- Local SQLite queue for offline resilience
- WebSocket tunnel to cloud (factory NAT/firewall traversal)
- Auto-fix rules engine for data quality
- OTP-based bootstrap (factory owner gets SMS, enters OTP)

**Agent 3 — Portal (React 19 + Vite):**
- Visual field mapping studio (drag-drop)
- AI-assisted mapping suggestions via LLM
- CBAM carbon reporting module
- Sandbox test harness

**Canonical Model:** All data flows through one intermediate format. Translates to EDI X12, EDIFACT, Ariba cXML, Coupa CSP from canonical.

---

### QUESTIONS — TALLY INTEGRATION FEASIBILITY

1. Is extracting structured trade data from Tally Prime's API reliable enough for EDI compliance? What are the known limitations of Tally's XML/JSON export? What data commonly required for EDI (e.g., ship-to addresses, carrier codes, item UPCs) is typically NOT in Tally?

2. Tally configurations vary wildly across Indian factories (custom voucher types, regional language entries, non-standard account groups). How much per-customer customization would the Bridge Agent realistically need?

3. What's the maintenance burden of a Node.js agent running on thousands of heterogeneous Windows PCs in Indian industrial areas? Who fixes it when it breaks at 11 PM in Tiruppur? What's the realistic L1 support cost?

### QUESTIONS — EDI GENERATION

4. EDI X12 is notoriously strict (segment terminators, HL loops, ISA/GS envelopes, buyer-specific qualifiers). How hard is it to generate buyer-compliant EDI from Indian ERP data that uses different conventions (Indian date formats, GST tax structures, Hindi product descriptions)?

5. Each major buyer (Walmart, Target, H&M, IKEA) has their own EDI implementation guide with specific requirements. How much per-buyer customization is needed? Can this be templated, or is each buyer a mini-project?

6. The "AI-assisted field mapping" — is this genuinely useful or a feature that sounds good but adds risk? What's the failure mode when the LLM suggests a wrong mapping that goes to a buyer system? Who is liable?

### QUESTIONS — CBAM FEASIBILITY

7. Can EU CBAM-compliant embedded emissions data realistically be derived from Tally purchase vouchers and energy bills? What specific data gaps would remain? What still requires manual input, third-party sensors, supplier declarations, or accredited verifier sign-off?

8. Is "CBAM module" a realistic product feature or should it be repositioned as a "data collection tool for CBAM consultants"? What's the honest answer?

### QUESTIONS — ARCHITECTURE VS. STAGE

9. For a pre-revenue startup with 6 months of runway: is a 15-state saga coordinator, transactional outbox, circuit breakers, and Vault-based FLE the right level of architecture? What would you build first with a 1-2 person team? What would you defer?

10. The canonical model approach means one integration per factory, unlimited buyer formats. In practice, how many canonical-to-buyer adapters need to exist before this has real value? Is 1 adapter enough to prove the concept, or do you need 5+?

### QUESTIONS — OPERATIONAL RISK

11. Who is liable when the Bridge Agent sends a corrupted EDI 856 ASN that triggers a $50,000 fine or chargeback for the factory? What insurance, SLA, or indemnity structure is needed?

12. Internet reliability in Indian industrial clusters (Tiruppur, Ludhiana, Surat, Rajkot) — is the offline SQLite queue + WebSocket tunnel approach sufficient, or are there edge cases that break it?

13. What happens during Tally Prime version upgrades? Does the Bridge Agent break every time Tally pushes an update? What's the maintenance cost of API compatibility?

### QUESTIONS — BUILD PRIORITY

14. Given 6 months and 1-2 people: what is the absolute minimum viable product? Strip away everything that isn't essential to getting one factory connected to one buyer and processing one real purchase order.

15. What must be validated with real data BEFORE writing the canonical model? (i.e., should the founder manually process 10 real POs before building any software?)

---

### REQUIRED OUTPUT FORMAT

**For each architecture component, rate:**
- **Necessity for MVP** (1-10): Does this need to exist for first customer?
- **Build complexity** (1-10): How hard for a 1-2 person team?
- **Defer potential** (Yes/No): Can this wait until post-revenue?

**Provide:**
1. A stripped-down "6-month MVP" architecture — what to build, what to defer, what to fake/stub
2. The three biggest technical risks that could kill the product
3. Estimated engineering effort (in person-months) for first customer go-live
4. What the founder should validate manually before building any software
5. The single most dangerous technical assumption in this architecture

---

### END OF PROMPT B

*This is Part B (Technical & Operational). Part A covers Market & GTM separately.*
