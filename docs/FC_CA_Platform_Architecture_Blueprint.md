# FactoryConnect CA Platform — Architecture Blueprint
### Extension to FC Master Blueprint v8.0
**Date:** April 3, 2026 | **Author:** Kishor Dama + Claude (Co-Architect)

---

## 1. WHAT IS FC CA PLATFORM

FC CA Platform extends the FactoryConnect core to serve **Chartered Accountant (CA) firms** as a primary distribution and usage channel. The same Bridge Agent that extracts factory ERP data for EDI compliance now extracts data for **GST filing, TDS reconciliation, MCA compliance, bank reconciliation, and practice management**.

**Key insight:** The CA firm is not just a customer — it's a **distribution multiplier**. One CA firm → 50-200 Bridge Agent installations across their client base. The CA firm becomes the **managed service provider** for FactoryConnect, handling client onboarding, monitoring, and support.

**Product position:** "Multi-client Tally extraction + validation + compliance prep + exception management + practice operating system."

---

## 2. PLATFORM PHILOSOPHY EXTENSIONS

The 10 original FC principles remain. Adding 5 CA-specific principles:

11. **CA IS THE OPERATOR** — CA firm manages everything for their clients. Client sees nothing unless CA enables it.
12. **FEATURE-GATED BY SUBSCRIPTION** — All features built and deployed. Toggled per tenant/firm via `feature_flags` table.
13. **CHANNEL-AGNOSTIC COMMUNICATION** — WhatsApp, Email, SMS. CA chooses channel per client. Same notification engine.
14. **DOCUMENT LIFECYCLE IS SACRED** — Every document request, submission, and acknowledgment is tracked with full audit trail.
15. **ZERO MANUAL DATA ENTRY** — If data exists in Tally, the system extracts it. Manual entry is a last resort.

---

## 3. USER TYPES & ROLES

| Role | Description | Access Level |
|------|-------------|-------------|
| **FC Admin** | FactoryConnect ops team | Platform-wide admin, feature flag control |
| **CA Partner** | CA firm owner/partner | Full firm access, billing, subscription, all clients |
| **CA Manager** | Senior staff | Assigned client portfolio, filing, review |
| **CA Staff** | Articled clerks, assistants | Assigned tasks, data review, limited actions |
| **Client Admin** | Factory/SME business owner | View own data, upload docs, respond to requests (optional) |
| **Client Staff** | Factory accountant | Upload docs, respond to requests (optional) |

### Role Hierarchy:
```
FC Admin → CA Partner → CA Manager → CA Staff → Client Admin → Client Staff
```

### Keycloak Realms:
- `fc-admin` — FC operations
- `ca-firm` — CA firm staff (multi-role)
- `ca-client` — Factory/SME clients (optional self-serve portal)

---

## 4. FEATURE REGISTRY (F1-F20)

### Tier 1 — Core (GO FIRST)
| ID | Feature | Description | Engine Reuse |
|----|---------|-------------|-------------|
| F1 | Bridge Agent + Tally Extraction | Auto-read client Tally via port 9000, push to cloud | 100% (existing) |
| F2 | GST Filing Preparation | GSTR-1/3B/9 auto-prep from Tally data | 90% + GST templates |
| F3 | TDS/TCS Reconciliation | Tally TDS vs TRACES matching, return prep | 90% + TDS templates |
| F5 | Compliance Dashboard | Multi-client traffic-light status, exception queue | 95% + new UI |
| F11 | Document Collection & Chase | WhatsApp/email doc requests to clients, tracking | New module |
| F13 | Notice & Demand Management | Track GST/IT notices, deadlines, response templates | New module |
| F17 | Client Health Score | AI risk scoring per client (compliance + financial) | 75% (AI engine) |

### Tier 2 — Growth
| ID | Feature | Description | Engine Reuse |
|----|---------|-------------|-------------|
| F4 | MCA/ITR Filing Prep | Tally P&L → ITR schedules, AOC-4/MGT-7 | 85% + ITR templates |
| F7 | Bank Reconciliation | Bank statement → Tally invoice matching | 90% + parser |
| F12 | GSTR-2B Reconciliation | Supplier-filed vs purchase register matching | 90% + 2B module |
| F14 | Staff Productivity Dashboard | Time tracking, client profitability, billing | New module |
| F15 | Audit Preparation Kit | Auto-generate audit-ready document packages | 80% (data exists) |
| F16 | EPFO/ESI Compliance | PF/ESI monthly filing from Tally payroll | 85% + PF templates |

### Tier 3 — Premium (Exporter Add-ons)
| ID | Feature | Description | Engine Reuse |
|----|---------|-------------|-------------|
| F6 | Export EDI Compliance | Buyer-compliant EDI 810/856/850 generation | 100% (existing FC core) |
| F8 | Trade Finance | TReDS/NBFC invoice discounting pipe | 100% + TReDS API |
| F9 | E-commerce Compliance | Marketplace reconciliation, TCS tracking | 85% + marketplace APIs |
| F18 | Customs Documentation | ICEGATE Shipping Bills, BoL, CoO | 95% + customs templates |

### Cross-Cutting
| ID | Feature | Description |
|----|---------|-------------|
| F19 | Feature Flag Admin | Toggle features per firm, per subscription tier |
| F20 | WhatsApp Communication Engine | Template-based messaging, doc collection, reminders |

---

## 5. ARCHITECTURE EXTENSION

### 5.1 Monorepo Update

