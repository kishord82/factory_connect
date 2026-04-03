# FactoryConnect — Connector Deep-Dive Report

**Date:** April 1, 2026 | **Status:** Research Only

---

## PART A: SOURCE CONNECTORS (Indian Factory ERPs)

---

### 1. Tally Prime Bridge Agent

**Market Position:** Tally dominates Indian SME accounting with 70%+ market share in the small business segment. Any integration platform MUST support Tally as Priority 1.

#### Mandatory Features
- Poll Tally XML Server on localhost:9000 every 5 minutes
- Export: Stock Summary, Sales Orders, Sales Invoices, Delivery Notes, Purchase Orders, Payment Vouchers
- Import (write-back): Create Sales Order in Tally when buyer PO arrives
- Handle GST fields: GSTIN, HSN, CGST/SGST/IGST, IRN, e-Way Bill number
- Support STOCKITEM, LEDGER, GODOWN, UNIT masters
- UTF-8 XML encoding (Tally default)
- Idempotency: detect duplicate vouchers by REMOTEID

#### Optional Features
- Export GSTR-1 data for compliance validation
- Export Outstanding Bills for payment reconciliation
- Export Profit & Loss for analytics
- Batch/Godown-level inventory tracking
- TDL customization for factory-specific fields

#### Pricing Model
| Item | Cost | Model |
|------|------|-------|
| TallyPrime Silver (Single User) | Rs 22,500 + 18% GST | One-time perpetual |
| TallyPrime Gold (Multi User) | Rs 67,500 + 18% GST | One-time perpetual |
| TSS Renewal (annual) | Rs 5,400-16,200/year | Subscription |
| TallyPrime Developer license | Rs 22,500 + GST | One-time |
| XML Server API access | Free (included in all licenses) | No additional cost |
| Bridge Agent (our software) | Our development cost | N/A |

**Key insight:** Tally's XML Server API is FREE with every Tally license. No per-call charges, no API key needed. This is a massive advantage — zero marginal cost per factory for the Tally integration.

#### Pros
- XML Server is free, no rate limits, no API keys
- Extremely well-documented XML request/response format
- Runs on localhost — no internet latency for data extraction
- Multiple open-source Node.js projects validate the approach (tally-database-loader, TallyConnector)
- Tally's massive market share means huge addressable base

#### Cons
- Requires local agent installation on factory's Windows PC
- Tally must be running for the bridge to work (factory staff may close it)
- No webhook/push support — polling only
- XML parsing is verbose and error-prone
- Factory PC may have poor internet connectivity
- Windows service management adds support burden

#### Risks
| Risk | Severity | Mitigation |
|------|----------|------------|
| Factory staff closes Tally | High | Auto-restart service, WhatsApp alert if Tally unreachable for 15 min |
| Factory PC has no internet | High | Local queue with retry when connection resumes |
| Tally version incompatibility | Medium | Test against TallyPrime 4.x, 5.x. XML format is stable across versions |
| Bridge Agent crashes | Medium | Windows service with auto-restart, remote health monitoring |
| Tally changes XML API | Low | Format has been stable for 10+ years. Very unlikely |

#### Future Competitors
- **Tally Solutions themselves** could build buyer-side integration. Currently no plans visible.
- **api2books.com** — Third-party Tally API platform. Could pivot to include buyer EDI.
- **RootFi** — Unified accounting API. Currently read-only, no EDI output.

---

### 2. Zoho Books / Zoho Inventory

**Market Position:** Zoho serves the cloud-first Indian SME segment. Growing rapidly with AI-native ERP launched 2025.

#### Mandatory Features
- Webhook receiver for: salesorder.create, salesorder.update, invoice.create, item.update, shipment.create
- REST API for: Items, Sales Orders, Invoices, Inventory, Contacts
- OAuth 2.0 authentication
- Handle custom fields (cf_ prefix) — critical for industry-specific data
- Multi-warehouse inventory sync
- HSN code and GST rate extraction

#### Optional Features
- Zoho Inventory integration (separate product with deeper inventory features)
- Bank transaction sync for payment reconciliation
- Zoho CRM contact sync for buyer data
- Zoho Flow integration for custom workflows
- Bill of Materials for manufacturing factories

