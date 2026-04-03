# FactoryConnect — Documentation Hub
**Version 3.0 | April 2026**

## What is FactoryConnect?
Multi-tenant SaaS integration platform connecting Indian SME factory ERPs (Tally, Zoho, SAP B1, ERPNext, Busy, Marg) to global buyer procurement systems (EDI X12, SAP Ariba, Coupa, Oracle Fusion, EDIFACT).

## Document Map

### Architecture (docs/architecture/)
- `FC_Architecture_Blueprint.html` — Master architecture document v3.0 (single source of truth)
- `FC_Versioned_Adapter_Architecture.html` — Microservice adapter design, scaling, lifecycle
- `FC_Integration_Specs_Reference.html` — All source/target API docs, sales order flow, best practices
- `FC_Onboarding_Configuration_Engine.html` — 10-step onboarding workflow
- `FC_Grey_Areas_MultiVersion_Strategy.html` — Multi-version handling decisions

### RAID Analysis (docs/raid/)
- `FC_RAID_Analysis.html` — 24 Risks, 18 Assumptions, 15 Issues, 20 Dependencies
- `FC_RAID_Recommendations.html` — Expert answers for all 20 questions + 6-month execution plan

### Research (docs/research/)
- `FC_Report1_Connector_DeepDive.md` — Source/target connector technical analysis
- `FC_Report2_Market_Revenue_Model.md` — Revenue modeling and market sizing
- `FactoryConnect_Research_Report.md` — Initial research findings
- `FactoryConnect_TestData_Samples.md` — Test data for development

### Business (docs/business/)
- `FC_Marketing_Strategy.html` — GTM strategy, channels, positioning
- `FC_Leads_Potential_Customers.html` — Target customer profiles
- `FC_Global_Market_Potential.html` — TAM/SAM/SOM analysis
- `FC_Cloud_Hosting_Comparison.html` — GCP vs AWS vs Azure comparison

### Security (docs/security/)
- `FC_Security_BestPractices_RACI.html` — Security controls and RACI matrix

## Key Decisions (from RAID Recommendations)
1. **EDI Parser:** Python Bots gRPC sidecar → Go native (hybrid approach)
2. **Buyer Connectivity:** TrueCommerce ISV Partnership + direct certification in parallel
3. **Tally Adapter:** JSON-first (TallyPrime 7.0) with XML fallback, 5-Star Partner application
4. **Pricing:** ₹4,999-24,999/month, INR-only, annual with 2-months-free discount
5. **GTM:** Tally Partner ecosystem + Tiruppur textile cluster + WhatsApp referral

## Recent Updates (v3.0 — April 2026)
- Added RAID analysis (77 items across Risks, Assumptions, Issues, Dependencies)
- Added detailed recommendations for all 20 expert consultation questions
- Updated Tally adapter strategy: JSON-first based on TallyPrime 7.0 native JSON support
- Updated Marg ERP strategy: confirmed Stock, Invoice/Orders, Dispatch APIs available
- Added Gemini-reviewed improvements: Shadow DB bridge agent, HWM reconciliation, structured industry overlays
- Added disaster recovery plan: RTO 2hr / RPO 30min
- Added SOC 2 Type I roadmap: 5-6 months, $25-35K budget
- Added TrueCommerce ISV partnership as primary buyer connectivity strategy

## How to Read These Documents
- Open any `.html` file in Chrome/Safari — they are self-contained with all styling
- Open `.md` files in any text editor or VS Code
- For an interactive index, see `index.html` in this directory

## Quick Links for Expert Consultation
Share these with GPT, Gemini, or industry experts:
- **RAID Analysis:** docs/raid/FC_RAID_Analysis.html
- **Expert Questions & Recommendations:** docs/raid/FC_RAID_Recommendations.html
- **Architecture Blueprint:** docs/architecture/FC_Architecture_Blueprint.html

## Project Status
- **Phase:** Research complete, architecture finalized, ready for development
- **Module Path:** `github.com/factoryconnect/portal`
- **Tech Stack:** Node.js 20 + TypeScript, PostgreSQL 16, Redis 7, BullMQ, Kong, Keycloak, MinIO, Novu
- **Target Launch:** Q3 2026