```
factory_connect/
├── apps/
│   ├── api/                    # Agent 1 — Core API (extended)
│   │   ├── src/
│   │   │   ├── routes/
│   │   │   │   ├── orders/     # Existing FC routes
│   │   │   │   ├── compliance/ # NEW: GST, TDS, MCA, EPFO routes
│   │   │   │   ├── documents/  # NEW: Document collection & chase
│   │   │   │   ├── notices/    # NEW: Notice & demand management
│   │   │   │   ├── reconciliation/ # NEW: Bank, GSTR-2B recon
│   │   │   │   ├── analytics/  # NEW: Health scores, productivity
│   │   │   │   ├── communication/ # NEW: WhatsApp/Email engine
│   │   │   │   └── admin/      # NEW: Feature flags, subscriptions
│   │   │   ├── workers/
│   │   │   │   ├── outbox-poller.ts      # Existing
│   │   │   │   ├── saga-poller.ts        # Existing
│   │   │   │   ├── gst-prep-worker.ts    # NEW
│   │   │   │   ├── tds-recon-worker.ts   # NEW
│   │   │   │   ├── bank-recon-worker.ts  # NEW
│   │   │   │   ├── doc-chase-worker.ts   # NEW
│   │   │   │   ├── notice-tracker-worker.ts # NEW
│   │   │   │   ├── health-score-worker.ts   # NEW
│   │   │   │   └── whatsapp-worker.ts    # NEW
│   │   │   ├── services/
│   │   │   │   ├── compliance/
│   │   │   │   │   ├── gst-service.ts
│   │   │   │   │   ├── tds-service.ts
│   │   │   │   │   ├── mca-service.ts
│   │   │   │   │   ├── epfo-service.ts
│   │   │   │   │   └── itr-service.ts
│   │   │   │   ├── reconciliation/
│   │   │   │   │   ├── bank-recon-service.ts
│   │   │   │   │   ├── gstr2b-recon-service.ts
│   │   │   │   │   └── tds-traces-recon-service.ts
│   │   │   │   ├── documents/
│   │   │   │   │   ├── doc-request-service.ts
│   │   │   │   │   ├── doc-chase-service.ts
│   │   │   │   │   └── doc-storage-service.ts
│   │   │   │   ├── notices/
│   │   │   │   │   ├── notice-tracker-service.ts
│   │   │   │   │   └── notice-response-service.ts
│   │   │   │   ├── analytics/
│   │   │   │   │   ├── health-score-service.ts
│   │   │   │   │   ├── productivity-service.ts
│   │   │   │   │   └── billing-service.ts
│   │   │   │   └── communication/
│   │   │   │       ├── whatsapp-service.ts
│   │   │   │       ├── email-service.ts
│   │   │   │       └── template-service.ts
│   │   │   └── middleware/
│   │   │       ├── feature-gate.ts  # ENHANCED: Checks subscription tier
│   │   │       └── ...existing...
│   ├── bridge/                 # Agent 2 — Bridge (enhanced)
│   │   ├── src/
│   │   │   ├── extractors/
│   │   │   │   ├── tally-sales.ts      # Existing
│   │   │   │   ├── tally-purchase.ts   # Existing
│   │   │   │   ├── tally-ledger.ts     # NEW: Full ledger extraction
│   │   │   │   ├── tally-gst.ts        # NEW: GST-specific data
│   │   │   │   ├── tally-tds.ts        # NEW: TDS entries
│   │   │   │   ├── tally-payroll.ts    # NEW: Salary/PF/ESI data
│   │   │   │   ├── tally-stock.ts      # NEW: Stock summary
│   │   │   │   └── tally-trial-balance.ts # NEW: Trial balance
│   │   │   └── ...existing...
│   └── portal/                 # Agent 3 — Portal (major extension)
│       ├── src/
│       │   ├── pages/
│       │   │   ├── dashboard/          # ENHANCED: CA multi-client view
│       │   │   ├── clients/            # NEW: Client management
│       │   │   ├── compliance/         # NEW: GST/TDS/MCA views
│       │   │   ├── reconciliation/     # NEW: Bank/2B recon views
│       │   │   ├── documents/          # NEW: Doc collection tracker
│       │   │   ├── notices/            # NEW: Notice management
│       │   │   ├── analytics/          # NEW: Health scores, productivity
│       │   │   ├── communication/      # NEW: WhatsApp templates, history
│       │   │   ├── admin/              # NEW: Feature flags, subscriptions
│       │   │   ├── orders/             # Existing FC order views
│       │   │   └── settings/           # Enhanced with CA settings
│       │   └── ...existing...
├── packages/
│   ├── shared/
│   │   ├── schemas/
│   │   │   ├── compliance/     # NEW: GST, TDS, MCA Zod schemas
│   │   │   ├── documents/      # NEW: Doc request/response schemas
│   │   │   ├── notices/        # NEW: Notice schemas
│   │   │   ├── reconciliation/ # NEW: Recon schemas
│   │   │   └── ...existing...
│   │   ├── templates/
│   │   │   ├── whatsapp/       # NEW: WhatsApp message templates
│   │   │   ├── email/          # NEW: Email templates
│   │   │   ├── gst/            # NEW: GST output templates
│   │   │   ├── tds/            # NEW: TDS output templates
│   │   │   └── notices/        # NEW: Notice response templates
│   └── ...existing...
```

### 5.2 New Database Tables