#### Pricing Model
| Item | Cost | Model |
|------|------|-------|
| API Access | Free with any paid Zoho plan | Included |
| Free Plan | 1,000 API calls/day | Free |
| Standard Plan | 2,000 API calls/day | Rs 999/org/month |
| Professional Plan | 5,000 API calls/day | Rs 2,499/org/month |
| Premium Plan | 10,000 API calls/day | Rs 3,999/org/month |
| Rate limit | 100 requests/minute | All plans |
| Concurrent connections | 5 (free) / 10 (paid) | Per plan |
| Webhooks | Native events-based | No additional cost |

**Key insight:** Zoho's API is included free with any paid plan. The webhook model means zero polling cost. But daily call limits (1K-10K) could be constraining for high-frequency sync. At 5-minute polling with 10 endpoints, that's 2,880 calls/day — requires Professional plan minimum.

#### Pros
- Native webhook support — no local agent needed
- Well-documented REST API with comprehensive endpoints
- Custom fields accessible via API (cf_ prefix pattern)
- OAuth 2.0 standard auth
- Cloud-native — no factory PC dependency
- Multi-warehouse support built-in

#### Cons
- Daily API rate limits (1K-10K) could be constraining
- 100 requests/minute rate limit applies to all plans
- Webhooks may not fire during Zoho outages (need polling fallback)
- Custom fields vary by factory — AI Field Mapper essential
- Zoho has recently launched their own ERP — potential future competitor

#### Risks
| Risk | Severity | Mitigation |
|------|----------|------------|
| Zoho adds buyer-side EDI | High | First-mover advantage, build network effects fast |
| API rate limits hit | Medium | Implement smart caching, batch operations, webhook-first strategy |
| Zoho deprecates API version | Medium | Pin to v3 API, monitor deprecation notices |
| Webhook delivery failures | Medium | Implement polling fallback with deduplication |
| Custom field schema changes | Low | AI Field Mapper re-maps automatically with factory confirmation |

#### Future Competitors
- **Zoho themselves** — Most credible threat. Their AI-native ERP could add buyer EDI connectors. Timeline: 12-18 months minimum.
- **Zoho Flow** — Their iPaaS could enable buyer connections, but lacks EDI/AS2 protocol support.

---

### 3. SAP Business One (Service Layer REST)

**Market Position:** Upper-SME and mid-market segment in India. Factories using SAP B1 tend to be larger, more export-oriented, and more willing to pay.

#### Mandatory Features
- Session-based authentication (POST /b1s/v1/Login)
- REST API for: Items, SalesOrders, Invoices, DeliveryNotes, BusinessPartners, StockTransfers
- Inventory queries with warehouse-level detail
- GST/HSN field extraction
- Batch/serial number tracking
- Session management with automatic renewal

#### Optional Features
- SAP B1 Alerts for change detection (pseudo-webhook)
- DI Server integration for real-time event capture
- User-Defined Fields (UDF) mapping
- Production Order tracking
- Blanket Agreement management

#### Pricing Model
| Item | Cost | Model |
|------|------|-------|
| SAP B1 Professional License (Perpetual) | Rs 1,36,620/user | One-time |
| SAP B1 Subscription (Cloud) | Rs 4,605-7,500/user/month | Subscription |
| Annual Maintenance (AMC) | 15-20% of perpetual license | Annual |
| Service Layer API | Free (included) | No additional cost |
| API Integration work | Rs 3-15 lakh per integration | One-time project |
| SAP B1 Starter Package | Rs 4,999/user (cloud) | Monthly |

**Key insight:** SAP B1 customers are already paying Rs 1.36 lakh+ per user. They are high-value targets who can easily afford FC's Rs 14,999-39,999/month pricing. Service Layer API is included free.

#### Pros
- Standard REST API — well-documented, stable
- SAP B1 customers are export-oriented and high-value
- API included free with all licenses
- Rich data model with industry-specific fields
- Strong partner ecosystem for co-selling

#### Cons
- Session-based auth requires active session management
- No native webhook — need DI Server or polling
- Complex data model with many nested entities
- SAP B1 version differences can affect API behavior
- Higher technical complexity than Tally/Zoho

#### Risks
| Risk | Severity | Mitigation |
|------|----------|------------|
| SAP adds native buyer EDI | Medium | SAP's EDI is enterprise-grade and expensive. SME gap remains |
| Session timeout issues | Medium | Implement session pool with auto-renewal |
| API version breaks | Low | SAP B1 API is backward-compatible. Test on major versions |

