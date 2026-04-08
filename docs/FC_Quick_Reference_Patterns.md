# FactoryConnect: Quick Reference — Code Patterns & Architecture Decisions

**For developers:** Copy-paste ready implementations from the full research. See `FC_SaaS_Architecture_Research_2026.md` for context.

---

## 1. RLS Initialization (Every Request)

```typescript
// Middleware: set tenant context
async function tenantContextMiddleware(req, res, next) {
  const tenantId = req.user?.tenant_id || req.headers['x-tenant-id'];
  const userId = req.user?.id;
  const correlationId = req.headers['x-correlation-id'] || crypto.randomUUID();
  
  // Pass to next middleware via request context
  req.context = { tenantId, userId, correlationId };
  
  // Attach to logger
  req.log = logger.child({ tenantId, userId, correlationId });
  
  res.setHeader('x-correlation-id', correlationId);
  next();
}

// Database helper: wrap all queries with tenant context
async function query(sql, params) {
  const client = await pool.connect();
  try {
    // SET tenant context BEFORE any query
    await client.query("SET LOCAL app.current_tenant = $1", [req.context.tenantId]);
    await client.query("SET LOCAL app.current_user = $1", [req.context.userId]);
    await client.query("SET LOCAL app.correlation_id = $1", [req.context.correlationId]);
    
    // Execute query (RLS policy enforces tenant isolation)
    const result = await client.query(sql, params);
    return result.rows;
  } finally {
    client.release();
  }
}
```

---

## 2. Transactional Outbox (4-Table Write)

```typescript
async function createOrder(factoryId, poData) {
  const client = await pool.connect();
  try {
    await client.query('BEGIN');
    
    // 1. Domain event: canonical order
    const order = await client.query(
      `INSERT INTO canonical_orders (factory_id, status, po_number, total, created_at)
       VALUES ($1, $2, $3, $4, NOW()) RETURNING id`,
      [factoryId, 'INITIATED', poData.number, poData.total]
    );
    const orderId = order.rows[0].id;
    
    // 2. Outbox table (polling listener publishes from here)
    const idempotencyKey = crypto.randomUUID();
    await client.query(
      `INSERT INTO outbox (aggregate_id, aggregate_type, event_type, payload, idempotency_key, created_at)
       VALUES ($1, $2, $3, $4, $5, NOW())`,
      [orderId, 'order', 'OrderCreated', JSON.stringify({orderId, ...poData}), idempotencyKey]
    );
    
    // 3. Saga orchestrator (state machine)
    await client.query(
      `INSERT INTO order_sagas (order_id, state, started_at)
       VALUES ($1, $2, NOW())`,
      [orderId, 'INITIATED']
    );
    
    // 4. Audit log (hash-chain for tamper detection)
    const auditHash = crypto.createHash('sha256')
      .update(JSON.stringify({orderId, po_number: poData.number}))
      .digest('hex');
    
    await client.query(
      `INSERT INTO audit_log (entity_type, entity_id, action, actor_id, changes, hash, created_at)
       VALUES ($1, $2, $3, $4, $5, $6, NOW())`,
      ['order', orderId, 'CREATE', userId, JSON.stringify({po_number: poData.number}), auditHash]
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

---

## 3. Outbox Poller (Every 100ms)

```typescript
async function pollOutbox() {
  const client = await pool.connect();
  try {
    const rows = await client.query(
      `SELECT id, aggregate_id, event_type, payload FROM outbox 
       WHERE published_at IS NULL 
       ORDER BY created_at ASC LIMIT 100`
    );
    
    for (const row of rows.rows) {
      try {
        // Publish to Redis stream or Kafka
        await redis.xadd(`events:${row.event_type}`, '*', 'data', JSON.stringify(row.payload));
        
        // Mark published
        await client.query(
          `UPDATE outbox SET published_at = NOW() WHERE id = $1`,
          [row.id]
        );
      } catch (publishError) {
        logger.warn(`Publish failed for outbox ${row.id}, will retry:`, publishError);
      }
    }
  } finally {
    client.release();
  }
}