```sql
-- ===== CA FIRM MANAGEMENT =====

CREATE TABLE ca_firms (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  registration_number TEXT, -- ICAI firm number
  gst_number TEXT,
  subscription_tier TEXT NOT NULL DEFAULT 'trial', -- trial/starter/professional/enterprise
  max_clients INTEGER DEFAULT 20,
  owner_user_id UUID REFERENCES users(id),
  settings JSONB DEFAULT '{}',
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

CREATE TABLE ca_firm_staff (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  ca_firm_id UUID NOT NULL REFERENCES ca_firms(id),
  user_id UUID NOT NULL REFERENCES users(id),
  role TEXT NOT NULL, -- partner/manager/staff
  assigned_clients UUID[] DEFAULT '{}',
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT now()
);

CREATE TABLE ca_clients (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  ca_firm_id UUID NOT NULL REFERENCES ca_firms(id),
  factory_id UUID REFERENCES factories(id), -- Links to existing FC factory if exporter
  business_name TEXT NOT NULL,
  gstin TEXT,
  pan TEXT,
  business_type TEXT, -- proprietorship/partnership/pvt_ltd/llp
  industry TEXT,
  annual_turnover_bracket TEXT,
  tally_status TEXT DEFAULT 'pending', -- pending/connected/error
  bridge_agent_id UUID,
  primary_contact_name TEXT,
  primary_contact_phone TEXT,
  primary_contact_email TEXT,
  whatsapp_number TEXT,
  preferred_channel TEXT DEFAULT 'whatsapp', -- whatsapp/email/sms
  assigned_staff_id UUID REFERENCES ca_firm_staff(id),
  settings JSONB DEFAULT '{}',
  health_score NUMERIC(3,1), -- 0.0 to 10.0
  health_score_updated_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- ===== COMPLIANCE TRACKING =====

CREATE TABLE compliance_filings (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  ca_firm_id UUID NOT NULL REFERENCES ca_firms(id),
  client_id UUID NOT NULL REFERENCES ca_clients(id),
  filing_type TEXT NOT NULL, -- GSTR1/GSTR3B/GSTR9/TDS_24Q/TDS_26Q/TDS_27Q/ITR/AOC4/MGT7/EPFO/ESI
  period TEXT NOT NULL, -- '2026-03' for monthly, '2026-Q1' for quarterly, '2025-26' for annual
  status TEXT NOT NULL DEFAULT 'pending',
  -- Status: pending → data_extracted → validated → exceptions_found → reviewed → filing_ready → filed → acknowledged
  due_date DATE NOT NULL,
  filed_date DATE,
  data_snapshot JSONB, -- Extracted Tally data snapshot
  validation_results JSONB, -- Validation errors/warnings
  exceptions JSONB, -- Flagged issues
  filed_reference TEXT, -- ARN number or acknowledgment
  prepared_by UUID REFERENCES ca_firm_staff(id),
  reviewed_by UUID REFERENCES ca_firm_staff(id),
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

CREATE TABLE compliance_exceptions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  filing_id UUID NOT NULL REFERENCES compliance_filings(id),
  client_id UUID NOT NULL REFERENCES ca_clients(id),
  ca_firm_id UUID NOT NULL REFERENCES ca_firms(id),
  exception_type TEXT NOT NULL, -- hsn_mismatch/gstin_invalid/rate_mismatch/2b_unmatched/tds_mismatch/amount_variance
  severity TEXT NOT NULL, -- critical/warning/info
  description TEXT NOT NULL,
  source_data JSONB,
  suggested_fix TEXT,
  status TEXT DEFAULT 'open', -- open/acknowledged/resolved/ignored
  resolved_by UUID REFERENCES ca_firm_staff(id),
  resolved_at TIMESTAMPTZ,
  resolution_notes TEXT,
  created_at TIMESTAMPTZ DEFAULT now()
);

-- ===== RECONCILIATION =====

CREATE TABLE reconciliation_sessions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  ca_firm_id UUID NOT NULL REFERENCES ca_firms(id),
  client_id UUID NOT NULL REFERENCES ca_clients(id),
  recon_type TEXT NOT NULL, -- bank/gstr2b/tds_traces/tcs_marketplace
  period TEXT NOT NULL,
  status TEXT DEFAULT 'pending', -- pending/in_progress/completed/review_needed
  source_count INTEGER, -- Tally records count
  target_count INTEGER, -- Bank/portal records count
  matched_count INTEGER DEFAULT 0,
  unmatched_source INTEGER DEFAULT 0,
  unmatched_target INTEGER DEFAULT 0,
  variance_amount NUMERIC(15,2) DEFAULT 0,
  summary JSONB,
  created_at TIMESTAMPTZ DEFAULT now(),
  completed_at TIMESTAMPTZ
);

CREATE TABLE reconciliation_items (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  session_id UUID NOT NULL REFERENCES reconciliation_sessions(id),
  source_record JSONB, -- Tally side
  target_record JSONB, -- Bank/portal side
  match_status TEXT NOT NULL, -- matched/unmatched_source/unmatched_target/partial_match/variance
  variance_amount NUMERIC(15,2),
  variance_reason TEXT,
  resolution TEXT, -- auto_matched/manual_matched/written_off/pending
  resolved_by UUID REFERENCES ca_firm_staff(id),
  created_at TIMESTAMPTZ DEFAULT now()
);

-- ===== DOCUMENT COLLECTION =====

CREATE TABLE document_requests (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  ca_firm_id UUID NOT NULL REFERENCES ca_firms(id),
  client_id UUID NOT NULL REFERENCES ca_clients(id),
  request_type TEXT NOT NULL, -- bank_statement/form16/rent_agreement/investment_proof/sale_deed/pan_copy/aadhar/gst_cert/tds_cert/other
  description TEXT,
  due_date DATE,
  status TEXT DEFAULT 'pending', -- pending/sent/reminded/received/verified/expired
  channel TEXT DEFAULT 'whatsapp', -- whatsapp/email/sms
  sent_at TIMESTAMPTZ,
  reminder_count INTEGER DEFAULT 0,
  last_reminder_at TIMESTAMPTZ,
  max_reminders INTEGER DEFAULT 3,
  reminder_interval_days INTEGER DEFAULT 3,
  received_at TIMESTAMPTZ,
  document_url TEXT, -- MinIO path
  verified_by UUID REFERENCES ca_firm_staff(id),
  verified_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT now()
);

CREATE TABLE document_templates (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  ca_firm_id UUID REFERENCES ca_firms(id), -- NULL = system template
  template_type TEXT NOT NULL, -- doc_request/reminder/acknowledgment/notice_response
  channel TEXT NOT NULL, -- whatsapp/email/sms
  name TEXT NOT NULL,
  subject TEXT, -- For email
  body_template TEXT NOT NULL, -- Supports {{variables}}
  variables JSONB, -- Available variables and descriptions
  language TEXT DEFAULT 'en', -- en/hi/te/ta
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT now()
);

-- ===== NOTICE MANAGEMENT =====

CREATE TABLE notices (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  ca_firm_id UUID NOT NULL REFERENCES ca_firms(id),
  client_id UUID NOT NULL REFERENCES ca_clients(id),
  notice_type TEXT NOT NULL, -- gst_demand/gst_scrutiny/it_assessment/it_demand/tds_default/mca_penalty/epfo_notice/other
  reference_number TEXT,
  issuing_authority TEXT, -- CGST/SGST/IGST/IT_AO/MCA/EPFO
  received_date DATE NOT NULL,
  response_due_date DATE NOT NULL,
  amount_demanded NUMERIC(15,2),
  status TEXT DEFAULT 'received', -- received/under_review/response_drafted/response_sent/resolved/escalated/appeal
  priority TEXT DEFAULT 'medium', -- critical/high/medium/low
  description TEXT,
  document_url TEXT, -- Uploaded notice scan
  response_document_url TEXT,
  assigned_to UUID REFERENCES ca_firm_staff(id),
  resolution_notes TEXT,
  resolved_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- ===== ANALYTICS =====

CREATE TABLE client_health_scores (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  ca_firm_id UUID NOT NULL REFERENCES ca_firms(id),
  client_id UUID NOT NULL REFERENCES ca_clients(id),
  score_date DATE NOT NULL,
  overall_score NUMERIC(3,1), -- 0.0 to 10.0
  compliance_score NUMERIC(3,1), -- Overdue filings, mismatches
  financial_score NUMERIC(3,1), -- Cash flow, receivables aging
  data_quality_score NUMERIC(3,1), -- Tally data completeness
  attention_needed BOOLEAN DEFAULT false,
  risk_factors JSONB, -- Array of risk items
  recommendations JSONB, -- Array of suggested actions
  created_at TIMESTAMPTZ DEFAULT now()
);

CREATE TABLE staff_activity_log (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  ca_firm_id UUID NOT NULL REFERENCES ca_firms(id),
  staff_id UUID NOT NULL REFERENCES ca_firm_staff(id),
  client_id UUID REFERENCES ca_clients(id),
  activity_type TEXT NOT NULL, -- filing_prep/review/recon/doc_collection/notice_response/client_call
  duration_minutes INTEGER,
  description TEXT,
  activity_date DATE NOT NULL,
  created_at TIMESTAMPTZ DEFAULT now()
);

-- ===== FEATURE FLAGS (ENHANCED) =====

CREATE TABLE subscription_tiers (
  id TEXT PRIMARY KEY, -- trial/starter/professional/enterprise
  name TEXT NOT NULL,
  max_clients INTEGER NOT NULL,
  price_per_client_monthly NUMERIC(10,2),
  base_price_monthly NUMERIC(10,2),
  features JSONB NOT NULL, -- Array of feature IDs enabled
  description TEXT,
  is_active BOOLEAN DEFAULT true
);

-- Insert default tiers
INSERT INTO subscription_tiers (id, name, max_clients, price_per_client_monthly, base_price_monthly, features) VALUES
('trial', 'Trial (30 days)', 5, 0, 0, '["F1","F2","F5","F17"]'),
('starter', 'Starter', 50, 200, 2000, '["F1","F2","F3","F5","F11","F12","F13","F17"]'),
('professional', 'Professional', 200, 350, 5000, '["F1","F2","F3","F4","F5","F7","F11","F12","F13","F14","F15","F16","F17","F20"]'),
('enterprise', 'Enterprise', -1, 500, 10000, '["F1","F2","F3","F4","F5","F6","F7","F8","F9","F11","F12","F13","F14","F15","F16","F17","F18","F19","F20"]');

-- feature_flags table (existing, enhanced)
-- Stores per-firm overrides on top of subscription tier defaults
-- flag_key = feature ID (F1, F2, etc.)
-- entity_type = 'ca_firm', entity_id = ca_firm UUID
-- enabled = true/false (overrides tier default)

-- ===== COMMUNICATION =====

CREATE TABLE communication_log (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  ca_firm_id UUID NOT NULL REFERENCES ca_firms(id),
  client_id UUID NOT NULL REFERENCES ca_clients(id),
  channel TEXT NOT NULL, -- whatsapp/email/sms
  direction TEXT NOT NULL, -- outbound/inbound
  message_type TEXT NOT NULL, -- doc_request/reminder/filing_alert/notice_alert/acknowledgment/custom
  template_id UUID REFERENCES document_templates(id),
  content TEXT,
  status TEXT DEFAULT 'queued', -- queued/sent/delivered/read/failed
  external_id TEXT, -- WhatsApp message ID / email message ID
  error_message TEXT,
  sent_at TIMESTAMPTZ,
  delivered_at TIMESTAMPTZ,
  read_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT now()
);

CREATE TABLE whatsapp_sessions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  client_id UUID NOT NULL REFERENCES ca_clients(id),
  phone_number TEXT NOT NULL,
  session_type TEXT NOT NULL, -- doc_collection/filing_reminder/notice_alert
  context JSONB, -- Current conversation context
  status TEXT DEFAULT 'active', -- active/completed/expired
  expires_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT now()
);
```

