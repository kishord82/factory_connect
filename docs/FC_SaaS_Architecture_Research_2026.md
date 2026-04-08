# FactoryConnect: Deep Architecture & Design Research
**Date:** April 3, 2026  
**Focus:** Multi-tenant B2B SaaS, ERP-to-EDI integration, Node.js 22, PostgreSQL 16, React 19

---

## EXECUTIVE SUMMARY

This research synthesizes best practices from industry leaders (Salesforce, Stripe, Cleo, SPS Commerce, OpenText, Fivetran, Airbyte) and provides specific technical recommendations for FactoryConnect's design decisions. Key findings:

1. **Multi-tenant isolation:** RLS on shared schema (PostgreSQL) is the consensus for cost-effective, defensible multi-tenancy at FactoryConnect's scale (100s-1000s of factories).

2. **EDI architecture:** Hybrid approach combining Cleo's "glass-box" transparency with SPS Commerce's domain expertise. Avoid black-box silos; build mapping transparency from day 1.

3. **ERP integration:** CDC + webhooks + polling hybrid. For offline ERPs (Tally), bridge agent with local SQLite queue + WebSocket tunnel is proven pattern.

4. **Exactly-once delivery:** Transactional outbox (outbox table in same transaction) + polling listener guarantees at-least-once + idempotency layer (Redis key + DB check) = effectively exactly-once.

5. **Saga orchestration:** 15-state machine for order lifecycle. Orchestrator pattern (vs. choreography) for audit trails and compensation logic.

6. **AI field mapping:** LLM role is constrained: error-code-only input (no factory data) + structured token-based output (no free-form). Fivetran's automated schema detection + Airbyte's vector embedding readiness inform design.

7. **Multi-tenant observability:** OpenTelemetry collector with tenant routing + Jaeger/Tempo for traces. Per-tenant alert routing via tenant_id cardinality.

8. **Indian compliance:** AES-256 at rest + TLS in transit + FIPS 140-3 HSM (Vault Transit) for GSTIN/PAN/Aadhaar. Tokenization pattern minimizes exposure.

9. **Bridge agent:** Windows PC agent with offline-first SQLite queue + WebSocket replication (CRDT-based sync pattern from sqlite-sync). Auto-update via delta binary distribution.

10. **Pricing:** Hybrid subscription + per-transaction for Indian SMEs. Razorpay integration essential for UPI AutoPay + e-NACH. Target: ₹5-20 LPA for entry-level factories (turnover ₹5-20Cr).

---

## 1. MULTI-TENANT SAAS ARCHITECTURE

### Current Consensus (2025-2026)

**Best Practice: RLS on Shared Schema**

Three isolation strategies exist:

| Strategy | Isolation Boundary | Cost | Complexity | Security |
|----------|-------------------|------|-----------|----------|
| **Shared DB + Shared Schema (RLS)** | Row-level via `tenant_id` + PostgreSQL RLS policy | Lowest | Moderate | High if RLS correctly implemented |
| **Shared DB + Schema-per-Tenant** | Schema isolation | Medium | High | High, stronger logical boundary |
| **DB-per-Tenant** | Separate database instance | Highest | Very high | Very high, but operational overhead |

**FactoryConnect recommendation:** Shared DB + Shared Schema + RLS because:
- 100s-1000s of factories = thousands of tenants at scale, not millions
- PostgreSQL RLS is production-proven (Salesforce, Stripe, others)
- Defense-in-depth: code filter `tenant_id` + database RLS policy (belt AND suspenders)
- Cost-optimal for Indian SMEs
- Simpler operations: 1 DB, 1 schema, n policies

### Salesforce's Architecture (Reference)