#### Future Competitors
- **SAP Ariba** itself — already handles buyer-side, but targets enterprises not SMEs
- **Boyum IT / Produmex** — SAP B1 add-on vendors could add EDI
- **SEEBURGER** — Already offers SAP Ariba ERP integration for suppliers, but enterprise pricing

---

### 4. Busy Accounting

**Market Position:** Strong in Delhi/North India micro-SME segment. 330+ employees. Second-tier ERP after Tally.

#### Mandatory Features
- ODBC driver connection to local Busy database
- OR local SQL Server database access
- Read: Stock Items, Sales Orders, Invoices, Delivery Notes, Payments
- Write-back: Create Sales Order from buyer PO
- GST/HSN field extraction

#### Optional Features
- Bank reconciliation data
- Multi-godown inventory
- Custom field extraction
- Batch tracking (pharma)

#### Pricing Model
| Item | Cost | Model |
|------|------|-------|
| Busy Standard | Rs 7,200 (single user) | One-time |
| Busy Enterprise | Rs 14,400 (multi user) | One-time |
| ODBC Driver | Included | Free |
| API access | Via ODBC/SQL only | No REST API |

**Key insight:** No REST API exists. Integration is via ODBC driver or direct SQL Server access. This requires a local bridge agent (same pattern as Tally). ODBC is less documented than Tally's XML API.

#### Pros
- Large user base in North India
- ODBC driver included free
- Simple data model
- Low-cost ERP — factories are price-sensitive

#### Cons
- No REST API — ODBC only
- Poor developer documentation
- No webhook support
- Requires local agent (Windows)
- Smaller market than Tally

#### Risks
| Risk | Severity | Mitigation |
|------|----------|------------|
| ODBC schema undocumented | High | Reverse-engineer schema during Phase 2 development |
| Busy acquired/discontinued | Medium | Third-party ERP — monitor company health |
| Small market share | Low | Phase 2 priority is correct — validate demand first |

---

### 5. Marg ERP

**Market Position:** 50%+ market share in Indian pharma distribution and FMCG trade. 10 lakh+ users. 850+ sales/support centers.

#### Mandatory Features
- Local SQL Server (MS SQL) database access
- Read: Stock Items, Sales, Purchase Orders, Invoices, Batch details
- Pharma-specific: Batch number, expiry date, drug schedule, storage condition
- FMCG-specific: MRP, batch, scheme pricing
- GST/HSN extraction

#### Optional Features
- Barcode/QR integration
- Scheme and discount tracking
- Multi-branch inventory consolidation
- Drug License verification fields

#### Pricing Model
| Item | Cost | Model |
|------|------|-------|
| Marg ERP 9+ | Rs 18,000-54,000 | One-time |
| Cloud version | Subscription available | Monthly |
| SQL Server access | Via local MS SQL | Included |
| API | No REST API — SQL only | N/A |

**Key insight:** Marg's dominance in pharma (50%+ share) makes it essential for factories supplying pharma companies. But integration is SQL-only — same local agent pattern.

#### Pros
- Dominant in pharma & FMCG — critical verticals for export
- Huge user base (10 lakh+)
- Pharma batch tracking is essential for compliance
- Strong channel partner network for co-selling

#### Cons
- No REST API — MS SQL direct access only
- Complex pharma-specific schema
- Requires local bridge agent
- Windows + SQL Server dependency

#### Risks
| Risk | Severity | Mitigation |
|------|----------|------------|
| MS SQL access complexity | Medium | Standard MSSQL Node.js drivers (mssql/tedious) work well |
| Pharma compliance requirements | Medium | Map Drug Schedule, WHO-GMP fields to canonical attributes |
| Marg schema changes | Low | Marg ERP schema has been stable |

---

### 6. ERPNext / Frappe

**Market Position:** Open-source ERP growing fast in tech-savvy Indian SMEs. Free self-hosted, paid cloud.

#### Mandatory Features
- REST API with API key auth (GET/POST/PUT/DELETE)
- Webhook support (native in Frappe framework)
- DocType-based resources: Item, Sales Order, Sales Invoice, Stock Entry, Delivery Note
- Custom field support via DocType customization
- HSN/GST fields included in standard doctypes