### 5.3 RLS Policies (All new tables)

Every CA-related table gets RLS policy scoped to `ca_firm_id`:
```sql
ALTER TABLE ca_clients ENABLE ROW LEVEL SECURITY;
CREATE POLICY ca_clients_tenant ON ca_clients
  USING (ca_firm_id = current_setting('app.current_tenant')::UUID);
-- Repeat for ALL tables above
```

---

## 6. WHATSAPP COMMUNICATION ENGINE (F20)

### 6.1 Architecture

```
CA Portal → API → BullMQ Queue → WhatsApp Worker → WhatsApp Cloud API
                                                          ↓
Client receives WhatsApp message ← Template rendered with {{variables}}
                                                          ↓
Client replies (text/document/image) → Webhook → API → Document Storage (MinIO)
                                                          ↓
CA Dashboard ← Real-time update (WebSocket) ← Document received notification
```

### 6.2 WhatsApp Cloud API Integration

```typescript
// WhatsApp service configuration
interface WhatsAppConfig {
  apiVersion: string;           // v21.0
  phoneNumberId: string;        // Business phone number ID
  businessAccountId: string;    // WABA ID
  accessToken: string;          // From Vault, never env var in prod
  webhookVerifyToken: string;   // For webhook verification
  callbackUrl: string;          // https://api.factoryconnect.in/webhooks/whatsapp
}
```