Salesforce serves 100k+ orgs from shared DB with:
- Tenant identifiers (org_id) on every table
- Metadata-driven config (don't create new tables per tenant; use config tables)
- RLS + Object-Level Security (OLS) for multi-level isolation
- Org-based query filters across entire stack

**Implementation specifics for FactoryConnect:**
```sql
-- Every table needs tenant context
ALTER TABLE canonical_orders ENABLE ROW LEVEL SECURITY;
CREATE POLICY tenant_isolation ON canonical_orders
  USING (tenant_id = current_setting('app.current_tenant')::bigint);

-- Set tenant context BEFORE any query
SET LOCAL app.current_tenant = $1;  -- Factory ID
SET LOCAL app.current_user = $2;    -- User ID
SET LOCAL app.correlation_id = $3;  -- Tracing
```

### Stripe's Approach

Stripe's multi-tenant design uses:
- Account hierarchies (org > team > user)
- Computed tenant_id at query time (not hardcoded)
- Cache invalidation via Redis cardinality filters
- Observability cardinality = tenant_id (limits cardinality explosion)

**Takeaway:** Use feature flags + app_config table (tenant overrides) rather than creating new schema per feature or tenant tier.

---

## 2. EDI INTEGRATION ARCHITECTURE

### Platform Comparison: Cleo vs. SPS Commerce vs. OpenText

| Platform | Model | Transparency | Scaling | Best For |
|----------|-------|-------------|---------|----------|
| **Cleo** | AI-powered glass-box | Native transformation logging | Cloud-native | Mid-market needing visibility + flexibility |
| **SPS Commerce** | Managed service / black-box | Limited (you see input/output) | Enterprise retail | Companies wanting hands-off, pre-built retail EDI |
| **OpenText** | Enterprise grid (monolith) | Medium | Legacy/hybrid | Fortune 500 + existing OpenText customers |

### FactoryConnect Strategy: Hybrid "Glass-Box" EDI

Adopt Cleo's philosophy but build for factories:

**Core principles:**
1. **Transparency first:** Every transformation logged with input/output visible to factory
2. **AI-assisted mapping:** LLM narrows field options, human confirms (not auto-generation)
3. **Sandbox test harness:** Dry-run mappings against sample Tally XML before production
4. **Connector catalog:** Pre-built mappings for common factories (Tally, SAP, Oracle) + custom onboarding flow

**Architecture:**
```
Factory ERP (Tally/SAP) 
    ↓
Bridge Agent (local Windows PC, offline-first SQLite queue)
    ↓
API Gateway (multi-tenant auth)
    ↓
Mapping Engine (schema detection + LLM recommendations)
    ↓
Transform Rules Engine (Zod-validated transforms)
    ↓
EDI Spec Engine (generate X12/D96A/EANCOM)
    ↓
AS2 Sidecar (sign, encrypt, send via SMTP/TLS)
    ↓
Buyer Portal (Ariba, SAP Ariba, custom)
```

### LLM in EDI Context

**DO NOT:** Send factory data (PO numbers, amounts, vendor names) to LLM.

**DO:** Send only error codes + metadata, get back field tokens and confidence scores.

**Example:**
```typescript
// Input to LLM
{
  "error_code": "FC_ERR_MAPPING_FIELD_NOT_FOUND",
  "source_system": "tally",
  "missing_field": "supplier_identifier",
  "target_spec": "edi_850",
  "available_fields": ["vendor_code", "vendor_name", "gst_number"]
}

// Output from LLM
{
  "recommended_mapping": "vendor_code -> supplier_identifier",
  "confidence": 0.92,
  "explanation": "Tally vendor_code maps to EDI supplier_id; vendor_name used as fallback"
}
```

### As2 Integration (OpenAS2 Docker Service)

Your docker-compose includes OpenAS2 (4080 HTTP, 4081 HTTPS). Use it for:
- Signing POs with factory's certificate (GSTIN embedded)
- Encrypting before sending to buyer
- Receiving EDI 997 ACKs (track delivery)
- Webhook callbacks on receipt

**Track C milestone:** Full AS2 sidecar integration with certificate rotation.

---

## 3. ERP INTEGRATION PATTERNS

### The Challenge: Offline ERPs (Tally)

Tally runs on factory Windows PCs, has no API, generates XML locally. Standard approaches fail:
- **Webhooks:** Tally can't initiate HTTP calls
- **CDC:** Tally has no transaction log access
- **Polling:** Factory may be offline for hours

### Solution: Bridge Agent + Local SQLite Queue

**Architecture:**
```
Tally XML (on Windows PC)
    ↓ (file system watch)
Bridge Agent (Node.js Windows service)
    ↓ (local SQLite queue)
WebSocket Tunnel (over HTTPS to API Gateway)
    ↓ (outbox poller on backend)
API → Saga Coordinator → Notification → Portal
```

**Bridge Agent responsibilities:**
- Watch Tally XML folder for new files (chokidar)
- Parse XML, validate schema, queue locally (SQLite)
- Attempt WebSocket push to API; if offline, retry with backoff (Opossum circuit breaker)
- Sync queued items when connectivity returns (CRDT-based merge)
- Auto-update via delta binary distribution (check update endpoint every 6 hours)

**Implementation notes:**
- SQLite with sqlite-vec + FTS5 for local embedding queries (support offline mapping suggestions)
- Sync table schema: `{ id, table_name, operation, record_id, payload, sync_status, retry_count, last_error }`
- WebSocket auto-reconnect with exponential backoff (1s, 2s, 4s, 8s, 60s max)

### Hybrid CDC Approach for Cloud ERPs (SAP, Oracle)

If factory uses cloud ERP:
1. **API-based delta capture** (SAP OData, Oracle API)
2. **Timestamp CDC** (last_modified column)
3. **Targeted webhooks** for critical events (PO created, amended, cancelled)

Combine all three for "approximately log-based fidelity" without real CDC.

---

## 4. TRANSACTIONAL OUTBOX PATTERN

### Guarantee: At-Least-Once Delivery (+ Idempotency = Effectively Exactly-Once)

**Pattern definition:** Write business data + outbox event in single transaction. Separate poller publishes outbox rows to message bus.

**Implementation in Node.js + PostgreSQL:**

```typescript
async function createOrder(factoryId: string, poData: PurchaseOrder) {
  const client = await pool.connect();
  try {
    await client.query('BEGIN');
    
    // Set tenant context
    await client.query("SET LOCAL app.current_tenant = $1", [factoryId]);
    
    // 1. Create canonical order
    const orderResult = await client.query(
      `INSERT INTO canonical_orders (factory_id, status, po_number, total_amount, created_at)
       VALUES ($1, $2, $3, $4, NOW())
       RETURNING id`,
      [factoryId, 'INITIATED', poData.number, poData.total]
    );
    const orderId = orderResult.rows[0].id;
    
    // 2. Write to outbox (same transaction)
    const idempotencyKey = crypto.randomUUID();
    await client.query(
      `INSERT INTO outbox (aggregate_id, aggregate_type, event_type, payload, idempotency_key, created_at)
       VALUES ($1, $2, $3, $4, $5, NOW())`,
      [orderId, 'canonical_order', 'ORDER_CREATED', JSON.stringify({orderId, ...poData}), idempotencyKey]
    );
    
    // 3. Create saga record (for orchestration)
    await client.query(
      `INSERT INTO order_sagas (order_id, state, started_at)
       VALUES ($1, $2, NOW())`,
      [orderId, 'INITIATED']
    );
    
    // 4. Audit log (same transaction)
    await client.query(
      `INSERT INTO audit_log (entity_type, entity_id, action, actor_id, changes, created_at)
       VALUES ($1, $2, $3, $4, $5, NOW())`,
      ['order', orderId, 'CREATE', userId, JSON.stringify({po_number: poData.number})]
    );
    
    await client.query('COMMIT');
    return { orderId, idempotencyKey };
  } catch (error) {
    await client.query('ROLLBACK');
    throw error;
  } finally {
    client.release();
  }
}
```

**Outbox poller (runs every 100ms):**

```typescript
async function pollOutbox() {
  const client = await pool.connect();
  try {
    const rows = await client.query(
      `SELECT id, aggregate_id, event_type, payload FROM outbox 
       WHERE published_at IS NULL 
       ORDER BY created_at ASC 
       LIMIT 100`
    );
    
    for (const row of rows.rows) {
      try {
        // Publish to Redis stream, Kafka, or directly emit
        await redis.xadd(`events:${row.event_type}`, '*', 'data', JSON.stringify(row.payload));
        
        // Mark published
        await client.query(
          `UPDATE outbox SET published_at = NOW() WHERE id = $1`,
          [row.id]
        );
      } catch (publishError) {
        // Poller continues; retry in next poll
        console.error(`Failed to publish outbox event ${row.id}:`, publishError);
      }
    }
  } finally {
    client.release();
  }
}
// Run every 100ms
setInterval(pollOutbox, 100);
```

**Idempotency key validation (on consumer side):**

```typescript
async function handleOrderCreated(event: OrderCreatedEvent) {
  // Check idempotency key in Redis (5 min TTL)
  const key = `idempotency:${event.idempotencyKey}`;
  const cached = await redis.get(key);
  if (cached) {
    console.log('Duplicate event, skipping');
    return;
  }
  
  // Process event
  await processOrder(event);
  
  // Mark as processed
  await redis.setex(key, 300, 'processed');
}
```

**This guarantees:**
- At least once delivery (poller retries until published_at is set)
- Exactly once processing (idempotency key + Redis cache)
- Data consistency (outbox + domain data in same transaction)
- Audit trail (4th table in transaction)

### Alternative: PostgreSQL Logical Decoding

For higher throughput (millions/sec), use WAL-based logical decoding (pg_transactional_outbox library handles this). But at FactoryConnect's scale (100s-1000s orders/day), polling is simpler and sufficient.

---

## 5. SAGA ORCHESTRATION (15-STATE LIFECYCLE)

### Architecture: Orchestrator Pattern (Not Choreography)

**Why orchestrator vs. choreography:**
- Orchestrator: Centralized coordinator tells each service what to do. Clear audit trail, easier compensation.
- Choreography: Services emit events, others react. Harder to debug, missing transactions silently.

**FactoryConnect uses orchestrator** because:
- Order lifecycle is complex (approval, validation, booking confirmation, ticketing)
- Need to enforce approval deadlines from connection SLA config
- Must compensate on failures (cancel booking if validation fails)
- Audit trail is mandatory for factories

### 15-State Lifecycle

```
INITIATED 
  ↓ (info gathering)
GATHERING_INFO 
  ↓ (schema validation)
COMPLETE 
  ↓ (search GDS)
SEARCHING 
  ↓ (quotes received)
QUOTED 
  ↓ (show rules)
FARE_RULES_SHOWN 
  ↓ (price confirmed by user)
PRICE_CONFIRMED 
  ↓ (approval workflow)
APPROVAL_PENDING 
  ↓ (approved)
APPROVED 
  ↓ (validate passengers)
PASSENGER_VALIDATED 
  ↓ (GDS booking)
BOOKING_CONFIRMED 
  ↓ (ticketed)
TICKETED 
  ↓ (invoice issued)
INVOICE_SENT 
  ↓ (end state)
COMPLETED

Failure paths:
- CANCELLED (from any state except COMPLETED/TICKETED/INVOICE_SENT)
- FAILED (from BOOKING_CONFIRMED if ticketing fails)
```

### Saga Coordinator Implementation

```typescript
// Track in order_sagas table
type SagaState = 
  | 'INITIATED' | 'GATHERING_INFO' | 'COMPLETE' | 'SEARCHING' 
  | 'QUOTED' | 'FARE_RULES_SHOWN' | 'PRICE_CONFIRMED' 
  | 'APPROVAL_PENDING' | 'APPROVED' | 'PASSENGER_VALIDATED' 
  | 'BOOKING_CONFIRMED' | 'TICKETED' | 'INVOICE_SENT' | 'COMPLETED' 
  | 'CANCELLED' | 'FAILED';

class SagaCoordinator {
  async transitionState(sagaId: string, newState: SagaState) {
    const saga = await this.getSaga(sagaId);
    
    // Validate transition
    const validNextStates = this.getValidTransitions(saga.state);
    if (!validNextStates.includes(newState)) {
      throw new FcError(
        'FC_ERR_SAGA_INVALID_TRANSITION',
        `Cannot transition from ${saga.state} to ${newState}`
      );
    }
    
    // Execute transition handler
    const handler = this.transitionHandlers[newState];
    const result = await handler(saga);
    
    // Update saga + emit event
    await this.db.query(
      `UPDATE order_sagas SET state = $1, updated_at = NOW() WHERE id = $2`,
      [newState, sagaId]
    );
    
    // Emit event for webhooks, notifications
    await this.outbox.append({
      aggregateId: sagaId,
      type: `SAGA_STATE_CHANGED`,
      payload: { from: saga.state, to: newState, ...result }
    });
    
    // Check deadlines (SLA enforcement)
    await this.checkSLADeadline(sagaId, newState);
  }
  
  private getValidTransitions(state: SagaState): SagaState[] {
    const map: Record<SagaState, SagaState[]> = {
      'INITIATED': ['GATHERING_INFO', 'CANCELLED'],
      'GATHERING_INFO': ['COMPLETE', 'CANCELLED'],
      'COMPLETE': ['SEARCHING', 'CANCELLED'],
      'SEARCHING': ['QUOTED', 'CANCELLED', 'FAILED'],
      'QUOTED': ['FARE_RULES_SHOWN', 'CANCELLED'],
      'FARE_RULES_SHOWN': ['PRICE_CONFIRMED', 'CANCELLED'],
      'PRICE_CONFIRMED': ['APPROVAL_PENDING', 'CANCELLED'],
      'APPROVAL_PENDING': ['APPROVED', 'CANCELLED'],
      'APPROVED': ['PASSENGER_VALIDATED', 'CANCELLED'],
      'PASSENGER_VALIDATED': ['BOOKING_CONFIRMED', 'CANCELLED'],
      'BOOKING_CONFIRMED': ['TICKETED', 'FAILED', 'CANCELLED'],
      'TICKETED': ['INVOICE_SENT', 'CANCELLED'],
      'INVOICE_SENT': ['COMPLETED'],
      'COMPLETED': [], // Terminal
      'CANCELLED': [], // Terminal
      'FAILED': [], // Terminal
    };
    return map[state] || [];
  }
}
```

### Compensation Logic (on FAILED/CANCELLED)

```typescript
async function compensateOrder(sagaId: string, failureReason: string) {
  const saga = await db.query('SELECT * FROM order_sagas WHERE id = $1', [sagaId]);
  
  // Reverse changes based on current state
  if (saga.state === 'BOOKING_CONFIRMED') {
    // Call GDS to cancel booking
    await galileo.cancelBooking(saga.booking_reference);
  }
  if (saga.state === 'APPROVAL_PENDING' || saga.state === 'APPROVED') {
    // Notify approval system
    await approval.notifyRejected(sagaId, failureReason);
  }
  
  // Notify factory via webhook
  await outbox.append({
    type: 'ORDER_FAILED',
    payload: { sagaId, reason: failureReason }
  });
  
  // Update saga to FAILED state
  await db.query(
    `UPDATE order_sagas SET state = 'FAILED', failed_at = NOW(), failure_reason = $1 WHERE id = $2`,
    [failureReason, sagaId]
  );
}
```

---

## 6. AI-ASSISTED FIELD MAPPING

### Design Principle: Error-Code-Only LLM Input

**DO NOT send:**
- Factory data (PO numbers, amounts, vendor names)
- Raw field values
- Sensitive identifiers

**DO send:**
- Error code (`FC_ERR_MAPPING_FIELD_NOT_FOUND`)
- Source system name (`tally`, `sap`)
- Available fields from source schema
- Target EDI spec version

### Implementation Pattern

**Step 1: Detect unmapped fields**
```typescript
async function detectUnmappedFields(sourceSchema: SourceSchema, targetSpec: EDISpec) {
  const unmapped: UnmappedField[] = [];
  
  for (const targetField of targetSpec.requiredFields) {
    const mapping = await db.query(
      `SELECT source_field FROM field_mappings 
       WHERE factory_id = $1 AND target_field = $2 AND source_system = $3`,
      [factoryId, targetField.name, sourceSystem]
    );
    
    if (!mapping.rows.length) {
      unmapped.push({
        targetField: targetField.name,
        targetType: targetField.type,
        availableSourceFields: sourceSchema.fieldNames
      });
    }
  }
  
  return unmapped;
}
```

**Step 2: Get LLM recommendations (error-code-only)**
```typescript
async function suggestMappings(unmapped: UnmappedField[], sourceSystem: string) {
  const payload = {
    source_system: sourceSystem,
    unmapped_fields: unmapped.map(u => ({
      target_field: u.targetField,
      target_type: u.targetType,
      available_sources: u.availableSourceFields
    }))
  };
  
  // Call LLM API with structured input
  const response = await fetch('https://api.anthropic.com/v1/messages', {
    method: 'POST',
    headers: { 'x-api-key': env.CLAUDE_API_KEY },
    body: JSON.stringify({
      model: 'claude-opus-4-6',
      max_tokens: 1024,
      messages: [{
        role: 'user',
        content: `Map these fields from ${sourceSystem} to EDI spec. Return ONLY JSON array of {target_field, suggested_source_field, confidence}. No explanations. No PII.\n${JSON.stringify(payload)}`
      }]
    })
  });
  
  const text = response.content[0].text;
  return JSON.parse(text); // [{ target_field, suggested_source_field, confidence }]
}
```

**Step 3: Present to factory for confirmation**
```typescript
// UI shows: "PO Number" → suggested mapping "vendor_po_num" (92% confidence)
// Factory confirms or overrides
// Store in field_mappings table
await db.query(
  `INSERT INTO field_mappings 
   (factory_id, source_system, source_field, target_field, confidence, confirmed_at)
   VALUES ($1, $2, $3, $4, $5, NOW())`,
  [factoryId, sourceSystem, confirmedMapping.sourceField, confirmedMapping.targetField, confirmedMapping.confidence]
);
```

### Sandbox Test Harness

Before live production, run mapping against sample Tally XML:

```typescript
async function testMapping(factoryId: string, sampleXmlPath: string) {
  const sampleData = parseXML(sampleXmlPath);
  const mappings = await db.query(
    `SELECT * FROM field_mappings WHERE factory_id = $1`,
    [factoryId]
  );
  
  const transformedEDI = await transformRulesEngine.apply(sampleData, mappings);
  const validationResult = await ediSpecEngine.validate(transformedEDI);
  
  return {
    success: validationResult.isValid,
    errors: validationResult.errors,
    ediPreview: transformedEDI,
    fieldCoverage: `${Math.round((mappings.length / totalRequiredFields) * 100)}%`
  };
}
```

---

## 7. MULTI-TENANT OBSERVABILITY

### Architecture: OpenTelemetry + Jaeger + Prometheus

**Key principle:** Stamp every telemetry with tenant_id, route by tenant, alert per-tenant.

### Implementation

**1. OpenTelemetry SDK (API layer)**
```typescript
import { NodeTracerProvider } from '@opentelemetry/sdk-node';
import { getNodeAutoInstrumentations } from '@opentelemetry/auto-instrumentations-node';
import { JaegerExporter } from '@opentelemetry/exporter-jaeger-basic';

const provider = new NodeTracerProvider();

// Add tenant_id to every span
provider.addSpanProcessor({
  onStart(span, context) {
    const tenantId = context.attributes['tenant_id'];
    span.setAttributes({ tenant_id: tenantId });
  }
});

provider.addSpanProcessor(
  new JaegerExporter({
    host: 'localhost',
    port: 6831
  })
);

provider.register();
```

**2. Tenant context middleware (Express)**
```typescript
app.use((req, res, next) => {
  const tenantId = req.user?.tenant_id || req.headers['x-tenant-id'];
  const correlationId = req.headers['x-correlation-id'] || crypto.randomUUID();
  
  // Add to OpenTelemetry context
  setSpanAttribute('tenant_id', tenantId);
  setSpanAttribute('correlation_id', correlationId);
  
  // Add to Pino logger context
  req.log = logger.child({ tenantId, correlationId });
  
  res.setHeader('x-correlation-id', correlationId);
  next();
});
```

**3. Prometheus metrics (per-tenant)**
```typescript
const orderCreatedCounter = new Counter({
  name: 'orders_created_total',
  help: 'Total orders created',
  labelNames: ['tenant_id', 'factory_type']
});

// Usage
orderCreatedCounter.inc({ tenant_id: tenantId, factory_type: 'tally' });

// Prometheus scrape endpoint
GET /metrics
# HELP orders_created_total Total orders created
# TYPE orders_created_total counter
orders_created_total{tenant_id="factory-123",factory_type="tally"} 42
```

**4. Jaeger distributed tracing**
```typescript
// Every request gets a trace_id
const tracer = provider.getTracer('api-gateway');
const span = tracer.startSpan('POST /orders', {
  attributes: {
    'http.method': 'POST',
    'http.url': '/orders',
    'tenant_id': tenantId,
    'correlation_id': correlationId
  }
});

// Spans propagate across services
// Jaeger UI shows:
// POST /orders [Saga Coordinator] [Validation Service] [Notification Service]
//   ↓              ↓                   ↓                    ↓
// 10ms          150ms               50ms                 200ms
```

**5. Alert routing (per-tenant)**
```yaml
# Prometheus alerting rules
groups:
  - name: tenant_sla
    rules:
      - alert: OrderProcessingLatencyHigh
        expr: |
          histogram_quantile(0.99, order_processing_duration_seconds{tenant_id=~".+"}) > 5
        for: 5m
        annotations:
          summary: "Order processing latency high for {{ $labels.tenant_id }}"
          # Route to tenant-specific webhook
          webhook_url: "{{ $labels.tenant_webhook_url }}"
```

---

## 8. INDIAN COMPLIANCE & SECURITY (PII, FLE, ENCRYPTION)

### Data Classification for Indian Factories

| Data | Sensitivity | Storage | Encryption | Tokenization |
|------|-------------|---------|-----------|--------------|
| GSTIN | HIGH | Vault | AES-256 + Transit | Yes → `token_gstin_123` |
| Aadhaar | CRITICAL | Vault only | FIPS 140-3 HSM | Yes → `token_aadhaar_456` |
| PAN | HIGH | Vault | AES-256 + Transit | Yes → `token_pan_789` |
| Bank account | HIGH | Vault | AES-256 + Transit | Yes → `token_bank_abc` |
| IFSC | HIGH | Vault | AES-256 + Transit | Yes → `token_ifsc_def` |
| Factory name | LOW | PostgreSQL | TLS in transit | No |
| Email | MEDIUM | PostgreSQL | TLS in transit, redacted in logs | No |

### Implementation: Vault Transit Engine

**Setup (in Vault dev mode, pre-configured):**
```bash
# Enable transit engine
vault secrets enable transit

# Create encryption key
vault write -f transit/keys/factoryconnect
# Result: key_id = 1

# Create keys for each PII type
vault write -f transit/keys/pii_gstin
vault write -f transit/keys/pii_aadhaar
vault write -f transit/keys/pii_pan
```

**Node.js encryption/decryption:**
```typescript
import axios from 'axios';

class VaultTransitClient {
  async encrypt(plaintext: string, keyName: string): Promise<string> {
    const response = await axios.post(
      `${env.VAULT_ADDR}/v1/transit/encrypt/${keyName}`,
      { plaintext: Buffer.from(plaintext).toString('base64') },
      { headers: { 'X-Vault-Token': env.VAULT_TOKEN } }
    );
    return response.data.data.ciphertext; // vault:v1:ciphertext...
  }
  
  async decrypt(ciphertext: string, keyName: string): Promise<string> {
    const response = await axios.post(
      `${env.VAULT_ADDR}/v1/transit/decrypt/${keyName}`,
      { ciphertext },
      { headers: { 'X-Vault-Token': env.VAULT_TOKEN } }
    );
    return Buffer.from(response.data.data.plaintext, 'base64').toString();
  }
}

// Usage
const vaultTransit = new VaultTransitClient();

// Store GSTIN (encrypted)
const encryptedGSTIN = await vaultTransit.encrypt(factory.gstin, 'pii_gstin');
await db.query(
  `INSERT INTO factories (name, gstin_encrypted, gstin_token) 
   VALUES ($1, $2, $3)`,
  [factory.name, encryptedGSTIN, `token_gstin_${randomId()}`]
);

// On read: fetch encrypted value, decrypt only when needed
const factory = await db.query(`SELECT gstin_encrypted FROM factories WHERE id = $1`, [id]);
const decryptedGSTIN = await vaultTransit.decrypt(factory.gstin_encrypted, 'pii_gstin');
```

### Pino Logger with PII Redaction

```typescript
import pino from 'pino';

const PII_PATTERNS = [
  /\b[0-9]{2}[A-Z]{5}[0-9]{4}[A-Z][1-9A-Z][Z][0-9]{3}[A-Z]\b/g, // GSTIN
  /\b[0-9]{12}\b/g, // Aadhaar
  /\b[A-Z]{5}[0-9]{4}[A-Z]\b/g, // PAN
  /\b\d{9,18}\b/g, // Bank account (masked)
  /\b[A-Z]{4}0[A-Z0-9]{6}\b/g, // IFSC
  /\b[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}\b/g // Email
];

const redactPII = (msg: string) => {
  return PII_PATTERNS.reduce((acc, pattern) => 
    acc.replace(pattern, '[REDACTED]'), msg
  );
};

const logger = pino({
  transport: {
    target: 'pino-pretty'
  },
  hooks: {
    logMethod(args) {
      if (args[0] && typeof args[0] === 'string') {
        args[0] = redactPII(args[0]);
      }
      if (args[1] && typeof args[1] === 'object') {
        args[1] = JSON.parse(redactPII(JSON.stringify(args[1])));
      }
      return args;
    }
  }
});

// All logs automatically redacted
logger.info({ gstin: '27AABCT0550H1Z0', amount: 50000 });
// Output: { gstin: '[REDACTED]', amount: 50000 }
```

### RLS for PII Tables

```sql
-- Separate table for PII (minimal schema)
CREATE TABLE pii_store (
  id BIGSERIAL PRIMARY KEY,
  factory_id BIGINT NOT NULL REFERENCES factories(id) ON DELETE CASCADE,
  data_type TEXT NOT NULL, -- 'gstin', 'aadhaar', 'pan', 'bank_account'
  encrypted_value TEXT NOT NULL,
  token TEXT NOT NULL UNIQUE,
  created_at TIMESTAMP DEFAULT NOW(),
  tenant_id BIGINT NOT NULL
);

-- RLS policy: only factory's tenant can access
ALTER TABLE pii_store ENABLE ROW LEVEL SECURITY;
CREATE POLICY tenant_isolation ON pii_store
  USING (tenant_id = current_setting('app.current_tenant')::bigint);

-- Index on token (fast lookups, no plaintext search)
CREATE INDEX idx_pii_store_token ON pii_store(token);

-- Audit trigger on PII access (who accessed what, when)
CREATE TABLE pii_audit_log (
  id BIGSERIAL PRIMARY KEY,
  pii_id BIGINT NOT NULL REFERENCES pii_store(id) ON DELETE CASCADE,
  accessed_by_user_id BIGINT NOT NULL,
  accessed_at TIMESTAMP DEFAULT NOW(),
  accessed_from_ip INET,
  reason TEXT
);

CREATE TRIGGER log_pii_access AFTER SELECT ON pii_store
FOR EACH ROW EXECUTE FUNCTION log_pii_access_fn();
```

---

## 9. BRIDGE AGENT ARCHITECTURE

### Windows PC Agent: Design & Implementation

**Purpose:** Run on Tally PC, watch XML folder, sync to cloud, handle offline scenarios.

**Tech Stack:**
- Node.js 22 (Windows portable binary, no installer required)
- SQLite (local queue)
- WebSocket client (HTTPS tunnel to API Gateway)
- Electron (optional: system tray UI for status/logs)

### Architecture Diagram

```
Tally XML → File Watcher (chokidar) → Parse & Validate
              ↓
           Local SQLite Queue (offline-first)
              ↓
           WebSocket Client (TLS 1.3)
              ↓
           API Gateway (reverse proxy, multi-tenant auth)
              ↓
           Outbox Poller → Saga Coordinator → Backend
              ↓
           Response → Update sync_queue → Mark synced
              ↓
           Auto-update (Delta binary, ~5MB)
```

### Local SQLite Schema

```sql
-- Queue table: tracks what needs to sync
CREATE TABLE sync_queue (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  operation TEXT NOT NULL, -- 'INSERT', 'UPDATE', 'DELETE'
  table_name TEXT NOT NULL, -- 'canonical_orders', 'line_items', etc.
  record_id TEXT NOT NULL,
  payload TEXT NOT NULL, -- JSON
  sync_status TEXT DEFAULT 'pending', -- pending, syncing, synced, failed
  retry_count INTEGER DEFAULT 0,
  last_error TEXT,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  synced_at TIMESTAMP
);

-- Local mappings (synced from cloud, cached)
CREATE TABLE field_mappings (
  source_field TEXT PRIMARY KEY,
  target_field TEXT,
  confidence REAL,
  last_synced_at TIMESTAMP
);

-- Local audit (all changes before sync)
CREATE TABLE local_audit_log (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  event TEXT,
  details TEXT,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);
```

### Implementation (Node.js)

```typescript
import chokidar from 'chokidar';
import SQLite3 from 'sqlite3';
import WebSocket from 'ws';
import { parseString } from 'xml2js';
import { Opossum } from 'opossum';

class BridgeAgent {
  private db: SQLite3.Database;
  private ws: WebSocket;
  private circuitBreaker: Opossum;
  
  constructor() {
    this.db = new SQLite3.Database('./queue.db');
    this.initializeDB();
    this.setupCircuitBreaker();
    this.startFileWatcher();
    this.startSyncLoop();
    this.setupAutoUpdate();
  }
  
  // Watch Tally XML folder
  private startFileWatcher() {
    const tallyFolder = process.env.TALLY_XML_FOLDER || 'C:\\Tally\\XML';
    const watcher = chokidar.watch(`${tallyFolder}/**/*.xml`, {
      persistent: true,
      awaitWriteFinish: { stabilityThreshold: 2000, pollInterval: 100 }
    });
    
    watcher.on('add', async (filePath) => {
      console.log(`[FileWatcher] New file: ${filePath}`);
      await this.processXMLFile(filePath);
    });
  }
  
  // Parse and queue
  private async processXMLFile(filePath: string) {
    try {
      const xmlContent = fs.readFileSync(filePath, 'utf-8');
      const parsed = await this.parseXML(xmlContent);
      
      const payload = {
        source: 'tally',
        type: parsed.document.type,
        data: parsed.document.data,
        originalFilePath: filePath,
        processedAt: new Date().toISOString()
      };
      
      // Insert into queue
      this.db.run(
        `INSERT INTO sync_queue (operation, table_name, record_id, payload, sync_status)
         VALUES ('INSERT', ?, ?, ?, 'pending')`,
        [
          `tally_${parsed.document.type}`,
          `${parsed.document.type}_${Date.now()}`,
          JSON.stringify(payload)
        ]
      );
      
      // Log
      this.db.run(
        `INSERT INTO local_audit_log (event, details) VALUES ('FILE_PROCESSED', ?)`,
        [JSON.stringify({ filePath, type: parsed.document.type })]
      );
      
      console.log(`[Queue] Added ${parsed.document.type} to sync queue`);
    } catch (error) {
      console.error(`[Error] Failed to process ${filePath}:`, error);
      this.db.run(
        `INSERT INTO local_audit_log (event, details) VALUES ('FILE_ERROR', ?)`,
        [JSON.stringify({ filePath, error: error.message })]
      );
    }
  }
  
  // Sync loop: runs every 5s, pushes queued items to cloud
  private startSyncLoop() {
    setInterval(async () => {
      const pendingRows = await this.getQueuedItems(5); // Batch of 5
      
      if (pendingRows.length === 0) return;
      
      for (const row of pendingRows) {
        try {
          // Circuit breaker: fail fast if API is down
          const response = await this.circuitBreaker.fire(() =>
            this.sendToCloud(row)
          );
          
          // Mark synced
          this.db.run(
            `UPDATE sync_queue SET sync_status = 'synced', synced_at = CURRENT_TIMESTAMP WHERE id = ?`,
            [row.id]
          );
          
          console.log(`[Sync] Item ${row.id} synced successfully`);
        } catch (error) {
          // Increment retry, keep queued for next attempt
          this.db.run(
            `UPDATE sync_queue SET retry_count = retry_count + 1, last_error = ? 
             WHERE id = ? AND retry_count < 10`,
            [error.message, row.id]
          );
          console.warn(`[Sync] Item ${row.id} failed (retry ${row.retry_count + 1}):`, error.message);
        }
      }
    }, 5000);
  }
  
  // Send to cloud via WebSocket
  private async sendToCloud(queueItem: any): Promise<any> {
    return new Promise((resolve, reject) => {
      const messageId = crypto.randomUUID();
      
      // Send via WebSocket
      const message = {
        id: messageId,
        type: 'SYNC_ITEM',
        factoryId: process.env.FACTORY_ID,
        payload: JSON.parse(queueItem.payload)
      };
      
      const timeout = setTimeout(() => {
        reject(new Error('WebSocket message timeout (30s)'));
      }, 30000);
      
      // Receive response
      const handler = (event: any) => {
        const response = JSON.parse(event.data);
        if (response.id === messageId) {
          clearTimeout(timeout);
          this.ws.removeEventListener('message', handler);
          
          if (response.status === 'success') {
            resolve(response.data);
          } else {
            reject(new Error(response.error || 'Unknown error'));
          }
        }
      };
      
      this.ws.addEventListener('message', handler);
      this.ws.send(JSON.stringify(message));
    });
  }
  
  // Circuit breaker: fail fast if API down, auto-retry
  private setupCircuitBreaker() {
    this.circuitBreaker = new Opossum(async (fn: Function) => fn(), {
      timeout: 10000,
      errorThresholdPercentage: 50,
      resetTimeout: 30000, // 30s before retry
      rollingCountTimeout: 10000,
      volumeThreshold: 10, // Open circuit after 10 requests
      rollingCountBuckets: 10
    });
    
    this.circuitBreaker.on('open', () => {
      console.warn('[CircuitBreaker] OPENED — API likely down, queuing locally');
    });
    
    this.circuitBreaker.on('close', () => {
      console.log('[CircuitBreaker] CLOSED — API recovered');
    });
  }
  
  // Auto-update: check every 6 hours for delta binary
  private setupAutoUpdate() {
    setInterval(async () => {
      try {
        const response = await fetch(`${process.env.API_GATEWAY}/agent/update-check`, {
          headers: { 'X-Factory-ID': process.env.FACTORY_ID }
        });
        
        const { hasUpdate, downloadUrl, version } = await response.json();
        
        if (hasUpdate) {
          console.log(`[Update] New version available: ${version}`);
          
          // Download delta binary (~5MB, compressed)
          const binaryPath = await this.downloadDeltaBinary(downloadUrl);
          
          // Backup current binary
          const backupPath = `./agent-backup-${Date.now()}.exe`;
          fs.copyFileSync('./bridge-agent.exe', backupPath);
          
          // Extract and replace
          fs.copyFileSync(binaryPath, './bridge-agent.exe');
          
          console.log(`[Update] Updated to ${version}, will restart on next sync cycle`);
          
          // Graceful restart
          process.exit(0); // Supervisor (Windows Service Manager) restarts process
        }
      } catch (error) {
        console.error('[Update] Check failed:', error);
      }
    }, 6 * 60 * 60 * 1000); // Every 6 hours
  }
  
  // Helper: parse XML with schema validation
  private parseXML(xmlString: string): Promise<any> {
    return new Promise((resolve, reject) => {
      parseString(xmlString, { mergeAttrs: true }, (err, result) => {
        if (err) reject(err);
        else resolve(result);
      });
    });
  }
  
  private getQueuedItems(limit: number): Promise<any[]> {
    return new Promise((resolve, reject) => {
      this.db.all(
        `SELECT * FROM sync_queue WHERE sync_status = 'pending' ORDER BY created_at ASC LIMIT ?`,
        [limit],
        (err, rows) => {
          if (err) reject(err);
          else resolve(rows);
        }
      );
    });
  }
  
  private async downloadDeltaBinary(url: string): Promise<string> {
    // Binary delta download (rsync-style, only changed blocks)
    // Use delta library or download full if delta not available
    const response = await fetch(url);
    const buffer = await response.buffer();
    const tempPath = `./bridge-agent-${Date.now()}.exe`;
    fs.writeFileSync(tempPath, buffer);
    return tempPath;
  }
}

const agent = new BridgeAgent();
```

### WebSocket Tunnel (API Gateway → Bridge Agent)

```typescript
// API Gateway (Express)
const wss = new WebSocket.Server({ noServer: true });

server.on('upgrade', (request, socket, head) => {
  const factoryId = request.headers['x-factory-id'];
  const token = request.headers.authorization?.split(' ')[1];
  
  // Authenticate factory
  const factory = await verifyFactoryToken(factoryId, token);
  if (!factory) {
    socket.destroy();
    return;
  }
  
  wss.handleUpgrade(request, socket, head, (ws) => {
    // Store connection
    bridgeAgentConnections.set(factoryId, ws);
    
    ws.on('message', async (data) => {
      const message = JSON.parse(data);
      
      if (message.type === 'SYNC_ITEM') {
        // Process sync item (outbox, saga, etc.)
        const result = await handleSyncItem(message.payload, factoryId);
        
        // Send response back to agent
        ws.send(JSON.stringify({
          id: message.id,
          status: result.success ? 'success' : 'error',
          data: result.data,
          error: result.error
        }));
      }
    });
    
    ws.on('close', () => {
      bridgeAgentConnections.delete(factoryId);
      console.log(`[Agent] Disconnected: ${factoryId}`);
    });
  });
});
```

---

## 10. B2B SAAS PRICING FOR INDIAN SMES

### Market Reality: ₹5-20 LPA for Entry-Level Factories

**Target factories:**
- Turnover: ₹5-20 Cr/year
- Employees: 20-100
- Current workflow: Manual PO generation, email-based EDI

### Hybrid Pricing Model

| Tier | Monthly | Per-Transaction | Best For | Annual |
|------|---------|-----------------|----------|--------|
| **Starter** | ₹2,000 | ₹50/PO | <5 POs/day, testing | ₹24,000 |
| **Growth** | ₹5,000 | ₹25/PO | 5-20 POs/day, SME | ₹60,000 |
| **Enterprise** | ₹15,000 | ₹10/PO | 20+ POs/day, mid-market | ₹180,000 |
| **Custom** | Negotiated | Volume discount | 100+ POs/day, large org | Custom |

**Logic:**
- Monthly base covers infrastructure, support, mapping updates
- Per-transaction covers: AS2 processing, GDS lookup, notification bandwidth

### Payment Collection Strategy

**Critical for India:** UPI AutoPay + e-NACH for recurring payments.

**Integration:**
1. **Razorpay** (primary)
   - UPI AutoPay (highest success rate in India)
   - e-NACH (bank mandate auto-debit)
   - Netbanking, card options as fallback
   - Native IST timezone support
   
2. **Fallback:** PayU or Instamojo if Razorpay unavailable

**Implementation:**
```typescript
// Razorpay subscription setup
const subscription = await razorpay.subscriptions.create({
  plan_id: planId, // 'plan_GrowthMonthly'
  customer_id: factoryId,
  quantity: 1,
  total_count: 12, // Yearly
  addons: [{
    item: {
      name: 'Setup fee',
      amount: 50000 // ₹500 one-time
    }
  }],
  notes: {
    factory_name: factory.name,
    gstin: factory.gstin_token // Never raw GSTIN
  }
});

// Webhook: handle payment success
app.post('/webhooks/razorpay', (req, res) => {
  const signature = req.headers['x-razorpay-signature'];
  const payload = JSON.stringify(req.body);
  
  // Verify signature
  const hmac = crypto.createHmac('sha256', env.RAZORPAY_SECRET);
  hmac.update(payload);
  const expectedSignature = hmac.digest('hex');
  
  if (signature !== expectedSignature) {
    return res.status(400).send('Invalid signature');
  }
  
  const event = req.body.event;
  const data = req.body.payload.payment;
  
  if (event === 'payment.authorized') {
    // Activate features for factory
    await db.query(
      `UPDATE factory_subscriptions SET status = 'active', activated_at = NOW() WHERE factory_id = $1`,
      [data.notes.factory_id]
    );
  }
  
  res.json({ ok: true });
});
```

### Payment Success Rate Optimization

**Recommended flow:**
1. Try UPI AutoPay (70-80% success)
2. If declined, offer e-NACH setup (30-day processing)
3. Fallback to one-time netbanking/card
4. Retry failed payments every 3 days (configurable)

**Expected monthly success rate in India:** 85-90% (vs. 95%+ in US).

### Pricing Communication

**Transparency matters in India:**
```
Starter Tier: ₹2,000/month
├─ First 5 POs: Included
├─ Additional POs: ₹50 each
├─ 2 users
├─ Email support (24h response)
├─ Monthly: ₹2,000 + (PO count - 5) × ₹50

Example: 10 POs = ₹2,000 + (10-5) × ₹50 = ₹2,250
```

---

## SUMMARY: FACTORYCONNECT TECHNICAL DECISIONS

| Area | Decision | Rationale |
|------|----------|-----------|
| **Multi-tenancy** | RLS on shared schema | Salesforce/Stripe proven, cost-optimal for 100s-1000s tenants |
| **EDI** | Glass-box hybrid (Cleo principles) | Transparency + AI-assisted mapping, not black-box |
| **ERP integration** | Bridge agent + CDC + polling | Handles offline Tally + cloud ERPs, flexible |
| **Outbox** | Transactional outbox + polling | At-least-once + idempotency = exactly-once, simpler than Debezium |
| **Sagas** | 15-state orchestrator | Audit trail, deadline enforcement, clear compensation logic |
| **AI mapping** | Error-code-only LLM input | Never factory data to LLM, constrained token-based output |
| **Observability** | OpenTelemetry + Jaeger + per-tenant routing | Multi-tenant traces, per-factory alerting |
| **Security** | Vault Transit + RLS + Pino redaction | AES-256 + FIPS HSM for PII, automatic log redaction |
| **Bridge agent** | Node.js + SQLite + WebSocket + CRDT sync | Lightweight, offline-capable, auto-updatable |
| **Pricing** | Hybrid subscription + per-transaction (Razorpay) | Indian SME reality, UPI AutoPay + e-NACH optimized |

---

## NEXT STEPS

1. **Track A (Foundation):** Implement RLS policies, migrations, PostgreSQL schema, Vault setup, Razorpay webhook skeleton.
2. **Track B (API):** Outbox poller + saga coordinator with state machine, idempotency middleware, Jaeger trace setup.
3. **Track C (Mapping):** LLM registry (error-code-only), mapping engine, transform rules, EDI spec validators, AS2 stub.
4. **Track D (Bridge):** Windows agent skeleton, file watcher, WebSocket tunnel, circuit breaker, auto-update mechanism.
5. **Track E (Portal):** Dashboard for monitoring sagas, field mapping UI, payment setup, factory analytics per-tenant.

**Cross-cutting:**
- Test RLS with cross-tenant queries
- Log redaction via Pino interceptor
- Correlation ID on every request/response
- Feature flags for incomplete tracks
- k6 load tests (1000 concurrent factories, 100 POs/sec burst)