#### Optional Features
- Bulk webhook for batch operations
- Apache Kafka integration for high-volume event streaming
- Manufacturing module: BOM, Work Order, Production Plan
- Quality Inspection integration
- ERPNext Shopify/WooCommerce bridge (for online buyers)

#### Pricing Model
| Item | Cost | Model |
|------|------|-------|
| Self-hosted | Free (open source) | AGPL license |
| Frappe Cloud (Starter) | $10/month | Subscription |
| Frappe Cloud (Business) | $25/month | Subscription |
| API access | Free (unlimited) | Included |
| Webhook support | Free | Included |
| Rate limits | None (self-hosted) | N/A |

**Key insight:** ERPNext is the ideal source connector — free REST API, native webhooks, zero rate limits (self-hosted), open-source schema documentation. The challenge is ERPNext's smaller market share compared to Tally/Zoho.

#### Pros
- Free, open-source, well-documented REST API
- Native webhook support
- No rate limits on self-hosted instances
- Rich manufacturing module (BOM, Work Orders)
- Active developer community (174+ apps)
- API-first design philosophy

#### Cons
- Smaller market share than Tally/Zoho/SAP B1
- Factories using ERPNext tend to be tech-savvy (smaller sales effort) but fewer in number
- Self-hosted instances may have unreliable uptime
- Custom doctypes vary significantly per factory

#### Risks
| Risk | Severity | Mitigation |
|------|----------|------------|
| Small addressable market | Medium | Phase 2 priority is correct |
| Instance uptime | Low | Webhook retry + polling fallback |

---

### 7. WhatsApp Order Intake

**Market Position:** CRITICAL. Most Indian SMEs communicate via WhatsApp. This is the onboarding ramp for factories with no ERP or simple ERP.

#### Mandatory Features
- WhatsApp Business API webhook receiver
- Claude API NLP parsing: extract SKU, quantity, delivery date, buyer name, PO number
- Support Hindi + English mixed messages (Hinglish)
- Clarification flow: ask factory for missing fields via WhatsApp reply
- Template messages for order confirmation, status updates
- Media handling: receive photos of handwritten orders, invoices

#### Optional Features
- Voice message transcription (via Sarvam AI STT)
- Multi-language support (Telugu, Tamil, Kannada, Marathi, Gujarati)
- Catalog sharing via WhatsApp
- Payment link sharing
- QC photo submission via WhatsApp

#### Pricing Model (Gupshup as provider)
| Item | Cost | Model |
|------|------|-------|
| Gupshup Platform fee | Varies by plan | Subscription |
| Marketing messages (India) | Rs 0.88/message | Per message |
| Utility messages (India) | Rs 0.13/message | Per message |
| Authentication messages | Rs 0.13/message | Per message |
| Service window messages (24hr) | Free | No charge |
| Claude API (for NLP parsing) | $3/MTok input, $15/MTok output (Sonnet) | Pay-as-you-go |

**Key insight:** Service window (24hr) messages are FREE. Most factory interactions happen within service windows. Outbound template messages (order notifications) cost only Rs 0.13-0.88 each. For a factory doing 10 orders/day, WhatsApp cost is Rs 30-100/day (Rs 900-3,000/month). Very affordable.

#### Pros
- Lowest barrier to entry — no ERP installation needed
- Reaches 95%+ of Indian factory owners (WhatsApp penetration)
- Service window messages are free
- Claude NLP handles Hinglish naturally
- Photos of handwritten orders can be parsed

#### Cons
- NLP parsing is probabilistic — needs human confirmation
- WhatsApp Business API requires Meta approval
- Template messages must be pre-approved by Meta
- Media (photos, voice) adds Claude API cost
- Gupshup adds a vendor dependency

#### Risks
| Risk | Severity | Mitigation |
|------|----------|------------|
| NLP parsing errors | High | Always confirm extracted data with factory owner before creating order |
| Meta policy changes | Medium | Support multiple WhatsApp BSPs (Gupshup, MSG91, Twilio) |
| Cost escalation at scale | Low | Volume discounts kick in; service window messages are free |

---

### 8. CSV / Excel File Upload

**Market Position:** Essential fallback for factories with no ERP or unsupported ERP.