### 6.3 Message Templates (Pre-approved by Meta)

```
TEMPLATE: fc_doc_request
LANGUAGE: en, hi, te
BODY: "Hello {{client_name}}, your CA {{ca_firm_name}} needs the following document: {{document_type}}. Please upload or reply with a photo of the document. Due by: {{due_date}}."
BUTTONS: [Upload Document] [Ask Question]

TEMPLATE: fc_doc_reminder
BODY: "Reminder: {{ca_firm_name}} is still waiting for your {{document_type}}. This is reminder {{reminder_number}} of {{max_reminders}}. Due: {{due_date}}."
BUTTONS: [Upload Now] [Need More Time]

TEMPLATE: fc_filing_alert
BODY: "{{client_name}}, your {{filing_type}} for {{period}} is due on {{due_date}}. Status: {{status}}. {{action_needed}}"

TEMPLATE: fc_notice_alert
BODY: "URGENT: {{client_name}}, a {{notice_type}} notice has been received. Reference: {{reference_number}}. Response due: {{due_date}}. Your CA is working on it."

TEMPLATE: fc_acknowledgment
BODY: "Thank you! We received your {{document_type}}. Our team will review and update you."
```

### 6.4 Document Upload Flow via WhatsApp

```
1. CA creates document request in portal → selects client + doc type + due date
2. System queues WhatsApp message via template
3. Client receives WhatsApp with "Upload Document" button
4. Client taps button → WhatsApp opens file picker
5. Client uploads document (photo/PDF/image)
6. Webhook receives media → downloads from WhatsApp CDN → stores in MinIO
7. Document linked to request → status updated to "received"
8. CA gets real-time notification → reviews document
9. If OK → marks "verified" | If not → sends "resubmit" template
```

### 6.5 Auto-Chase Logic

```typescript
// BullMQ repeatable job: runs daily at 9 AM IST
interface DocChaseConfig {
  firstReminderDays: number;      // 3 days after initial request
  reminderIntervalDays: number;   // Every 3 days after
  maxReminders: number;           // 3 (configurable per firm)
  escalateAfterMaxReminders: boolean; // Notify CA staff
  quietHoursStart: number;        // 21 (9 PM)
  quietHoursEnd: number;          // 8 (8 AM)
  skipWeekends: boolean;          // true
}
```

---

## 7. FEATURE FLAG SYSTEM (F19)

### 7.1 Evaluation Logic

```typescript
// Feature gate middleware
async function featureGate(featureId: string) {
  return async (req: Request, res: Response, next: NextFunction) => {
    const firmId = req.tenantContext.caFirmId;

    // 1. Check firm-specific override first
    const override = await getFeatureFlag(featureId, 'ca_firm', firmId);
    if (override !== null) {
      if (!override) throw new FcError('FC_ERR_FEATURE_DISABLED', `Feature ${featureId} is disabled`);
      return next();
    }

    // 2. Fall back to subscription tier
    const tier = await getFirmSubscriptionTier(firmId);
    const tierFeatures = tier.features as string[];
    if (!tierFeatures.includes(featureId)) {
      throw new FcError('FC_ERR_FEATURE_NOT_IN_TIER', `Upgrade to access ${featureId}`, {
        currentTier: tier.id,
        requiredTier: getMinimumTierForFeature(featureId)
      });
    }

    return next();
  };
}

// Usage in routes
router.get('/compliance/gst/:clientId',
  authMiddleware,
  tenantContext,
  featureGate('F2'),  // GST Filing Prep
  gstController.getFilingStatus
);
```

### 7.2 Admin Dashboard Controls

```
FC Admin can:
  - Toggle any feature for any firm (override tier)
  - Enable "beta" features for select firms
  - Set custom client limits
  - View feature usage analytics per firm

CA Partner can:
  - See which features are available in their tier
  - See upgrade path for locked features
  - Request feature trials
```