// Run every 100ms
setInterval(pollOutbox, 100);
```

---

## 4. Idempotency Validation (Consumer Side)

```typescript
async function handleOrderCreatedEvent(event) {
  // Check Redis cache (5 min TTL)
  const key = `idempotency:${event.idempotencyKey}`;
  const cached = await redis.get(key);
  
  if (cached) {
    logger.info(`Duplicate event ${event.idempotencyKey}, skipping`);
    return;
  }
  
  try {
    // Process event
    await processOrderCreated(event);
    
    // Mark processed
    await redis.setex(key, 300, 'processed');
  } catch (error) {
    // On error, don't mark processed; retry later
    logger.error(`Event processing failed:`, error);
    throw error;
  }
}
```

---

## 5. Saga State Machine (15 States)

```typescript
class SagaCoordinator {
  readonly TRANSITIONS: Record<string, string[]> = {
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
    'COMPLETED': [],
    'CANCELLED': [],
    'FAILED': []
  };
  
  async transition(sagaId: string, newState: string) {
    const saga = await this.getSaga(sagaId);
    const valid = this.TRANSITIONS[saga.state] || [];
    
    if (!valid.includes(newState)) {
      throw new FcError(
        'FC_ERR_SAGA_INVALID_TRANSITION',
        `Cannot transition from ${saga.state} to ${newState}`
      );
    }
    
    // Transition handler
    const handler = this.handlers[newState];
    const result = await handler(saga);
    
    // Update + emit event
    await db.query(
      `UPDATE order_sagas SET state = $1, updated_at = NOW() WHERE id = $2`,
      [newState, sagaId]
    );
    
    await this.outbox.append({
      aggregateId: sagaId,
      type: 'SagaStateChanged',
      payload: { from: saga.state, to: newState, ...result }
    });
    
    return result;
  }
}
```

---

## 6. Vault Transit (PII Encryption)

```typescript
class VaultTransitClient {
  async encrypt(plaintext: string, keyName: string): Promise<string> {
    const response = await axios.post(
      `${env.VAULT_ADDR}/v1/transit/encrypt/${keyName}`,
      { plaintext: Buffer.from(plaintext).toString('base64') },
      { headers: { 'X-Vault-Token': env.VAULT_TOKEN } }
    );
    return response.data.data.ciphertext; // vault:v1:...
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
const vault = new VaultTransitClient();

// Store encrypted
const encryptedGSTIN = await vault.encrypt(factory.gstin, 'pii_gstin');
await db.query(
  `INSERT INTO factories (name, gstin_encrypted, gstin_token)
   VALUES ($1, $2, $3)`,
  [factory.name, encryptedGSTIN, `token_gstin_${randomId()}`]
);

// Decrypt on read (only when needed)
const factory = await db.query(`SELECT gstin_encrypted FROM factories WHERE id = $1`, [id]);
const plainGSTIN = await vault.decrypt(factory.gstin_encrypted, 'pii_gstin');
```

---

## 7. PII Redaction (Pino Logger)

```typescript
const PII_PATTERNS = [
  /\b[0-9]{2}[A-Z]{5}[0-9]{4}[A-Z][1-9A-Z][Z][0-9]{3}[A-Z]\b/g, // GSTIN
  /\b[0-9]{12}\b/g, // Aadhaar (simplified)
  /\b[A-Z]{5}[0-9]{4}[A-Z]\b/g, // PAN
  /\b\d{9,18}\b/g, // Bank account
  /\b[A-Z]{4}0[A-Z0-9]{6}\b/g, // IFSC
  /\b[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}\b/g // Email
];

const redactPII = (text: string): string => {
  return PII_PATTERNS.reduce((acc, pattern) =>
    acc.replace(pattern, '[REDACTED]'), text
  );
};

const logger = pino({
  transport: { target: 'pino-pretty' },
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

// All logs auto-redacted
logger.info({ gstin: '27AABCT0550H1Z0', amount: 50000 });
// Output: { gstin: '[REDACTED]', amount: 50000 }
```

---

## 8. OpenTelemetry + Tenant Isolation

```typescript
import { NodeTracerProvider } from '@opentelemetry/sdk-node';
import { JaegerExporter } from '@opentelemetry/exporter-jaeger-basic';
import { trace } from '@opentelemetry/api';

const provider = new NodeTracerProvider();

provider.addSpanProcessor(
  new JaegerExporter({ host: 'localhost', port: 6831 })
);

provider.register();
const tracer = trace.getTracer('api-gateway');

// Express middleware
app.use((req, res, next) => {
  const tenantId = req.context.tenantId;
  const span = tracer.startSpan(`${req.method} ${req.path}`, {
    attributes: {
      'http.method': req.method,
      'http.url': req.url,
      'tenant_id': tenantId,
      'correlation_id': req.context.correlationId,
      'user_id': req.context.userId
    }
  });
  
  span.addEvent('request_received');
  req.span = span;
  
  res.on('finish', () => {
    span.addEvent('response_sent', { 'http.status_code': res.statusCode });
    span.end();
  });
  
  next();
});
```

---

## 9. Circuit Breaker (Bridge Agent ↔ API)

```typescript
import Opossum from 'opossum';

const circuitBreaker = new Opossum(async (fn: Function) => fn(), {
  timeout: 10000, // 10s
  errorThresholdPercentage: 50, // Open after 50% failures
  resetTimeout: 30000, // Try again after 30s
  volumeThreshold: 10 // Need 10+ requests before opening
});

circuitBreaker.on('open', () => {
  logger.warn('Circuit breaker OPEN — API likely down');
});

// Usage (from bridge agent)
try {
  await circuitBreaker.fire(() => sendToCloud(queueItem));
} catch (error) {
  if (circuitBreaker.opened) {
    logger.info('Circuit open, queuing locally');
    // Queue stays in SQLite, will retry when circuit closes
  } else {
    throw error;
  }
}
```

---

## 10. Bridge Agent: File Watcher + Queue

```typescript
import chokidar from 'chokidar';
import Database from 'sqlite3';

class BridgeAgent {
  private db: Database;
  
  constructor() {
    this.db = new Database('./queue.db');
    this.watchTallyFolder();
  }
  
  private watchTallyFolder() {
    const tallyFolder = process.env.TALLY_XML_FOLDER || 'C:\\Tally\\XML';
    
    chokidar.watch(`${tallyFolder}/**/*.xml`, {
      persistent: true,
      awaitWriteFinish: { stabilityThreshold: 2000 }
    }).on('add', async (filePath) => {
      try {
        const xml = fs.readFileSync(filePath, 'utf-8');
        const parsed = await parseXML(xml);
        
        this.db.run(
          `INSERT INTO sync_queue (operation, table_name, record_id, payload, sync_status)
           VALUES ('INSERT', ?, ?, ?, 'pending')`,
          [
            `tally_${parsed.type}`,
            `${parsed.type}_${Date.now()}`,
            JSON.stringify(parsed)
          ]
        );
        
        logger.info(`Queued ${parsed.type} from ${filePath}`);
      } catch (error) {
        logger.error(`Failed to process ${filePath}:`, error);
      }
    });
  }
}
```

---

## 11. WebSocket Sync (Bridge ↔ API Gateway)

```typescript
// Bridge Agent (Windows PC)
const ws = new WebSocket(`wss://${env.API_GATEWAY}/agent/sync?factory_id=${factoryId}&token=${token}`);

ws.on('open', () => {
  logger.info('WebSocket connected');
  this.startSyncLoop();
});

ws.on('message', (data) => {
  const response = JSON.parse(data);
  const handler = this.pendingRequests.get(response.id);
  if (handler) {
    handler(response);
    this.pendingRequests.delete(response.id);
  }
});

private async sendToCloud(queueItem) {
  return new Promise((resolve, reject) => {
    const messageId = crypto.randomUUID();
    const timeout = setTimeout(() => reject(new Error('Timeout')), 30000);
    
    this.pendingRequests.set(messageId, (response) => {
      clearTimeout(timeout);
      if (response.status === 'success') resolve(response.data);
      else reject(new Error(response.error));
    });
    
    ws.send(JSON.stringify({
      id: messageId,
      type: 'SYNC_ITEM',
      payload: JSON.parse(queueItem.payload)
    }));
  });
}
```

---

## 12. Razorpay Webhook (Payment Verification)

```typescript
import crypto from 'crypto';

app.post('/webhooks/razorpay', (req, res) => {
  const signature = req.headers['x-razorpay-signature'];
  const payload = JSON.stringify(req.body);
  
  // Timing-safe comparison
  const hmac = crypto.createHmac('sha256', env.RAZORPAY_SECRET);
  const expectedSignature = hmac.update(payload).digest('hex');
  
  if (!crypto.timingSafeEqual(Buffer.from(signature), Buffer.from(expectedSignature))) {
    return res.status(400).send('Invalid signature');
  }
  
  const event = req.body.event;
  
  if (event === 'payment.authorized') {
    db.query(
      `UPDATE factory_subscriptions SET status = 'active', activated_at = NOW() WHERE factory_id = $1`,
      [req.body.payload.payment.notes.factory_id]
    );
  }
  
  res.json({ ok: true });
});
```

---

## 13. Feature Flags (For Incomplete Tracks)

```typescript
async function isFeatureEnabled(featureName: string, factoryId: string): Promise<boolean> {
  // 1. Check platform-level flag first
  const platformFlag = await redis.get(`feature:${featureName}`);
  if (platformFlag === 'disabled') return false;
  
  // 2. Check factory-level override
  const factoryOverride = await db.query(
    `SELECT enabled FROM feature_flags WHERE factory_id = $1 AND feature_name = $2`,
    [factoryId, featureName]
  );
  
  if (factoryOverride.rows.length > 0) {
    return factoryOverride.rows[0].enabled;
  }
  
  // 3. Default to platform flag
  return platformFlag !== 'disabled';
}

// Usage
const sandboxEnabled = await isFeatureEnabled('SANDBOX_TEST_HARNESS', factoryId);
if (!sandboxEnabled) {
  throw new FcError('FC_ERR_FEATURE_DISABLED', 'Sandbox testing not available yet');
}
```

---

## Error Code Reference

Format: `FC_ERR_{DOMAIN}_{SPECIFIC}`

```typescript
// Auth
'FC_ERR_AUTH_TOKEN_EXPIRED'
'FC_ERR_AUTH_INVALID_CREDENTIALS'

// Tenant
'FC_ERR_TENANT_NOT_SET'
'FC_ERR_TENANT_UNAUTHORIZED'

// Order/Saga
'FC_ERR_SAGA_INVALID_TRANSITION'
'FC_ERR_SAGA_TIMEOUT'
'FC_ERR_ORDER_DUPLICATE'

// EDI/Mapping
'FC_ERR_MAPPING_FIELD_NOT_FOUND'
'FC_ERR_EDI_ENVELOPE_FAIL'
'FC_ERR_EDI_VALIDATION_ERROR'

// Bridge
'FC_ERR_BRIDGE_OFFLINE'
'FC_ERR_BRIDGE_SYNC_FAILED'

// Feature flags
'FC_ERR_FEATURE_DISABLED'
```

---

## Testing Checklist

- [ ] RLS: Insert as tenant A, query as tenant B → must return 0 rows
- [ ] Outbox: Create order, verify outbox row created in same transaction
- [ ] Idempotency: Retry event with same idempotency_key → second call no-ops
- [ ] Saga transitions: Try invalid transition → throws error
- [ ] Vault: Encrypt/decrypt cycles match
- [ ] Logging: All logs have tenant_id + correlation_id, PII redacted
- [ ] Bridge: File created → queued → synced (with WebSocket down, retries)
- [ ] Razorpay: Webhook signature validation passes/fails correctly