#### Mandatory Features
- File upload via FC web UI (drag-and-drop)
- Parse CSV (Papa Parse) and Excel (SheetJS)
- AI Field Mapper: detect column headers, suggest canonical mapping
- Validation: required fields, data types, HSN code format
- Preview before import
- Error reporting with row-level details

#### Optional Features
- Template download (pre-formatted CSV/Excel)
- Bulk upload with progress bar
- Scheduled recurring uploads (e.g., daily inventory from factory's exported file)
- Google Sheets integration (direct read via API)

#### Pricing Model
| Item | Cost | Model |
|------|------|-------|
| Papa Parse | Free (MIT) | Open source |
| SheetJS (Community) | Free (Apache 2.0) | Open source |
| SheetJS Pro | $750/year | Subscription |
| AI Field Mapper (Claude API) | ~$0.01-0.05 per mapping session | Pay-as-you-go |

#### Pros
- Zero barrier to entry — any factory can export to CSV/Excel
- No agent installation, no API setup
- AI mapper reduces setup time
- Works as onboarding funnel while proper ERP connector is set up

#### Cons
- Manual process — prone to human error
- No real-time sync
- Data freshness depends on upload frequency
- Factory staff may not understand field mapping

---

### 9. Custom REST API

#### Mandatory Features
- Configurable: endpoint_url, auth_type (API_KEY/OAUTH/BASIC), polling_interval
- Field mapping via mapping_configs table
- Webhook receiver mode (factory pushes to FC)
- Polling mode (FC pulls from factory API)

#### Optional Features
- GraphQL support
- SOAP/XML support
- Rate limiting per factory
- Schema discovery/introspection

#### Pricing Model
| Item | Cost | Model |
|------|------|-------|
| Development cost | Our engineering time | One-time |
| Per-factory setup | ~2-4 hours configuration | Included in onboarding |

---

## PART B: TARGET CONNECTORS (Global Buyer Systems)

---

### 10. EDI X12 over AS2

**Market Position:** Covers 80% of US buyer procurement systems. THE most important target connector.

#### Mandatory Features
- **Inbound parsing:** 850 (PO), 820 (Payment), 840 (RFQ)
- **Outbound generation:** 855 (PO ACK), 856 (ASN), 810 (Invoice), 843 (RFQ Response), 846 (Inventory)
- AS2 transport with digital signatures and MDN receipts
- ISA/GS envelope management
- Trading partner ISA ID routing
- Transaction set validation against X12 standards
- Acknowledgement tracking (997 Functional Acknowledgement)

#### Optional Features
- EDI 820 payment auto-reconciliation
- EDI 860 PO Change handling
- EDI 861 Receiving Advice processing
- Multi-version support (4010, 5010)
- Custom segment/element extensions per buyer

#### Pricing Model (Build vs Buy)
| Approach | Cost | Model |
|----------|------|-------|
| **Build with node-x12** | Free (MIT) | Open source |
| **AS2 transport (node-as2)** | Free (MIT) — but limited | Open source |
| **Managed AS2 VAN (SPS Commerce)** | $900-1,500 setup + monthly | Subscription |
| **Managed AS2 VAN (Cleo)** | Custom quote | Subscription |
| **AS2 certificate (SSL)** | $200-500/year | Annual |
| **EDI testing tool** | $500-2,000 | One-time |

**Key insight:** EDI parsing/generation is free with open-source libraries. The cost is in AS2 transport and trading partner setup. Two options:

**Option A (MVP): Managed VAN** — Use SPS Commerce or Cleo for AS2 transport. $900-1,500 setup per buyer + monthly. Removes AS2 complexity entirely. Pass through as Rs 15,000 one-time setup fee to factory.

**Option B (Scale): Self-hosted AS2** — Build custom AS2 with node-as2 + digital certificates. Higher upfront engineering but zero per-transaction cost at scale. Implement in Phase 2.

#### Pros
- Covers 80% of US buyer procurement
- Industry standard — buyers already expect EDI
- node-x12 is mature and actively maintained
- Once connected, very sticky (high switching cost)
- Rs 15,000 one-time setup fee generates immediate revenue

#### Cons
- AS2 transport is complex (digital signatures, MDN, async receipts)
- Each buyer requires separate trading partner setup and testing
- EDI standards have buyer-specific variations (implementation guides)
- 997 acknowledgement tracking adds complexity
- AS2 certificates require annual renewal

#### Risks
| Risk | Severity | Mitigation |
|------|----------|------------|
| AS2 transport failures | High | Use managed VAN for MVP, build custom AS2 in Phase 2 |
| Buyer-specific EDI variations | High | Maintain per-buyer implementation guides in mapping_configs |
| node-as2 library abandoned | Medium | Fork the library, or use managed VAN |
| Certificate management | Low | Automate renewal alerts, use Let's Encrypt where possible |

#### Future Competitors
- **Orderful** — Modern EDI API platform. No India focus yet but could enter.
- **Stedi** — API-first EDI platform. Developer-friendly but US-focused.
- **TrueCommerce** — EDI platform with global reach. Enterprise pricing.

---

### 11. SAP Ariba cXML

**Market Position:** Second-largest buyer procurement network globally. Critical for factories supplying to enterprises using SAP.

#### Mandatory Features
- **Inbound:** OrderRequest (PO), CancelOrderRequest
- **Outbound:** ConfirmationRequest (PO ACK), ShipNoticeRequest (ASN), InvoiceDetailRequest (Invoice)
- cXML header authentication (shared secret)
- Ariba Network ID routing
- HTTPS transport
- CIF catalog upload for product listing

#### Optional Features
- PunchOut catalog for Ariba Buying
- AdvanceShipNoticeRequest with SSCC barcodes
- StatusUpdateRequest for production visibility
- ServiceEntryRequest for service invoicing
- Multi-level approval workflow integration

#### Pricing Model
| Item | Cost | Model |
|------|------|-------|
| fast-xml-parser (npm) | Free (MIT) | Open source |
| Ariba Network — Supplier Standard | Free | Meta handles |
| Ariba Network — Supplier Enterprise | Negotiable (0.155% of transaction) | Transaction fee |
| Ariba Sandbox | Free for development/testing | Free |
| Ariba Production registration | Free for suppliers | Free |

**Key insight:** Ariba is FREE for suppliers in Standard tier. The buyer pays Ariba's fees. FactoryConnect acts as the integration middleware — Ariba sees FC as the supplier's system. No Ariba licensing cost to FactoryConnect.

#### Pros
- Free for suppliers (buyer pays Ariba fees)
- cXML is open protocol — no licensing needed
- Sandbox available for testing
- Standard protocol — well-documented by SAP
- HTTPS transport — simpler than AS2

#### Cons
- Ariba Network ID registration per factory
- Shared secret management per buyer-factory pair
- cXML error handling requires careful XML parsing
- Buyer-specific customizations to cXML documents
- Ariba's testing/certification process can be slow

#### Risks
| Risk | Severity | Mitigation |
|------|----------|------------|
| Ariba certification delays | Medium | Start certification early, maintain test environment |
| cXML schema changes | Low | Schema has been stable for years, backward-compatible |
| Ariba outages | Low | Queue outbound messages, retry on failure |

---

### 12. Coupa REST API

**Market Position:** Third-largest procurement platform. Growing in enterprise and mid-market.

#### Mandatory Features
- OAuth 2.0 client credentials authentication
- REST API endpoints: /api/purchase_orders, /api/invoices, /api/asns, /api/catalogue_items
- Supplier API for self-management
- Webhook support for PO notifications
- JSON payload format

#### Optional Features
- Coupa Pay integration (payment tracking)
- Punch-out catalog
- Approval workflow integration
- Coupa Analytics API

#### Pricing Model
| Item | Cost | Model |
|------|------|-------|
| Coupa API access | Free (supplier side) | Included |
| OAuth 2.0 setup | Development time | One-time |
| Coupa Sandbox | Available for testing | Free |

#### Pros
- Standard REST API with OAuth 2.0 (modern, easy to implement)
- JSON-based (simpler than EDI/cXML)
- Growing buyer base
- Well-documented API with Compass portal

#### Cons
- Smaller buyer network than Ariba
- API rate limits not publicly documented
- Requires buyer to enable supplier API access
- Phase 2 priority is correct — EDI + Ariba cover most buyers first

---

### 13. SAP S/4HANA Supplier Portal

#### Mandatory Features
- OAuth 2.0 authentication
- REST API for: Purchase Orders, Goods Receipts, Invoice Verification
- SAP Business Partner model
- IDoc/BAPI integration for legacy

#### Optional Features
- SAP Integration Suite connection
- Real-time event-driven with SAP Event Mesh
- Multi-language document support

#### Pricing Model
| Item | Cost | Model |
|------|------|-------|
| API access | Via Ariba Network (preferred) or direct | Buyer-dependent |
| SAP BTP (for direct integration) | Buyer pays | N/A |

**Key insight:** Most S/4HANA buyers use Ariba Network as their supplier portal. Building the Ariba cXML connector effectively covers S/4HANA buyers too.

---

### 14. Oracle Procurement Cloud

#### Mandatory Features
- REST API: /fscmRestApi/resources/purchaseOrders, /suppliers
- OAuth 2.0 or Basic Auth
- Oracle Fusion Cloud Procurement endpoints
- Supplier self-registration

#### Optional Features
- Oracle Integration Cloud connector
- Sourcing and negotiation APIs
- Receiving and inspection APIs

#### Pricing Model
| Item | Cost | Model |
|------|------|-------|
| Fusion REST API | Free (supplier side) | Included |
| Oracle Cloud registration | Free for suppliers | Free |

---

### 15. EDIFACT over AS2 (EU Buyers)

**Market Position:** Standard for EU buyer procurement. Essential for CBAM-affected sectors (steel, aluminium, cement).

#### Mandatory Features
- Parse/generate: ORDERS (PO), ORDRSP (PO ACK), DESADV (ASN), INVOIC (Invoice)
- node-edifact library for parsing/generation
- AS2 transport (same as X12)
- UN/EDIFACT syntax rules (UNA, UNB, UNH segments)

#### Optional Features
- PRICAT (Price Catalogue) for catalog listing
- REMADV (Payment Remittance Advice)
- CBAM carbon data attachment (new requirement)

#### Pricing Model
| Item | Cost | Model |
|------|------|-------|
| node-edifact | Free (MIT) | Open source |
| AS2 transport | Same as EDI X12 | Shared infrastructure |

**Key insight:** EDIFACT shares the same AS2 transport infrastructure as X12. Building X12/AS2 in Phase 1 means EDIFACT in Phase 2 is primarily a parser/generator addition, not a transport rebuild.

---

### 16. Government API Connectors

#### 16.1 NIC e-Invoice API (GST IRN)
| Feature | Status | Notes |
|---------|--------|-------|
| Generate IRN | Mandatory | Required for GST compliance |
| Cancel IRN | Mandatory | Within 24 hours |
| Get IRN by DocType | Optional | For verification |
| Sandbox | Available | Free for testing |
| Production | OTP/GSTIN auth | Per-factory GSTIN registration |

**Pricing:** Free (government service). Rate limits apply.

#### 16.2 NIC e-Way Bill API
| Feature | Status | Notes |
|---------|--------|-------|
| Generate e-Way Bill | Mandatory | For goods > Rs 50,000 |
| Update vehicle | Mandatory | When vehicle changes |
| Extend validity | Optional | For delays |
| Cancel | Mandatory | Within 24 hours |

**Pricing:** Free. New validation rules as of Jan 2025 (180-day document date limit).

#### 16.3 GSTN API
| Feature | Status | Notes |
|---------|--------|-------|
| GSTR-1 data pull | Optional | For compliance validation |
| GSTIN verification | Optional | Verify buyer GSTIN |

#### 16.4 DGFT Portal
| Feature | Status | Notes |
|---------|--------|-------|
| LUT bond tracking | Optional | For export without IGST |
| IGST refund status | Optional | Track refund |
| Shipping bill reconciliation | Optional | Export compliance |

---

### 17. Logistics API Connectors

#### 17.1 Delhivery API
| Feature | Status | Notes |
|---------|--------|-------|
| Create shipment | Mandatory | AWB generation |
| Track shipment | Mandatory | Real-time status |
| Cancel shipment | Optional | Before pickup |
| Pickup scheduling | Optional | Schedule pickup |

**Pricing:** Free API. Shipping charges apply per shipment (Rs 50-200 domestic).

#### 17.2 FedEx India API
| Feature | Status | Notes |
|---------|--------|-------|
| Track & Trace | Mandatory | International tracking |
| Rate quotes | Optional | For cost estimation |
| Create shipment | Optional | AWB generation |

**Pricing:** Free API access. Shipping charges separate.

#### 17.3 Blue Dart API
| Feature | Status | Notes |
|---------|--------|-------|
| Tracking | Mandatory | Domestic express |
| Pickup scheduling | Optional | Automate dispatch |

---

## PART C: CONNECTOR PRIORITY MATRIX

| Connector | Phase | Revenue Impact | Build Effort | Dependency Risk |
|-----------|-------|---------------|-------------|----------------|
| Tally Prime Bridge | MVP | Very High | Medium (4-6 weeks) | Low |
| Zoho Webhook | MVP | High | Low (2-3 weeks) | Low |
| EDI X12 Engine | MVP | Very High | High (6-8 weeks) | Medium (AS2) |
| SAP Ariba cXML | MVP | High | Medium (4-5 weeks) | Low |
| WhatsApp Intake | MVP | High | Medium (3-4 weeks) | Low |
| CSV Upload | MVP | Medium | Low (1-2 weeks) | None |
| NIC e-Invoice | MVP | Medium | Medium (3-4 weeks) | Low |
| NIC e-Way Bill | MVP | Medium | Medium (2-3 weeks) | Low |
| Delhivery API | MVP | Medium | Low (1-2 weeks) | Low |
| SAP B1 REST | Phase 2 | High | Medium (3-4 weeks) | Low |
| Coupa REST | Phase 2 | Medium | Low (2-3 weeks) | Low |
| EDIFACT/AS2 | Phase 2 | High (EU/CBAM) | Medium (3-4 weeks) | Low |
| Busy ODBC | Phase 2 | Low | Medium (3-4 weeks) | Medium |
| Marg SQL | Phase 2 | Medium (pharma) | Medium (3-4 weeks) | Medium |
| ERPNext REST | Phase 2 | Low | Low (1-2 weeks) | None |
| Oracle REST | Phase 2 | Low | Low (2-3 weeks) | Low |
| Custom REST | Phase 2 | Low | Low (1-2 weeks) | None |
| FedEx API | Phase 2 | Low | Low (1-2 weeks) | Low |

---

## Sources

- [TallyPrime Developer Platform](https://tallysolutions.com/us/tally-prime-developer/)
- [TallyPrime Pricing 2025](https://www.antraweb.com/blog/tally-prime-pricing)
- [Tally Database Loader — GitHub](https://github.com/dhananjay1405/tally-database-loader)
- [Zoho Books API v3 Documentation](https://www.zoho.com/books/api/v3/introduction/)
- [Zoho API Rate Limits](https://www.zoho.com/developer/help/api/api-limits.html)
- [SAP B1 Pricing India — Uneecops](https://www.uneecops.com/erp/sap-services/sap-business-one-licence/)
- [SAP B1 Cost Guide 2026](https://synavos.com/blogs/sap-business-one-cost-a-complete-2025-guide/)
- [Busy Accounting — SoftwareSuggest](https://www.softwaresuggest.com/busy-accounting)
- [Busy Integration — RootFi](https://www.rootfi.dev/integrations/busy-accounting)
- [Marg ERP Official](https://margcompusoft.com/)
- [ERPNext Frappe API Docs](https://docs.frappe.io/framework/user/en/api)
- [ERPNext GitHub](https://github.com/frappe/erpnext)
- [Gupshup WhatsApp Pricing Updates 2025](https://support.gupshup.io/hc/en-us/articles/38821010267673-WhatsApp-Pricing-Updates-2024-2025)
- [WhatsApp Business API Pricing India 2026](https://messagebot.in/blog/whatsapp-business-api-pricing-in-india/)
- [node-x12 — npm](https://www.npmjs.com/package/node-x12)
- [SPS Commerce EDI — Cleo Comparison](https://www.cleo.com/blog/edi-providers/sps-commerce-edi)
- [Coupa API OAuth 2.0 — Compass](https://compass.coupa.com/en-us/products/total-spend-management-platform/integration-playbooks-and-resources/integration-knowledge-articles/oauth-2.0-getting-started-with-coupa-api)
- [Oracle Fusion Procurement REST API](https://docs.oracle.com/en/cloud/saas/procurement/25d/fapra/api-supplier-initiatives-suppliers.html)
- [NIC e-Invoice Sandbox](https://einv-apisandbox.nic.in/)
- [Temporal.io Pricing](https://temporal.io/pricing)