### 7.3 Config File for Development

```json
// config/feature-flags.development.json
{
  "allFeaturesEnabled": true,
  "overrides": {},
  "subscriptionTiers": {
    "trial": { "features": ["F1","F2","F5","F17"], "maxClients": 5 },
    "starter": { "features": ["F1","F2","F3","F5","F11","F12","F13","F17"], "maxClients": 50 },
    "professional": { "features": ["F1","F2","F3","F4","F5","F7","F11","F12","F13","F14","F15","F16","F17","F20"], "maxClients": 200 },
    "enterprise": { "features": ["*"], "maxClients": -1 }
  }
}
```

---

## 8. COMPLIANCE ENGINE ARCHITECTURE

### 8.1 GST Filing Prep Pipeline (F2)

```
Bridge Agent extracts Tally GST data
  → BullMQ: gst-prep queue
    → Step 1: Parse Tally XML → Canonical GST records
    → Step 2: Validate HSN codes against master
    → Step 3: Validate GSTIN format + existence
    → Step 4: Calculate GSTR-1 summary (B2B, B2C, CDN, EXP)
    → Step 5: Calculate GSTR-3B summary
    → Step 6: Cross-check GSTR-2B (if available) vs purchase register
    → Step 7: Generate exceptions for mismatches
    → Step 8: Store filing-ready data snapshot
  → Dashboard: Filing status updated, exceptions visible
```

### 8.2 TDS Reconciliation Pipeline (F3)

```
Bridge Agent extracts Tally TDS entries
  → BullMQ: tds-recon queue
    → Step 1: Parse Tally TDS vouchers → deductee records
    → Step 2: Import TRACES data (CSV upload or API when available)
    → Step 3: Match by PAN + amount + section + period
    → Step 4: Flag mismatches (PAN error, rate variance, amount diff)
    → Step 5: Generate 24Q/26Q/27Q return data
    → Step 6: TCS credit reconciliation (if e-commerce clients)
  → Dashboard: Recon summary, mismatch queue
```

### 8.3 Bank Reconciliation Pipeline (F7)

```
CA uploads bank statement (PDF/CSV/MT940) OR client sends via WhatsApp
  → BullMQ: bank-recon queue
    → Step 1: Parse bank statement → normalized transactions
    → Step 2: Extract Tally bank ledger entries for same period
    → Step 3: AI matching engine:
        - Exact match (amount + date)
        - Fuzzy match (amount match, date ±3 days)
        - Reference match (narration keywords → invoice number)
        - Unmatched source (in Tally, not in bank)
        - Unmatched target (in bank, not in Tally)
    → Step 4: Generate BRS (Bank Reconciliation Statement)
    → Step 5: For exporters: SWIFT matching + forex adjustment
  → Dashboard: Matched/unmatched items, one-click reconciliation
```

### 8.4 Health Score Algorithm (F17)

```typescript
interface HealthScoreWeights {
  compliance: 0.35,    // Overdue filings, pending exceptions
  financial: 0.25,     // Cash flow indicators from Tally
  dataQuality: 0.20,   // Tally data completeness, extraction success rate
  responsiveness: 0.20  // Document submission speed, notice response time
}

// Scoring rules:
// Compliance: -2 per overdue filing, -1 per open critical exception, -0.5 per warning
// Financial: Based on receivables aging, cash position trends
// Data Quality: Bridge Agent uptime %, data extraction success rate
// Responsiveness: Average document submission days, notice response speed
```

---

## 9. BRIDGE AGENT EXTENSIONS

### 9.1 New Tally Extractors

The Bridge Agent adds these extraction capabilities (all via Tally XML port 9000):

| Extractor | Tally TDL Collection | Data Extracted | Used By |
|-----------|---------------------|----------------|---------|
| `tally-gst` | `StockItem`, `Ledger`, `Voucher` with GST fields | GSTIN, HSN, tax rates, supply type | F2, F12 |
| `tally-tds` | `Voucher` where `IsTDSEntry=Yes` | Deductee PAN, section, rate, amount | F3 |
| `tally-ledger` | `Ledger` (all) | Full chart of accounts with groups | F4, F7, F17 |
| `tally-trial-balance` | `TrialBalance` | Period-wise balances | F4 (ITR) |
| `tally-payroll` | `AttendanceType`, `PayHead`, `EmployeeGroup` | Salary, PF, ESI contributions | F16 |
| `tally-bank` | `Ledger` where `IsBankAccount=Yes` + vouchers | Bank transactions | F7 |
| `tally-stock` | `StockSummary` | Stock positions, movements | F17 |

### 9.2 Extraction Scheduling

```typescript
interface ExtractionSchedule {
  // CA-mode: extract more data types, less frequently than EDI mode
  gstData: { frequency: 'daily', time: '06:00' },     // Before office hours
  tdsData: { frequency: 'weekly', day: 'monday' },
  bankData: { frequency: 'daily', time: '06:00' },
  ledgerData: { frequency: 'weekly', day: 'sunday' },
  trialBalance: { frequency: 'monthly', day: 1 },
  payrollData: { frequency: 'monthly', day: 5 },       // After salary processing
  stockData: { frequency: 'weekly', day: 'monday' }
}
```

---

## 10. PORTAL UI — CA DASHBOARD DESIGN

### 10.1 Main Dashboard Layout

