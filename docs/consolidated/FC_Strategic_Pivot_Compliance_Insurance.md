# FactoryConnect — Strategic Pivot: Compliance Insurance Platform
## Post-Investor Due Diligence Decision Document
### Date: April 3, 2026

---

## Context

After running FactoryConnect's architecture and market thesis through three independent AI analyses (Claude, ChatGPT, Gemini) using progressively harder investor-grade prompts, the unanimous verdict was:

- **Architecture: Strong (8-9/10)** — over-engineered for current stage but defensible
- **Market thesis: Valid but untested** — the pain is real, willingness to pay is unproven
- **Investment verdict: Conditional** — no funding until customer validation proves unit economics

The critical insight across all analyses: **Indian MSMEs buy "fine avoidance," not "efficiency."**

---

## The Pivot

### FROM: "Automated ERP-to-Buyer Sync Platform" (Middleware SaaS)
### TO: "EDI Compliance & CBAM Shield" (Compliance Insurance Platform)

---

## Key Decisions

### 1. Value Proposition Rebrand

- **Primary message:** "Zero-Penalty Export" — not "automated data sync"
- **Lead with risk:** Risk Dashboard showing potential chargebacks (1-5% of invoice value)
- **Shadow Mode becomes a sales tool:** 14-day shadow run produces a "Manual Process Risk Report" showing exactly where chargebacks would have hit
- **Pricing frame:** ₹5,000/month to avoid ₹50,000+ in annual chargebacks = 10x ROI story

### 2. CBAM Module Pivot

- **FROM:** "Automated carbon calculator" deriving emissions from Tally data
- **TO:** "Supplier Connectivity Portal" — Tier-2 suppliers upload Verified Emission Declarations
- **Added:** Verification API for accredited verifiers to audit digital trail in FC Cloud
- **Rationale:** Tally purchase vouchers are financial proxies, not engineering-grade emission data. Honest about limitations. Network approach has more defensibility.

### 3. Liability Answer

- **Phase 1: Human Sign-off Loop** — software prepares compliant EDI, Export Manager clicks "Approve" on human-readable summary before AS2 dispatch
- **Legal boundary:** "Last Clear Chance" doctrine — user approves what software generated
- **Proof mechanism:** Hash-chained audit log proves exact content that was approved
- **Future (Phase 2+):** Graduated automation with configurable approval thresholds

### 4. Tally Data Quality Gate

- **Master Data Health Score** in Bridge Agent tray menu
- **Pre-flight scrubbing:** flags missing HSN codes, non-standard UOM, GST-EDI mismatches
- **Gate:** Health Score < 80% blocks implementation start
- **Purpose:** Forces data cleanup before integration, reducing onboarding chaos

### 5. Onboarding Strategy

- **First 3-5 factories:** Discovery mode (8-12 hours each) — learn common Tally configs
- **Factory 6+:** Standard Tally Templates — target <4 hours if factory uses template
- **Key metric:** Onboarding time must fall with each customer, proving template leverage

### 6. Go-to-Market Narrowing

- **Single cluster:** Tiruppur (textiles) — factories with active Walmart/Amazon EDI mandates
- **Single buyer type:** Start with one buyer's implementation guide (e.g., Walmart)
- **3-5 design partners:** Not 10, not 50. Prove the model works before scaling.

---

## 90-Day Proof Plan

| Week | Goal | Action | Success Metric |
|------|------|--------|----------------|
| 1-2 | Shadow Mode Audit Report | Build the risk report template | Template reviewed by 2 export managers |
| 3-4 | First factory Shadow Mode | Deploy Bridge Agent at 1 Tiruppur factory | 14 days of shadow data collected |
| 5-6 | Risk Report delivery | Present Manual Process Risk Report to factory owner | Owner understands chargeback exposure |
| 7-8 | Conversion | Convert shadow to paid pilot | First ₹5,000/month payment |
| 9-10 | Second/third factory | Repeat with 2 more factories | 3 factories in shadow/paid |
| 11-12 | Template validation | Measure onboarding time for factory 3-5 | <4 hours for factory using template |

---

## What We Will NOT Build Until Validated

- Full 15-state Saga Coordinator (stub it, prove the flow manually first)
- AI-assisted field mapping (manually map first 5 factories to learn the patterns)
- CBAM Supplier Portal (Phase 1.5, after EDI core is proven)
- Multi-buyer support (one buyer implementation guide first)
- Portal UI beyond essential monitoring dashboard

---

## Investment Reconsideration Conditions (from Gemini)

| Condition | Our Plan to Meet It |
|-----------|-------------------|
| 5 paying customers, 3 months retention | 90-day proof plan targets 3-5 in Tiruppur cluster |
| <4 hour onboarding | Template approach, measured from factory 3+ |
| Buyer mandate/approval | Approach Walmart India vendor compliance team for "approved partner" status |

---

## Risks Accepted

1. **Template chicken-and-egg:** First 3-5 factories are template discovery, not template consumers. Higher cost per early customer is acceptable.
2. **Single-cluster concentration:** All eggs in Tiruppur basket. Acceptable for validation phase.
3. **Manual operations initially:** Some processes will be manual/semi-automated. Acceptable to prove market before automating.
4. **CBAM deferred:** Not a Phase 1 feature. May lose early CBAM-only prospects. Acceptable tradeoff.

---

*This document represents the strategic pivot resulting from three-way AI due diligence analysis. All referenced analyses are in docs/consolidated/.*