```
┌─────────────────────────────────────────────────────────────┐
│  FC CA Platform          [Search clients]  [Notifications] [Profile]  │
├──────────┬──────────────────────────────────────────────────┤
│          │  OVERVIEW                                        │
│ SIDEBAR  │  ┌──────┐ ┌──────┐ ┌──────┐ ┌──────┐           │
│          │  │ 180  │ │  12  │ │   5  │ │  3   │           │
│ Dashboard│  │Active │ │Due   │ │Overdue│ │Notices│          │
│ Clients  │  │Clients│ │This  │ │Filings│ │Pending│          │
│ Compliance│ │      │ │Week  │ │      │ │      │           │
│ Recon    │  └──────┘ └──────┘ └──────┘ └──────┘           │
│ Documents│                                                  │
│ Notices  │  CLIENT COMPLIANCE STATUS (Traffic Light Grid)   │
│ Analytics│  ┌───────────────────────────────────────────┐   │
│ Comms    │  │ 🟢 ABC Pvt Ltd   │ GSTR1 ✓ │ TDS ✓ │ IT ✓│  │
│ Settings │  │ 🟡 XYZ Exports   │ GSTR1 ✓ │ TDS ⚠ │ IT -│  │
│ Admin    │  │ 🔴 PQR Mfg       │ GSTR1 ✗ │ TDS ✗ │ IT -│  │
│          │  │ 🟢 LMN Textiles  │ GSTR1 ✓ │ TDS ✓ │ IT ✓│  │
│          │  └───────────────────────────────────────────┘   │
│          │                                                  │
│          │  EXCEPTION QUEUE (Top Priority)                  │
│          │  ┌───────────────────────────────────────────┐   │
│          │  │ 🔴 GSTR-2B mismatch: XYZ (₹45,000 variance)│ │
│          │  │ 🔴 TDS default notice: PQR (due in 3 days) │  │
│          │  │ 🟡 Bank recon pending: ABC (15 unmatched)   │  │
│          │  └───────────────────────────────────────────┘   │
│          │                                                  │
│          │  UPCOMING DEADLINES                              │
│          │  ┌───────────────────────────────────────────┐   │
│          │  │ Apr 11 │ GSTR-1 (180 clients)             │   │
│          │  │ Apr 20 │ GSTR-3B (180 clients)            │   │
│          │  │ Apr 30 │ TDS Q4 (95 clients)              │   │
│          │  └───────────────────────────────────────────┘   │
└──────────┴──────────────────────────────────────────────────┘
```

### 10.2 Key Portal Pages

| Page | Features |
|------|----------|
| **Client List** | Search, filter by status/industry/staff, bulk actions, onboarding wizard |
| **Client Detail** | Profile, Tally connection status, compliance timeline, documents, notices, health score |
| **GST Dashboard** | Period selector, GSTR-1/3B prep status per client, bulk filing prep, exception drill-down |
| **TDS Dashboard** | Quarter selector, TRACES recon status, return prep, TCS tracking |
| **Bank Recon** | Upload statement, AI matching view, matched/unmatched toggle, BRS export |
| **Document Tracker** | Kanban: Requested → Sent → Reminded → Received → Verified. Bulk chase. |
| **Notice Board** | Priority-sorted notices, deadline countdown, response templates, resolution tracking |
| **Health Scores** | Client grid sorted by risk, drill-down to risk factors, trend charts |
| **Staff Dashboard** | Activity log, client assignments, productivity metrics, time tracking |
| **Communication Hub** | WhatsApp/email history per client, template editor, bulk messaging |
| **Admin Console** | Feature flags, subscription management, usage analytics, system health |

---

## 11. DEVELOPMENT TRACKS

### Track F1: Foundation (Week 1-2)
- CA firm, staff, client tables + migrations + RLS
- Subscription tiers + feature flag system
- Keycloak realm setup (ca-firm, ca-client)
- Feature gate middleware
- CA-specific Zod schemas in shared package

### Track F2: Bridge Agent Extensions (Week 2-4)
- New Tally extractors (GST, TDS, ledger, bank, payroll, trial balance)
- Extraction scheduling system
- Chart-of-accounts AI mapping (handles non-standard Tally setups)

### Track F3: Compliance Engine (Week 3-6)
- GST filing prep pipeline (F2)
- TDS reconciliation pipeline (F3)
- GSTR-2B reconciliation module (F12)
- Exception management system
- Filing status tracking

### Track F4: Communication Engine (Week 3-5)
- WhatsApp Cloud API integration
- Email notification service (existing, extend)
- Document request/chase workflow (F11)
- Template management system
- Webhook handlers for WhatsApp responses

### Track F5: Reconciliation (Week 5-7)
- Bank statement parser (PDF, CSV, MT940)
- AI matching engine for bank recon (F7)
- BRS generation
- Forex adjustment calculator (exporters)

### Track F6: Portal — CA Dashboard (Week 2-8)
- Multi-client dashboard with traffic lights
- Client management + onboarding wizard
- Compliance views (GST, TDS)
- Exception queue UI
- Document tracker (kanban)
- Notice management UI
- Health score visualization
- Staff productivity dashboard
- Admin console (feature flags)
- Communication hub

### Track F7: Analytics & AI (Week 6-8)
- Client health score algorithm (F17)
- Staff productivity metrics (F14)
- Audit prep kit generation (F15)
- Notice response templates (F13)

### Track F8: Premium — Export Features (Week 8+)
- EDI compliance features (existing FC core, integrate into CA portal)
- Payment reconciliation for exporters
- Customs documentation templates

---

## 12. API ROUTES (New)

```
# CA Firm Management
POST   /api/ca/firms                    # Create firm
GET    /api/ca/firms/:id                # Get firm details
PATCH  /api/ca/firms/:id                # Update firm
GET    /api/ca/firms/:id/staff          # List staff
POST   /api/ca/firms/:id/staff          # Add staff

# Client Management
POST   /api/ca/clients                  # Add client
GET    /api/ca/clients                  # List clients (with filters)
GET    /api/ca/clients/:id              # Client detail
PATCH  /api/ca/clients/:id              # Update client
GET    /api/ca/clients/:id/health       # Health score

# Compliance
GET    /api/compliance/filings          # List filings (filters: type, period, status, client)
POST   /api/compliance/filings/:id/prepare  # Trigger filing preparation
GET    /api/compliance/filings/:id/data     # Get filing data snapshot
POST   /api/compliance/filings/:id/validate # Run validation
GET    /api/compliance/exceptions       # List exceptions (filters)
PATCH  /api/compliance/exceptions/:id   # Resolve exception

# Reconciliation
POST   /api/recon/bank/upload           # Upload bank statement
POST   /api/recon/bank/:sessionId/match # Run AI matching
GET    /api/recon/bank/:sessionId       # Get recon results
POST   /api/recon/gstr2b/run            # Run 2B reconciliation
GET    /api/recon/tds/run               # Run TDS-TRACES recon

# Documents
POST   /api/documents/request           # Create doc request
POST   /api/documents/request/bulk      # Bulk doc request
GET    /api/documents/requests          # List requests (filters)
POST   /api/documents/:id/verify        # Mark document verified

# Notices
POST   /api/notices                     # Create notice
GET    /api/notices                     # List notices (filters)
PATCH  /api/notices/:id                 # Update notice status
POST   /api/notices/:id/response        # Upload/generate response

# Communication
POST   /api/comms/send                  # Send message (WhatsApp/email)
POST   /api/comms/send/bulk             # Bulk send
GET    /api/comms/history/:clientId     # Message history
POST   /api/comms/templates             # Create template
GET    /api/comms/templates             # List templates

# Analytics
GET    /api/analytics/dashboard         # Dashboard summary
GET    /api/analytics/health-scores     # All client health scores
GET    /api/analytics/staff/:id         # Staff productivity
GET    /api/analytics/deadlines         # Upcoming deadlines

# Admin
GET    /api/admin/features              # List all features with status
POST   /api/admin/features/:featureId/toggle  # Toggle feature
GET    /api/admin/subscription          # Current subscription
POST   /api/admin/subscription/upgrade  # Upgrade tier
GET    /api/admin/usage                 # Usage analytics
```

---

## 13. SECURITY ADDITIONS

All existing FC security patterns apply (RLS, FLE, PII redaction, etc.). Additional:

| Concern | Implementation |
|---------|---------------|
| CA-Client data isolation | RLS on `ca_firm_id`. CA staff only see their firm's clients. |
| Client self-serve isolation | Client portal (if enabled) sees only their own data via `ca_client_id` RLS. |
| WhatsApp data | Messages stored encrypted at rest. Media files in MinIO with signed URLs (24hr expiry). |
| Document storage | All uploaded docs in MinIO with Vault-encrypted paths. Access via signed URLs only. |
| PAN/GSTIN/Aadhaar | FLE via Vault Transit (existing pattern). |
| Staff access control | Role-based: Partner sees all, Manager sees assigned clients, Staff sees assigned tasks. |
| Audit trail | Every compliance action, document action, and communication logged in immutable audit log. |

---

## 14. EXCEPTION SCENARIOS & ERROR HANDLING

### 14.1 Tally Extraction Failures
| Scenario | Detection | Auto-Fix | Escalation |
|----------|-----------|----------|------------|
| Tally port 9000 disabled | Health probe L6 fails | Prompt client via WhatsApp | Alert CA staff after 2 days |
| Tally not running | Connection refused | Queue retry (exponential backoff) | Alert after 3 failed attempts |
| Custom ledger names | AI mapping confidence <80% | Suggest mapping, flag for review | CA staff reviews mapping |
| Corrupt Tally data | XML parse error | Skip record, log, continue | Exception in dashboard |
| Intermittent connectivity | Push fails | Local SQLite queue, retry on reconnect | Alert if queue >100 items |
| Tally version mismatch | TDL incompatibility | Auto-detect version, use compatible TDL | Alert if unsupported version |

### 14.2 Compliance Failures
| Scenario | Detection | Handling |
|----------|-----------|---------|
| HSN code not in master | Validation step 2 | Flag as exception, suggest nearest match |
| GSTIN format invalid | Regex validation | Flag, show correct format |
| GSTR-2B data unavailable | API timeout | Skip 2B recon, mark as "manual check needed" |
| TDS rate mismatch | Tally rate ≠ TRACES rate | Flag with both rates, suggest correct section |
| Filing deadline missed | Date comparison | Priority escalation, late fee calculation |
| Duplicate invoice number | Uniqueness check | Flag, show both invoices |

### 14.3 Communication Failures
| Scenario | Detection | Handling |
|----------|-----------|---------|
| WhatsApp delivery failed | Webhook status | Retry once, then fall back to email |
| Client number not on WhatsApp | API error 131026 | Auto-switch to SMS/email |
| Template rejected by Meta | API error | Use plain text fallback, alert admin |
| Client blocked business number | Error 131031 | Switch to email, alert CA staff |
| Document upload too large | >16MB WhatsApp limit | Request email upload instead |
| Media download failed | CDN timeout | Retry 3x, then request re-upload |

---

*This blueprint extends the FC Master Blueprint v8.0. All existing patterns, security rules, and architectural decisions remain in force. The CA Platform is Track F in the development plan, running parallel to existing Tracks A-E.*
